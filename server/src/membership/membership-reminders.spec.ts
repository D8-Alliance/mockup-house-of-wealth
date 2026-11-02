import { membershipReminderDue } from './membership-reminders';

const now = new Date('2026-11-02T09:00:00Z');
const inDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

describe('membership expiry reminder', () => {
  it('is due once the period has a week or less left', () => {
    expect(membershipReminderDue(inDays(7), now)).toBe(true);
    expect(membershipReminderDue(inDays(2), now)).toBe(true);
  });

  it('is not due earlier, or after the period has ended', () => {
    expect(membershipReminderDue(inDays(8), now)).toBe(false);
    expect(membershipReminderDue(inDays(-1), now)).toBe(false);
  });
});
