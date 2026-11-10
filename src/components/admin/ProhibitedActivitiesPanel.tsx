import React from 'react';
import { Ban } from 'lucide-react';
import { apiClient, apiErrorMessage, CountryNodeRow } from '../../services/apiClient';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';

/**
 * The words that flag an activity as not Shariah-compliant in the asset, partnership and lease checks: the
 * platform's own list (fixed in code) plus each country's extra words, which the Super Admin or the country's
 * Country Admin keeps here. A match is a flag for the Shariah reviewer, never a decision.
 */
export const ProhibitedActivitiesPanel: React.FC<{ nodes: CountryNodeRow[]; onSaved: () => void }> = ({ nodes, onSaved }) => {
  const [base, setBase] = React.useState<Array<{ label: string; terms: string[] }>>([]);
  const [code, setCode] = React.useState('');
  const [text, setText] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState('');

  React.useEffect(() => { apiClient.getProhibitedActivities().then(setBase).catch(() => setBase([])); }, []);
  React.useEffect(() => { if (!code && nodes.length) setCode(nodes[0].code); }, [nodes, code]);
  const node = nodes.find((item) => item.code === code);
  React.useEffect(() => { setText((node?.prohibitedActivityTerms ?? []).join('\n')); setReason(''); setDone(''); setError(''); }, [node]);

  const save = async () => {
    if (!node) return;
    setBusy(true);
    setError('');
    setDone('');
    try {
      const terms = text.split(/[\n,]/).map((term) => term.trim()).filter(Boolean);
      const saved = await apiClient.setCountryProhibitedActivities(node.code, terms, reason.trim());
      setDone(`${node.name}: ${saved.prohibitedActivityTerms.length} word(s) saved. They apply to new checks from now on.`);
      setReason('');
      onSaved();
    } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 text-xs">
      <div>
        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2"><Ban className="w-4 h-4 text-rose-600" />Prohibited activities</h4>
        <p className="text-slate-500">Words that flag an asset's tenants, a project or a lease as possibly not Shariah-compliant. A match is shown to the Shariah reviewer, who decides. The platform's list applies everywhere; each country can add its own words.</p>
      </div>
      {base.length > 0 && (
        <details className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3">
          <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-300">Platform list (all countries)</summary>
          <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
            {base.map((category) => <li key={category.label}><strong>{category.label}:</strong> {category.terms.join(', ')}</li>)}
          </ul>
        </details>
      )}
      {nodes.length === 0 ? <p className="text-slate-500">No country node to set.</p> : (
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <label className="font-bold text-slate-600 dark:text-slate-300">Country
            <select value={code} onChange={(event) => setCode(event.target.value)} className={`${INPUT} mt-1`}>
              {nodes.map((item) => <option key={item.code} value={item.code}>{item.name} ({(item.prohibitedActivityTerms ?? []).length})</option>)}
            </select>
          </label>
          <div className="space-y-2">
            <label className="block font-bold text-slate-600 dark:text-slate-300">Extra words for this country, one per line
              <textarea rows={5} value={text} onChange={(event) => setText(event.target.value)} placeholder={'e.g.\nshisha\ntarot'} className={`${INPUT} mt-1 font-mono`} />
            </label>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for the change (kept in the audit log)" className={INPUT} />
            <div className="flex justify-end">
              <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => void save()} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">{busy ? 'Saving…' : 'Save words'}</button>
            </div>
          </div>
        </div>
      )}
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {done && <p role="status" className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300">{done}</p>}
    </div>
  );
};
