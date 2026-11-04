import React from 'react';
import { FolderX } from 'lucide-react';
import { apiClient, apiErrorMessage, ManagedProject } from '../../services/apiClient';
import { useRBAC } from '../../rbac/RBACContext';
import { Card, label, TD, TH } from './AdminLivePlatformSections';

type Action = 'archive' | 'restore' | 'suspend' | 'resume';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';
const THEAD = 'bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400';
const PILL = 'text-[10px] font-black rounded-full px-2 py-0.5';
const ACTION_LABEL: Record<Action, string> = { archive: 'Archive', restore: 'Restore', suspend: 'Suspend', resume: 'Resume' };
const ACTION_HINT: Record<Action, string> = {
  archive: 'Takes the project out of every list. Unpaid orders are cancelled and its pools closed; investors are told not to transfer. Its records stay and it can be restored.',
  restore: 'Puts the project back in the lists. Its pools stay closed until they are reopened.',
  suspend: 'Pauses its open pools so no new investment is taken. Unpaid orders are kept; investors and the sponsor are told why.',
  resume: 'Reopens the pools the suspension paused, and tells investors and the sponsor.',
};
const STOPPING: Action[] = ['archive', 'suspend'];
const money = (amount: number, currency: string) => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/**
 * Super Admin and Country Admin handle a problem project, as in the mini-app's Manage projects: archive one with
 * no settled investor money (a duplicate, a mistake), or suspend a live one while it is looked into, and undo
 * either. Each step needs a reason, which the sponsor and investors see and the audit log keeps.
 */
export const ProblemProjectsSection: React.FC = () => {
  const { currentRole } = useRBAC();
  const manager = currentRole === 'Super Admin' || currentRole === 'Country Admin';
  const [projects, setProjects] = React.useState<ManagedProject[] | null>(null);
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'suspended' | 'archived'>('all');
  const [acting, setActing] = React.useState<{ project: ManagedProject; action: Action } | null>(null);
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    if (!manager) { setProjects([]); return; }
    apiClient.getManagedProjects().then(setProjects).catch((cause) => { setProjects([]); setError(apiErrorMessage(cause, 'Projects could not be loaded.')); });
  }, [manager]);
  React.useEffect(load, [load]);

  const run = async () => {
    if (!acting) return;
    setBusy(true);
    setError('');
    try {
      await apiClient.manageProject(acting.project.projectId, acting.action, reason.trim());
      setDone(`${acting.project.projectName}: ${ACTION_LABEL[acting.action].toLowerCase()} done.`);
      setActing(null);
      setReason('');
      load();
    } catch (cause) { setError(apiErrorMessage(cause, 'That did not go through.')); } finally { setBusy(false); }
  };

  const needle = query.trim().toLowerCase();
  const shown = (projects ?? []).filter((project) =>
    (filter === 'all' || (filter === 'suspended' ? project.suspendedAt : project.archivedAt))
    && (!needle || `${project.projectName} ${project.projectCode} ${project.organisationName}`.toLowerCase().includes(needle)));

  return (
    <Card icon={<FolderX className="w-5 h-5 text-rose-600" />} title="Problem Projects" lead="Archive a project with no settled investor money (a duplicate or a mistake), or suspend one while a problem is looked into. Each step needs a reason, which the sponsor and investors see and the audit log keeps.">
      {!manager && <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-xs text-slate-500">Only the Super Admin and Country Admins can archive or suspend projects.</p>}
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {done && <p role="status" className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-300">{done}</p>}
      {manager && (
        <div className="flex flex-wrap items-center gap-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, code or sponsor" className={`${INPUT} sm:w-72`} />
          {(['all', 'suspended', 'archived'] as const).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${filter === value ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{label(value)}</button>
          ))}
        </div>
      )}
      {manager && !projects && !error && <p className="text-xs text-slate-500">Loading...</p>}
      {manager && projects && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className={THEAD}><tr><th className={TH}>Project</th><th className={TH}>Status</th><th className={TH}>Money and pools</th><th className={TH}>Action</th></tr></thead>
            <tbody>
              {shown.map((project) => {
                const actions: Action[] = project.archivedAt ? ['restore'] : project.suspendedAt ? ['resume'] : project.hasSettledMoney ? ['suspend'] : ['suspend', 'archive'];
                const open = acting?.project.projectId === project.projectId;
                return (
                  <tr key={project.projectId} className={`border-t border-slate-100 dark:border-slate-700 align-top ${project.archivedAt ? 'bg-slate-50/70 dark:bg-slate-900/30' : ''}`}>
                    <td className={TD}>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{project.projectName}</p>
                      <p className="text-[11px] text-slate-500">{project.projectCode} · {project.organisationName} · {project.countryNodeId}</p>
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        <span className={`${PILL} bg-slate-500/10 text-slate-600 dark:text-slate-300`}>{label(project.status)}</span>
                        {project.archivedAt && <span className={`${PILL} bg-slate-500/15 text-slate-700 dark:text-slate-200`}>Archived</span>}
                        {project.suspendedAt && <span className={`${PILL} bg-rose-500/10 text-rose-700 dark:text-rose-300`}>Suspended</span>}
                      </div>
                      {(project.suspendedReason || project.archivedReason) && <p className="mt-1 text-[11px] italic text-slate-600 dark:text-slate-300">“{project.suspendedReason ?? project.archivedReason}”</p>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {project.settled.map((item) => <span key={item.currency} className={`${PILL} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>{money(item.amount, item.currency)} settled</span>)}
                        {project.pendingOrders > 0 && <span className={`${PILL} bg-amber-500/10 text-amber-700 dark:text-amber-300`}>{project.pendingOrders} unpaid order(s)</span>}
                        {project.pools.map((pool) => <span key={pool.poolId} className={`${PILL} bg-slate-500/10 text-slate-600 dark:text-slate-300`} title={pool.poolName}>Pool: {label(pool.status)}</span>)}
                        {project.settled.length === 0 && project.pendingOrders === 0 && project.pools.length === 0 && <span className="text-slate-400">None</span>}
                      </div>
                      {project.hasSettledMoney && !project.archivedAt && !project.suspendedAt && <p className="mt-1 text-[11px] text-slate-500">Investors have settled money here, so it can be suspended but not archived.</p>}
                    </td>
                    <td className={`${TD} min-w-[240px]`}>
                      {open ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">{ACTION_HINT[acting.action]}</p>
                          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000} placeholder="Reason (the sponsor and investors see it)" className={INPUT} />
                          <div className="flex gap-2">
                            <button type="button" disabled={busy || reason.trim().length < 5} onClick={() => void run()} className={`px-3 py-2 rounded-xl text-xs font-bold text-white cursor-pointer disabled:opacity-50 ${STOPPING.includes(acting.action) ? 'bg-rose-600' : 'bg-emerald-600'}`}>{ACTION_LABEL[acting.action]}</button>
                            <button type="button" onClick={() => { setActing(null); setReason(''); }} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold cursor-pointer">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {actions.map((action) => (
                            <button key={action} type="button" onClick={() => { setActing({ project, action }); setReason(''); setDone(''); }} className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${STOPPING.includes(action) ? 'border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300' : 'border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'}`}>{ACTION_LABEL[action]}</button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No project found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
