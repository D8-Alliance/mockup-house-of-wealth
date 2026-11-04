import { endOfDay, fundraisingOutcome, fundraisingWindowProblems } from './pool-fundraising';

describe('pool fundraising window', () => {
  it('refunds a pool below its minimum and closes one that reached it or has none', () => {
    expect(fundraisingOutcome(500000, 499999.99)).toBe('UNDERSUBSCRIBED');
    expect(fundraisingOutcome(500000, 500000)).toBe('CLOSED');
    expect(fundraisingOutcome(null, 0)).toBe('CLOSED');
  });

  it('checks the minimum and closing date given when the pool is created', () => {
    const now = new Date('2026-11-04T10:00:00Z');
    expect(fundraisingWindowProblems({ fundingRequired: 1000000, now })).toEqual([]);
    expect(fundraisingWindowProblems({ minimumRaise: 400000, closesAt: '2026-12-31', fundingRequired: 1000000, now })).toEqual([]);
    expect(fundraisingWindowProblems({ minimumRaise: 1200000, closesAt: '2026-12-31', fundingRequired: 1000000, now })).toEqual(['The minimum to raise cannot be more than the funding the project needs.']);
    expect(fundraisingWindowProblems({ minimumRaise: 400000, fundingRequired: 1000000, now })).toHaveLength(1);
    expect(fundraisingWindowProblems({ closesAt: '2026-11-03', fundingRequired: 1000000, now })).toEqual(['The closing date must be in the future.']);
    // The closing day itself still counts.
    expect(fundraisingWindowProblems({ closesAt: '2026-11-04', fundingRequired: 1000000, now })).toEqual([]);
    expect(endOfDay('2026-11-04').toISOString()).toBe('2026-11-04T23:59:59.999Z');
  });
});
