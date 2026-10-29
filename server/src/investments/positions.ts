/**
 * An investor's holding in each pool, worked out from their orders and the profit allocated to
 * them. Capital is what Finance has confirmed (settled orders); orders still waiting for that
 * confirmation are shown apart and earn nothing. Profit counts once its distribution is approved,
 * and is paid once the bank payout for it has settled.
 */

/** Distribution statuses whose allocations the investor has earned. */
export const EARNED_DISTRIBUTION_STATUSES = ['APPROVED', 'PROCESSING', 'PARTIALLY_SETTLED', 'SETTLED'];

export interface PositionOrder {
  poolId: string;
  amount: number;
  status: string;
  settledAt: Date | null;
  createdAt: Date;
  /** The investor profit share (%) of the akad terms accepted with this order. */
  investorProfitSharePct: number | null;
  pool: { poolName: string; status: string; currency: string; investmentStructure: string; indicativeExpectedReturn: number; projectName: string };
}

export interface PositionAllocation {
  poolId: string;
  amount: number;
  paid: boolean;
}

export interface InvestorPosition {
  poolId: string;
  poolName: string;
  projectName: string;
  poolStatus: string;
  contract: string;
  currency: string;
  indicativeExpectedReturn: number;
  investorProfitSharePct: number | null;
  capital: number;
  pendingAmount: number;
  /** The investor's settled capital as a percentage of all settled capital in the pool. */
  poolSharePct: number;
  profitEarned: number;
  profitPaid: number;
  /** Profit earned against capital, in percent. */
  returnPct: number;
  firstInvestedAt: string | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function buildPositions(orders: PositionOrder[], poolCapital: Map<string, number>, allocations: PositionAllocation[]): InvestorPosition[] {
  const byPool = new Map<string, PositionOrder[]>();
  for (const order of orders) byPool.set(order.poolId, [...(byPool.get(order.poolId) ?? []), order]);

  return [...byPool.entries()].map(([poolId, poolOrders]) => {
    const settled = poolOrders.filter((order) => order.status === 'SETTLED');
    const capital = round2(settled.reduce((sum, order) => sum + order.amount, 0));
    const pendingAmount = round2(poolOrders.filter((order) => order.status === 'PENDING').reduce((sum, order) => sum + order.amount, 0));
    const mine = allocations.filter((allocation) => allocation.poolId === poolId);
    const profitEarned = round2(mine.reduce((sum, allocation) => sum + allocation.amount, 0));
    const profitPaid = round2(mine.filter((allocation) => allocation.paid).reduce((sum, allocation) => sum + allocation.amount, 0));
    const total = poolCapital.get(poolId) ?? 0;
    const first = settled.map((order) => order.settledAt ?? order.createdAt).sort((a, b) => a.getTime() - b.getTime())[0];
    // The terms of the latest order are the ones now in force for this investor.
    const latest = [...poolOrders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    const { pool } = latest;
    return {
      poolId,
      poolName: pool.poolName,
      projectName: pool.projectName,
      poolStatus: pool.status,
      contract: pool.investmentStructure,
      currency: pool.currency,
      indicativeExpectedReturn: pool.indicativeExpectedReturn,
      investorProfitSharePct: latest.investorProfitSharePct,
      capital,
      pendingAmount,
      poolSharePct: total > 0 ? round2((capital / total) * 100) : 0,
      profitEarned,
      profitPaid,
      returnPct: capital > 0 ? round2((profitEarned / capital) * 100) : 0,
      firstInvestedAt: first ? first.toISOString() : null,
    };
  }).sort((a, b) => b.capital - a.capital);
}
