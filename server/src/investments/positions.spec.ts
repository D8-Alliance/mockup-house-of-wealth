import { buildPositions, PositionOrder } from './positions';

const pool = { poolName: 'Solar Pool', status: 'OPEN', currency: 'MYR', investmentStructure: 'Mudarabah', indicativeExpectedReturn: 8, projectName: 'Solar Farm' };
const order = (overrides: Partial<PositionOrder>): PositionOrder => ({
  poolId: 'POOL-1', amount: 1000, status: 'SETTLED', settledAt: new Date('2026-10-02'), createdAt: new Date('2026-10-01'), investorProfitSharePct: 70, pool, ...overrides,
});

describe('investor positions', () => {
  it('counts only settled orders as capital and keeps pending ones apart', () => {
    const [position] = buildPositions([order({}), order({ amount: 500, status: 'PENDING', settledAt: null })], new Map([['POOL-1', 4000]]), []);
    expect(position).toMatchObject({ capital: 1000, pendingAmount: 500, poolSharePct: 25, profitEarned: 0, returnPct: 0 });
  });

  it('splits profit earned from profit already paid out', () => {
    const [position] = buildPositions([order({})], new Map([['POOL-1', 1000]]), [
      { poolId: 'POOL-1', amount: 40, paid: true },
      { poolId: 'POOL-1', amount: 35.5, paid: false },
    ]);
    expect(position).toMatchObject({ profitEarned: 75.5, profitPaid: 40, returnPct: 7.55, poolSharePct: 100 });
  });

  it('gives one row per pool, largest holding first, with the latest accepted terms', () => {
    const rows = buildPositions([
      order({ poolId: 'POOL-1', amount: 200 }),
      order({ poolId: 'POOL-2', amount: 900, investorProfitSharePct: 60, createdAt: new Date('2026-10-05') }),
      order({ poolId: 'POOL-2', amount: 100, investorProfitSharePct: 65, createdAt: new Date('2026-10-09') }),
    ], new Map([['POOL-1', 200], ['POOL-2', 2000]]), []);
    expect(rows.map((row) => [row.poolId, row.capital, row.investorProfitSharePct])).toEqual([['POOL-2', 1000, 65], ['POOL-1', 200, 70]]);
  });
});
