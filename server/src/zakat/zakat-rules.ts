/**
 * Zakat al-mal calculation rules. The platform estimates; the state zakat authority
 * decides. Categories follow Malaysian practice:
 * - SAVINGS, INVESTMENT_CAPITAL, BUSINESS need a full haul (one year of ownership);
 * - INCOME and INVESTMENT_INCOME (al-mustaghallat: profit, dividends, rent) are assessed
 *   when received, without haul;
 * - the rate is 2.5% on a Hijri year, or 2.577% when the year is counted in Gregorian
 *   days (2.5% x 365.25 / 354.37), as used by Malaysian authorities and ASNB.
 */

export const ZAKAT_CATEGORIES = ['SAVINGS', 'INCOME', 'INVESTMENT_INCOME', 'INVESTMENT_CAPITAL', 'BUSINESS'] as const;
export type ZakatCategory = (typeof ZAKAT_CATEGORIES)[number];
export const YEAR_BASES = ['HIJRI', 'GREGORIAN'] as const;
export type YearBasis = (typeof YEAR_BASES)[number];

export const ZAKAT_RATES: Record<YearBasis, number> = { HIJRI: 0.025, GREGORIAN: 0.02577 };
/** Days in one haul for each year basis. */
export const HAUL_DAYS: Record<YearBasis, number> = { HIJRI: 354, GREGORIAN: 365 };

export const CATEGORY_LABELS: Record<ZakatCategory, string> = {
  SAVINGS: 'Savings and cash',
  INCOME: 'Employment or other income',
  INVESTMENT_INCOME: 'Investment income (al-mustaghallat)',
  INVESTMENT_CAPITAL: 'Investment capital',
  BUSINESS: 'Business assets (urud al-tijarah)',
};

const HAUL_REQUIRED: Record<ZakatCategory, boolean> = { SAVINGS: true, INCOME: false, INVESTMENT_INCOME: false, INVESTMENT_CAPITAL: true, BUSINESS: true };

export interface ZakatLineInput {
  category: ZakatCategory;
  label: string;
  amount: number;
  /** Owned for a full haul; ignored for categories without haul. */
  haulMet?: boolean;
  source: 'USER' | 'PLATFORM';
}

export interface ZakatLine extends ZakatLineInput {
  included: boolean;
  note: string;
}

export interface ZakatResult {
  lines: ZakatLine[];
  grossZakatable: number;
  debts: number;
  netZakatable: number;
  nisab: number;
  meetsNisab: boolean;
  rate: number;
  zakatDue: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function computeZakat(input: { lines: ZakatLineInput[]; debts: number; nisab: number; yearBasis: YearBasis }): ZakatResult {
  const lines: ZakatLine[] = input.lines.map((line) => {
    if (line.amount <= 0) return { ...line, included: false, note: 'No amount.' };
    if (HAUL_REQUIRED[line.category] && !line.haulMet) return { ...line, included: false, note: 'Not owned for a full haul yet; not zakatable this year.' };
    return { ...line, included: true, note: HAUL_REQUIRED[line.category] ? 'Haul complete.' : 'Assessed when received; no haul needed.' };
  });
  const grossZakatable = round2(lines.filter((line) => line.included).reduce((sum, line) => sum + line.amount, 0));
  const debts = round2(Math.max(0, input.debts));
  const netZakatable = round2(Math.max(0, grossZakatable - debts));
  const meetsNisab = netZakatable >= input.nisab;
  const rate = ZAKAT_RATES[input.yearBasis];
  return { lines, grossZakatable, debts, netZakatable, nisab: input.nisab, meetsNisab, rate, zakatDue: meetsNisab ? round2(netZakatable * rate) : 0 };
}
