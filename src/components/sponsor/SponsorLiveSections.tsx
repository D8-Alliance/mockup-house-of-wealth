import React from 'react';
import { Crown, Download, FileSpreadsheet } from 'lucide-react';
import { apiClient, BackendMembershipStatus } from '../../services/apiClient';
import { statementsApi, StatementFormat } from '../../services/statementsApi';
import { SponsorProject } from './SponsorTypes';

/** The sponsor's project statements, per project (server/src/statements). */
export const SponsorReportsLive: React.FC<{ projects: SponsorProject[] }> = ({ projects }) => {
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [busy, setBusy] = React.useState('');
  const [error, setError] = React.useState('');
  const download = async (projectId: string, format: StatementFormat) => {
    setBusy(`${projectId}-${format}`);
    setError('');
    try { await statementsApi.downloadProjectStatement(projectId, { from: from || undefined, to: to || undefined, format }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'The statement could not be generated.'); } finally { setBusy(''); }
  };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600" />Project statements</h3>
        <p className="text-slate-500">Each project's statement from the platform's records: capital raised, revenue and eligible costs reported, net result and investors' profit for the period. Leave the dates empty for the whole life of the project.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="font-bold text-slate-600 dark:text-slate-300">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="block mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" /></label>
        <label className="font-bold text-slate-600 dark:text-slate-300">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="block mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" /></label>
      </div>
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {projects.length === 0 ? <p className="text-slate-500">No projects yet.</p> : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div key={project.id} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <span><strong className="text-slate-900 dark:text-white">{project.title}</strong>{project.code ? <span className="text-slate-500"> · {project.code}</span> : null}</span>
              <span className="flex gap-2">
                {(['pdf', 'csv'] as StatementFormat[]).map((format) => (
                  <button key={format} type="button" disabled={busy === `${project.id}-${format}`} onClick={() => void download(project.id, format)} className="px-3 py-1.5 rounded-xl border border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"><Download className="w-3.5 h-3.5" />{format.toUpperCase()}</button>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-slate-500">Periodic performance reports for investors (actual against projected results) are not built yet; see PENDING_ACTIVITIES.</p>
    </div>
  );
};

/** The signed-in member's real plan, in place of the demo's PDP subscription tiers. */
export const SponsorMembershipCard: React.FC<{ onOpenMembership?: () => void }> = ({ onOpenMembership }) => {
  const [status, setStatus] = React.useState<BackendMembershipStatus | null>(null);
  React.useEffect(() => { apiClient.getMembershipStatus().then(setStatus).catch(() => setStatus(null)); }, []);
  if (!status) return null;
  const ending = status.lifecycleStatus === 'EXPIRING_SOON' || status.lifecycleStatus === 'GRACE';
  return (
    <div className={`rounded-3xl border p-5 flex flex-wrap items-center justify-between gap-3 text-xs ${ending ? 'border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
      <div className="flex items-center gap-3">
        <Crown className="w-5 h-5 text-amber-500" />
        <div>
          <p className="font-black text-slate-900 dark:text-white">{status.planName}</p>
          <p className="text-slate-500">{status.lifecycleStatus === 'FREE' ? 'Free plan' : status.lifecycleStatus === 'GRACE' ? `Ended; usable until ${status.graceEndsAt?.slice(0, 10) ?? ''}` : `${status.daysRemaining} days left in this ${status.billingInterval === 'annual' ? 'year' : 'month'}`}</p>
        </div>
      </div>
      {onOpenMembership && <button type="button" onClick={onOpenMembership} className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold cursor-pointer">Membership & billing</button>}
    </div>
  );
};
