import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { apiClient, BackendFundingRequest, BackendPool, BackendProject, BackendProjectLifecycle, PerformanceReport, PerformanceReportInput, ProjectRoadmapStep } from '../../services/apiClient';
import { useRBAC } from '../../rbac/RBACContext';
import { useT } from '../i18n';

const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4';
const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-sm font-bold text-slate-900 dark:text-white';
const primary = 'w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-50';
const secondary = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 py-3 text-sm font-black disabled:opacity-50';
const alert = 'rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300';
const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);
const num = (value: number | string | null | undefined) => Number(value ?? 0);

/** Who may ask for a tranche to be released (the server checks again). */
const TRANCHE_ROLES = ['Project Sponsor', 'Project Manager'];
/** Project statuses in which tranches are released. */
const RELEASING = ['FUNDED', 'EXECUTION'];
const OPEN_REQUEST = ['PENDING', 'REQUESTED', 'APPROVED', 'PENDING_APPROVAL'];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', DUE_DILIGENCE: 'In review', APPROVED: 'Approved', FUNDING_OPEN: 'Raising funds', POOLING: 'Raising funds', FUNDED: 'Funded',
  EXECUTION: 'Under way', PROFIT_DISTRIBUTION: 'Sharing profit', COMPLETED: 'Completed', REJECTED: 'Rejected',
};
const REPORT_STATUS: Record<string, string> = { DRAFT: 'Draft', SUBMITTED: 'With the auditor', RETURNED: 'Returned for changes', VERIFIED: 'Verified' };
const REQUEST_STATUS: Record<string, string> = { PENDING: 'Awaiting approval', APPROVED: 'Approved: awaiting release', DISBURSED: 'Released', REJECTED: 'Rejected' };
const STEP_LABEL: Record<string, string> = { DONE: 'Done', TODO: 'To do', WAITING: 'Waiting', LOCKED: 'Later', OPTIONAL: 'Optional', BLOCKED: 'Blocked' };

function useMoney() {
  const { locale } = useT();
  return (currency: string, amount: number) => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
}

/** The last quarters that have ended, newest first: the ones a report can be written for. */
function endedQuarters(count = 4): Array<{ year: number; quarter: number }> {
  const now = new Date();
  let year = now.getUTCFullYear();
  let quarter = Math.floor(now.getUTCMonth() / 3);
  if (quarter === 0) { year -= 1; quarter = 4; }
  const list: Array<{ year: number; quarter: number }> = [];
  for (let i = 0; i < count; i += 1) {
    list.push({ year, quarter });
    quarter -= 1;
    if (quarter === 0) { year -= 1; quarter = 4; }
  }
  return list;
}

/**
 * The delivery partner's projects on the phone: where each stands, its pool's progress, its tranches (and a
 * request to release the next one), and its quarterly performance reports, filled in and sent to the auditor
 * here. Preparing a project for review stays on the web portal.
 */
