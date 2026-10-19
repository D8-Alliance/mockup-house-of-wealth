import React, { useState } from 'react';
import { Handshake } from 'lucide-react';
import { apiClient, apiErrorMessage, AssetListingInput, PreferredAkad, RegisteredAsset } from '../services/apiClient';
import { INPUT, LABEL } from './EngagementTermsFields';
import { PREFERRED_AKAD_LABELS } from './partnershipLabels';

/**
 * The owner chooses whether delivery partners in the country may see this verified asset and ask to
 * use it. They see what it is and roughly where, never its title, lot, chassis or serial number,
 * or the owner's name, until a deal is approved.
 */
export const AssetListingPanel: React.FC<{ asset: RegisteredAsset; onChanged: (asset: RegisteredAsset) => void }> = ({ asset, onChanged }) => {
  const terms = asset.offerTerms;
  const [form, setForm] = useState<AssetListingInput>({
    offered: Boolean(asset.offeredToPdp),
    preferredAkad: terms?.preferredAkad ?? 'EITHER',
    availableFrom: terms?.availableFrom ?? '',
    availableUntil: terms?.availableUntil ?? '',
    indicativeTerms: terms?.indicativeTerms ?? '',
    note: terms?.note ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof AssetListingInput>(key: K, value: AssetListingInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (offered: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await apiClient.setAssetListing(asset.id, { ...form, offered, availableFrom: form.availableFrom || undefined, availableUntil: form.availableUntil || undefined });
      set('offered', saved.offeredToPdp);
      onChanged({ ...asset, offeredToPdp: saved.offeredToPdp, offerTerms: saved.offerTerms });
      setMessage({ ok: true, text: saved.offeredToPdp ? 'Delivery partners in your country can now see this asset and ask to use it.' : 'The asset is no longer offered. Discussions already started continue.' });
    } catch (cause) {
      setMessage({ ok: false, text: apiErrorMessage(cause, 'Not saved.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5"><Handshake className="w-4 h-4 text-emerald-600" />Offer to delivery partners</h3>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${form.offered ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'}`}>{form.offered ? 'Offered' : 'Not offered'}</span>
      </div>
      <p className="text-[11px] text-slate-500">Delivery partners (PDPs) in your country see what the asset is and roughly where, not its title, lot, chassis or serial number, nor your name, until a deal is approved by Legal and Shariah.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="listing-akad" className={LABEL}>Open to</label>
          <select id="listing-akad" value={form.preferredAkad} onChange={(e) => set('preferredAkad', e.target.value as PreferredAkad)} className={`${INPUT} cursor-pointer`}>
            {(Object.keys(PREFERRED_AKAD_LABELS) as PreferredAkad[]).map((akad) => <option key={akad} value={akad}>{PREFERRED_AKAD_LABELS[akad]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="listing-from" className={LABEL}>Available from</label>
          <input id="listing-from" type="date" value={form.availableFrom} onChange={(e) => set('availableFrom', e.target.value)} className={INPUT} />
        </div>
        <div>
          <label htmlFor="listing-until" className={LABEL}>Available until</label>
          <input id="listing-until" type="date" value={form.availableUntil} onChange={(e) => set('availableUntil', e.target.value)} className={INPUT} />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="listing-terms" className={LABEL}>Indicative terms (optional)</label>
          <input id="listing-terms" maxLength={300} value={form.indicativeTerms} onChange={(e) => set('indicativeTerms', e.target.value)} placeholder="e.g. RM 9,000 a month with operator, or 30% profit share" className={INPUT} />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="listing-note" className={LABEL}>Note to delivery partners (optional)</label>
          <textarea id="listing-note" rows={2} maxLength={1000} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Condition, what comes with it, minimum period…" className={INPUT} />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {form.offered && <button type="button" disabled={saving} onClick={() => void save(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50">Stop offering</button>}
        <button type="button" disabled={saving} onClick={() => void save(true)} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">{saving ? 'Saving…' : form.offered ? 'Save changes' : 'Offer to delivery partners'}</button>
      </div>
      {message && <p className={`text-xs font-bold ${message.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{message.text}</p>}
    </section>
  );
};
