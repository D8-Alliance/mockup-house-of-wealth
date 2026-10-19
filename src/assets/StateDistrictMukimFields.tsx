import React, { useState } from 'react';
import { MALAYSIAN_STATES } from './assetLabels';
import { DISTRICTS_BY_STATE, locationLabels, MUKIM_SUGGESTIONS } from './malaysiaLocations';

const INPUT = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
const LABEL = 'text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1';
const OTHER = '__other__';

export interface PlaceValue {
  state?: string;
  district?: string;
  mukim?: string;
}

interface StateDistrictMukimFieldsProps {
  idPrefix: string;
  value: PlaceValue;
  onChange: (patch: PlaceValue) => void;
}

/**
 * State, then a district from that state's list, then the mukim typed with suggestions for the
 * district. "Other" lets the owner type a district missing from the list.
 */
export const StateDistrictMukimFields: React.FC<StateDistrictMukimFieldsProps> = ({ idPrefix, value, onChange }) => {
  const districts = value.state ? DISTRICTS_BY_STATE[value.state] : undefined;
  const [typingDistrict, setTypingDistrict] = useState(Boolean(value.district && districts && !districts.includes(value.district)));
  const labels = locationLabels(value.state);
  const mukims = value.state && value.district ? MUKIM_SUGGESTIONS[`${value.state}|${value.district}`] ?? [] : [];
  const listId = `${idPrefix}-mukim-list`;

  const chooseState = (state: string | undefined) => {
    const stillThere = state && value.district && DISTRICTS_BY_STATE[state]?.includes(value.district);
    setTypingDistrict(false);
    // A one-district territory (Kuala Lumpur, Labuan, Putrajaya, Perlis) fills itself in.
    const only = state && DISTRICTS_BY_STATE[state]?.length === 1 ? DISTRICTS_BY_STATE[state][0] : undefined;
    onChange(stillThere ? { state } : { state, district: only, mukim: undefined });
  };

  const chooseDistrict = (choice: string) => {
    if (choice === OTHER) { setTypingDistrict(true); onChange({ district: undefined, mukim: undefined }); return; }
    onChange({ district: choice || undefined, mukim: choice === value.district ? value.mukim : undefined });
  };

  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-state`} className={LABEL}>State</label>
        <select id={`${idPrefix}-state`} value={value.state ?? ''} onChange={(e) => chooseState(e.target.value || undefined)} className={`${INPUT} cursor-pointer`}>
          <option value="">Choose…</option>
          {MALAYSIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-district`} className={LABEL}>{labels.district}</label>
        {districts && !typingDistrict ? (
          <select id={`${idPrefix}-district`} value={value.district ?? ''} onChange={(e) => chooseDistrict(e.target.value)} className={`${INPUT} cursor-pointer`}>
            <option value="">Choose…</option>
            {districts.map((district) => <option key={district} value={district}>{district}</option>)}
            <option value={OTHER}>Other (type it)</option>
          </select>
        ) : (
          <div className="flex gap-1">
            <input id={`${idPrefix}-district`} maxLength={80} disabled={!value.state} value={value.district ?? ''} onChange={(e) => onChange({ district: e.target.value })} placeholder={value.state ? 'As on the title' : 'Choose the state first'} className={INPUT} />
            {districts && <button type="button" onClick={() => { setTypingDistrict(false); onChange({ district: undefined, mukim: undefined }); }} title="Choose from the list" className="px-2 text-xs font-bold text-emerald-600 cursor-pointer">List</button>}
          </div>
        )}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-mukim`} className={LABEL}>{labels.mukim}</label>
        <input id={`${idPrefix}-mukim`} list={mukims.length ? listId : undefined} maxLength={80} value={value.mukim ?? ''} onChange={(e) => onChange({ mukim: e.target.value })} placeholder={labels.mukimPlaceholder} className={INPUT} />
        {mukims.length > 0 && <datalist id={listId}>{mukims.map((mukim) => <option key={mukim} value={mukim} />)}</datalist>}
      </div>
    </>
  );
};
