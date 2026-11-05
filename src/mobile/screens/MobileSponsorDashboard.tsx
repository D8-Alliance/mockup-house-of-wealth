import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, ChevronRight, FolderKanban, PieChart } from 'lucide-react';
import { apiClient, AssetLeaseView, BackendFundingRequest, BackendNotification, BackendPool, BackendProject, BackendProjectMilestone, PerformanceReport, ProjectRoadmapStep } from '../../services/apiClient';
import type { MobileTab } from '../MobileShell';
import { useT } from '../i18n';

const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4';
/** Lines shown before "See all": Home stays short. */
const SHOWN_ACTIONS = 3;
const SHOWN_NOTICES = 2;
/** Project statuses in which tranches are released and quarterly reports are due. */
const RUNNING = ['FUNDED', 'EXECUTION', 'PROFIT_DISTRIBUTION'];
const STATUS_GROUPS: Array<{ label: string; statuses: string[] }> = [
  { label: 'Draft', statuses: ['DRAFT'] },
  { label: 'In review', statuses: ['DUE_DILIGENCE'] },
  { label: 'Raising funds', statuses: ['APPROVED', 'FUNDING_OPEN', 'POOLING'] },
  { label: 'Under way', statuses: RUNNING },
  { label: 'Completed', statuses: ['COMPLETED'] },
];

interface ProjectFacts { project: BackendProject; roadmap: ProjectRoadmapStep[]; milestones: BackendProjectMilestone[]; requests: BackendFundingRequest[]; reports: PerformanceReport[] }
interface Action { key: string; project: string; text: string; tab: MobileTab }

/** The quarter that ended last (a report is due for it). */
function lastEndedQuarter() {
  const now = new Date();
  const quarter = Math.floor(now.getUTCMonth() / 3);
  return quarter === 0 ? { year: now.getUTCFullYear() - 1, quarter: 4 } : { year: now.getUTCFullYear(), quarter };
}

/**
 * The project sponsor's Home: what needs their action now across every project (roadmap steps to do, a tranche
 * request turned down, a quarterly report not filled or returned, a lease request waiting for their answer), how
 * their projects stand and what they have raised and drawn, and the latest notifications. Worked out on the phone
 * from what the server already gives the sponsor; each line opens the tab where it is acted on. Totals only: who
 * invested stays with the platform.
 */
