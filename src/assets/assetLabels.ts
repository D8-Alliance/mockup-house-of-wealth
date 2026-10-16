import { AssetDocumentType, AssetIntendedUse, AssetStatusCode, AssetTypeCode, LandDetailsInput } from '../services/apiClient';

export const ASSET_TYPE_LABELS: Record<AssetTypeCode, string> = {
  LAND: 'Land',
  BUILDING: 'Building',
  MACHINERY: 'Machinery',
  VEHICLE: 'Vehicle',
  EQUIPMENT: 'Equipment',
  OTHER: 'Other',
};

export const ASSET_USE_LABELS: Record<AssetIntendedUse, string> = {
  IJARAH: 'Ijarah: lease it out',
  MUSHARAKAH: 'Musharakah: contribute it to a partnership',
  MURABAHAH: 'Murabahah: sell it',
  UNDECIDED: 'Not decided yet',
};

export const ASSET_STATUS: Record<AssetStatusCode, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
  SUBMITTED: { label: 'Awaiting verification', className: 'bg-purple-500/10 text-purple-600' },
  CHANGES_REQUESTED: { label: 'Changes requested', className: 'bg-amber-500/10 text-amber-600' },
  VERIFIED: { label: 'Verified', className: 'bg-emerald-500/10 text-emerald-600' },
  REJECTED: { label: 'Rejected', className: 'bg-rose-500/10 text-rose-600' },
  WITHDRAWN: { label: 'Withdrawn', className: 'bg-slate-500/10 text-slate-500' },
};

export const ASSET_DOCUMENT_LABELS: Record<AssetDocumentType, { label: string; hint: string }> = {
  OWNERSHIP: { label: 'Proof of ownership', hint: 'Land title (geran), sale and purchase agreement, vehicle ownership certificate or purchase invoice. Required.' },
  OFFICIAL_SEARCH: { label: 'Official land search (Carian Rasmi)', hint: 'From the land office or registry, under 3 months old: it shows the owner and any charge or caveat today. Required for land.' },
  QUIT_RENT: { label: 'Quit rent receipt (cukai tanah)', hint: 'For this year or last year.' },
  VALUATION: { label: 'Valuation report', hint: 'By a registered valuer, ideally under 12 months old.' },
  INSURANCE: { label: 'Insurance or takaful', hint: 'Current policy covering the asset.' },
  SITE_PHOTO: { label: 'Site photo (with location)', hint: 'Taken on site with the camera button, so its location can be compared with the map pin.' },
  PHOTO: { label: 'Photo', hint: 'Photos of the asset as it is today.' },
  OTHER: { label: 'Other', hint: 'Any other supporting document.' },
};

/** Documents asked for, by asset type, in the order shown. Mirrors requiredDocuments() on the server. */
export function documentChecklist(assetType: AssetTypeCode): { type: AssetDocumentType; required: boolean }[] {
  if (assetType === 'LAND') return [
    { type: 'OWNERSHIP', required: true },
    { type: 'OFFICIAL_SEARCH', required: true },
    { type: 'QUIT_RENT', required: false },
    { type: 'VALUATION', required: false },
    { type: 'SITE_PHOTO', required: false },
  ];
  return [
    { type: 'OWNERSHIP', required: true },
    { type: 'VALUATION', required: false },
    { type: 'INSURANCE', required: false },
    { type: 'SITE_PHOTO', required: false },
  ];
}

/** On land, the proof of ownership is the title itself. */
export function documentLabel(type: AssetDocumentType, assetType: AssetTypeCode): string {
  return type === 'OWNERSHIP' && assetType === 'LAND' ? 'Land title (geran)' : ASSET_DOCUMENT_LABELS[type].label;
}

export const LAND_TITLE_TYPE_LABELS: Record<NonNullable<LandDetailsInput['titleType']>, string> = {
  GRN: 'GRN (Geran, registry title)',
  GM: 'GM (Geran Mukim, land office title)',
  PN: 'PN (Pajakan Negeri, state lease)',
  PM: 'PM (Pajakan Mukim, mukim lease)',
  HSD: 'HS(D) (qualified title, registry)',
  HSM: 'HS(M) (qualified title, land office)',
};
export const LAND_AREA_UNIT_LABELS: Record<NonNullable<LandDetailsInput['areaUnit']>, string> = { HECTARE: 'hectare', ACRE: 'acre', SQ_METRE: 'square metre', SQ_FEET: 'square feet' };
export const LAND_USE_LABELS: Record<NonNullable<LandDetailsInput['landUseCategory']>, string> = { AGRICULTURE: 'Agriculture (pertanian)', BUILDING: 'Building (bangunan)', INDUSTRY: 'Industry (perusahaan)', OTHER: 'Other' };
export const MALAYSIAN_STATES = ['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'Wilayah Persekutuan Kuala Lumpur', 'Wilayah Persekutuan Labuan', 'Wilayah Persekutuan Putrajaya'];

/** Asset owners may edit and add documents only while these apply. */
export const ASSET_EDITABLE: ReadonlySet<AssetStatusCode> = new Set(['DRAFT', 'CHANGES_REQUESTED']);

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}
