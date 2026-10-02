import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { FinancialLedgerService } from '../financial/financial-ledger.service';
import { PrismaService } from '../prisma.service';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';
import { CreateDistributionDto } from './distribution.dto';

const OPERATORS = new Set(['Super Admin', 'Settlement Officer']);

@Injectable()
export class DistributionService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: FinancialLedgerService, private readonly audit: AuditService) {}

  async create(actor: AuthenticatedUser, input: CreateDistributionDto) {
    assertTenantScope(actor, input, 'Distribution');
    const project = await this.prisma.project.findUnique({ where: { projectId: input.projectId } });
    if (!project) throw new NotFoundException('Project not found.');
    assertTenantScope(actor, project, 'Project');
    let pool: { poolId: string; status: string; currency: string; organisationId: string; countryNodeId: string } | null = null;
    if (input.poolId) {
      pool = await this.prisma.wealthPool.findUnique({ where: { poolId: input.poolId }, select: { poolId: true, status: true, currency: true, organisationId: true, countryNodeId: true } });
      if (!pool) throw new NotFoundException('Pool not found.');
      assertTenantScope(actor, pool, 'Pool');
      if (!['FULL', 'CLOSED'].includes(pool.status)) throw new BadRequestException('Distributions require a full or closed pool.');
      if (pool.currency !== input.currency) throw new BadRequestException('Distribution currency does not match the pool.');
    }
    const duplicate = await this.prisma.distribution.findFirst({ where: { projectId: input.projectId, poolId: input.poolId, periodName: input.periodName, status: { not: 'CANCELLED' } } });
    if (duplicate) throw new BadRequestException('A distribution already exists for this period.');
    const contributions = input.poolId ? await this.prisma.investmentContribution.findMany({ where: { poolId: input.poolId, status: 'POSTED', currency: input.currency }, select: { investorUserId: true, amount: true } }) : [];
    const capitalByInvestor = new Map<string, number>();
    contributions.forEach((item) => capitalByInvestor.set(item.investorUserId, (capitalByInvestor.get(item.investorUserId) || 0) + Number(item.amount)));
    if (input.poolId && !capitalByInvestor.size) throw new BadRequestException('No settled investments are eligible for this distribution.');
    const grossRevenue = input.grossRevenue ?? input.totalAmount;
    const eligibleCosts = input.eligibleCosts ?? 0;
    const netProfit = Math.max(0, grossRevenue - eligibleCosts);
    const investorProfit = input.grossRevenue === undefined ? input.totalAmount : netProfit * ((input.investorProfitSharePercent ?? 80) / 100);
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
    const activeBeneficiaries = await this.prisma.userRoleAssignment.findMany({ where: { userId: { in: allocations.map((allocation) => allocation.beneficiaryUserId) }, organisationId: input.organisationId, countryNodeId: input.countryNodeId, isActive: true }, select: { userId: true }, distinct: ['userId'] });
    if (activeBeneficiaries.length !== allocations.length) throw new BadRequestException('Every beneficiary must belong to the active distribution tenant.');
    const destinations = await this.prisma.payoutDestination.findMany({ where: { id: { in: input.allocations.map((allocation) => allocation.destinationId) }, organisationId: input.organisationId, countryNodeId: input.countryNodeId, status: 'VERIFIED' } });
    const destinationById = new Map(destinations.map((destination) => [destination.id, destination]));
    for (const allocation of input.allocations) {
      const destination = destinationById.get(allocation.destinationId);
      if (!destination || destination.ownerUserId !== allocation.beneficiaryUserId || (destination.cooldownUntil && destination.cooldownUntil > new Date())) throw new BadRequestException(`Payout destination for ${allocation.beneficiaryUserId} is not verified or is still in its cooling-off period.`);
    }
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.distribution.create({ data: { projectId: input.projectId, poolId: input.poolId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, totalAmount: new Prisma.Decimal(input.totalAmount), currency: input.currency, periodName: input.periodName, grossRevenue: new Prisma.Decimal(grossRevenue), eligibleCosts: new Prisma.Decimal(eligibleCosts), netProfit: new Prisma.Decimal(netProfit), investorProfit: new Prisma.Decimal(investorProfit), status: 'CALCULATED', createdBy: actor.userId } });
      for (const allocation of allocations) await tx.distributionAllocation.create({ data: { distributionId: created.id, beneficiaryUserId: allocation.beneficiaryUserId, destinationId: input.allocations.find((item) => item.beneficiaryUserId === allocation.beneficiaryUserId)!.destinationId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(allocation.amount), currency: input.currency, status: 'PENDING' } });
      await this.audit.recordActor(actor, { action: 'distribution.calculated', resourceType: 'Distribution', resourceId: created.id, organisationId: created.organisationId, countryNodeId: created.countryNodeId, metadata: { projectId: input.projectId, poolId: input.poolId, totalAmount: input.totalAmount, allocationCount: allocations.length, periodName: input.periodName, grossRevenue, eligibleCosts, netProfit, investorProfit } }, tx);
      return tx.distribution.findUniqueOrThrow({ where: { id: created.id }, include: { allocations: true } });
    });
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
    const source = await this.ledger.ensureAccount(actor, { accountCode: `POOL-${distribution.poolId || distribution.projectId}-CASH-${distribution.currency}`, accountType: 'ASSET', ownerType: distribution.poolId ? 'POOL' : 'PROJECT', ownerId: distribution.poolId || distribution.projectId, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, currency: distribution.currency });
    const sourceBalance = await this.ledger.getBalance(actor, source.id);
    if (sourceBalance.balance + 0.005 < Number(distribution.totalAmount)) throw new BadRequestException('Distribution exceeds the available pool balance.');
    const allocations = distribution.allocations;
    const beneficiaries = await Promise.all(allocations.map((allocation) => this.ledger.ensureAccount(actor, { accountCode: `USER-${allocation.beneficiaryUserId}-CASH-${distribution.currency}`, accountType: 'ASSET', ownerType: 'USER', ownerId: allocation.beneficiaryUserId, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, currency: distribution.currency })));
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.distribution.updateMany({ where: { id, status: 'APPROVED', version: distribution.version }, data: { status: 'PROCESSING', processedAt: new Date(), version: { increment: 1 } } });
      if (!claimed.count) throw new BadRequestException('Distribution changed concurrently.');
      for (let index = 0; index < allocations.length; index += 1) {
        const allocation = allocations[index];
        const ledger = await this.ledger.postInTransaction(tx, actor, { transactionType: 'DISTRIBUTION', referenceType: 'DistributionAllocation', referenceId: allocation.id, currency: distribution.currency, description: `${distribution.periodName} distribution`, idempotencyKey: `distribution:${distribution.id}:${allocation.id}`, entries: [{ accountId: beneficiaries[index].id, direction: 'DEBIT', amount: Number(allocation.amount), description: 'Beneficiary distribution' }, { accountId: source.id, direction: 'CREDIT', amount: Number(allocation.amount), description: 'Pool distribution' }] });
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
    return this.prisma.$transaction(async (tx) => {
      await tx.payoutInstruction.update({ where: { id: payoutId }, data: { status: 'SETTLED', settledAt: new Date() } });
      await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'SETTLED' } });
      const pending = await tx.payoutInstruction.count({ where: { allocation: { distributionId: payout.allocation.distributionId }, status: { not: 'SETTLED' } } });
      const distribution = pending === 0 ? await tx.distribution.update({ where: { id: payout.allocation.distributionId }, data: { status: 'SETTLED', settledAt: new Date(), version: { increment: 1 } } }) : await tx.distribution.findUniqueOrThrow({ where: { id: payout.allocation.distributionId } });
      await this.audit.recordActor(actor, { action: 'payout.settle', resourceType: 'PayoutInstruction', resourceId: payoutId, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, metadata: { distributionId: distribution.id, distributionStatus: distribution.status } }, tx);
      return distribution;
    });
  }

  async failPayout(actor: AuthenticatedUser, payoutId: string, reason: string) {
    const payout = await this.getPayout(actor, payoutId);
    if (!reason.trim()) throw new BadRequestException('Payout failure reason is required.');
    if (!['QUEUED', 'SUBMITTED'].includes(payout.status)) throw new BadRequestException('Only queued or submitted payouts can fail.');
    return this.prisma.$transaction(async (tx) => {
      if (payout.allocation.ledgerTransactionId) await this.ledger.reverseInTransaction(tx, actor, payout.allocation.ledgerTransactionId, `payout-failure-reversal:${payoutId}`, `Payout failure reversal for ${payoutId}`);
      await tx.payoutInstruction.update({ where: { id: payoutId }, data: { status: 'FAILED', failureReason: reason } });
      await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'FAILED' } });
      const distribution = await tx.distribution.update({ where: { id: payout.allocation.distributionId }, data: { status: 'FAILED', version: { increment: 1 } } });
      await this.audit.recordActor(actor, { action: 'payout.fail', resourceType: 'PayoutInstruction', resourceId: payoutId, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, metadata: { reason } }, tx);
      return distribution;
    });
  }

  async retryPayout(actor: AuthenticatedUser, payoutId: string) {
    const payout = await this.getPayout(actor, payoutId);
    if (payout.status !== 'FAILED') throw new BadRequestException('Only failed payouts can be retried.');
    return this.prisma.$transaction(async (tx) => {
      await tx.payoutInstruction.update({ where: { id: payoutId }, data: { status: 'QUEUED', providerReference: null, failureReason: null, submittedAt: null } });
      await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'QUEUED' } });
      const distribution = await tx.distribution.update({ where: { id: payout.allocation.distributionId }, data: { status: 'PROCESSING', version: { increment: 1 } } });
      await this.audit.recordActor(actor, { action: 'payout.retry', resourceType: 'PayoutInstruction', resourceId: payoutId, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId }, tx);
      return tx.payoutInstruction.findUniqueOrThrow({ where: { id: payoutId } });
    });
  }

  async reversePayout(actor: AuthenticatedUser, payoutId: string, reason: string) {
    const payout = await this.getPayout(actor, payoutId);
    if (payout.status !== 'SETTLED') throw new BadRequestException('Only settled payouts can be reversed.');
    if (!reason.trim()) throw new BadRequestException('Payout reversal reason is required.');
    return this.prisma.$transaction(async (tx) => {
      if (payout.allocation.ledgerTransactionId) await this.ledger.reverseInTransaction(tx, actor, payout.allocation.ledgerTransactionId, `payout-reversal:${payoutId}`, `Payout reversal for ${payoutId}`);
      await tx.payoutInstruction.update({ where: { id: payoutId }, data: { status: 'REVERSED', failureReason: reason } });
      await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'REVERSED' } });
      const distribution = await tx.distribution.update({ where: { id: payout.allocation.distributionId }, data: { status: 'PARTIALLY_SETTLED', version: { increment: 1 } } });
      await this.audit.recordActor(actor, { action: 'payout.reverse', resourceType: 'PayoutInstruction', resourceId: payoutId, organisationId: distribution.organisationId, countryNodeId: distribution.countryNodeId, metadata: { reason } }, tx);
      return distribution;
    });
  }

  async reconcilePayouts(actor: AuthenticatedUser) {
    if (!OPERATORS.has(actor.role)) throw new ForbiddenException('Only settlement operators can reconcile payouts.');
    const payouts = await this.prisma.payoutInstruction.findMany({ where: { status: { in: ['SUBMITTED', 'FAILED'] }, allocation: { distribution: tenantScopeFilter(actor) } }, include: { allocation: { include: { distribution: true } } }, orderBy: { createdAt: 'asc' }, take: 500 });
    return { inspected: payouts.length, payouts: payouts.map((payout) => ({ id: payout.id, status: payout.status, provider: payout.provider, providerReference: payout.providerReference, amount: payout.amount, currency: payout.currency, distributionId: payout.allocation.distributionId, createdAt: payout.createdAt })) };
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
      if (status === 'FAILED') {
        if (payout.allocation.ledgerTransactionId) await this.ledger.reverseInTransaction(tx, systemActor, payout.allocation.ledgerTransactionId, `payout-webhook-failure:${payoutId}`, `Provider payout failure reversal for ${payoutId}`);
        await tx.payoutInstruction.update({ where: { id: payoutId }, data: { status: 'FAILED', failureReason: String(payload.reason || 'Provider reported payout failure.') } });
        await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'FAILED' } });
      } else if (status === 'SETTLED') {
        await tx.payoutInstruction.update({ where: { id: payoutId }, data: { status: 'SETTLED', providerReference: providerReference || payout.providerReference, settledAt: new Date() } });
        await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'SETTLED' } });
      } else if (status === 'SUBMITTED') {
        await tx.payoutInstruction.update({ where: { id: payoutId }, data: { status: 'SUBMITTED', providerReference: providerReference || payout.providerReference, submittedAt: new Date() } });
        await tx.distributionAllocation.update({ where: { id: payout.allocationId }, data: { status: 'SUBMITTED' } });
      }
      await tx.payoutProviderEvent.update({ where: { provider_providerEventId: { provider, providerEventId: eventId } }, data: { processedAt: new Date() } });
      await this.audit.recordActor(systemActor, { action: `payout.webhook.${status.toLowerCase()}`, resourceType: 'PayoutInstruction', resourceId: payoutId, organisationId: payout.allocation.distribution.organisationId, countryNodeId: payout.allocation.distribution.countryNodeId, metadata: { provider, eventId, eventType, providerReference: providerReference || null } }, tx);
      return { idempotent: false, status, payoutId };
    });
  }

  list(actor: AuthenticatedUser) {
    return this.prisma.distribution.findMany({ where: tenantScopeFilter(actor), orderBy: { createdAt: 'desc' }, include: { allocations: { include: { payoutInstruction: true } }, approvals: true }, take: 100 });
  }

  private async get(actor: AuthenticatedUser, id: string) {
    const distribution = await this.prisma.distribution.findUnique({ where: { id }, include: { allocations: { include: { destination: true } }, approvals: true } });
    if (!distribution) throw new NotFoundException('Distribution not found.');
    assertTenantScope(actor, distribution, 'Distribution');
    return distribution;
  }

  private async getPayout(actor: AuthenticatedUser, id: string) {
    const payout = await this.prisma.payoutInstruction.findUnique({ where: { id }, include: { allocation: { include: { distribution: true } } } });
    if (!payout) throw new NotFoundException('Payout instruction not found.');
    assertTenantScope(actor, payout.allocation.distribution, 'Payout instruction');
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