export const MobileSponsor: React.FC = () => {
  const { t } = useT();
  const money = useMoney();
  const [projects, setProjects] = useState<BackendProject[] | null>(null);
  const [pools, setPools] = useState<BackendPool[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<BackendProject | null>(null);
  useEffect(() => {
    apiClient.getProjects().then(setProjects).catch((cause) => setError(errorText(cause, t('Projects could not be loaded.'))));
    apiClient.getPools().then(setPools).catch(() => setPools([]));
  }, [t]);

  if (open) return <ProjectDetail project={open} pools={pools.filter(pool => pool.projectId === open.projectId)} onBack={() => setOpen(null)} />;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black">{t('My projects')}</h1>
        <p className="text-xs text-slate-500">{t('Where each project stands, its funding and tranches, and its quarterly reports.')}</p>
      </div>
      {error && <p role="alert" className={alert}>{error}</p>}
      {!projects && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {projects?.length === 0 && <p className="text-xs text-slate-500">{t('No project yet. Projects are prepared on the web portal.')}</p>}
      {projects?.map(project => {
        const pool = pools.find(item => item.projectId === project.projectId);
        const raised = num(pool?.raisedAmount);
        const target = num(pool?.targetAmount ?? project.fundingRequired);
        const currency = pool?.currency ?? project.countryNode?.currency ?? 'MYR';
        return (
          <button key={project.projectId} type="button" onClick={() => setOpen(project)} className={`${card} w-full text-left flex items-center gap-3`}>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-black">{project.projectName}</p>
              <p className="text-[11px] text-slate-500">{project.projectCode} · {t(STATUS_LABEL[project.status] ?? project.status)}</p>
              {pool && target > 0 && (
                <>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (raised / target) * 100)}%` }} /></div>
                  <p className="text-[11px] text-slate-500">{t('{raised} of {target} raised', { raised: money(currency, raised), target: money(currency, target) })}</p>
                </>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        );
      })}
    </div>
  );
};

const ProjectDetail: React.FC<{ project: BackendProject; pools: BackendPool[]; onBack: () => void }> = ({ project, pools, onBack }) => {
  const { t, locale } = useT();
  const money = useMoney();
  const { currentRole } = useRBAC();
  const [lifecycle, setLifecycle] = useState<BackendProjectLifecycle | null>(null);
  const [requests, setRequests] = useState<BackendFundingRequest[]>([]);
  const [roadmap, setRoadmap] = useState<ProjectRoadmapStep[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(() => {
    apiClient.getProjectLifecycle(project.projectId).then(setLifecycle).catch((cause) => setError(errorText(cause, t('The project could not be loaded.'))));
    apiClient.getFundingRequests(project.projectId).then(setRequests).catch(() => setRequests([]));
    apiClient.getProjectRoadmap(project.projectId).then(setRoadmap).catch(() => setRoadmap([]));
  }, [project.projectId, t]);
  useEffect(load, [load]);
  const currency = pools[0]?.currency ?? project.countryNode?.currency ?? 'MYR';
  const canRequest = TRANCHE_ROLES.includes(currentRole) && RELEASING.includes(project.status);
  const pending = roadmap.filter(step => step.status === 'TODO' || step.status === 'WAITING' || step.status === 'BLOCKED');

  const requestTranche = async (milestoneId: string) => {
    setBusy(milestoneId);
    setError('');
    try { await apiClient.requestTrancheRelease(project.projectId, milestoneId); load(); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('My projects')}</button>
      <div>
        <h1 className="text-lg font-black">{project.projectName}</h1>
        <p className="text-[11px] text-slate-500">{project.projectCode} · {t(STATUS_LABEL[project.status] ?? project.status)}</p>
      </div>
      {error && <p role="alert" className={alert}>{error}</p>}

      {pending.length > 0 && (
        <section className={`${card} space-y-2`}>
          <h2 className="text-sm font-black">{t('Next steps')}</h2>
          {pending.slice(0, 4).map(step => (
            <div key={step.key} className="text-xs">
              <p className="font-bold">{step.title} <span className="text-[10px] font-black text-amber-700 dark:text-amber-300">· {t(STEP_LABEL[step.status] ?? step.status)}</span></p>
              <p className="text-[11px] text-slate-500">{step.detail}</p>
            </div>
          ))}
          <p className="text-[11px] text-slate-500">{t('These steps are done on the web portal.')}</p>
        </section>
      )}

      {pools.map(pool => {
        const raised = num(pool.raisedAmount);
        const target = num(pool.targetAmount);
        return (
          <section key={pool.poolId} className={`${card} space-y-1.5`}>
            <h2 className="text-sm font-black">{pool.poolName}</h2>
            <p className="text-[11px] text-slate-500">{pool.investmentStructure} · {pool.status}</p>
            {target > 0 && <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (raised / target) * 100)}%` }} /></div>}
            <p className="text-xs">{t('{raised} of {target} raised', { raised: money(pool.currency, raised), target: money(pool.currency, target) })}</p>
          </section>
        );
      })}

      <section className={`${card} space-y-2`}>
        <h2 className="text-sm font-black">{t('Tranches')}</h2>
        {!lifecycle && <p className="text-xs text-slate-500">{t('Loading...')}</p>}
        {lifecycle?.milestones.length === 0 && <p className="text-xs text-slate-500">{t('No tranche set yet.')}</p>}
        {lifecycle?.milestones.map(milestone => {
          const request = requests.filter(item => item.milestoneId === milestone.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
          const openRequest = request && (OPEN_REQUEST.includes(request.status) || request.status === 'DISBURSED');
          return (
            <div key={milestone.id} className="border-t border-slate-100 dark:border-slate-800 pt-2 first:border-0 first:pt-0 space-y-1">
              <div className="flex justify-between gap-2 text-xs">
                <p className="font-bold min-w-0">{milestone.title}</p>
                <p className="font-black shrink-0">{money(currency, num(milestone.disbursementAmount))}</p>
              </div>
              <p className="text-[11px] text-slate-500">{milestone.targetDate ? new Date(milestone.targetDate).toLocaleDateString(locale) : ''} · {t('{pct}% done', { pct: milestone.completionPct })}</p>
              {request && <p className="text-[11px] font-bold">{t('Release request: {status}', { status: t(REQUEST_STATUS[request.status] ?? request.status) })}{request.decisionNote ? ` · ${request.decisionNote}` : ''}</p>}
              {canRequest && !openRequest && <button type="button" disabled={busy === milestone.id} onClick={() => requestTranche(milestone.id)} className={secondary}>{t('Ask to release this tranche')}</button>}
            </div>
          );
        })}
        {!RELEASING.includes(project.status) && (lifecycle?.milestones.length ?? 0) > 0 && <p className="text-[11px] text-slate-500">{t('Tranches are released once the pool has raised its target.')}</p>}
      </section>

      <Reports project={project} />
    </div>
  );
};

