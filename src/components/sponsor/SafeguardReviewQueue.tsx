import React, { useCallback, useEffect, useState } from 'react';
import { Landmark, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiClient, SafeguardQueue } from '../../services/apiClient';
import { ProjectSafeguardsPanel, COVER_TYPE_LABELS } from './ProjectSafeguardsPanel';
import { formatProjectMoney } from './sponsorMoney';

/** Finance and Risk staff: evidence of funds, deposits to record and takaful policies to verify, in their country. */
export const SafeguardReviewQueue: React.FC = () => {
  const [queue, setQueue] = useState<SafeguardQueue | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    apiClient.getSafeguardQueue().then(setQueue).catch((cause) => setError(cause instanceof Error ? cause.message : 'The queue could not be loaded.'));
  }, []);
  useEffect(load, [load]);
  if (!queue && !error) return null;
  const count = (queue?.capital.length ?? 0) + (queue?.policies.length ?? 0);

  return (
    <section id="safeguard-queue" className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 text-xs">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white"><Landmark className="w-4 h-4 text-emerald-600" />Capital and takaful to check ({count})</h3>
        <button type="button" onClick={load} className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>
      {error && <p className="text-rose-600 font-bold">{error}</p>}
      {queue && count === 0 && <p className="text-slate-500">Nothing waiting.</p>}
      {queue?.capital.map((item) => (
        <button key={item.id} type="button" onClick={() => setOpen(open === item.projectId ? null : item.projectId)} className="w-full flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 cursor-pointer text-left">
          <span><Landmark className="inline w-3.5 h-3.5 mr-1 text-slate-500" /><strong>{item.project.projectName}</strong> · {item.partyName} · {formatProjectMoney(Number(item.amount), item.currency)}</span>
          <span className="font-bold text-blue-700 dark:text-blue-300">{item.status === 'EVIDENCE_SUBMITTED' ? 'Evidence to check' : 'Deposit to record'}</span>
        </button>
      ))}
      {queue?.policies.map((item) => (
        <button key={item.id} type="button" onClick={() => setOpen(open === item.projectId ? null : item.projectId)} className="w-full flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 cursor-pointer text-left">
          <span><ShieldCheck className="inline w-3.5 h-3.5 mr-1 text-slate-500" /><strong>{item.project.projectName}</strong> · {COVER_TYPE_LABELS[item.coverType]} · {item.provider} {item.policyNumber}{item.conventional ? ' (conventional)' : ''}</span>
          <span className="font-bold text-blue-700 dark:text-blue-300">Policy to verify</span>
        </button>
      ))}
      {open && <div className="pt-2 border-t border-slate-100 dark:border-slate-700"><ProjectSafeguardsPanel projectId={open} onChanged={load} /></div>}
    </section>
  );
};
