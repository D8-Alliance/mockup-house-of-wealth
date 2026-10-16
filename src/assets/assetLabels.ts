import { AssetDocumentType, AssetIntendedUse, AssetStatusCode, AssetTypeCode } from '../services/apiClient';

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
  OWNERSHIP: { label: 'Proof of ownership', hint: 'Land title or grant (geran), sale and purchase agreement, vehicle registration card or purchase invoice. Required.' },
  VALUATION: { label: 'Valuation report', hint: 'By a registered valuer, ideally under 12 months old.' },
  INSURANCE: { label: 'Insurance or takaful', hint: 'Current policy covering the asset.' },
  PHOTO: { label: 'Photo', hint: 'Photos of the asset as it is today.' },
  OTHER: { label: 'Other', hint: 'Any other supporting document.' },
};

/** Asset owners may edit and add documents only while these apply. */
export const ASSET_EDITABLE: ReadonlySet<AssetStatusCode> = new Set(['DRAFT', 'CHANGES_REQUESTED']);

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}
