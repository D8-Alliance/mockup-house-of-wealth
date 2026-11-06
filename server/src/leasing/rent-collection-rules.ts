/**
 * Rent collection: a month's rent the tenant has not paid becomes a case for the owner's collection team, who send up
 * to three reminder letters and then hand the case to the owner's legal team. Paying closes the case. The default
 * timings follow Al Hidayah's process: the tenant has 7 days after the due date; then reminder 1 within 7 days,
 * reminder 2 within 14 days of it, reminder 3 within 7 days of that, and Legal 7 days after the last reminder.
 * No late charge is added: in an Ijarah that needs a Shariah decision first.
 */

/** What a person does for their organisation's leases, on top of their role. */
export const ORGANISATION_DUTIES = ['ACCOUNTS', 'SOA', 'COLLECTION', 'FIELD', 'LEGAL'] as const;
export type OrganisationDutyCode = (typeof ORGANISATION_DUTIES)[number];

export const COLLECTION_STAGES = ['OPEN', 'REMINDER_1', 'REMINDER_2', 'REMINDER_3', 'LEGAL', 'PAID', 'CLOSED'] as const;
export type CollectionStage = (typeof COLLECTION_STAGES)[number];
/** Stages in which the case is still being chased. */
export const ACTIVE_STAGES: CollectionStage[] = ['OPEN', 'REMINDER_1', 'REMINDER_2', 'REMINDER_3', 'LEGAL'];

/** Days after the due date before an unpaid month becomes a collection case. */
export const COLLECTION_GRACE_DAYS = 7;

/** The step after each stage and the days allowed for it: the reminder that follows, or the hand-over to Legal. */
export const NEXT_STEP: Partial<Record<CollectionStage, { stage: CollectionStage; days: number }>> = {
  OPEN: { stage: 'REMINDER_1', days: 7 },
  REMINDER_1: { stage: 'REMINDER_2', days: 14 },
  REMINDER_2: { stage: 'REMINDER_3', days: 7 },
  REMINDER_3: { stage: 'LEGAL', days: 7 },
};

export const REMINDER_NUMBER: Partial<Record<CollectionStage, 1 | 2 | 3>> = { REMINDER_1: 1, REMINDER_2: 2, REMINDER_3: 3 };

const DAY_MS = 24 * 60 * 60 * 1000;
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

/** Whether an unpaid month is now late enough to open a case. */
export function shouldOpenCase(dueDate: Date, today: Date): boolean {
  return today.getTime() >= addDays(dueDate, COLLECTION_GRACE_DAYS).getTime();
}

/** The reminder the team sends next from this stage, or null once the reminders are done. */
export function nextReminder(stage: CollectionStage): CollectionStage | null {
  const next = NEXT_STEP[stage]?.stage;
  return next && REMINDER_NUMBER[next] ? next : null;
}

/** When the step after `stage` is due, counted from when the stage was reached. */
export function actionDueAfter(stage: CollectionStage, reachedAt: Date): Date {
  const step = NEXT_STEP[stage];
  return step ? addDays(reachedAt, step.days) : reachedAt;
}

/** The date a reminder letter asks the tenant to pay by: when the following step would otherwise start. */
export function payBy(stage: CollectionStage, sentAt: Date): Date {
  return actionDueAfter(stage, sentAt);
}

export const FOLLOW_UP_CHANNELS = ['CALL', 'WHATSAPP', 'EMAIL', 'VISIT', 'MEETING', 'OTHER'] as const;
