/**
 * Loss offset for pools under a profit-sharing akad. Profit protects capital: losses
 * recorded in earlier periods are recovered from later profit before anything is shared
 * again, so investors are never paid "profit" while their capital is impaired. Pending
 * results count too (except rejected or cancelled ones), so profit is never over-distributed.
 *
 * Final reckoning (tanzid) at the end of the pool, and charging an unrecovered loss
 * against capital, are separate steps (PENDING_ACTIVITIES.md, item 11, phase D).
 */

export interface PriorResult {
  kind: string;
  netProfit: number;
  /** Net shared under the akad; null on rows from before offsetting existed (treated as fully shared). */
  distributableNet: number | null;
}

export interface PeriodOutcome {
  /** Losses not yet recovered from profit, before this period. */
  unrecoveredLoss: number;
  /** Part of this period's net used to recover earlier losses. */
  lossOffset: number;
  /** Net profit left to share under the akad ratio. */
  distributableNet: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function periodOutcome(prior: PriorResult[], thisNet: number): PeriodOutcome {
  const cumulativeNet = prior.reduce((sum, row) => sum + row.netProfit, 0);
  const shared = prior.filter((row) => row.kind === 'PROFIT').reduce((sum, row) => sum + (row.distributableNet ?? row.netProfit), 0);
  const unrecoveredLoss = round2(Math.max(0, shared - cumulativeNet));
  const lossOffset = round2(thisNet > 0 ? Math.min(thisNet, unrecoveredLoss) : 0);
  return { unrecoveredLoss, lossOffset, distributableNet: round2(Math.max(0, thisNet - unrecoveredLoss)) };
}
