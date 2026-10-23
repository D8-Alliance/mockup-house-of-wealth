import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Download, RefreshCw } from 'lucide-react';
import { apiClient, apiErrorMessage, OrganisationKyb, OrganisationKybStatus } from '../services/apiClient';
import { formatDateTimeWithZone } from '../utils/platformTime';
import { KYB_DOCUMENT_LABELS, KYB_STATUS } from './organisationKybLabels';

const FILTERS: Array<OrganisationKybStatus | 'ALL'> = ['SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'ALL'];

/** KYB reviewers check an organisation's registration number, address and SSM documents, then decide. */
export const OrganisationKybQueue: React.FC = () => {
  const [filter, setFilter] = useState<OrganisationKybStatus | 'ALL'>('SUBMITTED');
  const [items, setItems] = useState<OrganisationKyb[]>([]);
  const [selected, setSelected] = useState<OrganisationKyb | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    apiClient.getOrganisationKybQueue(filter).then(setItems).catch((cause) => setError(apiErrorMessage(cause, 'The queue could not be loaded.')));
  }, [filter]);
  useEffect(load, [load]);

  const decide = async (decision: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT') => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      setSelected(await apiClient.reviewOrganisationKyb(selected.id, { decision, note }));
      setNote('');
      load();
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The decision was not saved.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" />Organisation verification (KYB)</h3>
          <p className="text-slate-500">Check the registration number and registered address against the SSM documents. Delivery partners are verified through their PDP application.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`px-3 py-1 rounded-full font-bold border cursor-pointer ${filter === value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{value === 'ALL' ? 'All' : KYB_STATUS[value].label}</button>)}
          <button type="button" onClick={load} className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 font-bold">{error}</p>}
      <table className="w-full text-left">
        <thead><tr className="text-[10px] uppercase text-slate-400"><th className="py-2">Organisation</th><th>Registration no.</th><th>Status</th><th>Submitted</th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onClick={() => { setSelected(item); setNote(''); }} className={`border-t border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 ${selected?.id === item.id ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''}`}>
              <td className="py-2 font-bold text-slate-800 dark:text-slate-100">{item.name}</td>
              <td className="font-mono">{item.registrationNumber ?? '-'}</td>
              <td><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${KYB_STATUS[item.kybStatus].className}`}>{KYB_STATUS[item.kybStatus].label}</span></td>
              <td className="text-slate-500">{item.kybSubmittedAt ? formatDateTimeWithZone(item.kybSubmittedAt) : '-'}</td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">Nothing here.</td></tr>}
        </tbody>
      </table>

      {selected && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <p className="font-black text-sm text-slate-900 dark:text-white">{selected.name}</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <p><span className="text-slate-400">Registration number:</span> <strong className="font-mono">{selected.registrationNumber ?? '-'}</strong></p>
            <p><span className="text-slate-400">Registered address:</span> {selected.registeredAddress ?? '-'}</p>
          </div>
          <div className="space-y-1">
            {selected.kybDocuments.map((document) => (
              <button key={document.id} type="button" onClick={() => void apiClient.downloadOrganisationKybDocument(selected.id, document.id)} className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 cursor-pointer text-left">
                <span><strong>{KYB_DOCUMENT_LABELS[document.documentType]}</strong> · {document.fileName} <span className="font-mono text-slate-400">SHA-256 {document.sha256.slice(0, 12)}…</span></span>
                <Download className="w-3.5 h-3.5 text-slate-500" />
              </button>
            ))}
          </div>
          {selected.kybHistory.length > 0 && <ul className="space-y-0.5 text-slate-500">{selected.kybHistory.map((entry, index) => <li key={index}>{formatDateTimeWithZone(entry.at)} · {entry.byName} ({entry.role}) {entry.action.toLowerCase().replace('_', ' ')}{entry.note ? `: "${entry.note}"` : ''}</li>)}</ul>}
          {selected.kybStatus === 'SUBMITTED' && (
            <div className="space-y-2">
              <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What you checked, or what must change (required)" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" disabled={busy || note.trim().length < 3} onClick={() => void decide('REJECT')} className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-600 font-bold cursor-pointer disabled:opacity-50">Reject</button>
                <button type="button" disabled={busy || note.trim().length < 3} onClick={() => void decide('REQUEST_CHANGES')} className="px-4 py-2 rounded-xl border border-amber-400 text-amber-700 font-bold cursor-pointer disabled:opacity-50">Request changes</button>
                <button type="button" disabled={busy || note.trim().length < 3} onClick={() => void decide('APPROVE')} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50">Verify</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
