import React from 'react';
import { BarChart3, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { apiClient, apiErrorMessage, PerformanceReport, PerformanceReportInput } from '../../services/apiClient';
import { formatProjectMoney } from '../sponsor/sponsorMoney';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';
const LABEL = 'text-xs font-bold text-slate-600 dark:text-slate-300';
const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs';
const STATUS: Record<PerformanceReport['status'], { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-500/10 text-slate-600' },
  SUBMITTED: { label: 'With the auditor', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  RETURNED: { label: 'Returned by the auditor', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  VERIFIED: { label: 'Verified', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
};

/** The last quarter that has ended, which is the one a PDP normally reports. */
function lastEndedQuarter(now = new Date()) {
  const quarter = Math.floor(now.getUTCMonth() / 3);
  return quarter === 0 ? { year: now.getUTCFullYear() - 1, quarter: 4 } : { year: now.getUTCFullYear(), quarter };
}

const variance = (actual: number, projected: number) => (projected ? Math.round(((actual - projected) / projected) * 1000) / 10 : null);

/** One report's figures, read-only: actual against projected, the KPIs and the auditor's decision. */
export const PerformanceReportView: React.FC<{ report: PerformanceReport; showHistory?: boolean }> = ({ report, showHistory }) => {
  const money = (value: number) => formatProjectMoney(value, report.currency);
  const rows = [
    { label: 'Revenue', actual: report.revenueActual, projected: report.revenueProjected, goodWhenHigher: true },
    { label: 'Costs', actual: report.costActual, projected: report.costProjected, goodWhenHigher: false },
    { label: 'Net result', actual: report.revenueActual - report.costActual, projected: report.revenueProjected - report.costProjected, goodWhenHigher: true },
  ];
  const status = STATUS[report.status];
  return (
    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-black text-slate-900 dark:text-white">{report.projectName ? `${report.projectName} · ` : ''}Q{report.quarter} {report.year}</p>
        <span className={`px-2 py-0.5 rounded font-black ${status.className}`}>{status.label}{report.verifiedAt ? ` ${report.verifiedAt.slice(0, 10)}` : ''}</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-2 text-left">Figure</th><th className="px-3 py-2 text-right">Actual</th><th className="px-3 py-2 text-right">Projected</th><th className="px-3 py-2 text-right">Difference</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => {
              const diff = variance(row.actual, row.projected);
              const good = diff === null || (row.goodWhenHigher ? diff >= 0 : diff <= 0);
              return <tr key={row.label}><td className="px-3 py-2">{row.label}</td><td className="px-3 py-2 text-right font-mono">{money(row.actual)}</td><td className="px-3 py-2 text-right font-mono">{money(row.projected)}</td><td className={`px-3 py-2 text-right font-bold ${good ? 'text-emerald-600' : 'text-rose-600'}`}>{diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff}%`}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50"><p className="text-[10px] uppercase font-black text-slate-400">Profit distributed</p><p className="font-black">{money(report.profitDistributed)}</p></div>
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50"><p className="text-[10px] uppercase font-black text-slate-400">Milestones on time</p><p className="font-black">{report.milestonesOnTimePct}%</p></div>
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50"><p className="text-[10px] uppercase font-black text-slate-400">Budget used</p><p className="font-black">{report.budgetUsedPct}%</p></div>
        <div className={`p-2.5 rounded-xl ${report.shariahIncidents ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}><p className="text-[10px] uppercase font-black text-slate-400">Shariah incidents</p><p className="font-black">{report.shariahIncidents}</p></div>
      </div>
      {report.sectorKpis.length > 0 && (
        <ul className="space-y-1">{report.sectorKpis.map((kpi) => <li key={kpi.name} className="flex justify-between"><span>{kpi.name}</span><span className="font-mono">{kpi.actual.toLocaleString()} / {kpi.target.toLocaleString()} {kpi.unit}</span></li>)}</ul>
      )}
      {report.auditFindings && <p><strong>Audit findings:</strong> {report.auditFindings}</p>}
      {report.commentary && <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{report.commentary}</p>}
      {report.reviewNote && <p className="text-slate-500"><strong>Auditor:</strong> {report.reviewNote}</p>}
      {showHistory && report.history.length > 0 && <ul className="text-slate-400 space-y-0.5">{report.history.map((entry, index) => <li key={index}>{new Date(entry.at).toLocaleString()} · {entry.action.toLowerCase()} by {entry.byName}{entry.note ? `: ${entry.note}` : ''}</li>)}</ul>}
    </div>
  );
};

const blank = (): PerformanceReportInput => ({ revenueActual: 0, revenueProjected: 0, costActual: 0, costProjected: 0, milestonesOnTimePct: 100, budgetUsedPct: 0, shariahIncidents: 0, auditFindings: '', commentary: '', sectorKpis: [] });

/** For the PDP: fill a quarter's report for a project, save it as a draft, and send it to the auditor. */
export const SponsorPerformanceReports: React.FC<{ projects: Array<{ id: string; title: string }> }> = ({ projects }) => {
  const [projectId, setProjectId] = React.useState(projects[0]?.id ?? '');
  const [reports, setReports] = React.useState<PerformanceReport[] | null>(null);
  const [period, setPeriod] = React.useState(lastEndedQuarter);
  const [form, setForm] = React.useState<PerformanceReportInput>(blank);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = React.useCallback(() => {
    if (!projectId) return;
    setReports(null);
    apiClient.getProjectPerformanceReports(projectId).then(setReports).catch((cause) => { setReports([]); setError(apiErrorMessage(cause, 'The reports could not be loaded.')); });
  }, [projectId]);
  React.useEffect(load, [load]);

  const current = reports?.find((report) => report.year === period.year && report.quarter === period.quarter);
  const editable = !current || current.status === 'DRAFT' || current.status === 'RETURNED';
  React.useEffect(() => {
    setForm(current ? { revenueActual: current.revenueActual, revenueProjected: current.revenueProjected, costActual: current.costActual, costProjected: current.costProjected, milestonesOnTimePct: current.milestonesOnTimePct, budgetUsedPct: current.budgetUsedPct, shariahIncidents: current.shariahIncidents, auditFindings: current.auditFindings, commentary: current.commentary, sectorKpis: current.sectorKpis } : blank());
  }, [current?.id, current?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<PerformanceReportInput>) => setForm({ ...form, ...patch });
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try { await action(); load(); } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(false); }
  };
  const number = (key: keyof PerformanceReportInput, label: string, hint?: string) => (
    <label className={LABEL}>{label}{hint && <span className="font-normal text-slate-400"> ({hint})</span>}
      <input type="number" min={0} value={Number(form[key] ?? 0)} disabled={!editable} onChange={(event) => set({ [key]: Number(event.target.value) } as Partial<PerformanceReportInput>)} className={`${INPUT} mt-1 font-normal`} />
    </label>
  );
  const years = [period.year - 1, period.year, new Date().getUTCFullYear()].filter((year, index, all) => all.indexOf(year) === index);

  if (projects.length === 0) return null;
  return (
    <div className={CARD}>
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-600" />Quarterly performance reports</h3>
        <p className="text-slate-500">Report each ended quarter: actual revenue and costs against the projection, milestones, budget, Shariah incidents, audit findings and up to five sector KPIs. Profit distributed is filled from the platform's distributions when you submit. An auditor verifies the report; the investors of the project's pools then see it.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className={LABEL}>Project<select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={`${INPUT} mt-1 font-normal`}>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
        <label className={LABEL}>Year<select value={period.year} onChange={(event) => setPeriod({ ...period, year: Number(event.target.value) })} className={`${INPUT} mt-1 font-normal`}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        <label className={LABEL}>Quarter<select value={period.quarter} onChange={(event) => setPeriod({ ...period, quarter: Number(event.target.value) })} className={`${INPUT} mt-1 font-normal`}>{[1, 2, 3, 4].map((quarter) => <option key={quarter} value={quarter}>Q{quarter}</option>)}</select></label>
      </div>
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {current && !editable ? <PerformanceReportView report={current} showHistory /> : (
        <div className="space-y-3">
          {current?.status === 'RETURNED' && current.reviewNote && <p className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200"><strong>Returned by the auditor:</strong> {current.reviewNote}</p>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {number('revenueActual', 'Revenue, actual')}
            {number('revenueProjected', 'Revenue, projected')}
            {number('costActual', 'Costs, actual')}
            {number('costProjected', 'Costs, projected')}
            {number('milestonesOnTimePct', 'Milestones on time', '%')}
            {number('budgetUsedPct', 'Budget used to date', '%')}
            {number('shariahIncidents', 'Shariah incidents')}
          </div>
          <div className="space-y-2">
            <p className={LABEL}>Sector KPIs (optional, up to 5)</p>
            {(form.sectorKpis ?? []).map((kpi, index) => (
              <div key={index} className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
                <input value={kpi.name} disabled={!editable} onChange={(event) => set({ sectorKpis: form.sectorKpis!.map((item, at) => (at === index ? { ...item, name: event.target.value } : item)) })} placeholder="e.g. FFB yield" className={INPUT} />
                <input value={kpi.unit} disabled={!editable} onChange={(event) => set({ sectorKpis: form.sectorKpis!.map((item, at) => (at === index ? { ...item, unit: event.target.value } : item)) })} placeholder="t/ha" className={INPUT} />
                <input type="number" value={kpi.actual} disabled={!editable} onChange={(event) => set({ sectorKpis: form.sectorKpis!.map((item, at) => (at === index ? { ...item, actual: Number(event.target.value) } : item)) })} placeholder="Actual" className={INPUT} />
                <input type="number" value={kpi.target} disabled={!editable} onChange={(event) => set({ sectorKpis: form.sectorKpis!.map((item, at) => (at === index ? { ...item, target: Number(event.target.value) } : item)) })} placeholder="Target" className={INPUT} />
                <button type="button" aria-label="Remove KPI" disabled={!editable} onClick={() => set({ sectorKpis: form.sectorKpis!.filter((_, at) => at !== index) })} className="text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {editable && (form.sectorKpis?.length ?? 0) < 5 && <button type="button" onClick={() => set({ sectorKpis: [...(form.sectorKpis ?? []), { name: '', unit: '', actual: 0, target: 0 }] })} className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" />Add KPI</button>}
          </div>
          <label className={`${LABEL} block`}>Audit findings (if any)<textarea rows={2} value={form.auditFindings} disabled={!editable} onChange={(event) => set({ auditFindings: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
          <label className={`${LABEL} block`}>Commentary for investors<textarea rows={3} value={form.commentary} disabled={!editable} onChange={(event) => set({ commentary: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void run(() => apiClient.savePerformanceReport(projectId, period.year, period.quarter, form))} className="px-4 py-2 rounded-xl border border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold cursor-pointer disabled:opacity-50">Save draft</button>
            <button type="button" disabled={busy || !current} title={current ? undefined : 'Save the draft first'} onClick={() => void run(() => apiClient.submitPerformanceReport(projectId, period.year, period.quarter))} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer disabled:opacity-50">Send to the auditor</button>
          </div>
        </div>
      )}
      {reports && reports.filter((report) => report.id !== current?.id).length > 0 && (
        <div className="space-y-2">
          <p className={LABEL}>Earlier quarters</p>
          {reports.filter((report) => report.id !== current?.id).map((report) => <PerformanceReportView key={report.id} report={report} />)}
        </div>
      )}
    </div>
  );
};

/** For auditors: reports waiting for verification in their country. */
export const AuditorPerformanceQueue: React.FC = () => {
  const [reports, setReports] = React.useState<PerformanceReport[] | null>(null);
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState('');
  const [error, setError] = React.useState('');
  const load = React.useCallback(() => { apiClient.getPerformanceReportQueue().then(setReports).catch((cause) => { setReports([]); setError(apiErrorMessage(cause, 'The queue could not be loaded.')); }); }, []);
  React.useEffect(load, [load]);
  const decide = async (report: PerformanceReport, decision: 'VERIFY' | 'RETURN') => {
    setBusy(report.id);
    setError('');
    try { await apiClient.reviewPerformanceReport(report.id, { decision, note: notes[report.id] ?? '' }); load(); } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(''); }
  };
  return (
    <div className={CARD}>
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Performance reports to verify</h3>
        <p className="text-slate-500">Check each project's quarterly figures against its accounts and evidence. Verify to publish it to the pool's investors, or return it with what must change. A note is required either way.</p>
      </div>
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {reports === null && <p className="text-slate-500">Loading…</p>}
      {reports?.length === 0 && <p className="text-slate-500">Nothing waiting.</p>}
      {reports?.map((report) => (
        <div key={report.id} className="space-y-2">
          <PerformanceReportView report={report} showHistory />
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={notes[report.id] ?? ''} onChange={(event) => setNotes({ ...notes, [report.id]: event.target.value })} placeholder="Your note (what you checked, or what must change)" className={INPUT} />
            <button type="button" disabled={busy === report.id || (notes[report.id] ?? '').trim().length < 3} onClick={() => void decide(report, 'VERIFY')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer disabled:opacity-50">Verify</button>
            <button type="button" disabled={busy === report.id || (notes[report.id] ?? '').trim().length < 3} onClick={() => void decide(report, 'RETURN')} className="px-4 py-2 rounded-xl border border-amber-500 text-amber-700 dark:text-amber-300 font-bold cursor-pointer disabled:opacity-50">Return</button>
          </div>
        </div>
      ))}
    </div>
  );
};

/** For investors: verified reports of the projects they hold. */
export const InvestorPerformanceReports: React.FC = () => {
  const [reports, setReports] = React.useState<PerformanceReport[] | null>(null);
  React.useEffect(() => { apiClient.getMyPerformanceReports().then(setReports).catch(() => setReports([])); }, []);
  if (!reports || reports.length === 0) return null;
  return (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 text-xs">
      <h3 className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white"><BarChart3 className="w-4 h-4 text-emerald-600" />Project performance</h3>
      <p className="text-slate-500">Quarterly reports from the projects you hold, verified by an independent auditor. Projections are not guaranteed.</p>
      {reports.map((report) => <PerformanceReportView key={report.id} report={report} />)}
    </section>
  );
};
