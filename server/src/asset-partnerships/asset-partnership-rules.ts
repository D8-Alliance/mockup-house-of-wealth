import { AssetDetails } from '../assets/asset-checks';

export type Akad = 'IJARAH' | 'MUSHARAKAH';
export type Party = 'OWNER' | 'PDP';

export interface EngagementTerms {
  rentAmount?: number;
  rentFrequency?: 'MONTHLY' | 'WHOLE_PERIOD';
  upkeepBy?: 'OWNER' | 'LESSEE';
  contributionValue?: number;
  profitSharePct?: number;
  /** Musharakah: the delivery partner's capital contribution. */
  pdpContributionValue?: number;
  currency?: string;
}

/** Projects that can no longer take on assets. */
export const CLOSED_PROJECT_STATUSES = ['COMPLETED', 'REJECTED'];
/** Engagements still being negotiated or approved; one asset and project may have only one at a time. */
export const OPEN_ENGAGEMENT_STATUSES = ['PROPOSED', 'ACCEPTED'];
/** Engagements that hold the asset for their period. */
export const HOLDING_ENGAGEMENT_STATUSES = ['ACCEPTED', 'APPROVED'];

/** Machinery and equipment answer each other's needs; other types must match exactly. */
export function typesMatch(needType: string, assetType: string): boolean {
  const machine = (type: string) => type === 'MACHINERY' || type === 'EQUIPMENT';
  return needType === assetType || (machine(needType) && machine(assetType));
}

/**
 * What is missing or wrong in the akad terms. Ijarah needs a known rent and who keeps the asset
 * running day to day; Musharakah needs the asset's agreed value and the owner's profit share.
 */
export function termsProblems(akad: Akad, terms: EngagementTerms, startDate: string | Date, endDate: string | Date): string[] {
  const problems: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) problems.push('valid start and end dates');
  else if (end <= start) problems.push('an end date after the start date');
  if (!terms.currency) problems.push('the currency');
  if (akad === 'IJARAH') {
    if (!terms.rentAmount || terms.rentAmount <= 0) problems.push('the rent (ujrah) amount');
    if (!terms.rentFrequency) problems.push('whether the rent is monthly or for the whole period');
    if (!terms.upkeepBy) problems.push('who handles day-to-day upkeep');
  } else {
    if (!terms.contributionValue || terms.contributionValue <= 0) problems.push("the asset's agreed value as capital");
    if (!terms.profitSharePct) problems.push("the owner's profit share");
  }
  return problems;
}

/** Only the fields that belong to the akad, so a switch from Ijarah to Musharakah leaves no stale rent behind. */
export function cleanTerms(akad: Akad, terms: EngagementTerms): EngagementTerms {
  return akad === 'IJARAH'
    ? { rentAmount: terms.rentAmount, rentFrequency: terms.rentFrequency, upkeepBy: terms.upkeepBy, currency: terms.currency }
    : { contributionValue: terms.contributionValue, profitSharePct: terms.profitSharePct, pdpContributionValue: terms.pdpContributionValue, currency: terms.currency };
}

/** Musharakah capital shares in percent; null until both contributions are known. Losses follow these shares. */
export function capitalShares(terms: EngagementTerms): { owner: number; pdp: number } | null {
  const owner = terms.contributionValue ?? 0;
  const pdp = terms.pdpContributionValue;
  if (pdp === undefined || owner + pdp <= 0) return null;
  const ownerPct = Math.round((owner / (owner + pdp)) * 1000) / 10;
  return { owner: ownerPct, pdp: Math.round((100 - ownerPct) * 10) / 10 };
}

/** The same akad terms, ignoring fields left empty. */
export function sameTerms(a: EngagementTerms, b: EngagementTerms): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof EngagementTerms>;
  return [...keys].every((key) => (a[key] ?? null) === (b[key] ?? null));
}

export function periodsOverlap(a: { startDate: Date; endDate: Date }, b: { startDate: Date; endDate: Date }): boolean {
  return a.startDate < b.endDate && b.startDate < a.endDate;
}

export const otherParty = (party: Party): Party => (party === 'OWNER' ? 'PDP' : 'OWNER');

/** Details a delivery partner may see before a deal: what the asset is and roughly where, never its title, lot, chassis or serial number. */
const PUBLIC_DETAIL_FIELDS: Record<string, Array<keyof AssetDetails>> = {
  LAND: ['areaValue', 'areaUnit', 'landUseCategory', 'tenure', 'mukim', 'district', 'state'],
  BUILDING: ['titleKind', 'buildingUse', 'floorArea', 'floorAreaUnit', 'yearCompleted', 'district', 'state'],
  VEHICLE: ['make', 'model', 'yearOfManufacture', 'category'],
  MACHINERY: ['manufacturer', 'model', 'yearOfManufacture', 'operatingHours', 'requiresDoshCertificate'],
  EQUIPMENT: ['manufacturer', 'model', 'yearOfManufacture', 'operatingHours', 'requiresDoshCertificate'],
};

