import { planProblems, splitHolding } from './estate-settlement';

describe('estate settlement', () => {
  it('splits capital to the cent, the last recipient taking the rounding difference', () => {
    const parts = splitHolding(1000, [{ userId: 'A', sharePct: 33.33 }, { userId: 'B', sharePct: 33.33 }, { userId: 'C', sharePct: 33.34 }]);
    expect(parts).toEqual([{ userId: 'A', amount: 333.3 }, { userId: 'B', amount: 333.3 }, { userId: 'C', amount: 333.4 }]);
    expect(parts.reduce((sum, part) => sum + part.amount, 0)).toBeCloseTo(1000, 2);
    expect(splitHolding(100, [{ userId: 'A', sharePct: 100 }])).toEqual([{ userId: 'A', amount: 100 }]);
  });

  it('accepts a plan that covers every pool held with shares adding up to 100%', () => {
    const plan = { note: '', holdings: [{ poolId: 'P1', recipients: [{ userId: 'A', sharePct: 87.5 }, { userId: 'B', sharePct: 12.5 }] }] };
    expect(planProblems(plan, ['P1'], 'DEAD')).toEqual([]);
  });

  it('refuses missing pools, wrong totals, duplicates and the deceased as recipient', () => {
    expect(planProblems({ note: '', holdings: [] }, ['P1'], 'DEAD')).toEqual(['Pool P1 is held but has no recipients.']);
    expect(planProblems({ note: '', holdings: [{ poolId: 'P1', recipients: [{ userId: 'A', sharePct: 90 }] }] }, ['P1'], 'DEAD')).toEqual(['Shares in pool P1 add up to 90%, not 100%.']);
    expect(planProblems({ note: '', holdings: [{ poolId: 'P1', recipients: [{ userId: 'A', sharePct: 50 }, { userId: 'A', sharePct: 50 }] }] }, ['P1'], 'DEAD')).toEqual(['A recipient appears twice in pool P1.']);
    expect(planProblems({ note: '', holdings: [{ poolId: 'P1', recipients: [{ userId: 'DEAD', sharePct: 100 }] }] }, ['P1'], 'DEAD')).toEqual(['The deceased cannot receive their own estate.']);
    expect(planProblems({ note: '', holdings: [{ poolId: 'P9', recipients: [{ userId: 'A', sharePct: 100 }] }] }, [], 'DEAD')).toEqual(['Pool P9 is not held by the deceased.']);
  });
});
