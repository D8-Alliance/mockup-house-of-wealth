/** What stands against approving an agreement: failed text checks and serious gaps the AI scan found. */
export interface AgreementSignals { failed: string[]; highGaps: number }

/** The grounds on which approving an agreement needs a reason, kept with the decision. The server asks the same. */
export function agreementOverrideGrounds(canApprove: boolean, signals: AgreementSignals, aiRunId: string | null, note: string): string[] {
  if (!canApprove) return [];
  return [
    ...(signals.failed.length ? [`${signals.failed.length} text check${signals.failed.length > 1 ? 's' : ''} failed: ${signals.failed.join(', ')}`] : []),
    ...(aiRunId && signals.highGaps ? [`the AI scan found ${signals.highGaps} serious gap${signals.highGaps > 1 ? 's' : ''}`] : []),
    ...(/\b(cannot|can ?not|could not|should not|not) be approved\b|\btidak (boleh |dapat )?(di)?lulus/i.test(note) ? ['your note reads as a refusal'] : []),
  ];
}

export const overrideReasonMissing = (grounds: string[], reason: string) => grounds.length > 0 && reason.trim().length < 10;
