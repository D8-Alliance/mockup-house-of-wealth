import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { formatAmount, NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma.service';
import { fundraisingOutcome, RAISING_POOL_STATUSES } from './pool-fundraising';

const INTERVAL_MS = 24 * 3600_000;

/**
 * Ends fundraising for pools past their closing date (see pool-fundraising.ts). Unpaid orders are cancelled
 * either way. Below the minimum, the pool becomes UNDERSUBSCRIBED and each settled order REFUND_DUE, for
 * Finance to return in full (InvestmentsService.refund); otherwise the pool is CLOSED to new investment.
 */
@Injectable()
export class PoolFundraisingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PoolFundraisingService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, @Optional() private readonly notifications?: NotificationService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref();
    setTimeout(() => void this.tick(), 150_000).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    try {
      const ended = await this.endDue();
      if (ended) this.logger.log(`Pool fundraising ended: ${ended}`);
    } catch (error) {
      this.logger.warn(`Pool closing check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async endDue(now = new Date()) {
    const pools = await this.prisma.wealthPool.findMany({
      where: { status: { in: RAISING_POOL_STATUSES }, closesAt: { lte: now }, fundraisingEndedAt: null },
      select: { poolId: true, poolName: true, currency: true, minimumRaise: true, closesAt: true, organisationId: true, countryNodeId: true, project: { select: { projectSponsorId: true } } },
    });
    for (const pool of pools) await this.end(pool, now);
    return pools.length;
  }

  private async end(pool: { poolId: string; poolName: string; currency: string; minimumRaise: unknown; organisationId: string; countryNodeId: string; project: { projectSponsorId: string } }, now: Date) {
    const minimum = pool.minimumRaise === null ? null : Number(pool.minimumRaise);
    const result = await this.prisma.$transaction(async (tx) => {
      const raised = Number((await tx.investmentContribution.aggregate({ where: { poolId: pool.poolId, status: 'POSTED' }, _sum: { amount: true } }))._sum.amount ?? 0);
      const outcome = fundraisingOutcome(minimum, raised);
      const claimed = await tx.wealthPool.updateMany({ where: { poolId: pool.poolId, status: { in: RAISING_POOL_STATUSES }, fundraisingEndedAt: null }, data: { status: outcome, fundraisingEndedAt: now } });
      if (!claimed.count) return null;
      const pending = await tx.investmentOrder.findMany({ where: { poolId: pool.poolId, status: 'PENDING' }, select: { investorUserId: true } });
      await tx.investmentOrder.updateMany({ where: { poolId: pool.poolId, status: 'PENDING' }, data: { status: 'CANCELLED', cancelledAt: now } });
      const refunds = outcome === 'UNDERSUBSCRIBED' ? await tx.investmentOrder.findMany({ where: { poolId: pool.poolId, status: 'SETTLED' }, select: { investorUserId: true } }) : [];
      if (refunds.length) await tx.investmentOrder.updateMany({ where: { poolId: pool.poolId, status: 'SETTLED' }, data: { status: 'REFUND_DUE' } });
      await this.audit.record({ userId: 'SYSTEM', action: outcome === 'UNDERSUBSCRIBED' ? 'pool.undersubscribed' : 'pool.fundraising_closed', resourceType: 'WealthPool', resourceId: pool.poolId, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, metadata: { raised, minimumRaise: minimum, pendingCancelled: pending.length, refundsDue: refunds.length } }, tx);
      return { outcome, raised, pending: pending.map((order) => order.investorUserId), refunds: refunds.map((order) => order.investorUserId) };
    });
    if (!result || !this.notifications) return;
    const raisedText = formatAmount(result.raised, pool.currency);
    const key = `pool-fundraising-ended:${pool.poolId}`;
    if (result.outcome === 'UNDERSUBSCRIBED') {
      const minimumText = formatAmount(minimum ?? 0, pool.currency);
      await this.notifications.notifyUsers(result.refunds, { type: 'INVESTMENT', title: 'Pool did not reach its minimum', message: `${pool.poolName} raised ${raisedText}, below its minimum of ${minimumText}, so it will not go ahead. Finance will return your money in full to your bank account; you will be told when it is sent.`, resourceType: 'WealthPool', resourceId: pool.poolId, dedupeKey: `${key}:refund` });
      await this.notifications.notifyRoles(['Settlement_Officer', 'Finance_Officer'], { countryNodeId: pool.countryNodeId }, { type: 'SETTLEMENT', title: 'Refunds to make', message: `${pool.poolName} missed its minimum (${raisedText} of ${minimumText}). Return each investor's money and record the bank reference under Refunds (Admin Center › Settlement Clearing, or Financials › Profit distribution).`, resourceType: 'WealthPool', resourceId: pool.poolId, dedupeKey: `${key}:finance` });
      await this.notifications.notifyUsers([pool.project.projectSponsorId], { type: 'PROJECT', title: 'Pool did not reach its minimum', message: `${pool.poolName} raised ${raisedText}, below its minimum of ${minimumText}. Investors are being refunded.`, resourceType: 'WealthPool', resourceId: pool.poolId, dedupeKey: `${key}:sponsor` });
    } else {
      await this.notifications.notifyUsers([pool.project.projectSponsorId], { type: 'PROJECT', title: 'Pool closed', message: `${pool.poolName} reached its closing date with ${raisedText} raised and no longer takes investment.`, resourceType: 'WealthPool', resourceId: pool.poolId, dedupeKey: `${key}:sponsor` });
    }
    await this.notifications.notifyUsers(result.pending, { type: 'INVESTMENT', title: 'Unpaid order cancelled', message: `${pool.poolName} closed before your transfer was confirmed, so your order was cancelled. Do not transfer for it; if you already did, contact support for a refund.`, resourceType: 'WealthPool', resourceId: pool.poolId, dedupeKey: `${key}:pending` });
  }
}
