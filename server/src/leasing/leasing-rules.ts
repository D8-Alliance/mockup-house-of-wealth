/** Whose move it is in a direct lease. */
export type LeaseParty = 'OWNER' | 'TENANT';

/** Leases still being negotiated or reviewed; a unit and tenant may have only one at a time. */
export const OPEN_LEASE_STATUSES = ['PROPOSED', 'ACCEPTED'];
/** Leases that hold the unit for their period. */
export const HOLDING_LEASE_STATUSES = ['ACCEPTED', 'APPROVED'];

export const otherLeaseParty = (party: LeaseParty): LeaseParty => (party === 'OWNER' ? 'TENANT' : 'OWNER');

const pad = (value: number) => String(value).padStart(2, '0');
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** The date `months` calendar months after `start`, kept on the same day or the month's last day (31 Jan + 1 = 28/29 Feb). */
export function addMonths(start: Date, months: number): Date {
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + months;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), last)));
}

/** The last day of a lease of `termMonths` from `start`: 1 Dec 2026 for 12 months ends 30 Nov 2027. */
export function leaseEndDate(start: Date, termMonths: number): Date {
  const next = addMonths(start, termMonths);
  return new Date(next.getTime() - 24 * 60 * 60 * 1000);
}

/** Whole months from start to end, counting the end date as the lease's last day. */
export function leaseTermMonths(start: Date, end: Date): number {
  let months = 0;
  while (months < 600 && leaseEndDate(start, months + 1) <= end) months += 1;
  return months;
}

export interface RentPeriod { period: string; dueDate: string; amount: number }

/** One row per month, due in advance on the lease's monthly anniversary; the period is named by its due month. */
export function rentSchedule(start: Date, termMonths: number, monthlyRent: number): RentPeriod[] {
  return Array.from({ length: termMonths }, (_, index) => {
    const due = addMonths(start, index);
    return { period: `${due.getUTCFullYear()}-${pad(due.getUTCMonth() + 1)}`, dueDate: isoDay(due), amount: monthlyRent };
  });
}

/** Security deposit from the months of rent the owner asks for, to the sen. */
export const depositFor = (monthlyRent: number, depositMonths: number) => Math.round(monthlyRent * depositMonths * 100) / 100;

/**
 * Business activities an Ijarah may not serve: the asset may not be rented out for what is haram.
 * A match is a flag for the Shariah reviewer, not a decision: "non-alcoholic" or "Islamic bank" also match.
 */
const PROHIBITED_ACTIVITIES: Array<{ label: string; pattern: RegExp }> = [
  { label: 'alcohol', pattern: /\b(alcohol|liquor|beer|wine|brewery|bar|pub|arak|minuman keras)\b/i },
  { label: 'gambling', pattern: /\b(gambling|casino|betting|lottery|judi|loteri|nombor ekor)\b/i },
  { label: 'conventional finance (riba)', pattern: /\b(conventional bank|moneylend\w*|pawn ?shop|ah long|pajak gadai|pinjaman wang|conventional insurance)\b/i },
  { label: 'pork', pattern: /\b(pork|babi|non-halal)\b/i },
  { label: 'adult entertainment', pattern: /\b(nightclub|night club|karaoke|massage parlou?r|adult entertainment|kelab malam|disco)\b/i },
  { label: 'tobacco', pattern: /\b(tobacco|cigarette|vape|rokok|tembakau)\b/i },
];

/** The prohibited activities the tenant's stated use or business may involve, for the Shariah reviewer to confirm. */
export function shariahFlags(...texts: string[]): string[] {
  const text = texts.join(' ');
  return PROHIBITED_ACTIVITIES.filter((item) => item.pattern.test(text)).map((item) => item.label);
}

/** The period's rent is overdue once its due date has passed without payment. */
export const isOverdue = (payment: { status: string; dueDate: Date }, today: Date) => payment.status === 'DUE' && isoDay(payment.dueDate) < isoDay(today);

const DAY_MS = 24 * 60 * 60 * 1000;
/** Whole days from today to a date, by calendar day (UTC): negative once it has passed. */
export const daysUntil = (date: Date, today: Date) => Math.round((Date.parse(isoDay(date)) - Date.parse(isoDay(today))) / DAY_MS);

/** Days after the due date at which an unpaid month is chased again; the owner is told too. */
export const OVERDUE_REMINDER_DAYS = [1, 7, 14, 30] as const;
/** Days before the end of a lease at which both sides are reminded to renew or hand back. */
export const ENDING_REMINDER_DAYS = [60, 30] as const;
/** The agreement gives the owner 30 days after the lease ends to refund the deposit. */
export const DEPOSIT_REFUND_DAYS = 30;

export type RentReminder = { stage: 'UPCOMING' | 'DUE_TODAY'; days: number } | { stage: 'OVERDUE'; days: number };

/**
 * The reminder a month's rent has reached: three days before it is due, on the day, then 1, 7, 14 and 30
 * days late. The nearest stage reached is sent, so a day the server was down only delays a reminder; the
 * outbox sends each stage once (its dedupe key names the stage).
 */
export function rentReminder(dueDate: Date, today: Date): RentReminder | null {
  const days = daysUntil(dueDate, today);
  if (days > 3) return null;
  if (days > 0) return { stage: 'UPCOMING', days };
  if (days === 0) return { stage: 'DUE_TODAY', days: 0 };
  const late = -days;
  const reached = [...OVERDUE_REMINDER_DAYS].reverse().find((threshold) => late >= threshold);
  return reached ? { stage: 'OVERDUE', days: reached } : null;
}

