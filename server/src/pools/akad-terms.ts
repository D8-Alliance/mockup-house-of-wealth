import { createHash } from 'node:crypto';

/**
 * Akad (Shariah contract) terms for a wealth pool. The profit-sharing ratio is
 * agreed before anyone invests and is fixed in versioned, append-only terms;
 * each investment order records which version the investor accepted (ijab and
 * qabul). Loss handling per akad is described here and enforced later (see
 * PENDING_ACTIVITIES.md, item 11, phase D).
 */

export const POOL_AKAD_TYPES = ['MUDARABAH', 'MUSHARAKAH', 'WAKALAH', 'IJARAH'] as const;
export type PoolAkadType = (typeof POOL_AKAD_TYPES)[number];

interface AkadRule {
  label: string;
  investorRole: string;
  managerRole: string;
  /** Allowed investor share of net profit, in percent. */
  minInvestorPct: number;
  maxInvestorPct: number;
  profitClause: (investorPct: number) => string;
  lossClause: string;
}

export const AKAD_RULES: Record<PoolAkadType, AkadRule> = {
  MUDARABAH: {
    label: 'Mudarabah',
    investorRole: 'capital provider (rabb al-mal)',
    managerRole: 'manager (mudarib)',
    // Both sides must share in profit, otherwise it is not a Mudarabah.
    minInvestorPct: 1,
    maxInvestorPct: 99,
    profitClause: (pct) => `Net profit is shared ${pct}% to investors and ${100 - pct}% to the manager (mudarib), as a ratio of actual profit, never as a fixed amount.`,
    lossClause: 'Capital losses are borne by investors in proportion to their capital. The manager bears the loss only if it results from negligence, misconduct or breach of these terms. The manager does not guarantee capital or returns.',
  },
  MUSHARAKAH: {
    label: 'Musharakah',
    investorRole: 'partners',
    managerRole: 'managing partner',
    minInvestorPct: 1,
    maxInvestorPct: 99,
    profitClause: (pct) => `Net profit is shared ${pct}% to investors and ${100 - pct}% to the managing partner, as agreed in advance.`,
    lossClause: 'Losses are shared strictly in proportion to each partner\'s capital contribution, regardless of the profit ratio. No partner guarantees another partner\'s capital or returns.',
  },
  WAKALAH: {
    label: 'Wakalah bil Istithmar',
    investorRole: 'principals (muwakkil)',
    managerRole: 'investment agent (wakil)',
    minInvestorPct: 1,
    maxInvestorPct: 100,
    profitClause: (pct) => `Investors receive ${pct}% of net profit${pct < 100 ? `; the agent receives the remaining ${100 - pct}% as a performance incentive` : ''}. Any agency fee is disclosed separately.`,
    lossClause: 'Losses are borne by investors in proportion to their capital. The agent bears the loss only if it results from negligence, misconduct or breach of the agency terms.',
  },
  IJARAH: {
    label: 'Ijarah',
    investorRole: 'co-owners of the leased asset',
    managerRole: 'asset manager',
    minInvestorPct: 1,
    maxInvestorPct: 100,
    profitClause: (pct) => `Investors receive ${pct}% of net rental income${pct < 100 ? `; the asset manager receives the remaining ${100 - pct}%` : ''}.`,
    lossClause: 'As owners, investors bear the risk of the leased asset (for example damage not caused by the lessee), in proportion to their ownership share.',
  },
};

export function isPoolAkadType(value: string): value is PoolAkadType {
  return (POOL_AKAD_TYPES as readonly string[]).includes(value);
}

/** Returns an error message, or null when the ratio is valid for the akad. */
export function validateProfitShare(akadType: PoolAkadType, investorPct: number): string | null {
  const rule = AKAD_RULES[akadType];
  if (!Number.isFinite(investorPct) || Math.round(investorPct * 100) !== investorPct * 100) return 'The investor profit share must be a number with at most two decimal places.';
  if (investorPct < rule.minInvestorPct || investorPct > rule.maxInvestorPct) return `${rule.label} requires an investor profit share between ${rule.minInvestorPct}% and ${rule.maxInvestorPct}%.`;
  return null;
}

export interface AkadTermsInput {
  akadType: PoolAkadType;
  investorProfitSharePct: number;
  version: number;
  poolName: string;
  projectName: string;
  currency: string;
  indicativeExpectedReturn: number;
}

/** The exact text an investor accepts. Its hash is stored on the order. */
export function buildAkadTermsText(input: AkadTermsInput): string {
  const rule = AKAD_RULES[input.akadType];
  return [
    `AKAD TERMS: ${input.poolName} (version ${input.version})`,
    `Contract: ${rule.label}. Project: ${input.projectName}. Currency: ${input.currency}.`,
    '',
    `1. Parties. Investors act as ${rule.investorRole}; the pool operator acts as ${rule.managerRole}.`,
    `2. Profit. ${rule.profitClause(input.investorProfitSharePct)}`,
    `3. Loss. ${rule.lossClause}`,
    `4. Returns are not guaranteed. The indicative expected return of ${input.indicativeExpectedReturn}% a year is a projection only; actual returns depend on the project's actual results and may be lower, or a loss.`,
    '5. Capital is not guaranteed by the operator, the project sponsor or the platform.',
    '6. Distributions are calculated from the project\'s reported gross revenue and eligible costs, using the ratio above, and require approval before payment.',
    '7. Zakat and tax are the investor\'s own responsibility. Statements from the platform are provided to help, not as zakat or tax advice.',
    '8. By accepting, the investor agrees to these terms for this version. If the terms change, a new version is published and must be accepted again.',
  ].join('\n');
}

export function hashTerms(text: string) {
  return createHash('sha256').update(text).digest('hex');
}

