import React from 'react';
import { LandDetailsInput } from '../services/apiClient';
import { LAND_AREA_UNIT_LABELS, LAND_TITLE_TYPE_LABELS, LAND_USE_LABELS, MALAYSIAN_STATES } from './assetLabels';

const INPUT = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
const LABEL = 'text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1';

interface LandDetailsFieldsProps {
  value: LandDetailsInput;
  onChange: (value: LandDetailsInput) => void;
}

/** The land title as printed on the geran. Saved with the draft; all of it is needed to submit. */
export const LandDetailsFields: React.FC<LandDetailsFieldsProps> = ({ value, onChange }) => {
  const set = <K extends keyof LandDetailsInput>(key: K, next: LandDetailsInput[K]) => onChange({ ...value, [key]: next });
  return (
    <fieldset className="sm:col-span-2 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
      <legend className="px-2 text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase">Land title details (as on the geran)</legend>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="land-title-type" className={LABEL}>Title type</label>
          <select id="land-title-type" value={value.titleType ?? ''} onChange={(e) => set('titleType', (e.target.value || undefined) as LandDetailsInput['titleType'])} className={`${INPUT} cursor-pointer`}>
            <option value="">Choose…</option>
            {(Object.keys(LAND_TITLE_TYPE_LABELS) as Array<keyof typeof LAND_TITLE_TYPE_LABELS>).map((type) => <option key={type} value={type}>{LAND_TITLE_TYPE_LABELS[type]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="land-title-no" className={LABEL}>Title number</label>
          <input id="land-title-no" maxLength={40} value={value.titleNumber ?? ''} onChange={(e) => set('titleNumber', e.target.value)} placeholder="e.g. 56789" className={INPUT} />
        </div>
        <div>
          <label htmlFor="land-lot" className={LABEL}>Lot number</label>
          <input id="land-lot" maxLength={40} value={value.lotNumber ?? ''} onChange={(e) => set('lotNumber', e.target.value)} placeholder="e.g. 1234" className={INPUT} />
        </div>
        <div>
          <label htmlFor="land-mukim" className={LABEL}>Mukim / town</label>
          <input id="land-mukim" maxLength={80} value={value.mukim ?? ''} onChange={(e) => set('mukim', e.target.value)} placeholder="e.g. Semenyih" className={INPUT} />
        </div>
        <div>
          <label htmlFor="land-district" className={LABEL}>District</label>
          <input id="land-district" maxLength={80} value={value.district ?? ''} onChange={(e) => set('district', e.target.value)} placeholder="e.g. Hulu Langat" className={INPUT} />
        </div>
        <div>
          <label htmlFor="land-state" className={LABEL}>State</label>
          <select id="land-state" value={value.state ?? ''} onChange={(e) => set('state', e.target.value || undefined)} className={`${INPUT} cursor-pointer`}>
            <option value="">Choose…</option>
            {MALAYSIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="land-area" className={LABEL}>Area</label>
            <input id="land-area" type="number" min={0} step="0.0001" value={value.areaValue ?? ''} onChange={(e) => set('areaValue', e.target.value === '' ? undefined : Number(e.target.value))} className={INPUT} />
          </div>
          <div>
            <label htmlFor="land-unit" className={LABEL}>Unit</label>
            <select id="land-unit" value={value.areaUnit ?? 'HECTARE'} onChange={(e) => set('areaUnit', e.target.value as LandDetailsInput['areaUnit'])} className={`${INPUT} cursor-pointer`}>
              {(Object.keys(LAND_AREA_UNIT_LABELS) as Array<keyof typeof LAND_AREA_UNIT_LABELS>).map((unit) => <option key={unit} value={unit}>{LAND_AREA_UNIT_LABELS[unit]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="land-use" className={LABEL}>Land use category</label>
          <select id="land-use" value={value.landUseCategory ?? ''} onChange={(e) => set('landUseCategory', (e.target.value || undefined) as LandDetailsInput['landUseCategory'])} className={`${INPUT} cursor-pointer`}>
            <option value="">Choose…</option>
            {(Object.keys(LAND_USE_LABELS) as Array<keyof typeof LAND_USE_LABELS>).map((use) => <option key={use} value={use}>{LAND_USE_LABELS[use]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="land-share" className={LABEL}>Share held</label>
          <input id="land-share" maxLength={20} value={value.ownershipShare ?? ''} onChange={(e) => set('ownershipShare', e.target.value)} placeholder="e.g. 1/1 or 1/2" className={INPUT} />
        </div>
        <div>
          <label htmlFor="land-tenure" className={LABEL}>Tenure</label>
          <select id="land-tenure" value={value.tenure ?? ''} onChange={(e) => set('tenure', (e.target.value || undefined) as LandDetailsInput['tenure'])} className={`${INPUT} cursor-pointer`}>
            <option value="">Choose…</option>
            <option value="FREEHOLD">Freehold (selama-lamanya)</option>
            <option value="LEASEHOLD">Leasehold (pajakan)</option>
          </select>
        </div>
        {value.tenure === 'LEASEHOLD' && (
          <div>
            <label htmlFor="land-lease" className={LABEL}>Lease expiry</label>
            <input id="land-lease" type="date" value={value.leaseExpiry?.slice(0, 10) ?? ''} onChange={(e) => set('leaseExpiry', e.target.value || undefined)} className={INPUT} />
          </div>
        )}
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer self-end pb-3">
          <input type="checkbox" checked={Boolean(value.malayReserve)} onChange={(e) => set('malayReserve', e.target.checked)} className="accent-emerald-600" />
          Malay reserve land (Tanah Rizab Melayu)
        </label>
      </div>
      <div>
        <label htmlFor="land-restrictions" className={LABEL}>Express conditions and restrictions in interest (optional)</label>
        <textarea id="land-restrictions" rows={2} maxLength={1000} value={value.restrictions ?? ''} onChange={(e) => set('restrictions', e.target.value)} placeholder="Syarat nyata and sekatan kepentingan, as on the title" className={INPUT} />
      </div>
    </fieldset>
  );
};
