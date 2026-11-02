/**
 * Whether a paid membership is due its expiry reminder. Renewal is manual (a ToyyibPay bill is a
 * one-off payment), so members are reminded once, a week before the period ends. Sending it only
 * once is the outbox's job (its dedupe key includes the period end).
 */
const DAY_MS = 24 * 60 * 60 * 1000;
export const REMINDER_DAYS_BEFORE = 7;

export function membershipReminderDue(periodEnd: Date, now: Date): boolean {
  const msLeft = periodEnd.getTime() - now.getTime();
  return msLeft > 0 && msLeft <= REMINDER_DAYS_BEFORE * DAY_MS;
}
