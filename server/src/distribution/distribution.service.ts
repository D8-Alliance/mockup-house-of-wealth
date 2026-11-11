import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { formatAmount, NotificationService } from '../notifications/notification.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { FinancialLedgerService, investorCashAccount } from '../financial/financial-ledger.service';
import { PrismaService } from '../prisma.service';
import { assertTenantScope, postingOnBehalfOf, TenantResource, tenantScopeFilter } from '../tenancy/tenant-scope';
import { CreateDistributionDto, DistributionPreviewDto, PoolIncomeDto, RecordPeriodResultDto } from './distribution.dto';
import { periodOutcome, PriorResult } from './period-result';
import { matchStatement, parseStatementCsv, StatementLine } from './bank-statement-match';

/** Earlier period results of a pool that count towards loss offsetting. */
const COUNTED_RESULT = { status: { notIn: ['REJECTED', 'CANCELLED'] } };

export const OPERATORS = new Set(['Super Admin', 'Settlement Officer']);

/**
 * Settlement works for the platform across a country: pools belong to their sponsors' organisations and
 * investors to their own, so a Settlement Officer (and a Country Admin) acts on every pool of their country.
 */
const COUNTRY_WIDE = new Set(['Settlement Officer', 'Country Admin']);

export function settlementScopeFilter(actor: AuthenticatedUser): { countryNodeId?: string; organisationId?: string } {
  return COUNTRY_WIDE.has(actor.role) ? { countryNodeId: actor.countryNodeId } : tenantScopeFilter(actor);
}

export function assertSettlementScope(actor: AuthenticatedUser, resource: TenantResource, label: string) {
  if (COUNTRY_WIDE.has(actor.role) && actor.countryNodeId === resource.countryNodeId) return;
  assertTenantScope(actor, resource, label);
}

/** Pool statuses whose investors can receive profit. */
const DISTRIBUTABLE_POOL_STATUSES = ['FULL', 'CLOSED'];
/** Profit distributions whose money has left the pool (or is on its way). */
const PAID_OUT_STATUSES = ['PROCESSING', 'SETTLED', 'PARTIALLY_SETTLED', 'FAILED'];
const round2 = (value: number) => Math.round(value * 100) / 100;
const poolIncomeAccount = (pool: { poolId: string; organisationId: string; countryNodeId: string; currency: string }) => ({ accountCode: `POOL-${pool.poolId}-INCOME-${pool.currency}`, accountType: 'INCOME', ownerType: 'POOL', ownerId: pool.poolId, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, currency: pool.currency });
const poolCashAccount = (pool: { poolId: string; organisationId: string; countryNodeId: string; currency: string }) => ({ accountCode: `POOL-${pool.poolId}-CASH-${pool.currency}`, accountType: 'ASSET', ownerType: 'POOL', ownerId: pool.poolId, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, currency: pool.currency });

