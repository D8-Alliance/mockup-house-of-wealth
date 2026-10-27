/**
 * The conditions that protect investors' money: the sponsor's own capital (pledged, proved, deposited) and the
 * takaful cover a project and its assets need. Pure functions; the services load the facts.
 */

export const CAPITAL_SOURCES = ['SPONSOR_CASH', 'OTHER_FINANCING'] as const;
export type CapitalSource = (typeof CAPITAL_SOURCES)[number];
export const COVER_TYPES = ['ASSET_PROPERTY', 'MACHINERY', 'MOTOR', 'CONTRACTORS_ALL_RISK', 'PUBLIC_LIABILITY', 'PERKESO', 'CROP', 'KEY_PERSON', 'OTHER'] as const;
export type CoverType = (typeof COVER_TYPES)[number];

/** Default minimum the sponsor puts in, as a share of the project cost. */
export const DEFAULT_MIN_SPONSOR_PCT = 10;
/** Days before a policy ends when its holder is reminded. */
export const EXPIRY_REMINDER_DAYS = [30, 14, 7] as const;

/**
 * The minimum sponsor share for a country. MIN_SPONSOR_CONTRIBUTION_PCT may be one number for every country
 * ("15") or a map by country node ('{"CN-MYS":10,"CN-IDN":20}').
 */
export function minSponsorPct(countryNodeId: string, setting = process.env.MIN_SPONSOR_CONTRIBUTION_PCT): number {
  if (!setting?.trim()) return DEFAULT_MIN_SPONSOR_PCT;
  const plain = Number(setting);
  if (Number.isFinite(plain) && plain >= 0 && plain <= 100) return plain;
  try {
    const map = JSON.parse(setting) as Record<string, unknown>;
    const value = Number(map[countryNodeId]);
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : DEFAULT_MIN_SPONSOR_PCT;
  } catch {
    return DEFAULT_MIN_SPONSOR_PCT;
  }
}

export interface CommitmentFact { source: string; amount: number; status: string }

/** The sponsor's cash at each stage, against the minimum it must put in. */
export function sponsorCapital(commitments: CommitmentFact[], totalProjectCost: number, pct: number) {
  const sponsor = commitments.filter((item) => item.source === 'SPONSOR_CASH' && item.status !== 'REJECTED');
  const sum = (statuses: string[]) => sponsor.filter((item) => statuses.includes(item.status)).reduce((total, item) => total + item.amount, 0);
  return {
    pct,
    required: Math.round(totalProjectCost * pct) / 100,
    pledged: sum(['PLEDGED', 'EVIDENCE_SUBMITTED', 'EVIDENCED', 'DEPOSITED']),
    evidenced: sum(['EVIDENCED', 'DEPOSITED']),
    deposited: sum(['DEPOSITED']),
  };
}

export interface CoveredAsset { assetId: string; assetType: string; name: string; value: number; akad: string; ownerName: string }

export interface CoverRequirement {
  key: string;
  coverType: CoverType;
  assetId?: string;
  label: string;
  /** The least the policy must cover, for an asset: its value. */
  minSumCovered?: number;
  /** Who takes out and pays for the cover. */
  payer: string;
}

const ASSET_COVER: Record<string, CoverType> = { BUILDING: 'ASSET_PROPERTY', MACHINERY: 'MACHINERY', EQUIPMENT: 'MACHINERY', VEHICLE: 'MOTOR' };
export const COVER_LABELS: Record<CoverType, string> = {
  ASSET_PROPERTY: 'Fire and perils (building)', MACHINERY: 'Machinery all-risk / breakdown', MOTOR: 'Motor takaful',
  CONTRACTORS_ALL_RISK: "Contractor's All Risk", PUBLIC_LIABILITY: 'Public liability', PERKESO: 'PERKESO (workers)',
  CROP: 'Crop takaful', KEY_PERSON: 'Key person', OTHER: 'Other cover',
};

/**
 * Cover the project must hold before funds are released. Assets in an agreed partnership need their own cover:
 * under Ijarah the owner (lessor) bears it (AAOIFI SS 9); under Musharakah it is a partnership expense.
 * Land needs none of its own; crop and key-person cover stay optional.
 */
