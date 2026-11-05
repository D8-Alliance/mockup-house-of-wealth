import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { kycInvestmentLimit, KycLimitsMisconfigured } from './kyc-limits';
import { isRelatedParty } from '../organisation-kyb/organisation-group';
import { formatAmount, NotificationService } from '../notifications/notification.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { FinancialLedgerService, investorCashAccount } from '../financial/financial-ledger.service';
import { PrismaService } from '../prisma.service';
import { assertTenantScope, postingOnBehalfOf, tenantScopeFilter } from '../tenancy/tenant-scope';
import { advanceProjectStatus, RAISING_PROJECT_STATUSES } from '../projects/project-status';
import { CreateInvestmentOrderDto } from './investments.dto';
import { assertCanViewPool, INVESTOR_ROLES } from '../pools/pool-access';
import { buildPositions, EARNED_DISTRIBUTION_STATUSES, InvestorPosition } from './positions';

export interface PaymentInstructions {
  orderId: string;
  orderNumber: string;
  status: string;
  amount: number;
  currency: string;
  /** What the investor writes as the transfer reference, so Finance can match the transfer to the order. */
  reference: string;
  /** The platform's trust account in the pool's country; null until Super Admin sets it. */
  account: { bankName: string; accountName: string; accountNumber: string; swiftCode: string | null; instructions: string | null } | null;
}

export interface InvestorDistribution {
  id: string;
  poolId: string | null;
  poolName: string;
  periodName: string;
  amount: number;
  currency: string;
  earnedAt: string;
  paid: boolean;
  paidAt: string | null;
}

export const SETTLEMENT_ROLES = new Set(['Super Admin', 'Settlement Officer', 'Portfolio Manager', 'Finance Officer']);
/** Settlement staff who confirm transfers for every organisation of their country, not only their own. */
const COUNTRY_SETTLEMENT_ROLES = new Set(['Finance Officer']);

/**
 * Platform staff who may see individual investor orders (who invested, how much, the transfer): finance and
 * settlement to confirm and pay, compliance and AML to screen, admins to support. Delivery partners and other roles
 * see only their pool's totals: the investors contracted with the pool through the platform, and their identity
 * stays with the platform (PDPA; the Recognized Markets guidelines put investor data on the operator).
 */
export const ORDER_DETAIL_ROLES: ReadonlySet<string> = new Set(['Super Admin', 'Country Admin', 'Finance Officer', 'Settlement Officer', 'Portfolio Manager', 'Compliance Officer', 'AML Officer']);

