import { AssetDetails, requiredDocuments } from '../assets/asset-checks';
import { Akad, capitalShares, EngagementTerms, monthsBetween, offerMetrics, typesMatch } from './asset-partnership-rules';

export type CheckStatus = 'PASS' | 'WARN' | 'FAIL' | 'INFO';
/** LEGAL checks are for the Legal reviewer, SHARIAH for the Shariah reviewer; BOTH are shown to each. */
export type CheckTrack = 'LEGAL' | 'SHARIAH' | 'BOTH';
export interface ReviewCheck { key: string; track: CheckTrack; label: string; status: CheckStatus; detail: string }

interface Finding { source?: string; field?: string; result?: string; found?: string; note?: string }

export interface ReviewCheckInput {
  akad: Akad;
  terms: EngagementTerms;
  startDate: Date;
  endDate: Date;
  need: { assetType: string; title: string; startDate: Date | null; endDate: Date | null } | null;
  project: { sector: string; projectName: string };
  asset: { assetType: string; status: string; isEncumbered: boolean; estimatedValue: number; valuationDate: Date | null; details: AssetDetails | null; checkFindings: unknown; documentTypes: string[] };
  /** Status of the delivery partner's PDP application, or null when it has none. */
  pdpApplicationStatus: string | null;
  /** Other accepted or approved partnerships holding the asset over an overlapping period. */
  overlappingCommitments: number;
  now?: Date;
}

/** Project activities a Shariah-compliant partnership cannot serve. */
const PROHIBITED_ACTIVITY = /\b(alcohol|liquor|brewery|beer|wine|casino|gambling|gaming|lottery|pork|swine|tobacco|cigarette|conventional (bank|insurance)|interest[- ]based|riba|nightclub|arak|judi|babi)\b/i;

const findingsOf = (value: unknown): Finding[] => (Array.isArray(value) ? value as Finding[] : []);
const pct = (value: number) => `${Math.round(value * 10) / 10}%`;

/**
 * What the system can check about an accepted partnership before Legal and Shariah decide. The same
 * data always gives the same results; reviewers still read the documents and decide.
 */
