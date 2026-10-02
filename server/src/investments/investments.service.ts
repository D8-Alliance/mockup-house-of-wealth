import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { FinancialLedgerService } from '../financial/financial-ledger.service';
import { PrismaService } from '../prisma.service';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';
import { CreateInvestmentOrderDto } from './investments.dto';

const SETTLEMENT_ROLES = new Set(['Super Admin', 'Settlement Officer', 'Portfolio Manager']);

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: FinancialLedgerService, private readonly audit: AuditService) {}

  async createOrder(actor: AuthenticatedUser, input: CreateInvestmentOrderDto) {
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: input.poolId }, include: { project: { select: { projectId: true, fundingRequired: true } } } });
    if (!pool) throw new NotFoundException('Pool not found.');
    assertTenantScope(actor, pool, 'Pool');
    if (pool.status !== 'OPEN') throw new BadRequestException('Only OPEN pools accept investment orders.');
    if (pool.currency.toUpperCase() !== input.currency.toUpperCase()) throw new BadRequestException('Investment currency does not match the pool currency.');
    const existing = await this.prisma.investmentOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      assertTenantScope(actor, existing, 'Investment order');
      if (existing.investorUserId !== actor.userId) throw new ForbiddenException('Investment order belongs to another investor.');
      return existing;
    }
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.investmentOrder.create({ data: { orderNumber: `HOW-INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, poolId: pool.poolId, projectId: pool.projectId, investorUserId: actor.userId, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency.toUpperCase(), status: 'PENDING', idempotencyKey: input.idempotencyKey } });
      await this.audit.recordActor(actor, { action: 'investment.order.create', resourceType: 'InvestmentOrder', resourceId: created.id, organisationId: created.organisationId, countryNodeId: created.countryNodeId, metadata: { poolId: created.poolId, amount: input.amount, currency: created.currency } }, tx);
      return created;
    });
    return order;
  }

  listOrders(actor: AuthenticatedUser) {
    return this.prisma.investmentOrder.findMany({ where: tenantScopeFilter(actor), orderBy: { createdAt: 'desc' }, include: { contribution: true }, take: 100 });
  }

  async getOrder(actor: AuthenticatedUser, id: string) {
    const order = await this.prisma.investmentOrder.findUnique({ where: { id }, include: { contribution: true, pool: true } });
    if (!order) throw new NotFoundException('Investment order not found.');
    assertTenantScope(actor, order, 'Investment order');
    if (order.investorUserId !== actor.userId && !SETTLEMENT_ROLES.has(actor.role)) throw new ForbiddenException('Investment order is not owned by this investor.');
    return order;
  }

  async settle(actor: AuthenticatedUser, id: string) {
    const order = await this.getOrder(actor, id);
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
