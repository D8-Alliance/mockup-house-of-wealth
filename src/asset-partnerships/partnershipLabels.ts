import { AssetEngagement, EngagementStatus, EngagementTerms, PartnershipAkad, PreferredAkad } from '../services/apiClient';

export const AKAD_LABELS: Record<PartnershipAkad, string> = { IJARAH: 'Ijarah (lease)', MUSHARAKAH: 'Musharakah (partnership)' };
export const PREFERRED_AKAD_LABELS: Record<PreferredAkad, string> = { ...AKAD_LABELS, EITHER: 'Either' };

/** What each akad means for the asset owner, shown next to the choice. */
export const AKAD_EXPLANATIONS: Record<PartnershipAkad, string> = {
  IJARAH: 'The project hires the asset for a known rent (ujrah) and period. The owner keeps ownership, major maintenance and takaful, and does not share in the project\'s profit or loss.',
  MUSHARAKAH: 'The asset becomes the owner\'s capital in the project at an agreed value. Profit is shared by the agreed ratio; losses are shared in proportion to capital.',
};

export const ENGAGEMENT_STATUS: Record<EngagementStatus, { label: string; className: string }> = {
  PROPOSED: { label: 'Under discussion', className: 'bg-blue-500/10 text-blue-600' },
  ACCEPTED: { label: 'Awaiting Legal & Shariah', className: 'bg-purple-500/10 text-purple-600' },
  APPROVED: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-600' },
  DECLINED: { label: 'Declined', className: 'bg-slate-500/10 text-slate-500' },
  WITHDRAWN: { label: 'Withdrawn', className: 'bg-slate-500/10 text-slate-500' },
  REJECTED: { label: 'Rejected in review', className: 'bg-rose-500/10 text-rose-600' },
};

export const NEED_STATUS: Record<'OPEN' | 'FILLED' | 'CLOSED', { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-emerald-500/10 text-emerald-600' },
  FILLED: { label: 'Filled', className: 'bg-blue-500/10 text-blue-600' },
  CLOSED: { label: 'Closed', className: 'bg-slate-500/10 text-slate-500' },
};

const HISTORY_ACTIONS: Record<string, string> = {
  PROPOSED: 'proposed', COUNTERED: 'made a counter-offer', ACCEPTED: 'accepted', DECLINED: 'declined', WITHDRAWN: 'withdrew',
  LEGAL_APPROVED: 'gave the Legal approval', LEGAL_REJECTED: 'rejected it (Legal)', SHARIAH_APPROVED: 'gave the Shariah approval', SHARIAH_REJECTED: 'rejected it (Shariah)',
  LEGAL_CHANGES_REQUESTED: 'asked for changes (Legal)', SHARIAH_CHANGES_REQUESTED: 'asked for changes (Shariah)',
};
export const historyAction = (action: string) => HISTORY_ACTIONS[action] ?? action.toLowerCase();
export const PARTY_LABELS: Record<'OWNER' | 'PDP' | 'REVIEW', string> = { OWNER: 'Asset owner', PDP: 'Delivery partner', REVIEW: 'Reviewer' };

function money(amount: number | undefined, currency = 'MYR') {
  if (amount === undefined) return '?';
  try { return new Intl.NumberFormat('en-MY', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); } catch { return `${currency} ${amount.toLocaleString()}`; }
}

/** One line, e.g. "RM 9,000.00 a month; day-to-day upkeep by the project" or "Asset valued RM 450,000.00 as capital; owner takes 30% of profit". */
export function describeTerms(akad: PartnershipAkad, terms: EngagementTerms): string {
  if (akad === 'IJARAH') return `${money(terms.rentAmount, terms.currency)} ${terms.rentFrequency === 'WHOLE_PERIOD' ? 'for the whole period' : 'a month'}; day-to-day upkeep by ${terms.upkeepBy === 'OWNER' ? 'the owner' : 'the project'}`;
  const owner = terms.contributionValue ?? 0;
  const pdp = terms.pdpContributionValue;
  const capital = pdp === undefined ? '; delivery partner\'s capital not stated' : owner + pdp > 0 ? `; delivery partner adds ${money(pdp, terms.currency)} (owner holds ${Math.round((owner / (owner + pdp)) * 1000) / 10}% of capital)` : '';
  return `Asset valued ${money(terms.contributionValue, terms.currency)} as capital; owner takes ${terms.profitSharePct ?? '?'}% of profit${capital}`;
}

/** What the viewer should do next, or who is being waited for. */
export function nextStep(engagement: AssetEngagement): string {
  const last = engagement.history[engagement.history.length - 1];
  if (engagement.status === 'PROPOSED' && last?.action?.endsWith('_CHANGES_REQUESTED')) return engagement.canRespond ? 'A reviewer asked for changes: send a counter-offer' : `Changes requested: waiting for the ${engagement.awaiting === 'OWNER' ? 'asset owner' : 'delivery partner'}`;
  if (engagement.canRespond) return 'Your response is needed';
  if (engagement.canReview) return 'Your review is needed';
  if (engagement.status === 'PROPOSED') return engagement.awaiting === 'OWNER' ? 'Waiting for the asset owner' : 'Waiting for the delivery partner';
  if (engagement.status === 'ACCEPTED') {
    if (engagement.legalApprovedAt && !engagement.shariahApprovedAt) return 'Waiting for the Shariah approval';
    if (engagement.shariahApprovedAt && !engagement.legalApprovedAt) return 'Waiting for the Legal approval';
    return 'Waiting for Legal and Shariah approval';
  }
  return ENGAGEMENT_STATUS[engagement.status].label;
}
