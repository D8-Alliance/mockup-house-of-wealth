/**
 * The rules an individual's estate instructions must keep, the same as the screen applies
 * (src/beneficiaries/estateRules.ts), so a request made outside the screen cannot break them.
 * Final distribution follows the Syariah court's faraid certificate, or probate or letters of
 * administration; these instructions guide the estate officer. Guidance pending Shariah and legal review.
 */
export const RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Waqf Foundation', 'Zakat Institution', 'Other'] as const;
export const DISTRIBUTION_TYPES = ['Profit Share', 'Hibah Amanah', 'Wasiyyah', 'Faraid Heir', 'Will Beneficiary', 'Zakat & Sadaqah'] as const;
export type Relation = (typeof RELATIONS)[number];
export type DistributionType = (typeof DISTRIBUTION_TYPES)[number];

/** A Muslim may bequeath at most one-third of the estate. */
export const WASIYYAH_LIMIT_PCT = 100 / 3;
/** Always faraid heirs, so a wasiyyah to them needs the other heirs' consent and is not offered. */
const FARAID_HEIR_RELATIONS: Relation[] = ['Spouse', 'Child', 'Parent'];
const INSTITUTIONS: Relation[] = ['Waqf Foundation', 'Zakat Institution'];

export interface EstateItem {
  relation: string;
  distributionType: string;
  /** Null for a faraid heir. */
  allocationPercent: number | null;
}

/** A faraid heir's share is fixed by law, so the owner sets none. */
export const hasOwnerSetShare = (type: string) => type !== 'Faraid Heir';

const total = (items: EstateItem[], type: DistributionType) => items.filter((item) => item.distributionType === type).reduce((sum, item) => sum + (item.allocationPercent ?? 0), 0);

/** Why the beneficiary is not allowed, or null. `others` are the owner's other beneficiaries. */
export function estateRuleError(item: EstateItem, others: EstateItem[]): string | null {
  if (!(RELATIONS as readonly string[]).includes(item.relation)) return `Unknown relation "${item.relation}".`;
  if (!(DISTRIBUTION_TYPES as readonly string[]).includes(item.distributionType)) return `Unknown distribution type "${item.distributionType}".`;
  if (hasOwnerSetShare(item.distributionType)) {
    if (item.allocationPercent === null || !Number.isFinite(item.allocationPercent) || item.allocationPercent < 0 || item.allocationPercent > 100) return 'The share must be between 0% and 100%.';
  } else if (item.allocationPercent !== null) {
    return "A faraid heir's share is fixed by faraid, not set by you.";
  }
  if (item.distributionType === 'Wasiyyah') {
    if (FARAID_HEIR_RELATIONS.includes(item.relation as Relation)) {
      return `A wasiyyah cannot go to a faraid heir (${item.relation.toLowerCase()}) unless the other heirs agree. Give to an heir during your lifetime with Hibah Amanah, or leave their share to faraid.`;
    }
    const sum = total(others, 'Wasiyyah') + (item.allocationPercent ?? 0);
    if (sum > WASIYYAH_LIMIT_PCT + 0.001) return `Wasiyyah is limited to one-third (33.33%) of the estate. With this one it would be ${sum.toFixed(2)}%.`;
  }
  if (item.distributionType === 'Faraid Heir' && INSTITUTIONS.includes(item.relation as Relation)) {
    return 'An institution cannot be a faraid heir. Use Wasiyyah (up to one-third) or Zakat & Sadaqah instead.';
  }
  if (item.distributionType === 'Will Beneficiary' && total(others, 'Will Beneficiary') + (item.allocationPercent ?? 0) > 100) {
    return 'The shares under your will cannot add up to more than 100%.';
  }
  return null;
}

/** "•••• 5521": the last four characters only. */
export const maskIdentity = (value: string) => `•••• ${value.replace(/\s/g, '').slice(-4)}`;
