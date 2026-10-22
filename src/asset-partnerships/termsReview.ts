import { EngagementHistoryEntry } from '../services/apiClient';
import { AKAD_LABELS } from './partnershipLabels';
import type { EngagementDraft } from './EngagementTermsFields';

export interface TermsChange { label: string; from: string; to: string }

const money = (amount: number | undefined, currency = 'MYR') => {
  if (amount === undefined) return 'not stated';
  try { return new Intl.NumberFormat('en-MY', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); } catch { return `${currency} ${amount.toLocaleString()}`; }
};
const months = (start: string, end: string) => {
  const from = new Date(start);
  const to = new Date(end);
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + (to.getDate() - from.getDate() + 1) / 30;
};

/** What a counter-offer changes, field by field, so the sender sees exactly what they are about to send. */
export function draftChanges(before: EngagementDraft, after: EngagementDraft): TermsChange[] {
  const currency = after.terms.currency ?? 'MYR';
  const rows: Array<[string, string, string]> = [
    ['Akad', AKAD_LABELS[before.akad], AKAD_LABELS[after.akad]],
    ['Rent', money(before.terms.rentAmount, currency), money(after.terms.rentAmount, currency)],
    ['Rent paid', before.terms.rentFrequency ?? '-', after.terms.rentFrequency ?? '-'],
    ['Day-to-day upkeep by', before.terms.upkeepBy ?? '-', after.terms.upkeepBy ?? '-'],
    ['Agreed value of the asset', money(before.terms.contributionValue, currency), money(after.terms.contributionValue, currency)],
    ["Owner's profit share", before.terms.profitSharePct === undefined ? 'not stated' : `${before.terms.profitSharePct}%`, after.terms.profitSharePct === undefined ? 'not stated' : `${after.terms.profitSharePct}%`],
    ["Delivery partner's capital", money(before.terms.pdpContributionValue, currency), money(after.terms.pdpContributionValue, currency)],
    ['From', before.startDate, after.startDate],
    ['Until', before.endDate, after.endDate],
  ];
  const relevant = (label: string) => (after.akad === 'IJARAH' ? !['Agreed value of the asset', "Owner's profit share", "Delivery partner's capital"].includes(label) : !['Rent', 'Rent paid', 'Day-to-day upkeep by'].includes(label));
  return rows.filter(([label, from, to]) => from !== to && (label === 'Akad' || relevant(label))).map(([label, from, to]) => ({ label, from, to }));
}

/** Likely mistakes in the terms about to be sent. They do not block sending; they make the sender look twice. */
export function draftWarnings(draft: EngagementDraft, context: { assetValue?: number; flagged?: string[] }): string[] {
  const warnings: string[] = [];
  const { terms } = draft;
  const currency = terms.currency ?? 'MYR';
  const length = months(draft.startDate, draft.endDate);
  if (!(new Date(draft.endDate) > new Date(draft.startDate))) warnings.push('The end date is not after the start date.');
  if (draft.akad === 'MUSHARAKAH') {
    if (terms.pdpContributionValue === undefined) warnings.push("The delivery partner's capital is empty. It is needed before the offer can be accepted; enter 0 if it adds none.");
    if (context.assetValue && terms.contributionValue !== undefined && Math.abs(terms.contributionValue - context.assetValue) / context.assetValue > 0.2) {
      warnings.push(`The agreed value of the asset (${money(terms.contributionValue, currency)}) is far from its estimated value (${money(context.assetValue, currency)}). Did you mean to enter this as the delivery partner's capital?`);
    }
    const owner = terms.contributionValue ?? 0;
    const pdp = terms.pdpContributionValue;
    if (terms.profitSharePct !== undefined && pdp !== undefined && owner + pdp > 0) {
      const capital = Math.round((owner / (owner + pdp)) * 1000) / 10;
      if (Math.abs(terms.profitSharePct - capital) > 30) warnings.push(`The owner takes ${terms.profitSharePct}% of profit for ${capital}% of capital. That is allowed when both agree, but check it is not a typo.`);
    }
    if (length < 6) warnings.push(`The partnership runs about ${Math.max(0, Math.round(length))} months: short for a Musharakah.`);
  } else if (context.assetValue && terms.rentAmount) {
    const monthly = terms.rentFrequency === 'WHOLE_PERIOD' ? terms.rentAmount / Math.max(1, length) : terms.rentAmount;
    const yieldPct = (monthly * 12 / context.assetValue) * 100;
    if (yieldPct < 2 || yieldPct > 25) warnings.push(`A year's rent is about ${Math.round(yieldPct * 10) / 10}% of the asset's value: unusually ${yieldPct < 2 ? 'low' : 'high'}. Check the amount and whether it is monthly or for the whole period.`);
  }
  if (context.flagged?.length) warnings.push(`The reviewer's checks flagged: ${context.flagged.join('; ')}. Make sure these terms deal with them.`);
  return warnings;
}

/** What the last reviewer's checks failed or warned on, when the offer came back for changes. */
export function lastReviewFlags(history: EngagementHistoryEntry[]): string[] {
  const review = [...history].reverse().find((entry) => entry.party === 'REVIEW');
  return review?.checks ? [...review.checks.fail, ...review.checks.warn] : [];
}

/** A counter-offer the sender saved on this device without sending it. */
export interface SavedDraft { draft: EngagementDraft; note: string; savedAt: string }
const key = (engagementId: string) => `how.engagement-draft.${engagementId}`;
export const draftStore = {
  load(engagementId: string): SavedDraft | null {
    try { const raw = localStorage.getItem(key(engagementId)); return raw ? JSON.parse(raw) as SavedDraft : null; } catch { return null; }
  },
  save(engagementId: string, value: SavedDraft) {
    try { localStorage.setItem(key(engagementId), JSON.stringify(value)); return true; } catch { return false; }
  },
  clear(engagementId: string) {
    try { localStorage.removeItem(key(engagementId)); } catch { /* storage unavailable */ }
  },
};