export function partnershipChecks(input: ReviewCheckInput): ReviewCheck[] {
  const now = input.now ?? new Date();
  const checks: ReviewCheck[] = [];
  const add = (key: string, track: CheckTrack, label: string, status: CheckStatus, detail: string) => checks.push({ key, track, label, status, detail });
  const { asset, terms } = input;
  const details = asset.details ?? {};
  const findings = findingsOf(asset.checkFindings);
  const months = monthsBetween(input.startDate, input.endDate);

  // ---- The deal against the project's need ----
  if (input.need) {
    add('type-match', 'BOTH', 'Asset type matches the need', typesMatch(input.need.assetType, asset.assetType) ? 'PASS' : 'FAIL',
      typesMatch(input.need.assetType, asset.assetType) ? `${asset.assetType.toLowerCase()} for "${input.need.title}".` : `The need asks for ${input.need.assetType.toLowerCase()} ("${input.need.title}") but the asset is ${asset.assetType.toLowerCase()}.`);
    if (input.need.startDate && input.need.endDate) {
      const coverage = offerMetrics(input.akad, terms, input.startDate, input.endDate, input.need.startDate, input.need.endDate).coveragePct ?? 0;
      const inside = input.startDate >= input.need.startDate && input.endDate <= input.need.endDate;
      add('period-in-need', 'LEGAL', 'Period fits the need', inside ? 'PASS' : 'WARN', `Covers ${coverage}% of the needed period${inside ? '' : '; part of it falls outside the dates the project asked for'}.`);
    }
  } else {
    add('type-match', 'BOTH', 'Asset type matches the need', 'INFO', 'Asked for directly by the delivery partner, not against a posted need.');
  }
  if (input.akad === 'MUSHARAKAH' && months < 6) add('period-length', 'LEGAL', 'Length of the partnership', 'WARN', `${months} months is short for a Musharakah: check it is enough to earn and share a profit, and whether it can be extended.`);
  else add('period-length', 'LEGAL', 'Length of the partnership', months < 1 ? 'WARN' : 'PASS', `${months} months.`);

  // ---- The asset ----
  add('asset-verified', 'LEGAL', 'Asset verified', asset.status === 'VERIFIED' ? 'PASS' : 'FAIL', asset.status === 'VERIFIED' ? 'Verified by the country\'s verifier.' : `The asset is ${asset.status.toLowerCase()}, not verified.`);
  const missing = requiredDocuments(asset.assetType, details).filter((type) => !asset.documentTypes.includes(type));
  add('documents', 'LEGAL', 'Required documents uploaded', missing.length ? 'FAIL' : 'PASS', missing.length ? `Missing: ${missing.join(', ').toLowerCase().replace(/_/g, ' ')}.` : 'All required documents are on file.');

  const worst = (field: string) => {
    const rows = findings.filter((finding) => finding.field === field);
    return rows.find((row) => row.result === 'MISMATCH') ?? rows.find((row) => row.result === 'NOT_FOUND') ?? rows.find((row) => row.result === 'MATCH') ?? rows[0];
  };
  const fromFinding = (key: string, field: string, label: string, failOnMismatch: boolean, passText: string) => {
    const row = worst(field);
    if (!row) return;
    const status: CheckStatus = row.result === 'MISMATCH' ? (failOnMismatch ? 'FAIL' : 'WARN') : row.result === 'NOT_FOUND' ? 'WARN' : row.result === 'MATCH' ? 'PASS' : 'INFO';
    add(key, 'LEGAL', label, status, status === 'PASS' ? passText : row.note ?? (row.found ? `Read on the document: ${row.found}` : 'Not read on the document; check it by eye.'));
  };
  fromFinding('registered-owner', 'Registered owner', 'Registered owner is the asset owner', true, 'The name on the title matches the owner.');
  fromFinding('search-date', 'Search date', 'Official search is recent (under 3 months)', true, 'The official search is recent.');
  const charge = worst('Charge or caveat');
  if (charge?.result === 'MISMATCH') add('charge', 'LEGAL', 'Charges and caveats', 'FAIL', charge.note ?? 'A charge or caveat was read that the owner did not declare.');
  else if (asset.isEncumbered || charge?.result === 'MATCH') add('charge', 'LEGAL', 'Charges and caveats', 'WARN', 'The asset is charged: the chargee (bank) must consent before it is leased or contributed.');
  else if (asset.assetType === 'LAND' || asset.assetType === 'BUILDING') add('charge', 'LEGAL', 'Charges and caveats', 'PASS', 'None declared or read on the search.');
  fromFinding('hire-purchase', 'Hire purchase claim', 'No financier\'s claim on the asset', true, 'No hire purchase claim.');
  if (details.malayReserve || worst('Malay reserve land')?.result === 'MISMATCH') add('malay-reserve', 'LEGAL', 'Malay reserve land', 'WARN', 'Only parties the state\'s Malay Reservations Enactment allows may hold an interest: confirm the delivery partner qualifies.');
  fromFinding('quit-rent', 'Year paid', 'Quit rent or assessment paid', false, 'Paid for the current or last year.');
  if (details.leaseExpiry) {
    const expiry = new Date(details.leaseExpiry);
    add('lease-expiry', 'LEGAL', 'Leasehold outlasts the partnership', expiry > input.endDate ? 'PASS' : 'FAIL', expiry > input.endDate ? `The lease runs to ${details.leaseExpiry}.` : `The lease ends on ${details.leaseExpiry}, before the partnership does.`);
  }
  if (asset.assetType === 'LAND' && details.landUseCategory) {
    const agricultural = /agri|pertanian/i.test(details.landUseCategory);
    const farming = /agri|plantation|farm|pertanian|ladang|irrigat/i.test(`${input.project.sector} ${input.project.projectName}`);
    add('land-use', 'LEGAL', 'Land category fits the project', agricultural === farming ? 'PASS' : 'WARN', `The land is ${details.landUseCategory.toLowerCase()}; the project is "${input.project.sector}". ${agricultural === farming ? '' : 'A change of category (tukar syarat) may be needed.'}`.trim());
  }
  if (findings.some((finding) => finding.field === 'Readable text' && finding.result === 'NOT_FOUND')) add('unreadable', 'LEGAL', 'All documents readable', 'WARN', 'At least one document could not be read by the system: check it by eye.');
  if (!asset.valuationDate) add('valuation', 'BOTH', 'Valuation is recent (under 12 months)', 'WARN', 'No valuation date is recorded.');
  else {
    const ageMonths = monthsBetween(asset.valuationDate, now);
    add('valuation', 'BOTH', 'Valuation is recent (under 12 months)', ageMonths <= 12 ? 'PASS' : 'WARN', ageMonths <= 12 ? `Valued ${asset.valuationDate.toISOString().slice(0, 10)}.` : `The valuation is ${Math.floor(ageMonths)} months old; ask for a new one.`);
  }

  // ---- The parties ----
  const kyb = input.pdpApplicationStatus;
  add('pdp-kyb', 'LEGAL', 'Delivery partner passed KYB', kyb === 'APPROVED' || kyb === 'ACTIVE' ? 'PASS' : kyb === 'REJECTED' ? 'FAIL' : 'WARN', kyb === 'APPROVED' || kyb === 'ACTIVE' ? 'Its PDP application is approved.' : kyb ? `Its PDP application is ${kyb.toLowerCase().replace(/_/g, ' ')}.` : 'No PDP application is on record for the delivery partner.');
  add('overlap', 'LEGAL', 'Asset not committed elsewhere for the period', input.overlappingCommitments ? 'FAIL' : 'PASS', input.overlappingCommitments ? 'Another accepted or approved partnership holds the asset over these dates.' : 'No other partnership holds the asset over these dates.');

  // ---- The terms ----
  if (input.akad === 'IJARAH') {
    const monthly = offerMetrics('IJARAH', terms, input.startDate, input.endDate, null, null).monthlyRent;
    if (monthly && asset.estimatedValue > 0) {
      const yieldPct = (monthly * 12 / asset.estimatedValue) * 100;
      add('rent-yield', 'LEGAL', 'Rent is in a usual range for the asset\'s value', yieldPct < 2 || yieldPct > 25 ? 'WARN' : 'PASS', `A year's rent is ${pct(yieldPct)} of the asset's value${yieldPct < 2 ? ': unusually low, check for a typo' : yieldPct > 25 ? ': unusually high, check for a typo' : ''}.`);
    }
    add('rent-known', 'SHARIAH', 'Rent and period are known', terms.rentAmount && terms.rentFrequency ? 'PASS' : 'FAIL', terms.rentAmount && terms.rentFrequency ? 'Ijarah rent is fixed and known for a known period.' : 'The rent or its frequency is missing.');
    add('ownership-burden', 'SHARIAH', 'Ownership risks stay with the owner', 'INFO', `Major maintenance and takaful must stay with the owner as lessor; day-to-day upkeep is with ${terms.upkeepBy === 'OWNER' ? 'the owner' : 'the project'}.`);
  } else {
    const shares = capitalShares(terms);
    if (!shares) add('pdp-capital', 'BOTH', 'Delivery partner\'s capital is stated', 'FAIL', 'Without it, losses cannot be shared by capital.');
    else if (shares.pdp === 0) add('pdp-capital', 'BOTH', 'Delivery partner\'s capital is stated', 'WARN', 'The delivery partner adds no capital: one side brings capital and the other manages, which is closer to Mudarabah. Confirm Musharakah is the right akad.');
    else add('pdp-capital', 'BOTH', 'Delivery partner\'s capital is stated', 'PASS', `Capital: owner ${shares.owner}%, delivery partner ${shares.pdp}%.`);
    const share = terms.profitSharePct;
    if (share !== undefined && shares) {
      const gap = Math.abs(share - shares.owner);
      add('profit-vs-capital', 'BOTH', 'Profit share is in line with capital', gap > 30 ? 'WARN' : 'PASS', `The owner takes ${share}% of profit for ${shares.owner}% of capital${gap > 30 ? '. A different ratio is allowed when both agree, but a gap this large is often a typo: confirm it with both sides' : ''}.`);
    }
    if (terms.contributionValue && asset.estimatedValue > 0) {
      const diff = Math.abs(terms.contributionValue - asset.estimatedValue) / asset.estimatedValue;
      add('agreed-value', 'LEGAL', 'Agreed value matches the valuation', diff > 0.2 ? 'WARN' : 'PASS', `Agreed at ${terms.contributionValue.toLocaleString()} against an estimated value of ${asset.estimatedValue.toLocaleString()}${diff > 0.2 ? ` (${Math.round(diff * 100)}% apart)` : ''}.`);
    }
    add('profit-ratio', 'SHARIAH', 'Profit shared by ratio, not a fixed amount', share ? 'PASS' : 'FAIL', share ? `${share}% of actual profit to the owner; no fixed or guaranteed return.` : 'No profit ratio is set.');
    add('loss-by-capital', 'SHARIAH', 'Losses borne by capital', shares ? 'PASS' : 'FAIL', shares ? `Losses fall ${shares.owner}% / ${shares.pdp}% by capital; the agreement must say so.` : 'Capital shares are unknown, so losses cannot be allocated by capital.');
  }

  // ---- Shariah: what the asset is used for ----
  const activity = `${input.project.sector} ${input.project.projectName}`;
  add('halal-use', 'SHARIAH', 'Project activity is permissible', PROHIBITED_ACTIVITY.test(activity) ? 'FAIL' : 'PASS', PROHIBITED_ACTIVITY.test(activity) ? `"${activity.trim()}" suggests an activity that is not Shariah-compliant.` : `${input.project.sector}: no prohibited activity found in the project's description.`);
  const tenants = worst("Tenants' business");
  if (tenants) add('tenants', 'SHARIAH', 'Tenants\' business is permissible', tenants.result === 'MISMATCH' ? 'FAIL' : 'INFO', tenants.note ?? 'Check the tenancy agreements.');

  return checks;
}

/** Counts for a summary line, and to record what the reviewer saw when deciding. */
export function checkSummary(checks: ReviewCheck[], track?: 'LEGAL' | 'SHARIAH') {
  const mine = track ? checks.filter((check) => check.track === track || check.track === 'BOTH') : checks;
  return {
    fail: mine.filter((check) => check.status === 'FAIL').map((check) => check.label),
    warn: mine.filter((check) => check.status === 'WARN').map((check) => check.label),
    pass: mine.filter((check) => check.status === 'PASS').length,
  };
}
