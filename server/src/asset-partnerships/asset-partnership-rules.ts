import { AssetDetails } from '../assets/asset-checks';

export type Akad = 'IJARAH' | 'MUSHARAKAH';
export type Party = 'OWNER' | 'PDP';

export interface EngagementTerms {
  rentAmount?: number;
  rentFrequency?: 'MONTHLY' | 'WHOLE_PERIOD';
  upkeepBy?: 'OWNER' | 'LESSEE';
  contributionValue?: number;
  profitSharePct?: number;
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
    : { contributionValue: terms.contributionValue, profitSharePct: terms.profitSharePct, currency: terms.currency };
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