const blankReport: Record<keyof Omit<PerformanceReportInput, 'sectorKpis'>, string> = { revenueActual: '', revenueProjected: '', costActual: '', costProjected: '', milestonesOnTimePct: '', budgetUsedPct: '', shariahIncidents: '0', auditFindings: '', commentary: '' };

/** Quarterly performance reports: fill one for a quarter that has ended, save it, and send it to the auditor. */
const Reports: React.FC<{ project: BackendProject }> = ({ project }) => {
  const { t } = useT();
  const money = useMoney();
  const [reports, setReports] = useState<PerformanceReport[] | null>(null);
  const [editing, setEditing] = useState<{ year: number; quarter: number } | null>(null);
  const [form, setForm] = useState(blankReport);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { apiClient.getProjectPerformanceReports(project.projectId).then(setReports).catch(() => setReports([])); }, [project.projectId]);
  useEffect(load, [load]);
  const quarters = endedQuarters();
  const find = (year: number, quarter: number) => reports?.find(report => report.year === year && report.quarter === quarter);
  const edit = (year: number, quarter: number) => {
    const existing = find(year, quarter);
    setForm(existing ? { revenueActual: String(existing.revenueActual), revenueProjected: String(existing.revenueProjected), costActual: String(existing.costActual), costProjected: String(existing.costProjected), milestonesOnTimePct: String(existing.milestonesOnTimePct), budgetUsedPct: String(existing.budgetUsedPct), shariahIncidents: String(existing.shariahIncidents), auditFindings: existing.auditFindings ?? '', commentary: existing.commentary ?? '' } : blankReport);
    setEditing({ year, quarter });
    setError('');
  };
  const set = (key: keyof typeof blankReport) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(current => ({ ...current, [key]: event.target.value }));
  const save = async (send: boolean) => {
    if (!editing) return;
    setBusy(true);
    setError('');
    const body: PerformanceReportInput = {
      revenueActual: Number(form.revenueActual), revenueProjected: Number(form.revenueProjected), costActual: Number(form.costActual), costProjected: Number(form.costProjected),
      milestonesOnTimePct: Number(form.milestonesOnTimePct), budgetUsedPct: Number(form.budgetUsedPct), shariahIncidents: Number(form.shariahIncidents),
      auditFindings: form.auditFindings || undefined, commentary: form.commentary || undefined,
    };
    try {
      await apiClient.savePerformanceReport(project.projectId, editing.year, editing.quarter, body);
      if (send) await apiClient.submitPerformanceReport(project.projectId, editing.year, editing.quarter);
      setEditing(null);
      load();
    } catch (cause) { setError(errorText(cause, t('The report could not be saved.'))); } finally { setBusy(false); }
  };
  const field = (key: keyof typeof blankReport, label: string, kind: 'number' | 'text' = 'number') => (
    <label className="block text-xs font-bold text-slate-500">{label}{kind === 'number'
      ? <input required type="number" min={0} step="0.01" inputMode="decimal" value={form[key]} onChange={set(key)} className={input} />
      : <textarea maxLength={4000} rows={3} value={form[key]} onChange={set(key)} className={input} />}</label>
  );

  if (editing) {
    return (
      <form className={`${card} space-y-3`} onSubmit={(event) => { event.preventDefault(); void save(true); }}>
        <h2 className="text-sm font-black">{t('Report for Q{quarter} {year}', editing)}</h2>
        <div className="grid grid-cols-2 gap-2">{field('revenueActual', t('Revenue (actual)'))}{field('revenueProjected', t('Revenue (projected)'))}</div>
        <div className="grid grid-cols-2 gap-2">{field('costActual', t('Costs (actual)'))}{field('costProjected', t('Costs (projected)'))}</div>
        <div className="grid grid-cols-2 gap-2">{field('milestonesOnTimePct', t('Milestones on time (%)'))}{field('budgetUsedPct', t('Budget used (%)'))}</div>
        {field('shariahIncidents', t('Shariah incidents'))}
        {field('auditFindings', t('Audit findings (optional)'), 'text')}
        {field('commentary', t('Commentary for investors (optional)'), 'text')}
        <p className="text-[11px] text-slate-500">{t('Profit distributed is filled in from the distributions. Investors see the report once the auditor verifies it.')}</p>
        {error && <p role="alert" className={alert}>{error}</p>}
        <button type="submit" disabled={busy} className={primary}>{t('Save and send to the auditor')}</button>
        <button type="button" disabled={busy} onClick={() => void save(false)} className={secondary}>{t('Save as draft')}</button>
        <button type="button" onClick={() => setEditing(null)} className="w-full text-xs font-black text-slate-500 py-1">{t('Cancel')}</button>
      </form>
    );
  }

  return (
    <section className={`${card} space-y-2`}>
      <h2 className="text-sm font-black">{t('Quarterly reports')}</h2>
      {!reports && <p className="text-xs text-slate-500">{t('Loading...')}</p>}
      {reports && quarters.map(({ year, quarter }) => {
        const report = find(year, quarter);
        const editable = !report || report.status === 'DRAFT' || report.status === 'RETURNED';
        return (
          <div key={`${year}-${quarter}`} className="border-t border-slate-100 dark:border-slate-800 pt-2 first:border-0 first:pt-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold">{t('Q{quarter} {year}', { quarter, year })}</p>
              <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${!report ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : report.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : report.status === 'RETURNED' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'}`}>{report ? t(REPORT_STATUS[report.status]) : t('Not filled')}</span>
            </div>
            {report && <p className="text-[11px] text-slate-500">{t('Revenue {revenue} · costs {costs}', { revenue: money(report.currency, report.revenueActual), costs: money(report.currency, report.costActual) })}</p>}
            {report?.status === 'RETURNED' && report.reviewNote && <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">{t('Auditor: {note}', { note: report.reviewNote })}</p>}
            {editable && <button type="button" onClick={() => edit(year, quarter)} className="text-xs font-black text-emerald-700 dark:text-emerald-400">{report ? t('Continue the report') : t('Fill in the report')}</button>}
          </div>
        );
      })}
    </section>
  );
};