export function publicDetails(assetType: string, details: AssetDetails | null): Partial<AssetDetails> {
  if (!details) return {};
  return Object.fromEntries((PUBLIC_DETAIL_FIELDS[assetType] ?? []).filter((field) => details[field] !== undefined && details[field] !== '').map((field) => [field, details[field]]));
}

/** "Hulu Langat, Selangor" from the details, without the street address. */
export function regionOf(details: AssetDetails | null): string {
  return [details?.district, details?.state].filter(Boolean).join(', ');
}


/** Calendar months in a period, counting both dates: 1 Jan to 30 Jun is 6, 1 Nov to 31 Jan is 3. */
export function monthsBetween(start: Date, end: Date): number {
  if (end < start) return 0;
  const daysInEndMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  const whole = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  const part = (end.getUTCDate() - start.getUTCDate() + 1) / daysInEndMonth;
  return Math.max(0, Math.round((whole + part) * 10) / 10);
}

export interface OfferMetrics {
  months: number;
  /** Ijarah: the rent per month, whether quoted monthly or for the whole period. */
  monthlyRent: number | null;
  /** Ijarah: the rent over the whole offered period. */
  totalRent: number | null;
  /** Share of the need's period the offer covers, in percent; null when the need has no dates. */
  coveragePct: number | null;
}

/** Figures that make offers comparable side by side, whatever way their rent is quoted. */
export function offerMetrics(akad: Akad, terms: EngagementTerms, start: Date, end: Date, needStart: Date | null, needEnd: Date | null): OfferMetrics {
  const months = monthsBetween(start, end);
  let monthlyRent: number | null = null;
  let totalRent: number | null = null;
  if (akad === 'IJARAH' && terms.rentAmount) {
    if (terms.rentFrequency === 'WHOLE_PERIOD') {
      totalRent = terms.rentAmount;
      monthlyRent = months ? Math.round((terms.rentAmount / months) * 100) / 100 : null;
    } else {
      monthlyRent = terms.rentAmount;
      totalRent = Math.round(terms.rentAmount * months * 100) / 100;
    }
  }
  let coveragePct: number | null = null;
  if (needStart && needEnd && needEnd > needStart) {
    const overlap = Math.min(end.getTime(), needEnd.getTime()) - Math.max(start.getTime(), needStart.getTime());
    coveragePct = Math.max(0, Math.min(100, Math.round((overlap / (needEnd.getTime() - needStart.getTime())) * 100)));
  }
  return { months, monthlyRent, totalRent, coveragePct };
}

/**
 * Fixed weights for comparing offers, shown to the delivery partner. The score is worked out by the
 * system so the same offers always score the same; AI only explains it.
 */
export const OFFER_SCORE_WEIGHTS = { rent: 35, coverage: 25, documents: 20, encumbrance: 10, availability: 10 } as const;

/** How much other projects want the same asset over the same period: a level, never names or numbers. */
export type DemandLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export const demandLevel = (otherOpenOffers: number): DemandLevel => (otherOpenOffers >= 2 ? 'HIGH' : otherOpenOffers === 1 ? 'MEDIUM' : 'LOW');

export interface ScoreInput {
  id: string;
  akad: Akad;
  monthlyRent: number | null;
  profitSharePct: number | null;
  coveragePct: number | null;
  documentIssues: number;
  encumbered: boolean;
  demand: DemandLevel;
}
export interface OfferScore { total: number; parts: Record<keyof typeof OFFER_SCORE_WEIGHTS, number> }

/**
 * Scores live offers out of 100. Price is compared only within the same akad: the lowest monthly rent
 * among Ijarah offers, or the lowest owner's profit share among Musharakah offers, gets full marks and
 * the others in proportion. An offer alone in its akad gets full price marks.
 */
export function scoreOffers(offers: ScoreInput[]): Map<string, OfferScore> {
  const w = OFFER_SCORE_WEIGHTS;
  const price = (offer: ScoreInput) => (offer.akad === 'IJARAH' ? offer.monthlyRent : offer.profitSharePct);
  const lowest = (akad: Akad) => Math.min(...offers.filter((offer) => offer.akad === akad).map((offer) => price(offer) ?? Infinity));
  const scores = new Map<string, OfferScore>();
  for (const offer of offers) {
    const own = price(offer);
    const best = lowest(offer.akad);
    const parts = {
      rent: own && Number.isFinite(best) ? (best / own) * w.rent : w.rent,
      coverage: offer.coveragePct === null ? w.coverage : (offer.coveragePct / 100) * w.coverage,
      documents: Math.max(0, w.documents - offer.documentIssues * 5),
      encumbrance: offer.encumbered ? 0 : w.encumbrance,
      availability: offer.demand === 'HIGH' ? 0 : offer.demand === 'MEDIUM' ? w.availability / 2 : w.availability,
    };
    const rounded = Object.fromEntries(Object.entries(parts).map(([key, value]) => [key, Math.round(value * 10) / 10])) as OfferScore['parts'];
    scores.set(offer.id, { total: Math.round(Object.values(parts).reduce((sum, value) => sum + value, 0)), parts: rounded });
  }
  return scores;
}
