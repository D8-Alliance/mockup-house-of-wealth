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
