import React from 'react';
import { EngagementTerms, PartnershipAkad } from '../services/apiClient';
import { AKAD_EXPLANATIONS, AKAD_LABELS } from './partnershipLabels';

export const INPUT = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
export const LABEL = 'text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1';

export interface EngagementDraft {
  akad: PartnershipAkad;
  terms: EngagementTerms;
  startDate: string;
  endDate: string;
}

export const emptyDraft = (akad: PartnershipAkad = 'IJARAH', startDate = '', endDate = ''): EngagementDraft => ({ akad, terms: { currency: 'MYR', rentFrequency: 'MONTHLY', upkeepBy: 'LESSEE' }, startDate, endDate });

/** The akad, its terms and the period. Ijarah asks for the rent; Musharakah for the asset's value and the owner's profit share. */
export const EngagementTermsFields: React.FC<{ value: EngagementDraft; onChange: (value: EngagementDraft) => void; idPrefix: string }> = ({ value, onChange, idPrefix }) => {
  const setTerms = (patch: Partial<EngagementTerms>) => onChange({ ...value, terms: { ...value.terms, ...patch } });
  const number = (raw: string) => (raw === '' ? undefined : Number(raw));
  return (
    <div className="space-y-3">
      <div>
        <span className={LABEL}>Akad</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(AKAD_LABELS) as PartnershipAkad[]).map((akad) => (
            <label key={akad} className={`p-3 rounded-xl border cursor-pointer text-xs ${value.akad === akad ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
              <span className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                <input type="radio" name={`${idPrefix}-akad`} checked={value.akad === akad} onChange={() => onChange({ ...value, akad })} className="accent-emerald-600" />
                {AKAD_LABELS[akad]}
              </span>
              <span className="block mt-1 text-[11px] text-slate-500">{AKAD_EXPLANATIONS[akad]}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {value.akad === 'IJARAH' ? (
          <>
            <div>
              <label htmlFor={`${idPrefix}-rent`} className={LABEL}>Rent (ujrah), {value.terms.currency ?? 'MYR'}</label>
              <input id={`${idPrefix}-rent`} type="number" min={0} step="0.01" value={value.terms.rentAmount ?? ''} onChange={(e) => setTerms({ rentAmount: number(e.target.value) })} className={INPUT} />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-frequency`} className={LABEL}>Paid</label>
              <select id={`${idPrefix}-frequency`} value={value.terms.rentFrequency ?? 'MONTHLY'} onChange={(e) => setTerms({ rentFrequency: e.target.value as EngagementTerms['rentFrequency'] })} className={`${INPUT} cursor-pointer`}>
                <option value="MONTHLY">Monthly</option>
                <option value="WHOLE_PERIOD">Once, for the whole period</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${idPrefix}-upkeep`} className={LABEL}>Day-to-day upkeep by</label>
              <select id={`${idPrefix}-upkeep`} value={value.terms.upkeepBy ?? 'LESSEE'} onChange={(e) => setTerms({ upkeepBy: e.target.value as EngagementTerms['upkeepBy'] })} className={`${INPUT} cursor-pointer`}>
                <option value="LESSEE">The project (fuel, operator, routine servicing)</option>
                <option value="OWNER">The asset owner</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor={`${idPrefix}-value`} className={LABEL}>Agreed value of the asset, {value.terms.currency ?? 'MYR'}</label>
              <input id={`${idPrefix}-value`} type="number" min={0} step="0.01" value={value.terms.contributionValue ?? ''} onChange={(e) => setTerms({ contributionValue: number(e.target.value) })} className={INPUT} />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-share`} className={LABEL}>Owner's profit share (%)</label>
              <input id={`${idPrefix}-share`} type="number" min={0.01} max={99.99} step="0.01" value={value.terms.profitSharePct ?? ''} onChange={(e) => setTerms({ profitSharePct: number(e.target.value) })} className={INPUT} />
            </div>
            <div className="hidden sm:block" />
          </>
        )}
        <div>
          <label htmlFor={`${idPrefix}-start`} className={LABEL}>From</label>
          <input id={`${idPrefix}-start`} type="date" value={value.startDate} onChange={(e) => onChange({ ...value, startDate: e.target.value })} className={INPUT} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-end`} className={LABEL}>Until</label>
          <input id={`${idPrefix}-end`} type="date" value={value.endDate} onChange={(e) => onChange({ ...value, endDate: e.target.value })} className={INPUT} />
        </div>
      </div>
      {value.akad === 'IJARAH' && <p className="text-[11px] text-slate-500">Major maintenance and takaful of the asset stay with the owner in an Ijarah; the rent can allow for them.</p>}
    </div>
  );
};
