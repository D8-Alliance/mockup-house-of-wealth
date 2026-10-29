import { AssetDetailsInput, AssetDocumentType, AssetIntendedUse, AssetStatusCode, AssetTypeCode, BuildingDetailsInput, LandDetailsInput, VehicleDetailsInput } from '../services/apiClient';

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
  SERIAL_PLATE: { label: 'Serial plate photo', hint: "A clear, close photo of the manufacturer's plate on the machine, showing the serial number. Required for machinery." },
  DOSH_CERTIFICATE: { label: 'JKKP certificate of fitness (PMA)', hint: 'Required for cranes, hoists, boilers and pressure vessels. Must be current.' },
  INSPECTION: { label: 'PUSPAKOM inspection', hint: 'The latest periodic inspection report for a commercial vehicle.' },
  ROAD_TAX: { label: 'Road tax (LKM)', hint: 'Current road tax, from MyJPJ or the printed copy.' },
  ASSESSMENT: { label: 'Assessment bill (cukai pintu)', hint: 'From the local council, for this year or last year.' },
  COMPLETION_CERT: { label: 'Completion certificate (CCC / CF)', hint: 'Certificate of Completion and Compliance, or the older Certificate of Fitness for Occupation. Required for buildings.' },
  TENANCY: { label: 'Tenancy agreement', hint: "If the building is let: the current tenancy agreements, which show the rent and the tenants' business." },
  VALUATION: { label: 'Valuation report', hint: 'By a registered valuer, ideally under 12 months old.' },
  INSURANCE: { label: 'Insurance or takaful', hint: 'Current policy covering the asset.' },
  SITE_PHOTO: { label: 'Site photo (with location)', hint: 'Taken on site with the camera button, so its location can be compared with the map pin.' },
  PHOTO: { label: 'Photo', hint: 'Photos of the asset as it is today.' },
  OTHER: { label: 'Other', hint: 'Any other supporting document.' },
};

/** Documents asked for, by asset type, in the order shown. Mirrors requiredDocuments() on the server. */
export function documentChecklist(assetType: AssetTypeCode, details?: AssetDetailsInput | null): { type: AssetDocumentType; required: boolean }[] {
  if (assetType === 'LAND') return [
    { type: 'OWNERSHIP', required: true },
    { type: 'OFFICIAL_SEARCH', required: true },
    { type: 'QUIT_RENT', required: false },
    { type: 'VALUATION', required: false },
    { type: 'SITE_PHOTO', required: false },
  ];
  if (assetType === 'VEHICLE') return [
    { type: 'OWNERSHIP', required: true },
    { type: 'INSPECTION', required: false },
    { type: 'ROAD_TAX', required: false },
    { type: 'VALUATION', required: false },
    { type: 'INSURANCE', required: false },
    { type: 'SITE_PHOTO', required: false },
  ];
  if (assetType === 'MACHINERY' || assetType === 'EQUIPMENT') return [
    { type: 'OWNERSHIP', required: true },
    { type: 'SERIAL_PLATE', required: true },
    { type: 'DOSH_CERTIFICATE', required: Boolean(details?.requiresDoshCertificate) },
    // A partnership contribution or a sale needs an independent valuation (asset-structuring.ts), machines included.
    { type: 'VALUATION', required: false },
    { type: 'INSURANCE', required: false },
    { type: 'SITE_PHOTO', required: false },
  ];
  if (assetType === 'BUILDING') return [
    { type: 'OWNERSHIP', required: true },
    { type: 'COMPLETION_CERT', required: true },
    { type: 'ASSESSMENT', required: false },
    ...(details?.hasTenants ? [{ type: 'TENANCY' as const, required: false }] : []),
    { type: 'VALUATION', required: false },
    { type: 'INSURANCE', required: false },
    { type: 'SITE_PHOTO', required: false },
  ];
  return [
    { type: 'OWNERSHIP', required: true },
    { type: 'VALUATION', required: false },
    { type: 'INSURANCE', required: false },
    { type: 'SITE_PHOTO', required: false },
  ];
}

/** The proof of ownership is a different document for each type of asset. */
const OWNERSHIP_LABELS: Partial<Record<AssetTypeCode, { label: string; hint: string }>> = {
  LAND: { label: 'Land title (geran)', hint: 'A copy of the title, front and back pages. Required.' },
  VEHICLE: { label: 'JPJ ownership certificate (VOC)', hint: 'The vehicle ownership certificate, or the MyJPJ printout, showing the chassis and engine numbers. Required.' },
  MACHINERY: { label: 'Purchase invoice', hint: 'The invoice or sale agreement naming the buyer, model and serial number. Required.' },
  EQUIPMENT: { label: 'Purchase invoice', hint: 'The invoice or sale agreement naming the buyer, model and serial number. Required.' },
  BUILDING: { label: 'Title or sale agreement', hint: 'The individual or strata title; before the strata title is issued, the sale and purchase agreement. Required.' },
};

export function documentLabel(type: AssetDocumentType, assetType: AssetTypeCode): string {
  return (type === 'OWNERSHIP' && OWNERSHIP_LABELS[assetType]?.label) || ASSET_DOCUMENT_LABELS[type].label;
}

export function documentHint(type: AssetDocumentType, assetType: AssetTypeCode): string {
  return (type === 'OWNERSHIP' && OWNERSHIP_LABELS[assetType]?.hint) || ASSET_DOCUMENT_LABELS[type].hint;
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
export const VEHICLE_CATEGORY_LABELS: Record<NonNullable<VehicleDetailsInput['category']>, string> = { LORRY: 'Lorry', PRIME_MOVER: 'Prime mover', TRAILER: 'Trailer', TANKER: 'Tanker', BUS: 'Bus', OTHER: 'Other' };
export const BUILDING_TITLE_KIND_LABELS: Record<NonNullable<BuildingDetailsInput['titleKind']>, string> = { INDIVIDUAL: 'Own title (individual title)', STRATA: 'Strata title (a unit in a building)', MASTER_TITLE: 'Strata title not issued yet (master title)' };
export const BUILDING_USE_LABELS: Record<NonNullable<BuildingDetailsInput['buildingUse']>, string> = { RESIDENTIAL: 'Residential', COMMERCIAL: 'Commercial', INDUSTRIAL: 'Industrial', MIXED: 'Mixed use' };
export const FLOOR_AREA_UNIT_LABELS: Record<NonNullable<BuildingDetailsInput['floorAreaUnit']>, string> = { SQ_FEET: 'sq ft', SQ_METRE: 'sq m' };
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