/** The ending reminder (60 or 30 days before) a running lease has reached, or null. */
export function endingReminder(endDate: Date, today: Date): number | null {
  const days = daysUntil(endDate, today);
  if (days < 0) return null;
  return [...ENDING_REMINDER_DAYS].reverse().find((threshold) => days <= threshold) ?? null;
}

/** The last day to refund the deposit: 30 days after the lease ended (early, or at its end date). */
export function depositRefundDueBy(lease: { endDate: Date; endedAt: Date | null }): Date {
  const ended = lease.endedAt && lease.endedAt < lease.endDate ? lease.endedAt : lease.endDate;
  return new Date(Date.parse(isoDay(ended)) + DEPOSIT_REFUND_DAYS * DAY_MS);
}

export type DepositKind = 'SECURITY' | 'UTILITY' | 'RENOVATION';
export interface DepositRefund { kind: DepositKind; amount: number; reference: string; paidAt: string; deductions: Array<{ reason: string; amount: number }> }

/** Each deposit of a lease and its amount; a deposit of 0 is not held. */
export const depositsOf = (lease: { depositAmount: number; utilityDepositAmount: number; renovationDepositAmount: number }): Record<DepositKind, number> => ({
  SECURITY: lease.depositAmount, UTILITY: lease.utilityDepositAmount, RENOVATION: lease.renovationDepositAmount,
});

/**
 * The deposits the owner can refund now: received, held (more than 0), not refunded yet. The security and utility
 * deposits once the lease is over; the renovation deposit at any time once the fit-out has been inspected.
 */
export function refundableDeposits(lease: { status: string; endDate: Date; received: boolean; amounts: Record<DepositKind, number>; refunds: DepositRefund[] }, today: Date): DepositKind[] {
  if (!lease.received || !['APPROVED', 'ENDED'].includes(lease.status)) return [];
  const over = lease.status === 'ENDED' || daysUntil(lease.endDate, today) < 0;
  return (['SECURITY', 'UTILITY', 'RENOVATION'] as DepositKind[]).filter((kind) => lease.amounts[kind] > 0 && !lease.refunds.some((refund) => refund.kind === kind) && (kind === 'RENOVATION' || over));
}

/** What is refunded after the deductions, and why a refund cannot be recorded as given. */
export function depositRefund(deposit: number, deductions: Array<{ reason: string; amount: number }>): { amount: number; problem: string | null } {
  const deducted = Math.round(deductions.reduce((total, item) => total + item.amount, 0) * 100) / 100;
  if (deductions.some((item) => item.amount <= 0 || item.reason.trim().length < 3)) return { amount: 0, problem: 'Give each deduction an amount and a reason.' };
  if (deducted > deposit) return { amount: 0, problem: 'The deductions cannot be more than the deposit.' };
  return { amount: Math.round((deposit - deducted) * 100) / 100, problem: null };
}

/** A deposit passed from a lease to the lease that renews it, per kind; `leaseId` is the lease on the other side. */
export interface DepositCarry { leaseId: string; at: string; amounts: Record<DepositKind, number> }
const sen = (value: number) => Math.round(value * 100) / 100;
export const depositTotal = (amounts: Record<DepositKind, number>) => sen(amounts.SECURITY + amounts.UTILITY + amounts.RENOVATION);

/** What the owner still holds of each deposit under this lease: not refunded, and not passed on to its renewal. */
export function heldDeposits(amounts: Record<DepositKind, number>, refunds: DepositRefund[], carriedOut: DepositCarry | null): Record<DepositKind, number> {
  const held = (kind: DepositKind) => (refunds.some((refund) => refund.kind === kind) ? 0 : sen(amounts[kind] - (carriedOut?.amounts[kind] ?? 0)));
  return { SECURITY: held('SECURITY'), UTILITY: held('UTILITY'), RENOVATION: held('RENOVATION') };
}

/** What passes to the renewal, kind by kind: what it needs, up to what is held. Anything more stays refundable under the earlier lease. */
export const depositCarryOver = (held: Record<DepositKind, number>, required: Record<DepositKind, number>): Record<DepositKind, number> => ({
  SECURITY: Math.min(held.SECURITY, required.SECURITY), UTILITY: Math.min(held.UTILITY, required.UTILITY), RENOVATION: Math.min(held.RENOVATION, required.RENOVATION),
});

/** The utility deposit a unit starts with where no state rule applies. */
export const DEFAULT_UTILITY_DEPOSIT_MONTHS = 1;
/** State names compare without regard to case or spacing: asset details are typed by hand. */
export const stateKey = (state: string) => state.trim().replace(/\s+/g, ' ').toLowerCase();
/** The months the state's rule sets, or the default. */
export function utilityDepositMonthsFor(state: string | null | undefined, rules: Array<{ state: string; months: number }>): number {
  const rule = state ? rules.find((item) => stateKey(item.state) === stateKey(state)) : undefined;
  return rule ? rule.months : DEFAULT_UTILITY_DEPOSIT_MONTHS;
}

/** Days the tenant has to pay a recharged utility bill, unless the owner gives a date. */
export const UTILITY_CHARGE_DAYS = 14;
/** A bill's due date when the owner gives none. */
export const utilityChargeDueDate = (today: Date) => new Date(Date.parse(isoDay(today)) + UTILITY_CHARGE_DAYS * DAY_MS);
