import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { FinancialLedgerService } from '../financial/financial-ledger.service';
import { PrismaService } from '../prisma.service';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';
import { CreateInvestmentOrderDto } from './investments.dto';
import { assertCanViewPool, INVESTOR_ROLES } from '../pools/pool-access';

const SETTLEMENT_ROLES = new Set(['Super Admin', 'Settlement Officer', 'Portfolio Manager']);

/** Delivery-partner (PDP) roles. Someone running a project must not also invest in its pool. */
const DELIVERY_PARTNER_ROLES: ReadonlySet<string> = new Set(['Project Sponsor', 'Project Manager']);

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: FinancialLedgerService, private readonly audit: AuditService) {}

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
    const kyc = await this.prisma.kycApplication.findFirst({ where: { userId: actor.userId, status: 'APPROVED' }, select: { id: true } });
    if (!kyc) throw new ForbiddenException('Complete identity verification (KYC) before investing. Your KYC must be approved first.');
    if (pool.status !== 'OPEN') throw new BadRequestException('Only OPEN pools accept investment orders.');
    if (pool.currency.toUpperCase() !== input.currency.toUpperCase()) throw new BadRequestException('Investment currency does not match the pool currency.');
    const existing = await this.prisma.investmentOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.investorUserId !== actor.userId) throw new ForbiddenException('Investment order belongs to another investor.');
      return existing;
    }
    const order = await this.prisma.$transaction(async (tx) => {
      // Ijab and qabul: the order must accept the pool's current akad terms, read inside the
      // transaction so a terms change cannot slip between reading and accepting.
      // FOR SHARE conflicts with the FOR UPDATE taken when terms are republished.
      await tx.$queryRaw`SELECT "poolId" FROM "WealthPool" WHERE "poolId" = ${pool.poolId} FOR SHARE`;
      const terms = await tx.poolAkadTerms.findFirst({ where: { poolId: pool.poolId }, orderBy: { version: 'desc' } });
      if (!terms) throw new BadRequestException('This pool has no akad terms yet, so it cannot accept investments.');
      if (terms.id !== input.akadTermsId) throw new ConflictException('The akad terms for this pool have changed. Review and accept the latest version.');
      const created = await tx.investmentOrder.create({ data: { akadTermsId: terms.id, akadTermsHash: terms.termsHash, akadAcceptedAt: new Date(), orderNumber: `HOW-INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, poolId: pool.poolId, projectId: pool.projectId, investorUserId: actor.userId, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency.toUpperCase(), status: 'PENDING', idempotencyKey: input.idempotencyKey } });
      await this.audit.recordActor(actor, { action: 'investment.order.create', resourceType: 'InvestmentOrder', resourceId: created.id, organisationId: created.organisationId, countryNodeId: created.countryNodeId, metadata: { poolId: created.poolId, amount: input.amount, currency: created.currency, akadTermsId: terms.id, akadTermsVersion: terms.version, akadType: terms.akadType, akadTermsHash: terms.termsHash } }, tx);
      return created;
    });
    return order;
  }

  listOrders(actor: AuthenticatedUser) {
    // An investor sees only their own orders (they sit in the pool's organisation, not the investor's).
    const where = INVESTOR_ROLES.has(actor.role) ? { investorUserId: actor.userId } : tenantScopeFilter(actor);
    return this.prisma.investmentOrder.findMany({ where, orderBy: { createdAt: 'desc' }, include: { contribution: true }, take: 100 });
  }

  async getOrder(actor: AuthenticatedUser, id: string) {
    const order = await this.prisma.investmentOrder.findUnique({ where: { id }, include: { contribution: true, pool: true } });
    if (!order) throw new NotFoundException('Investment order not found.');
    if (order.investorUserId === actor.userId) return order;
    assertTenantScope(actor, order, 'Investment order');
    if (order.investorUserId !== actor.userId && !SETTLEMENT_ROLES.has(actor.role)) throw new ForbiddenException('Investment order is not owned by this investor.');
    return order;
  }

  /**
   * Settlement confirms the investor's money was actually received, and posts pool cash and a
   * contribution that drive distributions. So only settlement staff may settle, and never their own order.
   */
  async settle(actor: AuthenticatedUser, id: string) {
    if (!SETTLEMENT_ROLES.has(actor.role)) throw new ForbiddenException('Only settlement staff can settle an investment order.');
    const order = await this.getOrder(actor, id);
    if (order.investorUserId === actor.userId) throw new ForbiddenException('You cannot settle your own investment order.');
    if (order.status !== 'PENDING') throw new BadRequestException(`Cannot settle an order in state ${order.status}.`);
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: order.poolId }, include: { project: { select: { fundingRequired: true } } } });
    if (!pool || pool.status !== 'OPEN') throw new BadRequestException('Only OPEN pools can receive settlement.');
    const settlementActor = actor;
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.investmentOrder.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'SETTLED', settledAt: new Date() } });
      if (!claimed.count) throw new BadRequestException('Investment order was already settled or changed state.');
      const poolAccount = await this.ledger.ensureAccountInTransaction(tx, settlementActor, { accountCode: `POOL-${order.poolId}-CASH-${order.currency}`, accountType: 'ASSET', ownerType: 'POOL', ownerId: order.poolId, organisationId: order.organisationId, countryNodeId: order.countryNodeId, currency: order.currency });
      const investorAccount = await this.ledger.ensureAccountInTransaction(tx, settlementActor, { accountCode: `USER-${order.investorUserId}-CASH-${order.currency}`, accountType: 'ASSET', ownerType: 'USER', ownerId: order.investorUserId, organisationId: order.organisationId, countryNodeId: order.countryNodeId, currency: order.currency });
      const contribution = await this.ledger.recordInvestmentContributionInTransaction(tx, settlementActor, { orderId: order.id, projectId: order.projectId, poolId: order.poolId, investorUserId: order.investorUserId, organisationId: order.organisationId, countryNodeId: order.countryNodeId, amount: Number(order.amount), currency: order.currency, posting: { transactionType: 'INVESTMENT_CONTRIBUTION', referenceType: 'InvestmentOrder', referenceId: order.id, currency: order.currency, description: `Investment contribution for ${order.poolId}`, idempotencyKey: `investment-order:${order.id}`, entries: [{ accountId: poolAccount.id, direction: 'DEBIT', amount: Number(order.amount), description: 'Pool cash received' }, { accountId: investorAccount.id, direction: 'CREDIT', amount: Number(order.amount), description: 'Investor contribution' }] } });
      const total = await tx.investmentContribution.aggregate({ _sum: { amount: true }, where: { poolId: order.poolId, status: 'POSTED' } });
      if (Number(total._sum.amount || 0) >= Number(pool.project.fundingRequired)) await tx.wealthPool.updateMany({ where: { poolId: order.poolId, status: 'OPEN' }, data: { status: 'FULL' } });
      await this.audit.recordActor(actor, { action: 'investment.order.settle', resourceType: 'InvestmentOrder', resourceId: order.id, organisationId: order.organisationId, countryNodeId: order.countryNodeId, metadata: { contributionId: contribution.id, amount: Number(order.amount) } }, tx);
      return tx.investmentOrder.findUniqueOrThrow({ where: { id: order.id }, include: { contribution: true } });
    });
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
    return cancelled;
  }
}