export function takafulRequirements(input: { assets: CoveredAsset[]; hasSiteWork: boolean; hasWorkers: boolean }): CoverRequirement[] {
  const requirements: CoverRequirement[] = [];
  for (const asset of input.assets) {
    const coverType = ASSET_COVER[asset.assetType];
    if (!coverType) continue;
    requirements.push({
      key: `${coverType}:${asset.assetId}`, coverType, assetId: asset.assetId, label: `${COVER_LABELS[coverType]}: ${asset.name}`, minSumCovered: asset.value,
      payer: asset.akad === 'IJARAH' ? `${asset.ownerName} (lessor)` : 'The partnership (Musharakah expense)',
    });
  }
  const hasSite = input.hasSiteWork || input.assets.some((asset) => ['LAND', 'BUILDING'].includes(asset.assetType));
  if (input.hasSiteWork) requirements.push({ key: 'CONTRACTORS_ALL_RISK', coverType: 'CONTRACTORS_ALL_RISK', label: COVER_LABELS.CONTRACTORS_ALL_RISK, payer: 'Delivery partner or its contractor' });
  if (hasSite) requirements.push({ key: 'PUBLIC_LIABILITY', coverType: 'PUBLIC_LIABILITY', label: COVER_LABELS.PUBLIC_LIABILITY, payer: 'Delivery partner' });
  if (input.hasWorkers) requirements.push({ key: 'PERKESO', coverType: 'PERKESO', label: COVER_LABELS.PERKESO, payer: 'Employer (required by law)' });
  return requirements;
}

export interface PolicyFact { id: string; coverType: string; assetId: string | null; sumCovered: number; startDate: Date; endDate: Date; status: string }
export type CoverState = 'COVERED' | 'EXPIRING' | 'PENDING_REVIEW' | 'NOT_STARTED' | 'INSUFFICIENT' | 'LAPSED' | 'MISSING';

/** Whether each requirement is met today by a verified policy in force for enough. */
export function coverStatus(requirements: CoverRequirement[], policies: PolicyFact[], now = new Date()) {
  const day = 86_400_000;
  return requirements.map((requirement) => {
    const matching = policies.filter((policy) => policy.coverType === requirement.coverType && (!requirement.assetId || policy.assetId === requirement.assetId));
    const verified = matching.filter((policy) => policy.status === 'VERIFIED');
    const inForce = verified.filter((policy) => policy.startDate <= now && policy.endDate >= now);
    const enough = inForce.filter((policy) => !requirement.minSumCovered || policy.sumCovered >= requirement.minSumCovered);
    const best = enough.sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0];
    let state: CoverState;
    if (best) state = best.endDate.getTime() - now.getTime() <= EXPIRY_REMINDER_DAYS[0] * day ? 'EXPIRING' : 'COVERED';
    else if (inForce.length) state = 'INSUFFICIENT';
    else if (matching.some((policy) => policy.status === 'SUBMITTED')) state = 'PENDING_REVIEW';
    else if (verified.some((policy) => policy.startDate > now)) state = 'NOT_STARTED';
    else if (verified.length) state = 'LAPSED';
    else state = 'MISSING';
    return { ...requirement, state, policyId: best?.id ?? null, coveredUntil: best?.endDate.toISOString() ?? null };
  });
}

export const COVER_MET: CoverState[] = ['COVERED', 'EXPIRING'];

/** Why a pool cannot open, or funds cannot be released, yet; empty when nothing stands in the way. */
export function fundingBlockers(stage: 'POOL' | 'DISBURSE', facts: { capital: ReturnType<typeof sponsorCapital>; cover: Array<{ label: string; state: CoverState }>; currency: string }): string[] {
  const money = (amount: number) => `${facts.currency === 'MYR' ? 'RM' : facts.currency} ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const blockers: string[] = [];
  const { capital } = facts;
  if (stage === 'POOL' && capital.evidenced < capital.required) blockers.push(`The sponsor's own capital must be proved before investors are invited: ${money(capital.evidenced)} of the ${money(capital.required)} minimum (${capital.pct}% of the project cost) is proved.`);
  if (stage === 'DISBURSE') {
    if (capital.deposited < capital.required) blockers.push(`The sponsor's own capital must be deposited before funds are released: ${money(capital.deposited)} of the ${money(capital.required)} minimum is deposited.`);
    const unmet = facts.cover.filter((item) => !COVER_MET.includes(item.state));
    if (unmet.length) blockers.push(`Required cover is not in place: ${unmet.map((item) => `${item.label} (${item.state.toLowerCase().replace('_', ' ')})`).join('; ')}.`);
  }
  return blockers;
}

/** Each release is drawn from the sponsor's deposited capital and investors' funds in proportion. */
export function proRataShares(amount: number, sponsorDeposited: number, investorFunding: number) {
  const total = sponsorDeposited + investorFunding;
  const sponsorRatio = total > 0 ? sponsorDeposited / total : 0;
  const sponsor = Math.round(amount * sponsorRatio * 100) / 100;
  return { sponsorRatio: Math.round(sponsorRatio * 10000) / 100, sponsor, investors: Math.round((amount - sponsor) * 100) / 100 };
}
