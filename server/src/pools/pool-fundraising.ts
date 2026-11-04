/**
 * A pool's fundraising window: an optional minimum it must raise and a closing date. At the closing date a
 * pool that reached its minimum (or has none) stops taking investment; one below it is UNDERSUBSCRIBED and
 * every investor is refunded in full, since the money was never put to work.
 */

/** Statuses in which a pool is still raising money. */
export const RAISING_POOL_STATUSES = ['OPEN', 'PAUSED'];

export type FundraisingOutcome = 'CLOSED' | 'UNDERSUBSCRIBED';

export function fundraisingOutcome(minimumRaise: number | null, raised: number): FundraisingOutcome {
  return minimumRaise !== null && raised < minimumRaise ? 'UNDERSUBSCRIBED' : 'CLOSED';
}

/** Problems with a minimum and closing date set when the pool is created; empty when they are fine. */
export function fundraisingWindowProblems(input: { minimumRaise?: number; closesAt?: string; fundingRequired: number; now?: Date }): string[] {
  const problems: string[] = [];
  if (input.minimumRaise !== undefined && input.minimumRaise > input.fundingRequired) problems.push('The minimum to raise cannot be more than the funding the project needs.');
  if (input.minimumRaise !== undefined && !input.closesAt) problems.push('Give a closing date with the minimum: the minimum is checked on that date.');
  if (input.closesAt) {
    const closes = endOfDay(input.closesAt);
    if (Number.isNaN(closes.getTime())) problems.push('The closing date is not a valid date.');
    else if (closes <= (input.now ?? new Date())) problems.push('The closing date must be in the future.');
  }
  return problems;
}

/** A closing date means the whole day: investment is taken until 23:59:59 UTC of that date. */
export function endOfDay(date: string): Date {
  return new Date(`${date.slice(0, 10)}T23:59:59.999Z`);
}
