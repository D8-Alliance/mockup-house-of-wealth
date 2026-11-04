import React from 'react';
import { Plus, Scale, Star, Trash2 } from 'lucide-react';
import { apiClient, apiErrorMessage, EstateExecutor, EstateExecutorInput } from '../services/apiClient';

const KINDS: Record<EstateExecutorInput['kind'], string> = {
  INDIVIDUAL: 'A person (family member or friend)',
  AMANAH_RAYA: 'Amanah Raya Berhad',
  TRUST_COMPANY: 'Trust company',
  LAWYER: 'Lawyer',
};
const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';
const blank = (): EstateExecutorInput => ({ name: '', kind: 'INDIVIDUAL', relation: '', email: '', phone: '', identityNumber: '', isPrimary: false });

/**
 * The owner's executor (wasi) or administrator, and how a death is reported. The executor, or any beneficiary
 * recorded here, reports it on the death report page with the last four characters of their own ID number.
 */
export const EstateExecutorsPanel: React.FC = () => {
  const [rows, setRows] = React.useState<EstateExecutor[] | null>(null);
  const [editing, setEditing] = React.useState<{ id?: string; input: EstateExecutorInput } | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(() => { apiClient.getEstateExecutors().then(setRows).catch((cause) => { setRows([]); setError(apiErrorMessage(cause, 'Executors could not be loaded.')); }); }, []);
  React.useEffect(load, [load]);
  const reportLink = `${window.location.origin}/m/estate/report`;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try { await action(); setEditing(null); load(); } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(false); }
  };
  const set = (patch: Partial<EstateExecutorInput>) => editing && setEditing({ ...editing, input: { ...editing.input, ...patch } });

  return (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 text-xs">
      <div>
        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2"><Scale className="w-5 h-5 text-emerald-600" />Executor or administrator (wasi)</h3>
        <p className="text-slate-500">Who handles your estate. In Malaysia a Muslim's estate is usually administered by a family member under a letter of administration, or by Amanah Raya Berhad; a will names an executor. Their ID number lets them report your death to the platform.</p>
      </div>
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {rows === null && <p className="text-slate-500">Loading…</p>}
      {rows?.length === 0 && !editing && <p className="text-slate-500">No executor recorded yet.</p>}
      {rows && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black text-slate-900 dark:text-white flex items-center gap-1">{row.isPrimary && <Star className="w-3.5 h-3.5 text-amber-500" />}{row.name}</p>
                <p className="text-slate-500">{KINDS[row.kind]}{row.relation ? ` · ${row.relation}` : ''}{row.identityNumberMasked ? ` · ID ${row.identityNumberMasked}` : ' · no ID number yet'}</p>
              </div>
              <span className="flex gap-2">
                <button type="button" onClick={() => setEditing({ id: row.id, input: { name: row.name, kind: row.kind, relation: row.relation ?? '', email: row.email ?? '', phone: row.phone ?? '', identityNumber: '', isPrimary: row.isPrimary } })} className="text-emerald-700 dark:text-emerald-300 font-bold cursor-pointer">Edit</button>
                <button type="button" aria-label={`Remove ${row.name}`} disabled={busy} onClick={() => void run(() => apiClient.deleteEstateExecutor(row.id))} className="text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </span>
            </div>
          ))}
        </div>
      )}
      {!editing && <button type="button" onClick={() => setEditing({ input: blank() })} className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1.5 cursor-pointer"><Plus className="w-3.5 h-3.5" />Add executor</button>}
      {editing && (
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="font-bold text-slate-600 dark:text-slate-300">Name<input value={editing.input.name} onChange={(event) => set({ name: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="font-bold text-slate-600 dark:text-slate-300">Type<select value={editing.input.kind} onChange={(event) => set({ kind: event.target.value as EstateExecutorInput['kind'] })} className={`${INPUT} mt-1 font-normal`}>{(Object.keys(KINDS) as EstateExecutorInput['kind'][]).map((kind) => <option key={kind} value={kind}>{KINDS[kind]}</option>)}</select></label>
            <label className="font-bold text-slate-600 dark:text-slate-300">Relation (optional)<input value={editing.input.relation} onChange={(event) => set({ relation: event.target.value })} placeholder="e.g. Sister" className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="font-bold text-slate-600 dark:text-slate-300">ID, passport or company no.{editing.id ? ' (leave empty to keep)' : ''}<input value={editing.input.identityNumber} onChange={(event) => set({ identityNumber: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="font-bold text-slate-600 dark:text-slate-300">Email (optional)<input value={editing.input.email} onChange={(event) => set({ email: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="font-bold text-slate-600 dark:text-slate-300">Phone (optional)<input value={editing.input.phone} onChange={(event) => set({ phone: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
          </div>
          <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={editing.input.isPrimary} onChange={(event) => set({ isPrimary: event.target.checked })} />Main executor</label>
          <div className="flex gap-2">
            <button type="button" disabled={busy || editing.input.name.trim().length < 2} onClick={() => void run(() => apiClient.saveEstateExecutor({ ...editing.input, relation: editing.input.relation || undefined, email: editing.input.email || undefined, phone: editing.input.phone || undefined, identityNumber: editing.input.identityNumber || undefined }, editing.id))} className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer disabled:opacity-50">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 font-bold cursor-pointer">Cancel</button>
          </div>
        </div>
      )}
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 space-y-1">
        <p className="font-bold">If you pass away</p>
        <p>Your executor, or a beneficiary you recorded with their ID number, reports it at <span className="font-mono break-all">{reportLink}</span> with the death certificate. An estate officer verifies it, freezes your account, and passes your investments on according to the faraid certificate, probate or letters of administration, guided by the instructions on this page. Tell your executor where to find this link.</p>
      </div>
    </section>
  );
};