@Injectable()
export class DistributionService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: FinancialLedgerService, private readonly audit: AuditService, @Optional() private readonly notifications?: NotificationService) {}

  async create(actor: AuthenticatedUser, input: CreateDistributionDto) {
    assertSettlementScope(actor, input, 'Distribution');
    const project = await this.prisma.project.findUnique({ where: { projectId: input.projectId } });
    if (!project) throw new NotFoundException('Project not found.');
    assertSettlementScope(actor, project, 'Project');
    let pool: { poolId: string; status: string; currency: string; organisationId: string; countryNodeId: string } | null = null;
    if (input.poolId) {
      pool = await this.prisma.wealthPool.findUnique({ where: { poolId: input.poolId }, select: { poolId: true, status: true, currency: true, organisationId: true, countryNodeId: true } });
      if (!pool) throw new NotFoundException('Pool not found.');
      assertSettlementScope(actor, pool, 'Pool');
      if (pool.organisationId !== input.organisationId || pool.countryNodeId !== input.countryNodeId) throw new BadRequestException('The distribution must be recorded in the pool\'s own organisation and country.');
      if (!DISTRIBUTABLE_POOL_STATUSES.includes(pool.status)) throw new BadRequestException('Distributions require a full or closed pool.');
      if (pool.currency !== input.currency) throw new BadRequestException('Distribution currency does not match the pool.');
    }
    const duplicate = await this.prisma.distribution.findFirst({ where: { projectId: input.projectId, poolId: input.poolId, periodName: input.periodName, status: { not: 'CANCELLED' } } });
    if (duplicate) throw new BadRequestException('A distribution already exists for this period.');
    const contributions = input.poolId ? await this.prisma.investmentContribution.findMany({ where: { poolId: input.poolId, status: 'POSTED', currency: input.currency }, select: { investorUserId: true, amount: true } }) : [];
    const capitalByInvestor = new Map<string, number>();
    contributions.forEach((item) => capitalByInvestor.set(item.investorUserId, (capitalByInvestor.get(item.investorUserId) || 0) + Number(item.amount)));
    if (input.poolId && !capitalByInvestor.size) throw new BadRequestException('No settled investments are eligible for this distribution.');
    // The profit-sharing ratio comes from the pool's akad, agreed before anyone invested,
    // not from the request. Older pools without akad terms keep the request's ratio.
    const terms = input.poolId ? await this.prisma.poolAkadTerms.findFirst({ where: { poolId: input.poolId }, orderBy: { version: 'desc' } }) : null;
    const investorSharePct = terms ? Number(terms.investorProfitSharePct) : input.investorProfitSharePercent ?? 80;
    if (terms && input.investorProfitSharePercent !== undefined && input.investorProfitSharePercent !== investorSharePct) throw new BadRequestException(`This pool's akad fixes the investor profit share at ${investorSharePct}%.`);
    if (terms && input.grossRevenue === undefined) throw new BadRequestException('A pool with akad terms must report gross revenue and eligible costs, so the agreed profit ratio can be applied.');
    const grossRevenue = input.grossRevenue ?? input.totalAmount;
    const eligibleCosts = input.eligibleCosts ?? 0;
    const outcome = terms ? periodOutcome(await this.priorResults(this.prisma, input.poolId!), grossRevenue - eligibleCosts) : null;
    if (outcome && outcome.distributableNet <= 0) throw new BadRequestException(`Nothing to distribute: this period's result is offset by ${outcome.unrecoveredLoss.toFixed(2)} of unrecovered losses. Record it as a period result instead.`);
    const netProfit = terms ? grossRevenue - eligibleCosts : Math.max(0, grossRevenue - eligibleCosts);
    const sharedNet = outcome ? outcome.distributableNet : netProfit;
    const investorProfit = input.grossRevenue === undefined ? input.totalAmount : sharedNet * (investorSharePct / 100);
    const capitalTotal = [...capitalByInvestor.values()].reduce((sum, amount) => sum + amount, 0);
    const allocations = input.allocations.map((allocation) => {
      if (input.poolId && !capitalByInvestor.has(allocation.beneficiaryUserId)) throw new BadRequestException(`Beneficiary ${allocation.beneficiaryUserId} has no settled investment in this pool.`);
      const derivedAmount = input.poolId ? investorProfit * ((capitalByInvestor.get(allocation.beneficiaryUserId) || 0) / capitalTotal) : allocation.amount || 0;
      if (allocation.amount !== undefined && Math.abs(allocation.amount - derivedAmount) > 0.01) throw new BadRequestException(`Allocation for ${allocation.beneficiaryUserId} does not match the server-calculated entitlement.`);
      return { beneficiaryUserId: allocation.beneficiaryUserId, amount: Number((allocation.amount ?? derivedAmount).toFixed(2)) };
    });
    const allocationTotal = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    if (!allocations.length || Math.abs(allocationTotal - input.totalAmount) > 0.01) throw new BadRequestException('Distribution allocations must equal the calculated investor profit.');
    if (new Set(allocations.map((allocation) => allocation.beneficiaryUserId)).size !== allocations.length) throw new BadRequestException('A beneficiary may only appear once in a distribution.');
    // A pool's investors are whoever holds settled capital in it (checked above); they sit in their own
    // organisations. Without a pool, the beneficiaries must be active in the distribution's organisation.
    if (!input.poolId) {
      const activeBeneficiaries = await this.prisma.userRoleAssignment.findMany({ where: { userId: { in: allocations.map((allocation) => allocation.beneficiaryUserId) }, organisationId: input.organisationId, countryNodeId: input.countryNodeId, isActive: true }, select: { userId: true }, distinct: ['userId'] });
      if (activeBeneficiaries.length !== allocations.length) throw new BadRequestException('Every beneficiary must belong to the active distribution tenant.');
    }
    if (input.poolId && allocations.length !== capitalByInvestor.size) throw new BadRequestException('Every investor with settled capital in the pool must receive their share.');
    // An investor's payout account belongs to them, in their own organisation; it must be in the same country.
    const destinations = await this.prisma.payoutDestination.findMany({ where: { id: { in: input.allocations.map((allocation) => allocation.destinationId) }, countryNodeId: input.countryNodeId, status: 'VERIFIED', ...(input.poolId ? {} : { organisationId: input.organisationId }) } });
    const destinationById = new Map(destinations.map((destination) => [destination.id, destination]));
    for (const allocation of input.allocations) {
      const destination = destinationById.get(allocation.destinationId);
      if (!destination || destination.ownerUserId !== allocation.beneficiaryUserId || (destination.cooldownUntil && destination.cooldownUntil > new Date())) throw new BadRequestException(`Payout destination for ${allocation.beneficiaryUserId} is not verified or is still in its cooling-off period.`);
    }
    return this.prisma.$transaction(async (tx) => {
      if (outcome) await this.assertOutcomeUnchanged(tx, input.poolId!, grossRevenue - eligibleCosts, outcome.distributableNet);
      const created = await tx.distribution.create({ data: { kind: 'PROFIT', distributableNet: outcome ? new Prisma.Decimal(outcome.distributableNet) : null, lossOffset: outcome ? new Prisma.Decimal(outcome.lossOffset) : null, projectId: input.projectId, poolId: input.poolId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, totalAmount: new Prisma.Decimal(input.totalAmount), currency: input.currency, periodName: input.periodName, grossRevenue: new Prisma.Decimal(grossRevenue), eligibleCosts: new Prisma.Decimal(eligibleCosts), netProfit: new Prisma.Decimal(netProfit), investorProfit: new Prisma.Decimal(investorProfit), akadTermsId: terms?.id, investorProfitSharePct: input.grossRevenue === undefined ? null : new Prisma.Decimal(investorSharePct), status: 'CALCULATED', createdBy: actor.userId } });
      for (const allocation of allocations) await tx.distributionAllocation.create({ data: { distributionId: created.id, beneficiaryUserId: allocation.beneficiaryUserId, destinationId: input.allocations.find((item) => item.beneficiaryUserId === allocation.beneficiaryUserId)!.destinationId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(allocation.amount), currency: input.currency, status: 'PENDING' } });
      await this.audit.recordActor(actor, { action: 'distribution.calculated', resourceType: 'Distribution', resourceId: created.id, organisationId: created.organisationId, countryNodeId: created.countryNodeId, metadata: { projectId: input.projectId, poolId: input.poolId, totalAmount: input.totalAmount, allocationCount: allocations.length, periodName: input.periodName, grossRevenue, eligibleCosts, netProfit, investorProfit, investorProfitSharePct: input.grossRevenue === undefined ? null : investorSharePct, akadTermsId: terms?.id ?? null, lossOffset: outcome?.lossOffset ?? null, distributableNet: outcome?.distributableNet ?? null } }, tx);
      return tx.distribution.findUniqueOrThrow({ where: { id: created.id }, include: { allocations: true } });
    });
  }

  /**
   * Records a period of a pool under akad terms whose result is not paid out: a loss, or a
   * profit fully absorbed by earlier losses. It goes through the same submit and approval
   * steps, and later profit is offset against it.
   */
  async recordPeriodResult(actor: AuthenticatedUser, input: RecordPeriodResultDto) {
    assertSettlementScope(actor, input, 'Distribution');
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: input.poolId }, select: { poolId: true, projectId: true, status: true, currency: true, organisationId: true, countryNodeId: true } });
    if (!pool || pool.projectId !== input.projectId) throw new NotFoundException('Pool not found for this project.');
    assertSettlementScope(actor, pool, 'Pool');
    if (pool.currency !== input.currency) throw new BadRequestException('Currency does not match the pool.');
    const terms = await this.prisma.poolAkadTerms.findFirst({ where: { poolId: input.poolId }, orderBy: { version: 'desc' } });
    if (!terms) throw new BadRequestException('Period results are recorded for pools with akad terms.');
    if (await this.prisma.distribution.findFirst({ where: { poolId: input.poolId, periodName: input.periodName, status: { not: 'CANCELLED' } } })) throw new BadRequestException('A result already exists for this period.');
    const net = Math.round((input.grossRevenue - input.eligibleCosts) * 100) / 100;
    const outcome = periodOutcome(await this.priorResults(this.prisma, input.poolId), net);
    if (outcome.distributableNet > 0) throw new BadRequestException(`This period has ${outcome.distributableNet.toFixed(2)} of profit to share. Create a distribution instead.`);
    const kind = net < 0 ? 'LOSS' : 'ABSORBED';
    return this.prisma.$transaction(async (tx) => {
      await this.assertOutcomeUnchanged(tx, input.poolId, net, 0);
      const created = await tx.distribution.create({ data: { kind, projectId: input.projectId, poolId: input.poolId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, totalAmount: new Prisma.Decimal(0), currency: input.currency, periodName: input.periodName, grossRevenue: new Prisma.Decimal(input.grossRevenue), eligibleCosts: new Prisma.Decimal(input.eligibleCosts), netProfit: new Prisma.Decimal(net), investorProfit: new Prisma.Decimal(0), distributableNet: new Prisma.Decimal(0), lossOffset: new Prisma.Decimal(outcome.lossOffset), akadTermsId: terms.id, investorProfitSharePct: terms.investorProfitSharePct, status: 'CALCULATED', createdBy: actor.userId } });
      await this.audit.recordActor(actor, { action: 'distribution.period_result', resourceType: 'Distribution', resourceId: created.id, organisationId: created.organisationId, countryNodeId: created.countryNodeId, metadata: { kind, poolId: input.poolId, periodName: input.periodName, grossRevenue: input.grossRevenue, eligibleCosts: input.eligibleCosts, netResult: net, unrecoveredLossBefore: outcome.unrecoveredLoss, lossOffset: outcome.lossOffset, akadTermsId: terms.id } }, tx);
      return tx.distribution.findUniqueOrThrow({ where: { id: created.id }, include: { allocations: true } });
    });
  }

  private async priorResults(client: Prisma.TransactionClient | PrismaService, poolId: string): Promise<PriorResult[]> {
    const rows = await client.distribution.findMany({ where: { poolId, ...COUNTED_RESULT }, select: { kind: true, netProfit: true, distributableNet: true } });
    return rows.map((row) => ({ kind: row.kind, netProfit: Number(row.netProfit ?? 0), distributableNet: row.distributableNet === null ? null : Number(row.distributableNet) }));
  }

  /** Re-checks the offset under a pool lock, so two results recorded at once cannot both use the same history. */
  private async assertOutcomeUnchanged(tx: Prisma.TransactionClient, poolId: string, net: number, expectedDistributable: number) {
    await tx.$queryRaw`SELECT "poolId" FROM "WealthPool" WHERE "poolId" = ${poolId} FOR UPDATE`;
    if (periodOutcome(await this.priorResults(tx, poolId), net).distributableNet !== expectedDistributable) throw new ConflictException('Another period result was recorded for this pool meanwhile. Recalculate and try again.');
  }

  async submit(actor: AuthenticatedUser, id: string) {
    const distribution = await this.get(actor, id);
    if (distribution.status !== 'CALCULATED') throw new BadRequestException('Only calculated distributions can be submitted.');
    return this.transition(actor, distribution, 'PENDING_APPROVAL', 'distribution.submit');
  }

  async approve(actor: AuthenticatedUser, id: string, comment?: string) {
    const distribution = await this.get(actor, id);
    if (distribution.createdBy === actor.userId) throw new ForbiddenException('The distribution creator cannot approve the same distribution.');
    if (distribution.status !== 'PENDING_APPROVAL') throw new BadRequestException('Only distributions pending approval can be approved.');
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.distribution.updateMany({ where: { id, status: 'PENDING_APPROVAL', version: distribution.version }, data: { status: 'APPROVED', approvedBy: actor.userId, approvedAt: new Date(), version: { increment: 1 } } });
      if (!claimed.count) throw new BadRequestException('Distribution changed concurrently.');
      await tx.distributionApproval.create({ data: { distributionId: id, reviewerId: actor.userId, decision: 'APPROVED', comment } });
      await this.audit.recordActor(actor, { action: 'distribution.approve', resourceType: 'Distribution', resourceId: id, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, metadata: { comment: comment || null } }, tx);
      return tx.distribution.findUniqueOrThrow({ where: { id }, include: { allocations: true } });
    });
  }

  async reject(actor: AuthenticatedUser, id: string, comment: string) {
    const distribution = await this.get(actor, id);
    if (!comment.trim()) throw new BadRequestException('A rejection comment is required.');
    if (!['CALCULATED', 'PENDING_APPROVAL'].includes(distribution.status)) throw new BadRequestException('This distribution cannot be rejected in its current state.');
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.distribution.updateMany({ where: { id, status: distribution.status, version: distribution.version }, data: { status: 'REJECTED', rejectedBy: actor.userId, rejectedAt: new Date(), version: { increment: 1 } } });
      if (!claimed.count) throw new BadRequestException('Distribution changed concurrently.');
      await tx.distributionApproval.create({ data: { distributionId: id, reviewerId: actor.userId, decision: 'REJECTED', comment } });
      await this.audit.recordActor(actor, { action: 'distribution.reject', resourceType: 'Distribution', resourceId: id, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, metadata: { comment } }, tx);
      return tx.distribution.findUniqueOrThrow({ where: { id }, include: { allocations: true } });
    });
  }

  async process(actor: AuthenticatedUser, id: string) {
    const distribution = await this.get(actor, id);
    if (distribution.status !== 'APPROVED') throw new BadRequestException('Only approved distributions can be processed.');
    if (distribution.kind !== 'PROFIT') throw new BadRequestException(`A recorded ${distribution.kind} result has nothing to pay out.`);
    const books = postingOnBehalfOf(actor, distribution);
    if (distribution.poolId) {
      const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: distribution.poolId }, select: { poolId: true, organisationId: true, countryNodeId: true, currency: true } });
      const available = pool ? (await this.profitFunds(pool)).available : 0;
      if (available + 0.005 < Number(distribution.totalAmount)) throw new BadRequestException(`Record the project income received for this pool first: ${available.toFixed(2)} of income is available to pay ${Number(distribution.totalAmount).toFixed(2)} in profit.`);
    }
    const source = await this.ledger.ensureAccount(books, { accountCode: `POOL-${distribution.poolId || distribution.projectId}-CASH-${distribution.currency}`, accountType: 'ASSET', ownerType: distribution.poolId ? 'POOL' : 'PROJECT', ownerId: distribution.poolId || distribution.projectId, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, currency: distribution.currency });
    const sourceBalance = await this.ledger.getBalance(books, source.id);
    if (sourceBalance.balance + 0.005 < Number(distribution.totalAmount)) throw new BadRequestException('Distribution exceeds the available pool balance.');
    const allocations = distribution.allocations;
    const beneficiaries = await Promise.all(allocations.map(async (allocation) => this.ledger.ensureAccount(books, await investorCashAccount(this.prisma, allocation.beneficiaryUserId, distribution.organisationId, distribution.countryNodeId, distribution.currency))));
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.distribution.updateMany({ where: { id, status: 'APPROVED', version: distribution.version }, data: { status: 'PROCESSING', processedAt: new Date(), version: { increment: 1 } } });
      if (!claimed.count) throw new BadRequestException('Distribution changed concurrently.');
      for (let index = 0; index < allocations.length; index += 1) {
        const allocation = allocations[index];
        const ledger = await this.ledger.postInTransaction(tx, books, { transactionType: 'DISTRIBUTION', referenceType: 'DistributionAllocation', referenceId: allocation.id, currency: distribution.currency, description: `${distribution.periodName} distribution`, idempotencyKey: `distribution:${distribution.id}:${allocation.id}`, entries: [{ accountId: beneficiaries[index].id, direction: 'DEBIT', amount: Number(allocation.amount), description: 'Beneficiary distribution' }, { accountId: source.id, direction: 'CREDIT', amount: Number(allocation.amount), description: 'Pool distribution' }] });
        await tx.distributionAllocation.update({ where: { id: allocation.id }, data: { ledgerTransactionId: ledger.id, status: 'QUEUED' } });
        await tx.payoutInstruction.create({ data: { allocationId: allocation.id, destinationId: allocation.destinationId, beneficiaryUserId: allocation.beneficiaryUserId, destinationHash: allocation.destination?.destinationHash, amount: allocation.amount, currency: distribution.currency, idempotencyKey: `payout:${allocation.id}`, status: 'QUEUED' } });
      }
      await this.audit.recordActor(actor, { action: 'distribution.process', resourceType: 'Distribution', resourceId: id, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, metadata: { allocationCount: allocations.length, payoutProvider: 'MANUAL_BANK_FILE' } }, tx);
      return tx.distribution.findUniqueOrThrow({ where: { id }, include: { allocations: { include: { payoutInstruction: true } } } });
    });
  }

  async submitPayout(actor: AuthenticatedUser, payoutId: string, providerReference: string) {
    const payout = await this.getPayout(actor, payoutId);
    if (payout.status !== 'QUEUED') throw new BadRequestException('Only queued payouts can be submitted.');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payoutInstruction.updateMany({ where: { id: payoutId, status: 'QUEUED' }, data: { status: 'SUBMITTED', providerReference, submittedAt: new Date() } });
      if (!updated.count) throw new BadRequestException('Payout changed concurrently.');
      await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'SUBMITTED' } });
      await this.audit.recordActor(actor, { action: 'payout.submit', resourceType: 'PayoutInstruction', resourceId: payoutId, organisationId: payout.allocation.distribution.organisationId, countryNodeId: payout.allocation.distribution.countryNodeId, metadata: { provider: payout.provider, providerReference } }, tx);
      return tx.payoutInstruction.findUniqueOrThrow({ where: { id: payoutId } });
    });
  }

  async settlePayout(actor: AuthenticatedUser, payoutId: string) {
    const payout = await this.getPayout(actor, payoutId);
    if (payout.status !== 'SUBMITTED') throw new BadRequestException('Only submitted payouts can be settled.');
    const settled = await this.prisma.$transaction(async (tx) => {
      // Conditional on SUBMITTED so a provider webhook handled at the same moment cannot also change it.
      const claimed = await tx.payoutInstruction.updateMany({ where: { id: payoutId, status: 'SUBMITTED' }, data: { status: 'SETTLED', settledAt: new Date() } });
      if (!claimed.count) throw new BadRequestException('Payout changed concurrently.');
      await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'SETTLED' } });
      const pending = await tx.payoutInstruction.count({ where: { allocation: { distributionId: payout.allocation.distributionId }, status: { not: 'SETTLED' } } });
      const distribution = pending === 0 ? await tx.distribution.update({ where: { id: payout.allocation.distributionId }, data: { status: 'SETTLED', settledAt: new Date(), version: { increment: 1 } } }) : await tx.distribution.findUniqueOrThrow({ where: { id: payout.allocation.distributionId } });
      await this.audit.recordActor(actor, { action: 'payout.settle', resourceType: 'PayoutInstruction', resourceId: payoutId, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, metadata: { distributionId: distribution.id, distributionStatus: distribution.status } }, tx);
      return distribution;
    });
    await this.notifications?.notifyUsers([payout.allocation.beneficiaryUserId], {
      type: 'DISTRIBUTION', title: 'Profit paid to your bank account',
      message: `${formatAmount(payout.allocation.amount, payout.allocation.currency)} from ${payout.allocation.distribution.periodName} was paid to your verified bank account.`,
      resourceType: 'PayoutInstruction', resourceId: payoutId, dedupeKey: `payout-settled:${payoutId}`,
    });
    return settled;
  }

  async failPayout(actor: AuthenticatedUser, payoutId: string, reason: string) {
    const payout = await this.getPayout(actor, payoutId);
    if (!reason.trim()) throw new BadRequestException('Payout failure reason is required.');
    if (!['QUEUED', 'SUBMITTED'].includes(payout.status)) throw new BadRequestException('Only queued or submitted payouts can fail.');
    const failed = await this.prisma.$transaction(async (tx) => {
      if (!(await this.markFailedInTransaction(tx, actor, payout, reason))) throw new BadRequestException('Payout changed concurrently.');
      const distribution = await tx.distribution.update({ where: { id: payout.allocation.distributionId }, data: { status: 'FAILED', version: { increment: 1 } } });
      await this.audit.recordActor(actor, { action: 'payout.fail', resourceType: 'PayoutInstruction', resourceId: payoutId, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, metadata: { reason } }, tx);
      return distribution;
    });
    await this.notifications?.notifyUsers([payout.allocation.beneficiaryUserId], {
      type: 'DISTRIBUTION', title: 'Profit payout did not go through',
      message: `The payout of ${formatAmount(payout.allocation.amount, payout.allocation.currency)} from ${payout.allocation.distribution.periodName} failed: ${reason.trim()}. Check your payout bank account in Profile; settlement can send it again once it is corrected.`,
      resourceType: 'PayoutInstruction', resourceId: payoutId, dedupeKey: `payout-failed:${payoutId}:${Date.now()}`,
    });
    return failed;
  }

  /**
   * The one way a payout becomes FAILED (manual action or provider webhook). The status claim
   * (only from QUEUED or SUBMITTED) decides who reverses the ledger posting, so a payout is never
   * reversed twice and a settled payout is never reversed here. Returns false when nothing was claimed.
   */
  private async markFailedInTransaction(tx: Prisma.TransactionClient, actor: AuthenticatedUser, payout: { id: string; allocationId: string }, reason: string): Promise<boolean> {
    const claimed = await tx.payoutInstruction.updateMany({ where: { id: payout.id, status: { in: ['QUEUED', 'SUBMITTED'] } }, data: { status: 'FAILED', failureReason: reason } });
    if (!claimed.count) return false;
    // Read inside the transaction: a retry may have replaced the posting since the payout was loaded.
    const allocation = await tx.distributionAllocation.findUniqueOrThrow({ where: { id: payout.allocationId } });
    if (allocation.ledgerTransactionId) await this.ledger.reverseInTransaction(tx, postingOnBehalfOf(actor, await tx.distribution.findUniqueOrThrow({ where: { id: allocation.distributionId }, select: { organisationId: true, countryNodeId: true } })), allocation.ledgerTransactionId, `payout-failure:${payout.id}:${allocation.ledgerTransactionId}`, `Payout failure reversal for ${payout.id}`);
    await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'FAILED' } });
    return true;
  }

  async retryPayout(actor: AuthenticatedUser, payoutId: string) {
    const payout = await this.getPayout(actor, payoutId);
    if (payout.status !== 'FAILED') throw new BadRequestException('Only failed payouts can be retried.');
    const reversedId = payout.allocation.ledgerTransactionId;
    // The failure reversed the pool-to-beneficiary posting; a retry must post it again before paying out.
    const original = reversedId ? await this.prisma.ledgerTransaction.findUnique({ where: { id: reversedId }, include: { entries: true } }) : null;
    const sourceEntry = original?.entries.find((entry) => entry.direction === 'CREDIT');
    if (sourceEntry) {
      const balance = await this.ledger.getBalance(postingOnBehalfOf(actor, payout.allocation.distribution), sourceEntry.accountId);
      if (balance.balance + 0.005 < Number(payout.amount)) throw new BadRequestException('The pool no longer has enough balance to retry this payout.');
    }
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payoutInstruction.updateMany({ where: { id: payoutId, status: 'FAILED' }, data: { status: 'QUEUED', providerReference: null, failureReason: null, submittedAt: null } });
      if (!claimed.count) throw new BadRequestException('Payout changed concurrently.');
      let ledgerTransactionId = reversedId;
      if (original) {
        const reposted = await this.ledger.postInTransaction(tx, postingOnBehalfOf(actor, payout.allocation.distribution), {
          transactionType: 'DISTRIBUTION',
          referenceType: 'DistributionAllocation',
          referenceId: payout.allocationId,
          currency: original.currency,
          description: `Payout retry for ${payoutId}`,
          // Chained to the reversed posting, so every fail/retry cycle gets its own key.
          idempotencyKey: `payout-retry:${payoutId}:${original.id}`,
          entries: original.entries.map((entry) => ({ accountId: entry.accountId, direction: entry.direction as 'DEBIT' | 'CREDIT', amount: Number(entry.amount), description: entry.description ?? 'Payout retry' })),
        });
        ledgerTransactionId = reposted.id;
      }
      await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'QUEUED', ledgerTransactionId } });
      const distribution = await tx.distribution.update({ where: { id: payout.allocation.distributionId }, data: { status: 'PROCESSING', version: { increment: 1 } } });
      await this.audit.recordActor(actor, { action: 'payout.retry', resourceType: 'PayoutInstruction', resourceId: payoutId, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, metadata: { reversedLedgerTransactionId: reversedId, ledgerTransactionId } }, tx);
      return tx.payoutInstruction.findUniqueOrThrow({ where: { id: payoutId } });
    });
  }

  async reversePayout(actor: AuthenticatedUser, payoutId: string, reason: string) {
    const payout = await this.getPayout(actor, payoutId);
    if (payout.status !== 'SETTLED') throw new BadRequestException('Only settled payouts can be reversed.');
    if (!reason.trim()) throw new BadRequestException('Payout reversal reason is required.');
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payoutInstruction.updateMany({ where: { id: payoutId, status: 'SETTLED' }, data: { status: 'REVERSED', failureReason: reason } });
      if (!claimed.count) throw new BadRequestException('Payout changed concurrently.');
      const allocation = await tx.distributionAllocation.findUniqueOrThrow({ where: { id: payout.allocationId } });
      if (allocation.ledgerTransactionId) await this.ledger.reverseInTransaction(tx, postingOnBehalfOf(actor, payout.allocation.distribution), allocation.ledgerTransactionId, `payout-reversal:${payoutId}:${allocation.ledgerTransactionId}`, `Payout reversal for ${payoutId}`);
      await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'REVERSED' } });
      const distribution = await tx.distribution.update({ where: { id: payout.allocation.distributionId }, data: { status: 'PARTIALLY_SETTLED', version: { increment: 1 } } });
      await this.audit.recordActor(actor, { action: 'payout.reverse', resourceType: 'PayoutInstruction', resourceId: payoutId, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, metadata: { reason } }, tx);
      return distribution;
    });
  }

  async reconcilePayouts(actor: AuthenticatedUser) {
    if (!OPERATORS.has(actor.role)) throw new ForbiddenException('Only settlement operators can reconcile payouts.');
    const payouts = await this.prisma.payoutInstruction.findMany({ where: { status: { in: ['SUBMITTED', 'FAILED'] }, allocation: { distribution: settlementScopeFilter(actor) } }, include: { allocation: { include: { distribution: true } } }, orderBy: { createdAt: 'asc' }, take: 500 });
    return { inspected: payouts.length, payouts: payouts.map((payout) => ({ id: payout.id, status: payout.status, provider: payout.provider, providerReference: payout.providerReference, amount: payout.amount, currency: payout.currency, distributionId: payout.allocation.distributionId, createdAt: payout.createdAt })) };
  }

  /**
   * Pairs a bank statement's outgoing lines with payouts already sent (SUBMITTED) in that currency. Read only:
   * the officer reviews the pairs and confirms the ones to settle with settleFromStatement.
   */
  async matchBankStatement(actor: AuthenticatedUser, input: { csv: string; currency: string }) {
    if (!OPERATORS.has(actor.role)) throw new ForbiddenException('Only settlement operators can match bank statements.');
    let lines: StatementLine[];
    try { lines = parseStatementCsv(input.csv); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'The statement could not be read.'); }
    if (lines.length > 5000) throw new BadRequestException('The statement has too many lines. Export one month at a time.');
    const currency = input.currency.toUpperCase();
    const payouts = await this.prisma.payoutInstruction.findMany({ where: { status: 'SUBMITTED', currency, allocation: { distribution: settlementScopeFilter(actor) } }, include: { allocation: { include: { distribution: { select: { periodName: true } } } } }, orderBy: { submittedAt: 'asc' }, take: 2000 });
    const result = matchStatement(lines, payouts.map((payout) => ({ id: payout.id, amount: Number(payout.amount), currency: payout.currency, providerReference: payout.providerReference })));
    const users = await this.prisma.user.findMany({ where: { id: { in: [...new Set(payouts.map((payout) => payout.beneficiaryUserId))] } }, select: { id: true, name: true } });
    const info = new Map(payouts.map((payout) => [payout.id, {
      id: payout.id, amount: Number(payout.amount), currency: payout.currency, providerReference: payout.providerReference, periodName: payout.allocation.distribution.periodName,
      beneficiaryName: users.find((user) => user.id === payout.beneficiaryUserId)?.name ?? null, submittedAt: payout.submittedAt?.toISOString() ?? null,
    }]));
    await this.audit.recordActor(actor, { action: 'payout.statement_matched', resourceType: 'PayoutInstruction', resourceId: 'BANK_STATEMENT', organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { currency, lines: lines.length, submitted: payouts.length, matched: result.matches.length, mismatched: result.mismatches.length, ambiguous: result.ambiguous.length } });
    return {
      currency, lineCount: lines.length, submittedCount: payouts.length,
      matches: result.matches.map((match) => ({ ...match, payout: info.get(match.payoutId)! })),
      mismatches: result.mismatches.map((item) => ({ ...item, payout: info.get(item.payoutId)! })),
      ambiguous: result.ambiguous.map((item) => ({ ...item, payouts: item.payoutIds.map((id) => info.get(id)!) })),
      unmatchedLines: result.unmatchedLines,
      unmatchedPayouts: result.unmatchedPayoutIds.map((id) => info.get(id)!),
    };
  }

  /** Settles the payouts the officer confirmed from a statement, one by one; a payout that cannot be settled is reported, not fatal. */
  async settleFromStatement(actor: AuthenticatedUser, input: { items: Array<{ payoutId: string; line: number; description?: string }>; statementName?: string }) {
    if (!OPERATORS.has(actor.role)) throw new ForbiddenException('Only settlement operators can settle payouts.');
    const ids = input.items.map((item) => item.payoutId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Each payout can be confirmed once.');
    const settled: string[] = [];
    const failed: Array<{ payoutId: string; reason: string }> = [];
    for (const item of input.items) {
      try {
        await this.settlePayout(actor, item.payoutId);
        settled.push(item.payoutId);
      } catch (error) {
        failed.push({ payoutId: item.payoutId, reason: error instanceof Error ? error.message : String(error) });
      }
    }
    await this.audit.recordActor(actor, { action: 'payout.statement_settled', resourceType: 'PayoutInstruction', resourceId: 'BANK_STATEMENT', organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { statementName: input.statementName ?? null, settled: input.items.filter((item) => settled.includes(item.payoutId)).map((item) => ({ payoutId: item.payoutId, line: item.line, description: item.description ?? null })), failed } });
    return { settled, failed };
  }

  async handleProviderWebhook(provider: string, eventId: string, payoutId: string, eventType: string, status: string, providerReference: string | undefined, payload: Record<string, unknown>) {
    const payout = await this.prisma.payoutInstruction.findUnique({ where: { id: payoutId }, include: { allocation: { include: { distribution: true } } } });
    if (!payout) throw new NotFoundException('Payout instruction not found.');
    const systemActor: AuthenticatedUser = { userId: 'SYSTEM-PAYOUT-WEBHOOK', idpSubjectId: 'SYSTEM-PAYOUT-WEBHOOK', email: 'payout-webhook@internal', name: 'Payout Webhook', role: 'Settlement Officer', countryNodeId: payout.allocation.distribution.countryNodeId, organisationId: payout.allocation.distribution.organisationId, assignedRoles: ['Settlement Officer'] };
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.payoutProviderEvent.findUnique({ where: { provider_providerEventId: { provider, providerEventId: eventId } } });
      if (existing) return { idempotent: true, status: payout.status, payoutId };
      await tx.payoutProviderEvent.create({ data: { provider, providerEventId: eventId, payoutInstructionId: payoutId, eventType, payload: payload as Prisma.InputJsonObject } });
      if (providerReference && payout.providerReference && providerReference !== payout.providerReference) throw new BadRequestException('Provider payout reference does not match the stored reference.');
      // Every change is a conditional claim on the current status. Anything that does not fit the
      // payout's state (e.g. FAILED after it was settled, SETTLED after it failed and was reversed)
      // is recorded and audited for an operator, but never moves money automatically.
      let applied = false;
      if (status === 'FAILED') {
        applied = await this.markFailedInTransaction(tx, systemActor, payout, String(payload.reason || 'Provider reported payout failure.'));
      } else if (status === 'SETTLED') {
        applied = (await tx.payoutInstruction.updateMany({ where: { id: payoutId, status: { in: ['QUEUED', 'SUBMITTED'] } }, data: { status: 'SETTLED', providerReference: providerReference || payout.providerReference, settledAt: new Date() } })).count === 1;
        if (applied) await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'SETTLED' } });
      } else if (status === 'SUBMITTED') {
        applied = (await tx.payoutInstruction.updateMany({ where: { id: payoutId, status: 'QUEUED' }, data: { status: 'SUBMITTED', providerReference: providerReference || payout.providerReference, submittedAt: new Date() } })).count === 1;
        if (applied) await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'SUBMITTED' } });
      }
      await tx.payoutProviderEvent.update({ where: { provider_providerEventId: { provider, providerEventId: eventId } }, data: { processedAt: new Date() } });
      await this.audit.recordActor(systemActor, { action: `payout.webhook.${status.toLowerCase()}`, resourceType: 'PayoutInstruction', resourceId: payoutId, organisationId: payout.allocation.distribution.organisationId, countryNodeId: payout.allocation.distribution.countryNodeId, metadata: { provider, eventId, eventType, providerReference: providerReference || null, applied, payoutStatusBefore: payout.status } }, tx);
      return { idempotent: false, status: applied ? status : payout.status, applied, payoutId };
    });
  }

  /** Distributions in scope, with the pool's and each investor's name and the masked payout account, for the settlement screen. */
  async list(actor: AuthenticatedUser) {
    const rows = await this.prisma.distribution.findMany({ where: settlementScopeFilter(actor), orderBy: { createdAt: 'desc' }, include: { allocations: { include: { payoutInstruction: true, destination: { select: { provider: true, maskedReference: true, accountHolder: true } } } }, approvals: true }, take: 100 });
    const poolIds = [...new Set(rows.map((row) => row.poolId).filter((id): id is string => Boolean(id)))];
    const userIds = [...new Set(rows.flatMap((row) => [row.createdBy, ...(row.approvedBy ? [row.approvedBy] : []), ...row.allocations.map((allocation) => allocation.beneficiaryUserId)]))];
    const [pools, users] = await Promise.all([
      poolIds.length ? this.prisma.wealthPool.findMany({ where: { poolId: { in: poolIds } }, select: { poolId: true, poolName: true } }) : [],
      userIds.length ? this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
    ]);
    const poolName = new Map(pools.map((pool) => [pool.poolId, pool.poolName]));
    const userName = new Map(users.map((user) => [user.id, user.name]));
    return rows.map((row) => ({
      ...row,
      poolName: row.poolId ? poolName.get(row.poolId) ?? null : null,
      createdByName: userName.get(row.createdBy) ?? null,
      approvedByName: row.approvedBy ? userName.get(row.approvedBy) ?? null : null,
      // The creator cannot approve their own distribution; the screen hides the button for them.
      canApprove: row.status === 'PENDING_APPROVAL' && row.createdBy !== actor.userId && OPERATORS.has(actor.role),
      allocations: row.allocations.map((allocation) => ({ ...allocation, beneficiaryName: userName.get(allocation.beneficiaryUserId) ?? null })),
    }));
  }

  /**
   * Pools of the actor's scope that can share profit (full or closed, under akad terms), with their settled
   * capital, the project income recorded for them and how much of it is still available to pay out.
   */
  async settlementPools(actor: AuthenticatedUser) {
    if (!OPERATORS.has(actor.role)) throw new ForbiddenException('Only settlement operators see the pools to settle.');
    const pools = await this.prisma.wealthPool.findMany({ where: { ...settlementScopeFilter(actor), status: { in: DISTRIBUTABLE_POOL_STATUSES }, project: { archivedAt: null } }, orderBy: { poolName: 'asc' }, select: { poolId: true, poolName: true, projectId: true, organisationId: true, countryNodeId: true, currency: true, status: true, investmentStructure: true, project: { select: { projectName: true } } } });
    return Promise.all(pools.map(async (pool) => {
      const [terms, contributions, funds, last] = await Promise.all([
        this.prisma.poolAkadTerms.findFirst({ where: { poolId: pool.poolId }, orderBy: { version: 'desc' }, select: { akadType: true, investorProfitSharePct: true } }),
        this.prisma.investmentContribution.findMany({ where: { poolId: pool.poolId, status: 'POSTED', currency: pool.currency }, select: { investorUserId: true, amount: true } }),
        this.profitFunds(pool),
        this.prisma.distribution.findFirst({ where: { poolId: pool.poolId, ...COUNTED_RESULT }, orderBy: { createdAt: 'desc' }, select: { periodName: true, kind: true, status: true } }),
      ]);
      return {
        poolId: pool.poolId, poolName: pool.poolName, projectId: pool.projectId, projectName: pool.project.projectName, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId,
        currency: pool.currency, status: pool.status, akad: terms?.akadType ?? pool.investmentStructure, investorProfitSharePct: terms ? Number(terms.investorProfitSharePct) : null,
        capital: round2(contributions.reduce((sum, item) => sum + Number(item.amount), 0)), investors: new Set(contributions.map((item) => item.investorUserId)).size,
        ...funds, lastPeriod: last,
      };
    }));
  }

  /**
   * What a period would share, worked out by the server: net result, earlier losses recovered first, the
   * investors' share under the akad, and each investor's part by capital with their default verified payout
   * account. Nothing is saved; the screen sends the same figures to create the distribution.
   */
  async preview(actor: AuthenticatedUser, input: DistributionPreviewDto) {
    if (!OPERATORS.has(actor.role)) throw new ForbiddenException('Only settlement operators prepare distributions.');
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: input.poolId }, select: { poolId: true, poolName: true, projectId: true, organisationId: true, countryNodeId: true, currency: true, status: true } });
    if (!pool) throw new NotFoundException('Pool not found.');
    assertSettlementScope(actor, pool, 'Pool');
    const terms = await this.prisma.poolAkadTerms.findFirst({ where: { poolId: pool.poolId }, orderBy: { version: 'desc' } });
    if (!terms) throw new BadRequestException('Profit is shared only for pools with akad terms.');
    const net = round2(input.grossRevenue - input.eligibleCosts);
    const outcome = periodOutcome(await this.priorResults(this.prisma, pool.poolId), net);
    const sharePct = Number(terms.investorProfitSharePct);
    const investorProfit = round2(outcome.distributableNet * (sharePct / 100));
    const contributions = await this.prisma.investmentContribution.findMany({ where: { poolId: pool.poolId, status: 'POSTED', currency: pool.currency }, select: { investorUserId: true, amount: true } });
    const capital = new Map<string, number>();
    contributions.forEach((item) => capital.set(item.investorUserId, (capital.get(item.investorUserId) || 0) + Number(item.amount)));
    const capitalTotal = [...capital.values()].reduce((sum, amount) => sum + amount, 0);
    const ids = [...capital.keys()];
    const [users, destinations] = await Promise.all([
      ids.length ? this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [],
      ids.length ? this.prisma.payoutDestination.findMany({ where: { ownerUserId: { in: ids }, countryNodeId: pool.countryNodeId, status: { in: ['VERIFIED', 'PENDING_VERIFICATION'] } }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }], select: { id: true, ownerUserId: true, provider: true, maskedReference: true, status: true, cooldownUntil: true, isDefault: true } }) : [],
    ]);
    const now = new Date();
    const investors = ids.map((userId) => {
      const mine = destinations.filter((destination) => destination.ownerUserId === userId);
      const ready = mine.find((destination) => destination.status === 'VERIFIED' && (!destination.cooldownUntil || destination.cooldownUntil <= now));
      const issue = ready ? null : mine.some((destination) => destination.status === 'VERIFIED') ? 'COOLING_OFF' : mine.length ? 'NOT_VERIFIED' : 'NO_ACCOUNT';
      const amount = capitalTotal ? round2(investorProfit * ((capital.get(userId) || 0) / capitalTotal)) : 0;
      return { userId, name: users.find((user) => user.id === userId)?.name ?? userId, capital: round2(capital.get(userId) || 0), sharePct: capitalTotal ? Math.round(((capital.get(userId) || 0) / capitalTotal) * 10000) / 100 : 0, amount, destination: ready ? { id: ready.id, provider: ready.provider, maskedReference: ready.maskedReference } : null, issue };
    }).sort((a, b) => b.capital - a.capital);
    const duplicate = await this.prisma.distribution.findFirst({ where: { poolId: pool.poolId, periodName: input.periodName, status: { not: 'CANCELLED' } }, select: { id: true } });
    return {
      pool: { poolId: pool.poolId, poolName: pool.poolName, projectId: pool.projectId, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, currency: pool.currency, status: pool.status },
      periodName: input.periodName, grossRevenue: input.grossRevenue, eligibleCosts: input.eligibleCosts, netResult: net,
      unrecoveredLossBefore: outcome.unrecoveredLoss, lossOffset: outcome.lossOffset, distributableNet: outcome.distributableNet,
      investorProfitSharePct: sharePct, investorProfit,
      // The amount the distribution is created for: the investors' parts as rounded, so they add up exactly.
      totalAmount: round2(investors.reduce((sum, investor) => sum + investor.amount, 0)),
      kind: net < 0 ? 'LOSS' : outcome.distributableNet <= 0 ? 'ABSORBED' : 'PROFIT',
      investors, funds: await this.profitFunds(pool),
      problems: [
        ...(!DISTRIBUTABLE_POOL_STATUSES.includes(pool.status) ? ['The pool must be full or closed before profit is shared.'] : []),
        ...(!capital.size ? ['No investor has settled capital in this pool.'] : []),
        ...(duplicate ? ['A result already exists for this period.'] : []),
        ...(investors.some((investor) => investor.issue) && outcome.distributableNet > 0 ? ['Some investors have no verified payout account yet.'] : []),
      ],
    };
  }

  /**
   * Records project income received into the trust account for a pool: the money profit is paid from.
   * The Settlement Officer, who sees the bank statement, records it with the bank's reference.
   */
  async recordPoolIncome(actor: AuthenticatedUser, input: PoolIncomeDto) {
    if (!OPERATORS.has(actor.role)) throw new ForbiddenException('Only settlement operators record income received.');
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: input.poolId }, select: { poolId: true, poolName: true, organisationId: true, countryNodeId: true, currency: true } });
    if (!pool) throw new NotFoundException('Pool not found.');
    assertSettlementScope(actor, pool, 'Pool');
    const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
    if (receivedAt > new Date()) throw new BadRequestException('The date received cannot be in the future.');
    const idempotencyKey = `pool-income:${pool.poolId}:${input.reference.toUpperCase()}`;
    if (await this.prisma.ledgerTransaction.findUnique({ where: { idempotencyKey }, select: { id: true } })) throw new ConflictException(`Income with reference ${input.reference} is already recorded for this pool.`);
    const books = postingOnBehalfOf(actor, pool);
    const [cash, income] = await Promise.all([this.ledger.ensureAccount(books, poolCashAccount(pool)), this.ledger.ensureAccount(books, poolIncomeAccount(pool))]);
    const posted = await this.ledger.post(books, {
      transactionType: 'POOL_INCOME', referenceType: 'WealthPool', referenceId: pool.poolId, currency: pool.currency, idempotencyKey,
      description: `Project income received ${receivedAt.toISOString().slice(0, 10)}, ref ${input.reference}${input.note ? `: ${input.note}` : ''}`,
      entries: [{ accountId: cash.id, direction: 'DEBIT', amount: input.amount, description: 'Project income into the trust account' }, { accountId: income.id, direction: 'CREDIT', amount: input.amount, description: 'Pool income' }],
    });
    await this.audit.recordActor(actor, { action: 'distribution.pool_income', resourceType: 'WealthPool', resourceId: pool.poolId, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, metadata: { amount: input.amount, currency: pool.currency, reference: input.reference, receivedAt: receivedAt.toISOString(), ledgerTransactionId: posted.id } });
    return { poolId: pool.poolId, ledgerTransactionId: posted.id, ...(await this.profitFunds(pool)) };
  }

  /** Project income recorded for a pool, profit already paid out of it, and what is left to pay. */
  private async profitFunds(pool: { poolId: string; currency: string }) {
    const [credits, debits, paid] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({ where: { account: { accountCode: `POOL-${pool.poolId}-INCOME-${pool.currency}` }, direction: 'CREDIT' }, _sum: { amount: true } }),
      this.prisma.ledgerEntry.aggregate({ where: { account: { accountCode: `POOL-${pool.poolId}-INCOME-${pool.currency}` }, direction: 'DEBIT' }, _sum: { amount: true } }),
      this.prisma.distribution.aggregate({ where: { poolId: pool.poolId, kind: 'PROFIT', status: { in: PAID_OUT_STATUSES } }, _sum: { totalAmount: true } }),
    ]);
    const income = round2(Number(credits._sum.amount ?? 0) - Number(debits._sum.amount ?? 0));
    const paidOut = round2(Number(paid._sum.totalAmount ?? 0));
    return { incomeRecorded: income, profitPaidOut: paidOut, available: round2(income - paidOut) };
  }

  private async get(actor: AuthenticatedUser, id: string) {
    const distribution = await this.prisma.distribution.findUnique({ where: { id }, include: { allocations: { include: { destination: true } }, approvals: true } });
    if (!distribution) throw new NotFoundException('Distribution not found.');
    assertSettlementScope(actor, distribution, 'Distribution');
    return distribution;
  }

  private async getPayout(actor: AuthenticatedUser, id: string) {
    const payout = await this.prisma.payoutInstruction.findUnique({ where: { id }, include: { allocation: { include: { distribution: true } } } });
    if (!payout) throw new NotFoundException('Payout instruction not found.');
    assertSettlementScope(actor, payout.allocation.distribution, 'Payout instruction');
    if (!OPERATORS.has(actor.role)) throw new ForbiddenException('Only settlement operators can manage payouts.');
    return payout;
  }

  private async transition(actor: AuthenticatedUser, distribution: { id: string; status: string; version: number; organisationId: string; countryNodeId: string }, status: string, action: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.distribution.updateMany({ where: { id: distribution.id, status: distribution.status, version: distribution.version }, data: { status, version: { increment: 1 } } });
      if (!updated.count) throw new BadRequestException('Distribution changed concurrently.');
      await this.audit.recordActor(actor, { action, resourceType: 'Distribution', resourceId: distribution.id, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId }, tx);
      return tx.distribution.findUniqueOrThrow({ where: { id: distribution.id }, include: { allocations: true } });
    });
  }
}
