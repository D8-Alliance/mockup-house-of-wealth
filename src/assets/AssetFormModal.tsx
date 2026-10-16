import React, { useState } from 'react';
import { Building2, X } from 'lucide-react';
import { apiClient, apiErrorMessage, AssetInput, AssetIntendedUse, AssetTypeCode, RegisteredAsset } from '../services/apiClient';
import { ASSET_TYPE_LABELS, ASSET_USE_LABELS } from './assetLabels';
import { LandDetailsFields } from './LandDetailsFields';
import { LocationPicker } from './LocationPicker';

interface AssetFormModalProps {
  /** Editing an existing draft; omitted for a new asset. */
  asset?: RegisteredAsset;
  defaultCurrency?: string;
  onClose: () => void;
  onSaved: (asset: RegisteredAsset) => void;
}

const CURRENCIES = ['MYR', 'IDR', 'TRY', 'BDT', 'EGP', 'NGN', 'PKR', 'IRR', 'USD'];
const INPUT = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
const LABEL = 'text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1';

/** Registers an asset as a draft (or edits one). Documents and submission follow on the asset's own page. */
export const AssetFormModal: React.FC<AssetFormModalProps> = ({ asset, defaultCurrency = 'MYR', onClose, onSaved }) => {
  const [form, setForm] = useState<AssetInput>({
    assetType: asset?.assetType ?? 'LAND',
    name: asset?.name ?? '',
    description: asset?.description ?? '',
    location: asset?.location ?? '',
    titleReference: asset?.titleReference ?? '',
    estimatedValue: asset?.estimatedValue ?? 0,
    currency: asset?.currency ?? defaultCurrency,
    valuationDate: asset?.valuationDate ? asset.valuationDate.slice(0, 10) : '',
    valuerName: asset?.valuerName ?? '',
    isEncumbered: asset?.isEncumbered ?? false,
    encumbranceNote: asset?.encumbranceNote ?? '',
    intendedUse: asset?.intendedUse ?? 'UNDECIDED',
    latitude: asset?.latitude ?? undefined,
    longitude: asset?.longitude ?? undefined,
    land: asset?.details ?? { areaUnit: 'HECTARE' },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    // Land details are kept only for land; empty text fields are not sent.
    const land = form.assetType === 'LAND' && form.land ? Object.fromEntries(Object.entries(form.land).filter(([, value]) => value !== '' && value !== undefined)) as AssetInput['land'] : undefined;
    const input: AssetInput = { ...form, land, valuationDate: form.valuationDate || undefined, estimatedValue: Number(form.estimatedValue) };
    try {
      onSaved(asset ? await apiClient.updateAsset(asset.id, input) : await apiClient.createAsset(input));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The asset was not saved.'));
    } finally {
      setSaving(false);
    }
  };

  const titleHint = form.assetType === 'LAND' || form.assetType === 'BUILDING' ? 'Title or lot number, e.g. GRN 12345, Lot 678, Mukim Semenyih' : form.assetType === 'VEHICLE' ? 'Registration number' : 'Serial or registration number';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={(event) => void save(event)} onClick={(event) => event.stopPropagation()} className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{asset ? 'Edit asset' : 'Register an asset'}</h2>
              <p className="text-xs text-slate-500">Saved as a draft. Add proof of ownership next, then submit it for verification.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" title="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="asset-type" className={LABEL}>Type of asset</label>
            <select id="asset-type" value={form.assetType} onChange={(e) => set('assetType', e.target.value as AssetTypeCode)} className={`${INPUT} cursor-pointer`}>
              {(Object.keys(ASSET_TYPE_LABELS) as AssetTypeCode[]).map((type) => <option key={type} value={type}>{ASSET_TYPE_LABELS[type]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="asset-name" className={LABEL}>Name</label>
            <input id="asset-name" required minLength={3} maxLength={160} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. 5-acre agricultural land, Semenyih" className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="asset-location" className={LABEL}>Location or address</label>
            <input id="asset-location" maxLength={500} value={form.location} onChange={(e) => set('location', e.target.value)} className={INPUT} />
          </div>
          <div>
            <label htmlFor="asset-title" className={LABEL}>Title / registration reference</label>
            <input id="asset-title" maxLength={120} value={form.titleReference} onChange={(e) => set('titleReference', e.target.value)} placeholder={titleHint} className={INPUT} />
          </div>
          <div>
            <label htmlFor="asset-use" className={LABEL}>Intended Islamic contract</label>
            <select id="asset-use" value={form.intendedUse} onChange={(e) => set('intendedUse', e.target.value as AssetIntendedUse)} className={`${INPUT} cursor-pointer`}>
              {(Object.keys(ASSET_USE_LABELS) as AssetIntendedUse[]).map((use) => <option key={use} value={use}>{ASSET_USE_LABELS[use]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <label htmlFor="asset-value" className={LABEL}>Estimated value</label>
              <input id="asset-value" required type="number" min={1} step="0.01" value={form.estimatedValue || ''} onChange={(e) => set('estimatedValue', Number(e.target.value))} className={INPUT} />
            </div>
            <div>
              <label htmlFor="asset-currency" className={LABEL}>Currency</label>
              <select id="asset-currency" value={form.currency} onChange={(e) => set('currency', e.target.value)} className={`${INPUT} cursor-pointer`}>
                {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="asset-valued" className={LABEL}>Valuation date</label>
              <input id="asset-valued" type="date" value={form.valuationDate} onChange={(e) => set('valuationDate', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label htmlFor="asset-valuer" className={LABEL}>Valuer</label>
              <input id="asset-valuer" maxLength={160} value={form.valuerName} onChange={(e) => set('valuerName', e.target.value)} placeholder="Firm name" className={INPUT} />
            </div>
          </div>
          {form.assetType === 'LAND' && <LandDetailsFields value={form.land ?? {}} onChange={(land) => set('land', land)} />}
          <LocationPicker latitude={form.latitude} longitude={form.longitude} onChange={(latitude, longitude) => setForm((current) => ({ ...current, latitude, longitude }))} />
          <div className="sm:col-span-2">
            <label htmlFor="asset-description" className={LABEL}>Description</label>
            <textarea id="asset-description" rows={3} maxLength={2000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Size, condition, current use, tenants..." className={INPUT} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
              <input type="checkbox" checked={form.isEncumbered} onChange={(e) => set('isEncumbered', e.target.checked)} className="mt-0.5 accent-emerald-600" />
              <span>The asset is charged to a bank or otherwise pledged (for example under a home or business financing).</span>
            </label>
            {form.isEncumbered && (
              <input aria-label="Charge details" maxLength={500} value={form.encumbranceNote} onChange={(e) => set('encumbranceNote', e.target.value)} placeholder="Who holds the charge, and is the financing Islamic?" className={INPUT} />
            )}
          </div>
        </div>

        {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-60">{saving ? 'Saving…' : asset ? 'Save changes' : 'Save draft'}</button>
        </div>
      </form>
    </div>
  );
};