/** Delivery-partner (PDP) roles. Someone running a project must not also invest in its pool. */
const DELIVERY_PARTNER_ROLES: ReadonlySet<string> = new Set(['Project Sponsor', 'Project Manager']);

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: FinancialLedgerService, private readonly audit: AuditService, @Optional() private readonly notifications?: NotificationService) {}

  async createOrder(actor: AuthenticatedUser, input: CreateInvestmentOrderDto) {
    if (!INVESTOR_ROLES.has(actor.role)) throw new ForbiddenException('Only investor accounts can place investment orders.');
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: input.poolId }, include: { project: { select: { projectId: true, fundingRequired: true, projectSponsorId: true } } } });
    if (!pool) throw new NotFoundException('Pool not found.');
    assertCanViewPool(actor, pool);
    // Conflict of interest: the organisation that runs the project (the delivery-partner entity),
    // its sponsor, and anyone holding a delivery-partner role cannot invest in its pool.
    if (pool.organisationId === actor.organisationId) {
      throw new ForbiddenException('Your organisation runs this project, so it cannot invest in its own pool.');
    }
    if (pool.project?.projectSponsorId === actor.userId || actor.assignedRoles.some((role) => DELIVERY_PARTNER_ROLES.has(role))) {
      throw new ForbiddenException('You are a delivery partner for this project, so you cannot invest in its pool.');
    }
    // Know your customer: only investors whose identity verification is approved may invest.
    const kyc = await this.prisma.kycApplication.findFirst({ where: { userId: actor.userId, status: 'APPROVED' }, select: { id: true, kycLevel: true } });
    if (!kyc) throw new ForbiddenException('Complete identity verification (KYC) before investing. Your KYC must be approved first.');
    if (pool.status !== 'OPEN') throw new BadRequestException('Only OPEN pools accept investment orders.');
    if (pool.closesAt && pool.closesAt < new Date()) throw new BadRequestException('This pool closed for new investment on ' + pool.closesAt.toISOString().slice(0, 10) + '.');
    if (pool.currency.toUpperCase() !== input.currency.toUpperCase()) throw new BadRequestException('Investment currency does not match the pool currency.');
    const currency = input.currency.toUpperCase();
    let cap: number | null;
    try {
      cap = kycInvestmentLimit(kyc.kycLevel, currency);
    } catch (error) {
      if (error instanceof KycLimitsMisconfigured) throw new ServiceUnavailableException('Investment limits are misconfigured; contact the platform operator.');
      throw error;
    }
    const existing = await this.prisma.investmentOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.investorUserId !== actor.userId) throw new ForbiddenException('Investment order belongs to another investor.');
      return existing;
    }
    // Related party: an entity of the same corporate group as the organisation running the project
    // may invest, but the order is flagged for Compliance and Shariah and disclosed to other investors.
    const groups = await this.prisma.organisation.findMany({ where: { id: { in: [actor.organisationId, pool.organisationId] } }, select: { id: true, groupName: true } });
    const relatedParty = isRelatedParty(groups.find((org) => org.id === actor.organisationId) ?? null, groups.find((org) => org.id === pool.organisationId) ?? null);
    const order = await this.prisma.$transaction(async (tx) => {
      // Ijab and qabul: the order must accept the pool's current akad terms, read inside the
      // transaction so a terms change cannot slip between reading and accepting.
      // FOR SHARE conflicts with the FOR UPDATE taken when terms are republished.
      await tx.$queryRaw`SELECT "poolId" FROM "WealthPool" WHERE "poolId" = ${pool.poolId} FOR SHARE`;
      const terms = await tx.poolAkadTerms.findFirst({ where: { poolId: pool.poolId }, orderBy: { version: 'desc' } });
      if (!terms) throw new BadRequestException('This pool has no akad terms yet, so it cannot accept investments.');
      if (terms.id !== input.akadTermsId) throw new ConflictException('The akad terms for this pool have changed. Review and accept the latest version.');
      if (cap !== null) {
        // One investor's orders are checked one at a time, so two orders placed together cannot both slip under the cap.
        // Selecting 1 instead of the lock function's void result, which Prisma cannot read back.
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${actor.userId}))`;
        const used = await tx.investmentOrder.aggregate({ _sum: { amount: true }, where: { investorUserId: actor.userId, currency, status: { in: ['PENDING', 'SETTLED'] } } });
        const usedAmount = Number(used._sum.amount ?? 0);
        if (usedAmount + input.amount > cap + 0.005) {
          throw new ForbiddenException(`Your KYC level allows up to ${formatAmount(cap, currency)} invested; you already have ${formatAmount(usedAmount, currency)}. Ask for a higher KYC level to invest more.`);
        }
      }
      const created = await tx.investmentOrder.create({ data: { akadTermsId: terms.id, akadTermsHash: terms.termsHash, akadAcceptedAt: new Date(), orderNumber: `HOW-INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, poolId: pool.poolId, projectId: pool.projectId, investorUserId: actor.userId, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency.toUpperCase(), status: 'PENDING', idempotencyKey: input.idempotencyKey, relatedParty } });
      await this.audit.recordActor(actor, { action: 'investment.order.create', resourceType: 'InvestmentOrder', resourceId: created.id, organisationId: created.organisationId, countryNodeId: created.countryNodeId, metadata: { poolId: created.poolId, amount: input.amount, currency: created.currency, akadTermsId: terms.id, akadTermsVersion: terms.version, akadType: terms.akadType, akadTermsHash: terms.termsHash, relatedParty } }, tx);
      return created;
    });
    const account = this.notifications ? await this.prisma.collectionAccount.findUnique({ where: { countryNodeId: order.countryNodeId } }).catch(() => null) : null;
    const where = account ? ` to ${account.bankName} ${account.accountNumber} (${account.accountName})` : '';
    await this.notifications?.notifyUsers([order.investorUserId], {
      type: 'INVESTMENT', title: 'Order received: transfer to complete it',
      message: `Transfer ${formatAmount(order.amount, order.currency)} for ${pool.poolName}${where} with reference ${order.orderNumber}. It counts in your portfolio once Finance confirms the money arrived.`,
      resourceType: 'InvestmentOrder', resourceId: order.id, dedupeKey: `investment-order-created:${order.id}`,
    });
    return order;
  }

  /**
   * Where and how the investor pays for their order: the platform's trust account in the pool's country
   * and the order number as the transfer reference, so Finance can match the transfer to the order.
   */
  async paymentInstructions(actor: AuthenticatedUser, id: string): Promise<PaymentInstructions> {
    const order = await this.prisma.investmentOrder.findUnique({ where: { id }, select: { id: true, orderNumber: true, status: true, amount: true, currency: true, countryNodeId: true, investorUserId: true } });
    if (!order || order.investorUserId !== actor.userId) throw new NotFoundException('Investment order not found.');
    const account = await this.prisma.collectionAccount.findUnique({ where: { countryNodeId: order.countryNodeId } });
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      amount: Number(order.amount),
      currency: order.currency,
      reference: order.orderNumber,
      account: account ? { bankName: account.bankName, accountName: account.accountName, accountNumber: account.accountNumber, swiftCode: account.swiftCode, instructions: account.instructions } : null,
    };
  }

  /** The investor's profit from each distribution period, newest first, and whether its bank payout has settled. */
  async myDistributions(actor: AuthenticatedUser): Promise<InvestorDistribution[]> {
    if (!INVESTOR_ROLES.has(actor.role)) throw new ForbiddenException('Profit history is for investor accounts.');
    const allocations = await this.prisma.distributionAllocation.findMany({
      where: { beneficiaryUserId: actor.userId, distribution: { status: { in: EARNED_DISTRIBUTION_STATUSES } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, amount: true, currency: true, createdAt: true, distribution: { select: { periodName: true, poolId: true, projectId: true } }, payoutInstruction: { select: { status: true, settledAt: true } } },
    });
    const poolIds = [...new Set(allocations.map((item) => item.distribution.poolId).filter((poolId): poolId is string => Boolean(poolId)))];
    const names = new Map((await this.prisma.wealthPool.findMany({ where: { poolId: { in: poolIds } }, select: { poolId: true, poolName: true } })).map((pool) => [pool.poolId, pool.poolName]));
    return allocations.map((item) => {
      const paid = item.payoutInstruction?.status === 'SETTLED';
      return {
        id: item.id,
        poolId: item.distribution.poolId,
        poolName: names.get(item.distribution.poolId ?? '') ?? item.distribution.projectId,
        periodName: item.distribution.periodName,
        amount: Number(item.amount),
        currency: item.currency,
        earnedAt: item.createdAt.toISOString(),
        paid,
        paidAt: paid ? item.payoutInstruction?.settledAt?.toISOString() ?? null : null,
      };
    });
  }

  async listOrders(actor: AuthenticatedUser) {
    // An investor sees only their own orders (they sit in the pool's organisation, not the investor's).
    const investor = INVESTOR_ROLES.has(actor.role);
    if (!investor && !ORDER_DETAIL_ROLES.has(actor.role)) throw new ForbiddenException("Investor orders are visible only to the platform's finance, settlement and compliance staff. Your pool's totals are shown with the pool.");
    // Staff review orders for every organisation of their country (orders sit in the pool's organisation).
    const where = investor ? { investorUserId: actor.userId } : actor.role === 'Super Admin' ? {} : { countryNodeId: actor.countryNodeId };
    // An investor also gets the akad terms they accepted with each order (ijab and qabul): a pool that has
    // filled up is no longer listed to them, but the agreement they made stays readable.
    const akadTerms = investor ? { select: { id: true, version: true, akadType: true, investorProfitSharePct: true, termsText: true, termsHash: true } } : false;
    return this.prisma.investmentOrder.findMany({ where, orderBy: { createdAt: 'desc' }, include: { contribution: true, pool: { select: { poolName: true } }, akadTerms }, take: 100 });
  }

  /** The signed-in investor's holding in each pool: capital, pool share and profit (see positions.ts). */
  async positions(actor: AuthenticatedUser): Promise<InvestorPosition[]> {
    if (!INVESTOR_ROLES.has(actor.role)) throw new ForbiddenException('Positions are for investor accounts.');
    const orders = await this.prisma.investmentOrder.findMany({
      where: { investorUserId: actor.userId, status: { in: ['PENDING', 'SETTLED', 'REFUND_DUE'] } },
      include: {
        akadTerms: { select: { investorProfitSharePct: true } },
        pool: { select: { poolName: true, status: true, currency: true, investmentStructure: true, indicativeExpectedReturn: true, project: { select: { projectName: true, suspendedAt: true, suspendedReason: true } } } },
      },
    });
    if (!orders.length) return [];
    const poolIds = [...new Set(orders.map((order) => order.poolId))];
    const [totals, allocations] = await Promise.all([
      this.prisma.investmentContribution.groupBy({ by: ['poolId'], where: { poolId: { in: poolIds }, status: 'POSTED' }, _sum: { amount: true } }),
      this.prisma.distributionAllocation.findMany({
        where: { beneficiaryUserId: actor.userId, distribution: { poolId: { in: poolIds }, status: { in: EARNED_DISTRIBUTION_STATUSES } } },
        select: { amount: true, distribution: { select: { poolId: true } }, payoutInstruction: { select: { status: true } } },
      }),
    ]);
    return buildPositions(
      orders.map((order) => ({
        poolId: order.poolId,
        amount: Number(order.amount),
        status: order.status,
        settledAt: order.settledAt,
        createdAt: order.createdAt,
        investorProfitSharePct: order.akadTerms ? Number(order.akadTerms.investorProfitSharePct) : null,
        pool: { poolName: order.pool.poolName, status: order.pool.status, currency: order.pool.currency, investmentStructure: order.pool.investmentStructure, indicativeExpectedReturn: Number(order.pool.indicativeExpectedReturn), projectName: order.pool.project.projectName, projectSuspended: !!order.pool.project.suspendedAt, projectSuspendedReason: order.pool.project.suspendedAt ? order.pool.project.suspendedReason ?? 'Under review' : null },
      })),
      new Map(totals.map((row) => [row.poolId ?? '', Number(row._sum.amount ?? 0)])),
      allocations.map((allocation) => ({ poolId: allocation.distribution.poolId ?? '', amount: Number(allocation.amount), paid: allocation.payoutInstruction?.status === 'SETTLED' })),
    );
  }

  /** Settled orders in pools that missed their minimum (pool-fundraising.service.ts), waiting for Finance to return the money. */
  async refundQueue(actor: AuthenticatedUser) {
    if (!SETTLEMENT_ROLES.has(actor.role)) throw new ForbiddenException('Only settlement staff return investor money.');
    const scope = actor.role === 'Super Admin' ? {} : COUNTRY_SETTLEMENT_ROLES.has(actor.role) ? { countryNodeId: actor.countryNodeId } : tenantScopeFilter(actor);
    const orders = await this.prisma.investmentOrder.findMany({ where: { ...scope, status: 'REFUND_DUE' }, orderBy: { settledAt: 'asc' }, take: 200, include: { pool: { select: { poolName: true, minimumRaise: true, project: { select: { projectName: true } } } } } });
    const investors = await this.prisma.user.findMany({ where: { id: { in: [...new Set(orders.map((order) => order.investorUserId))] } }, select: { id: true, name: true } });
    const names = new Map(investors.map((investor) => [investor.id, investor.name]));
    return orders.map((order) => ({ ...order, investorName: names.get(order.investorUserId) ?? null }));
  }

  /**
   * Finance has sent the investor's money back (the pool missed its minimum): record the bank reference,
   * take the capital out of the pool in the ledger, and mark the order and its contribution REFUNDED.
   */
  async refund(actor: AuthenticatedUser, id: string, refundReference?: string) {
    if (!SETTLEMENT_ROLES.has(actor.role)) throw new ForbiddenException('Only settlement staff return investor money.');
    const order = await this.getOrder(actor, id);
    if (order.investorUserId === actor.userId) throw new ForbiddenException('You cannot record a refund of your own investment.');
    if (order.status !== 'REFUND_DUE') throw new BadRequestException(`Only orders waiting for a refund can be refunded; this one is ${order.status}.`);
    const reference = refundReference?.trim() ?? '';
    if (reference.length < 4) throw new BadRequestException('Enter the bank reference of the refund transfer (at least 4 characters).');
    const books = COUNTRY_SETTLEMENT_ROLES.has(actor.role) ? postingOnBehalfOf(actor, order) : actor;
    const amount = Number(order.amount);
    const refunded = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.investmentOrder.updateMany({ where: { id, status: 'REFUND_DUE' }, data: { status: 'REFUNDED', refundReference: reference, refundedAt: new Date(), refundedBy: actor.userId } });
      if (!claimed.count) throw new BadRequestException('Someone else recorded this refund first. Reload.');
      const poolAccount = await this.ledger.ensureAccountInTransaction(tx, books, { accountCode: `POOL-${order.poolId}-CASH-${order.currency}`, accountType: 'ASSET', ownerType: 'POOL', ownerId: order.poolId, organisationId: order.organisationId, countryNodeId: order.countryNodeId, currency: order.currency });
      const investorAccount = await this.ledger.ensureAccountInTransaction(tx, books, await investorCashAccount(tx, order.investorUserId, order.organisationId, order.countryNodeId, order.currency));
      const posted = await this.ledger.postInTransaction(tx, books, {
        transactionType: 'INVESTMENT_REFUND', referenceType: 'InvestmentOrder', referenceId: order.id, currency: order.currency, idempotencyKey: `investment-refund:${order.id}`,
        description: `Refund of ${order.orderNumber}: pool missed its minimum, ref ${reference}`,
        entries: [{ accountId: investorAccount.id, direction: 'DEBIT', amount, description: 'Investor capital returned' }, { accountId: poolAccount.id, direction: 'CREDIT', amount, description: 'Pool cash paid back' }],
      });
      await tx.investmentContribution.updateMany({ where: { orderId: order.id, status: 'POSTED' }, data: { status: 'REFUNDED' } });
      await this.audit.recordActor(actor, { action: 'investment.order.refund', resourceType: 'InvestmentOrder', resourceId: order.id, organisationId: order.organisationId, countryNodeId: order.countryNodeId, metadata: { amount, refundReference: reference, ledgerTransactionId: posted.id } }, tx);
      return tx.investmentOrder.findUniqueOrThrow({ where: { id: order.id } });
    });
    await this.notifications?.notifyUsers([order.investorUserId], {
      type: 'INVESTMENT', title: 'Money returned',
      message: `Finance sent back ${formatAmount(order.amount, order.currency)} for order ${order.orderNumber} (bank reference ${reference}), because ${order.pool.poolName} did not reach its minimum.`,
      resourceType: 'InvestmentOrder', resourceId: order.id, dedupeKey: `investment-refunded:${order.id}`,
    });
    return refunded;
  }

  async getOrder(actor: AuthenticatedUser, id: string) {
    const order = await this.prisma.investmentOrder.findUnique({ where: { id }, include: { contribution: true, pool: true } });
    if (!order) throw new NotFoundException('Investment order not found.');
    if (order.investorUserId === actor.userId) return order;
    if (COUNTRY_SETTLEMENT_ROLES.has(actor.role) && order.countryNodeId === actor.countryNodeId) return order;
    assertTenantScope(actor, order, 'Investment order');
    if (order.investorUserId !== actor.userId && !SETTLEMENT_ROLES.has(actor.role)) throw new ForbiddenException('Investment order is not owned by this investor.');
    return order;
  }

  /** Investor transfers waiting for settlement staff to match them to the bank, oldest first. */
  async settlementQueue(actor: AuthenticatedUser) {
    if (!SETTLEMENT_ROLES.has(actor.role)) throw new ForbiddenException('Only settlement staff confirm investor payments.');
    const scope = actor.role === 'Super Admin' ? {} : COUNTRY_SETTLEMENT_ROLES.has(actor.role) ? { countryNodeId: actor.countryNodeId } : tenantScopeFilter(actor);
    const orders = await this.prisma.investmentOrder.findMany({ where: { ...scope, status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 100, include: { pool: { select: { poolName: true, project: { select: { projectName: true } } } } } });
    const investors = await this.prisma.user.findMany({ where: { id: { in: [...new Set(orders.map((order) => order.investorUserId))] } }, select: { id: true, name: true } });
    const names = new Map(investors.map((investor) => [investor.id, investor.name]));
    return orders.map((order) => ({ ...order, investorName: names.get(order.investorUserId) ?? null }));
  }

  /**
   * Settlement confirms the investor's money was actually received, against the bank reference of the
   * transfer, and posts pool cash and a contribution that drive distributions. So only settlement staff
   * may settle, and never their own order. The pool raising its target moves the project to FUNDED.
   */
  async settle(actor: AuthenticatedUser, id: string, paymentReference?: string) {
    if (!SETTLEMENT_ROLES.has(actor.role)) throw new ForbiddenException('Only settlement staff can settle an investment order.');
    const order = await this.getOrder(actor, id);
    if (order.investorUserId === actor.userId) throw new ForbiddenException('You cannot settle your own investment order.');
    if (order.status !== 'PENDING') throw new BadRequestException(`Cannot settle an order in state ${order.status}.`);
    const reference = paymentReference?.trim() ?? '';
    if (reference.length < 4) throw new BadRequestException("Enter the bank reference of the investor's transfer (at least 4 characters).");
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: order.poolId }, include: { project: { select: { fundingRequired: true, projectSponsorId: true } } } });
    if (!pool || pool.status !== 'OPEN') throw new BadRequestException('Only OPEN pools can receive settlement.');
    // Finance confirms for any organisation of its country; the money sits in the pool organisation's books.
    const settlementActor = COUNTRY_SETTLEMENT_ROLES.has(actor.role) ? postingOnBehalfOf(actor, order) : actor;
    let becameFull = false;
    const settled = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.investmentOrder.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'SETTLED', settledAt: new Date(), paymentReference: reference, settledBy: actor.userId } });
      if (!claimed.count) throw new BadRequestException('Investment order was already settled or changed state.');
      const poolAccount = await this.ledger.ensureAccountInTransaction(tx, settlementActor, { accountCode: `POOL-${order.poolId}-CASH-${order.currency}`, accountType: 'ASSET', ownerType: 'POOL', ownerId: order.poolId, organisationId: order.organisationId, countryNodeId: order.countryNodeId, currency: order.currency });
      const investorAccount = await this.ledger.ensureAccountInTransaction(tx, settlementActor, await investorCashAccount(tx, order.investorUserId, order.organisationId, order.countryNodeId, order.currency));
      const contribution = await this.ledger.recordInvestmentContributionInTransaction(tx, settlementActor, { orderId: order.id, projectId: order.projectId, poolId: order.poolId, investorUserId: order.investorUserId, organisationId: order.organisationId, countryNodeId: order.countryNodeId, amount: Number(order.amount), currency: order.currency, posting: { transactionType: 'INVESTMENT_CONTRIBUTION', referenceType: 'InvestmentOrder', referenceId: order.id, currency: order.currency, description: `Investment contribution for ${order.poolId}`, idempotencyKey: `investment-order:${order.id}`, entries: [{ accountId: poolAccount.id, direction: 'DEBIT', amount: Number(order.amount), description: 'Pool cash received' }, { accountId: investorAccount.id, direction: 'CREDIT', amount: Number(order.amount), description: 'Investor contribution' }] } });
      const total = await tx.investmentContribution.aggregate({ _sum: { amount: true }, where: { poolId: order.poolId, status: 'POSTED' } });
      if (Number(total._sum.amount || 0) >= Number(pool.project.fundingRequired)) {
        becameFull = (await tx.wealthPool.updateMany({ where: { poolId: order.poolId, status: 'OPEN' }, data: { status: 'FULL' } })).count > 0;
        await advanceProjectStatus(tx, order, RAISING_PROJECT_STATUSES, 'FUNDED', actor.userId, `Pool ${pool.poolName} raised the funding required.`);
      }
      await this.audit.recordActor(actor, { action: 'investment.order.settle', resourceType: 'InvestmentOrder', resourceId: order.id, organisationId: order.organisationId, countryNodeId: order.countryNodeId, metadata: { contributionId: contribution.id, amount: Number(order.amount), paymentReference: reference } }, tx);
      return tx.investmentOrder.findUniqueOrThrow({ where: { id: order.id }, include: { contribution: true } });
    });
    await this.notifications?.notifyUsers([order.investorUserId], {
      type: 'INVESTMENT', title: 'Investment confirmed',
      message: `Finance confirmed your transfer of ${formatAmount(order.amount, order.currency)} to ${pool.poolName} (order ${order.orderNumber}). It now counts in the pool.`,
      resourceType: 'InvestmentOrder', resourceId: order.id, dedupeKey: `investment-settled:${order.id}`,
    });
    if (becameFull) {
      await this.notifications?.notifyUsers([pool.project.projectSponsorId], {
        type: 'POOL', title: 'Pool fully funded', message: `${pool.poolName} has raised its target. You can now request the first disbursement tranche.`,
        resourceType: 'WealthPool', resourceId: pool.poolId, dedupeKey: `pool-full:${pool.poolId}`,
      });
    }
    return settled;
  }

  async cancel(actor: AuthenticatedUser, id: string, reason?: string) {
    const order = await this.getOrder(actor, id);
    if (order.status !== 'PENDING') throw new BadRequestException(`Cannot cancel an order in state ${order.status}.`);
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.investmentOrder.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
      if (!claimed.count) throw new BadRequestException('Investment order was already changed state.');
      await this.audit.recordActor(actor, { action: 'investment.order.cancel', resourceType: 'InvestmentOrder', resourceId: id, organisationId: order.organisationId, countryNodeId: order.countryNodeId, metadata: { reason: reason || null } }, tx);
      return tx.investmentOrder.findUniqueOrThrow({ where: { id } });
    });
    // Staff cancelling an investor's order tells the investor; an investor cancelling their own does not need telling.
    if (order.investorUserId !== actor.userId) {
      await this.notifications?.notifyUsers([order.investorUserId], {
        type: 'INVESTMENT', title: 'Investment order cancelled',
        message: `Your order ${order.orderNumber} for ${formatAmount(order.amount, order.currency)} was cancelled${reason ? `: ${reason}` : '.'}`,
        resourceType: 'InvestmentOrder', resourceId: id, dedupeKey: `investment-cancelled:${id}`,
      });
    }
    return cancelled;
  }
}