export const MobileSponsorDashboard: React.FC<{ onOpen: (tab: MobileTab) => void; onOpenNotifications: () => void }> = ({ onOpen, onOpenNotifications }) => {
  const { t, locale, serverText } = useT();
  const [facts, setFacts] = useState<ProjectFacts[] | null>(null);
  const [pools, setPools] = useState<BackendPool[]>([]);
  const [leases, setLeases] = useState<AssetLeaseView[]>([]);
  const [notices, setNotices] = useState<BackendNotification[]>([]);
  const [error, setError] = useState('');
  const [allActions, setAllActions] = useState(false);
  const [allNotices, setAllNotices] = useState(false);

  useEffect(() => {
    // Lists only: a list that fails shows as empty rather than breaking Home.
    const list = <T,>(promise: Promise<T[]>) => promise.then((rows) => (Array.isArray(rows) ? rows : [])).catch(() => [] as T[]);
    apiClient.getProjects()
      .then(async (projects) => setFacts(await Promise.all((Array.isArray(projects) ? projects : []).slice(0, 12).map(async (project) => {
        const [roadmap, lifecycle, requests, reports] = await Promise.all([
          list(apiClient.getProjectRoadmap(project.projectId)),
          apiClient.getProjectLifecycle(project.projectId).catch(() => null),
          list(apiClient.getFundingRequests(project.projectId)),
          RUNNING.includes(project.status) ? list(apiClient.getProjectPerformanceReports(project.projectId)) : Promise.resolve([] as PerformanceReport[]),
        ]);
        return { project, roadmap, milestones: Array.isArray(lifecycle?.milestones) ? lifecycle!.milestones : [], requests, reports };
      }))))
      .catch((cause) => { setFacts([]); setError(cause instanceof Error ? cause.message : t('Projects could not be loaded.')); });
    list(apiClient.getPools()).then(setPools);
    list(apiClient.getLeases()).then(setLeases);
    list(apiClient.getNotifications()).then(setNotices);
  }, [t]);

  const money = (amount: number, currency = 'MYR') => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(locale, { maximumFractionDigits: 0 })}`;

  const view = useMemo(() => {
    const rows = facts ?? [];
    const due = lastEndedQuarter();
    const actions: Action[] = [];
    for (const { project, roadmap, milestones, requests, reports } of rows) {
      const name = project.projectName;
      for (const step of roadmap.filter(item => item.status === 'TODO')) actions.push({ key: `${project.projectId}-${step.key}`, project: name, text: serverText(step.title), tab: 'projects' });
      for (const milestone of milestones) {
        const latest = requests.filter(item => item.milestoneId === milestone.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
        if (latest?.status === 'REJECTED') actions.push({ key: `${project.projectId}-rej-${milestone.id}`, project: name, text: t('Tranche release turned down: {title}', { title: serverText(milestone.title) }), tab: 'projects' });
      }
      if (RUNNING.includes(project.status)) {
        const report = reports.find(item => item.year === due.year && item.quarter === due.quarter);
        if (!report || report.status === 'DRAFT') actions.push({ key: `${project.projectId}-rpt`, project: name, text: t('Quarterly report Q{quarter} {year} not sent yet', due), tab: 'projects' });
        if (report?.status === 'RETURNED') actions.push({ key: `${project.projectId}-rpt-ret`, project: name, text: t('Quarterly report Q{quarter} {year} returned by the auditor', due), tab: 'projects' });
      }
    }
    for (const lease of leases.filter(item => item.canRespond)) actions.push({ key: `lease-${lease.id}`, project: `${lease.unit.label} · ${lease.asset.name}`, text: t('A lease request is waiting for your answer'), tab: 'leasing' });

    const currency = pools[0]?.currency ?? rows[0]?.project.countryNode?.currency ?? 'MYR';
    const raised = pools.reduce((total, pool) => total + Number(pool.raisedAmount ?? 0), 0);
    const released = rows.flatMap(row => row.requests).filter(item => item.status === 'DISBURSED').reduce((total, item) => total + Number(item.requestedAmount), 0);
    const allocated = rows.filter(row => RUNNING.includes(row.project.status)).flatMap(row => row.milestones).reduce((total, item) => total + Number(item.disbursementAmount), 0);
    const counts = STATUS_GROUPS.map(group => ({ label: group.label, count: rows.filter(row => group.statuses.includes(row.project.status)).length })).filter(group => group.count > 0);
    // One bar per pool that has a target, most funded first.
    const funding = pools.map(pool => ({ pool, raised: Number(pool.raisedAmount ?? 0), target: Number(pool.targetAmount ?? 0) })).filter(row => row.target > 0)
      .map(row => ({ ...row, pct: Math.min(100, (row.raised / row.target) * 100) })).sort((a, b) => b.pct - a.pct);
    const fullyFunded = pools.filter(pool => pool.status === 'FULL' || pool.status === 'CLOSED').length;
    // Holdings, not people: someone in two pools counts in each.
    const holdings = pools.reduce((total, pool) => total + (pool.investorCount ?? 0), 0);
    const poolTarget = funding.reduce((total, row) => total + row.target, 0);
    return { actions, currency, raised, released, allocated, counts, funding, fullyFunded, holdings, poolTarget };
  }, [facts, pools, leases, t, serverText]);

  if (error) return <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{serverText(error)}</p>;
  if (!facts) return <p className="text-sm text-slate-500">{t('Loading...')}</p>;

  return (
    <div className="space-y-4">
      <section className={`${card} space-y-2`}>
        <h2 className="text-sm font-black flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />{t('Needs your action')}
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black ${view.actions.length ? 'bg-amber-500 text-white' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>{view.actions.length ? view.actions.length : t('All clear')}</span>
        </h2>
        {view.actions.length === 0 && <p className="text-xs text-slate-500">{t('Nothing is waiting for you.')}</p>}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {(allActions ? view.actions : view.actions.slice(0, SHOWN_ACTIONS)).map(action => (
            <li key={action.key}>
              <button type="button" onClick={() => onOpen(action.tab)} className="w-full flex items-center justify-between gap-3 py-2.5 text-left">
                <span className="min-w-0">
                  <span className="block text-xs font-bold">{action.text}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{action.project}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
        {view.actions.length > SHOWN_ACTIONS && <button type="button" onClick={() => setAllActions(!allActions)} className="w-full pt-1 text-xs font-black text-emerald-700 dark:text-emerald-400">{allActions ? t('Show fewer') : t('See all ({count})', { count: view.actions.length })}</button>}
      </section>

      {view.funding.length > 0 && (
        <section className={`${card} space-y-3`} aria-label={t('Pool funding')}>
          <h2 className="text-sm font-black flex items-center gap-2"><PieChart className="w-4 h-4 text-emerald-600" />{t('Pool funding')}</h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-2.5"><p className="text-[10px] font-bold text-slate-500">{t('Raised')}</p><p className="text-sm font-black">{money(view.raised, view.currency)}</p><p className="text-[10px] text-slate-500">{view.poolTarget > 0 ? t('{pct}% of the target', { pct: Math.round((view.raised / view.poolTarget) * 100) }) : ''}</p></div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><p className="text-[10px] font-bold text-slate-500">{t('Fully funded')}</p><p className="text-sm font-black">{view.fullyFunded} / {pools.length}</p><p className="text-[10px] text-slate-500">{t('pools')}</p></div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><p className="text-[10px] font-bold text-slate-500">{t('Investor holdings')}</p><p className="text-sm font-black">{view.holdings}</p><p className="text-[10px] text-slate-500">{t('with confirmed capital')}</p></div>
          </div>
          <ul className="space-y-3">
            {view.funding.map(({ pool, raised, target, pct }) => (
              <li key={pool.poolId} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold truncate">{pool.projectName ?? pool.poolName}</span>
                  <span className="shrink-0 font-black flex items-center gap-1">{pct >= 100 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />}{Math.round(pct)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" role="img" aria-label={t('{raised} of {target} raised', { raised: money(raised, pool.currency), target: money(target, pool.currency) })}>
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-slate-500">{t('{raised} of {target} raised', { raised: money(raised, pool.currency), target: money(target, pool.currency) })} · {t('{count} investor(s)', { count: pool.investorCount ?? 0 })}</p>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-slate-400">{t('Totals only: who invested is kept by the platform.')}</p>
        </section>
      )}

      <button type="button" onClick={() => onOpen('projects')} className={`${card} w-full text-left space-y-3`}>
        <span className="flex items-center justify-between">
          <span className="text-sm font-black flex items-center gap-2"><FolderKanban className="w-4 h-4 text-emerald-600" />{t('My projects')}</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </span>
        {view.counts.length === 0 ? <span className="block text-xs text-slate-500">{t('No project yet. Projects are prepared on the web portal.')}</span> : (
          <span className="flex flex-wrap gap-1.5">
            {view.counts.map(group => <span key={group.label} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold">{t(group.label)} · {group.count}</span>)}
          </span>
        )}
        {view.allocated > 0 && <span className="block text-[11px] text-slate-500">{t('Tranches released: {released} of {allocated}', { released: money(view.released, view.currency), allocated: money(view.allocated, view.currency) })}</span>}
      </button>

      {notices.length > 0 && (
        <section className={`${card} space-y-2`}>
          <button type="button" onClick={onOpenNotifications} className="w-full flex items-center justify-between">
            <span className="text-sm font-black flex items-center gap-2"><Bell className="w-4 h-4 text-emerald-600" />{t('Latest')}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {(allNotices ? notices.slice(0, 10) : notices.slice(0, SHOWN_NOTICES)).map(notice => (
              <li key={notice.id} className="py-2">
                <p className={`text-xs ${notice.readAt ? 'font-bold' : 'font-black'}`}>{serverText(notice.title)}</p>
                <p className="text-[11px] text-slate-500 line-clamp-2">{serverText(notice.message)}</p>
                <p className="text-[10px] text-slate-400">{new Date(notice.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</p>
              </li>
            ))}
          </ul>
          {notices.length > SHOWN_NOTICES && <button type="button" onClick={() => setAllNotices(!allNotices)} className="w-full pt-1 text-xs font-black text-emerald-700 dark:text-emerald-400">{allNotices ? t('Show fewer') : t('See more')}</button>}
        </section>
      )}
    </div>
  );
};
