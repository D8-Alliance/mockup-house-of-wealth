import { BadRequestException } from '@nestjs/common';
import { quarterEnded, quarterRange } from './performance-reports.service';

describe('performance report quarters', () => {
  it('spans the three months of the quarter', () => {
    expect(quarterRange(2026, 3)).toEqual({ from: new Date('2026-07-01T00:00:00Z'), to: new Date('2026-10-01T00:00:00Z') });
    expect(quarterRange(2026, 4).to).toEqual(new Date('2027-01-01T00:00:00Z'));
  });

  it('refuses a quarter outside 1 to 4', () => {
    expect(() => quarterRange(2026, 5)).toThrow(BadRequestException);
    expect(() => quarterRange(2026, 0)).toThrow(BadRequestException);
  });

  it('allows reporting only once the quarter has ended', () => {
    const now = new Date('2026-11-03T00:00:00Z');
    expect(quarterEnded(2026, 3, now)).toBe(true);
    expect(quarterEnded(2026, 4, now)).toBe(false);
  });
});
