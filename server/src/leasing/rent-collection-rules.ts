/**
 * Rent collection: a month's rent the tenant has not paid becomes a case for the owner's collection team, who send up
 * to three reminder letters and then hand the case to the owner's legal team. Paying closes the case. The default
 * timings follow Al Hidayah's process: the tenant has 7 days after the due date; then reminder 1 within 7 days,
 * reminder 2 within 14 days of it, reminder 3 within 7 days of that, and Legal 7 days after the last reminder.
 * Each owner organisation may set its own timings (RentCollectionSettings); these are the defaults.
 * No late charge is added: in an Ijarah that needs a Shariah decision first.
 */

/** What a person does for their organisation's leases, on top of their role. */
export const ORGANISATION_DUTIES = ['ACCOUNTS', 'SOA', 'COLLECTION', 'FIELD', 'LEGAL'] as const;
export type OrganisationDutyCode = (typeof ORGANISATION_DUTIES)[number];

export const COLLECTION_STAGES = ['OPEN', 'REMINDER_1', 'REMINDER_2', 'REMINDER_3', 'LEGAL', 'PAID', 'CLOSED'] as const;
export type CollectionStage = (typeof COLLECTION_STAGES)[number];
/** Stages in which the case is still being chased. */
export const ACTIVE_STAGES: CollectionStage[] = ['OPEN', 'REMINDER_1', 'REMINDER_2', 'REMINDER_3', 'LEGAL'];

/** The days an owner allows at each step: before a case opens, then for reminder 1, 2 and 3, and before Legal. */
export interface CollectionTimings { graceDays: number; reminder1Days: number; reminder2Days: number; reminder3Days: number; legalDays: number }
export const TIMING_KEYS = ['graceDays', 'reminder1Days', 'reminder2Days', 'reminder3Days', 'legalDays'] as const;
export const DEFAULT_TIMINGS: CollectionTimings = { graceDays: 7, reminder1Days: 7, reminder2Days: 14, reminder3Days: 7, legalDays: 7 };
/** The range of days an owner may choose for each timing. */
export const TIMING_LIMITS = { min: 1, max: 90 } as const;

/** The step after each stage and which timing gives its days: the reminder that follows, or the hand-over to Legal. */
export const NEXT_STEP: Partial<Record<CollectionStage, { stage: CollectionStage; timing: keyof CollectionTimings }>> = {
  OPEN: { stage: 'REMINDER_1', timing: 'reminder1Days' },
  REMINDER_1: { stage: 'REMINDER_2', timing: 'reminder2Days' },
  REMINDER_2: { stage: 'REMINDER_3', timing: 'reminder3Days' },
  REMINDER_3: { stage: 'LEGAL', timing: 'legalDays' },
};

export const REMINDER_NUMBER: Partial<Record<CollectionStage, 1 | 2 | 3>> = { REMINDER_1: 1, REMINDER_2: 2, REMINDER_3: 3 };

/** The owner's saved timings, with the default for any missing or out of range. */
export function timingsFrom(saved?: Partial<Record<keyof CollectionTimings, number | null>> | null): CollectionTimings {
  const result = { ...DEFAULT_TIMINGS };
  for (const key of TIMING_KEYS) {
    const value = saved?.[key];
    if (typeof value === 'number' && Number.isInteger(value) && value >= TIMING_LIMITS.min && value <= TIMING_LIMITS.max) result[key] = value;
  }
  return result;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

/** Whether an unpaid month is now late enough to open a case. */
export function shouldOpenCase(dueDate: Date, today: Date, timings: CollectionTimings = DEFAULT_TIMINGS): boolean {
  return today.getTime() >= addDays(dueDate, timings.graceDays).getTime();
}

/** The reminder the team sends next from this stage, or null once the reminders are done. */
export function nextReminder(stage: CollectionStage): CollectionStage | null {
  const next = NEXT_STEP[stage]?.stage;
  return next && REMINDER_NUMBER[next] ? next : null;
}

/** When the step after `stage` is due, counted from when the stage was reached. */
export function actionDueAfter(stage: CollectionStage, reachedAt: Date, timings: CollectionTimings = DEFAULT_TIMINGS): Date {
  const step = NEXT_STEP[stage];
  return step ? addDays(reachedAt, timings[step.timing]) : reachedAt;
}

/** The date a reminder letter asks the tenant to pay by: when the following step would otherwise start. */
export function payBy(stage: CollectionStage, sentAt: Date, timings: CollectionTimings = DEFAULT_TIMINGS): Date {
  return actionDueAfter(stage, sentAt, timings);
}

export const FOLLOW_UP_CHANNELS = ['CALL', 'WHATSAPP', 'EMAIL', 'VISIT', 'MEETING', 'OTHER'] as const;

/** What a case chases, as the English notices name it: "rent", or "electricity bill", "water bill" and so on. */
export const collectionItem = (itemKind: string) => (itemKind === 'RENT' ? 'rent' : `${itemKind.toLowerCase()} bill`);
