import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { apiClient, ManagedProject } from '../../services/apiClient';
import { useT } from '../i18n';

type Action = 'archive' | 'restore' | 'suspend' | 'resume';

const ACTION_LABEL: Record<Action, string> = { archive: 'Archive', restore: 'Restore', suspend: 'Suspend', resume: 'Resume' };
const ACTION_HINT: Record<Action, string> = {
  archive: 'Takes the project out of every list. Unpaid orders are cancelled and its pools closed; investors are told not to transfer. Its records stay and it can be restored.',
  restore: 'Puts the project back in the lists. Its pools stay closed until they are reopened.',
  suspend: 'Pauses its open pools so no new investment is taken. Unpaid orders are kept; investors and the sponsor are told why.',
  resume: 'Reopens the pools the suspension paused, and tells investors and the sponsor.',
};

/**
 * Super Admin and Country Admin handle a problem project: archive one with no settled investor money (a
 * duplicate, a mistake), or suspend a live one while it is looked into, and undo either. Each step needs a
 * reason, which the sponsor and investors see and the audit log keeps.
 */
export const MobileProjectsAdmin: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t, locale } = useT();
  const [projects, setProjects] = useState<ManagedProject[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [acting, setActing] = useState<{ project: ManagedProject; action: Action } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const load = useCallback(() => { setError(''); apiClient.getManagedProjects().then(setProjects).catch((cause) => setError(cause instanceof Error ? cause.message : t('Projects could not be loaded.'))); }, [t]);
  useEffect(load, [load]);
  const money = (amount: number, currency: string) => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(locale, { maximumFractionDigits: 2 })}`;

  const run = async () => {
    if (!acting) return;
    setBusy(true);
    setError('');
    try {
      await apiClient.manageProject(acting.project.projectId, acting.action, reason.trim());
      setDone(t('{project}: {action} done.', { project: acting.project.projectName, action: t(ACTION_LABEL[acting.action]) }));
      setActing(null);
      setReason('');
      load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('That did not go through.')); } finally { setBusy(false); }
  };

  const shown = (projects ?? []).filter(project => !query.trim() || `${project.projectName} ${project.projectCode} ${project.organisationName}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Home')}</button>
      <div>
        <h1 className="text-lg font-black">{t('Manage projects')}</h1>
        <p className="text-xs text-slate-500">{t('Archive a project with no settled investor money, or suspend one while a problem is looked into. Each step needs a reason, which the sponsor and investors see.')}</p>
      </div>
      <label className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search by name, code or sponsor')} className="w-full bg-transparent py-3 text-sm font-bold outline-none" />
      </label>
      {done && <p className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-200">{done}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!projects && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {projects && shown.length === 0 && <p className="text-xs text-slate-500">{t('No project found.')}</p>}

      {shown.map(project => {
        const actions: Action[] = project.archivedAt ? ['restore'] : project.suspendedAt ? ['resume'] : project.hasSettledMoney ? ['suspend'] : ['suspend', 'archive'];
        return (
          <section key={project.projectId} className={`rounded-2xl border p-4 space-y-2 ${project.archivedAt ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
            <div>
              <p className="text-sm font-black">{project.projectName}</p>
              <p className="text-[11px] text-slate-500">{project.projectCode} · {project.organisationName} · {project.status.replace(/_/g, ' ')}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {project.archivedAt && <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-slate-500/10 text-slate-600 dark:text-slate-300">{t('Archived')}</span>}
              {project.suspendedAt && <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-300">{t('Suspended')}</span>}
              {project.settled.map(item => <span key={item.currency} className="text-[10px] font-black rounded-full px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{t('{amount} settled', { amount: money(item.amount, item.currency) })}</span>)}
              {project.pendingOrders > 0 && <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300">{t('{count} unpaid order(s)', { count: project.pendingOrders })}</span>}
              {project.pools.map(pool => <span key={pool.poolId} className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-slate-500/10 text-slate-600 dark:text-slate-300">{t('Pool')}: {pool.status}</span>)}
            </div>
            {(project.archivedReason || project.suspendedReason) && <p className="text-[11px] italic text-slate-600 dark:text-slate-300">“{project.suspendedReason ?? project.archivedReason}”</p>}
            {project.hasSettledMoney && !project.archivedAt && !project.suspendedAt && <p className="text-[11px] text-slate-500">{t('Investors have settled money here, so it can be suspended but not archived.')}</p>}

            {acting?.project.projectId === project.projectId ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-600 dark:text-slate-300">{t(ACTION_HINT[acting.action])}</p>
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000} placeholder={t('Reason (the sponsor and investors see it)')} className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={busy || reason.trim().length < 5} onClick={run} className={`rounded-xl py-3 text-sm font-black text-white disabled:opacity-50 ${acting.action === 'archive' || acting.action === 'suspend' ? 'bg-rose-600' : 'bg-emerald-600'}`}>{t(ACTION_LABEL[acting.action])}</button>
                  <button type="button" onClick={() => { setActing(null); setReason(''); }} className="rounded-xl border border-slate-300 dark:border-slate-600 py-3 text-sm font-black">{t('Cancel')}</button>
                </div>
              </div>
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}>
                {actions.map(action => (
                  <button key={action} type="button" onClick={() => { setActing({ project, action }); setReason(''); setDone(''); }} className={`rounded-xl py-2.5 text-xs font-black border ${action === 'archive' || action === 'suspend' ? 'border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300' : 'border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'}`}>{t(ACTION_LABEL[action])}</button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
