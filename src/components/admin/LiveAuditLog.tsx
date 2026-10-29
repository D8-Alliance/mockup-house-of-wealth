import React from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { apiClient, AuditEventPage, AuditEventQuery } from '../../services/apiClient';
import { useRBAC } from '../../rbac/RBACContext';
import { LedgerIntegrityPanel } from './LedgerIntegrityPanel';

const PAGE_SIZE = 50;

/** The server's append-only audit log, scoped to the viewer's tenant, with the hash-chain check above it. */
export const LiveAuditLog: React.FC = () => {
  const { currentRole } = useRBAC();
  const [filters, setFilters] = React.useState<AuditEventQuery>({});
  const [draft, setDraft] = React.useState<AuditEventQuery>({});
  const [page, setPage] = React.useState(1);
  const [result, setResult] = React.useState<AuditEventPage | null>(null);
  const [error, setError] = React.useState('');
  const [exporting, setExporting] = React.useState(false);

  const load = React.useCallback(() => {
    setError('');
    setResult(null);
    void apiClient.getAuditEvents({ ...filters, page, limit: PAGE_SIZE })
      .then(setResult)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'The audit log could not be loaded.'));
  }, [filters, page]);
  React.useEffect(load, [load]);

  // Dates from the inputs are days; the server takes ISO times, so "to" covers the whole day.
  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setFilters({
      action: draft.action?.trim() || undefined,
      resourceType: draft.resourceType?.trim() || undefined,
      from: draft.from ? new Date(`${draft.from}T00:00:00`).toISOString() : undefined,
      to: draft.to ? new Date(`${draft.to}T23:59:59`).toISOString() : undefined,
    });
  };

  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      await apiClient.exportAuditEvents(filters);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The export did not complete.');
    } finally {
      setExporting(false);
    }
  };

  const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';

  return (
    <div className="space-y-6">
      {(currentRole === 'Super Admin' || currentRole === 'Auditor') && <LedgerIntegrityPanel canSeal={currentRole === 'Super Admin'} />}

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Audit Log</h3>
            <p className="text-xs text-slate-500">Every recorded action in your scope, newest first. Records cannot be edited or deleted.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={load} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"><RefreshCw className="w-4 h-4" /> Refresh</button>
            <button type="button" disabled={exporting} onClick={() => void exportCsv()} className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"><Download className="w-4 h-4" /> {exporting ? 'Exporting...' : 'Export CSV'}</button>
          </div>
        </div>

        <form onSubmit={apply} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end text-xs">
          <label className="space-y-1"><span className="font-bold text-slate-500">Action</span><input className={input} placeholder="e.g. project.create" value={draft.action ?? ''} onChange={event => setDraft({ ...draft, action: event.target.value })} /></label>
          <label className="space-y-1"><span className="font-bold text-slate-500">Resource type</span><input className={input} placeholder="e.g. Project" value={draft.resourceType ?? ''} onChange={event => setDraft({ ...draft, resourceType: event.target.value })} /></label>
          <label className="space-y-1"><span className="font-bold text-slate-500">From</span><input type="date" className={input} value={draft.from ?? ''} onChange={event => setDraft({ ...draft, from: event.target.value })} /></label>
          <label className="space-y-1"><span className="font-bold text-slate-500">To</span><input type="date" className={input} value={draft.to ?? ''} onChange={event => setDraft({ ...draft, to: event.target.value })} /></label>
          <button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"><Search className="w-4 h-4" /> Filter</button>
        </form>

        {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
        {!result && !error && <p className="text-xs text-slate-500">Loading...</p>}
        {result && result.data.length === 0 && <p className="text-xs text-slate-500">No audit event matches.</p>}
        {result && result.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400">
                <tr className="text-left">
                  <th className="px-3 py-2.5 font-black">When</th>
                  <th className="px-3 py-2.5 font-black">Who</th>
                  <th className="px-3 py-2.5 font-black">Action</th>
                  <th className="px-3 py-2.5 font-black">Resource</th>
                  <th className="px-3 py-2.5 font-black">Scope</th>
                  <th className="px-3 py-2.5 font-black">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {result.data.map(event => (
                  <tr key={event.id}>
                    <td className="px-3 py-2.5 whitespace-nowrap">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2.5">{event.userEmail ?? event.userId}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">{event.action}</td>
                    <td className="px-3 py-2.5">{event.resourceType} <span className="font-mono text-slate-400">{event.resourceId}</span></td>
                    <td className="px-3 py-2.5 font-mono text-slate-500">{[event.countryNodeId, event.organisationId].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-3 py-2.5">{event.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Page {result.page} of {result.totalPages} · {result.total.toLocaleString()} events</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40 cursor-pointer">Previous</button>
              <button type="button" disabled={page >= result.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40 cursor-pointer">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
