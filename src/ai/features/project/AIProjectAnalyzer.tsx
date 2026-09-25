import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Sparkles } from 'lucide-react';
import { AIApprovalPanel } from '../../components/AIApprovalPanel';
import { AIRecommendationCard } from '../../components/AIRecommendationCard';
import { apiClient, BackendFeasibilityAssessment, BackendProject } from '../../../services/apiClient';

const reviewStages = ['DRAFT', 'FINANCE_REVIEW', 'RISK_REVIEW', 'COMPLIANCE_REVIEW', 'SHARIAH_REVIEW', 'INVESTMENT_COMMITTEE_REVIEW', 'FINAL_DECISION'];
const reviewRoles: Record<string, string[]> = {
  DRAFT: ['Project Sponsor', 'Project Manager', 'Country Admin', 'Organization Admin'],
  FINANCE_REVIEW: ['Finance Officer', 'Country Admin', 'Organization Admin'],
  RISK_REVIEW: ['Risk Officer', 'Country Admin', 'Organization Admin'],
  COMPLIANCE_REVIEW: ['Compliance Officer', 'Country Admin', 'Organization Admin'],
  SHARIAH_REVIEW: ['Shariah Reviewer', 'Shariah Advisor', 'Country Admin', 'Organization Admin'],
  INVESTMENT_COMMITTEE_REVIEW: ['Shariah Committee'],
  FINAL_DECISION: ['Shariah Committee']
};

export const AIProjectAnalyzer: React.FC<{ user: any }> = ({ user }) => {
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectData, setProjectData] = useState<BackendFeasibilityAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewDecision, setReviewDecision] = useState('ACCEPTED');
  const [reviewComment, setReviewComment] = useState('');
  const canAnalyze = ['Project Sponsor', 'Project Manager', 'Finance Officer', 'Risk Officer', 'Compliance Officer', 'Country Admin', 'Organization Admin', 'AI Model Reviewer', 'Shariah Reviewer'].includes(user.role);

  useEffect(() => {
    let cancelled = false;
    apiClient.getProjects().then((items) => {
      if (!cancelled) {
        setProjects(items);
        setSelectedProjectId((current) => current || items[0]?.projectId || '');
      }
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load accessible projects.');
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    apiClient.getLatestProjectFeasibility(selectedProjectId)
      .then(setProjectData)
      .catch(() => setProjectData(null));
  }, [selectedProjectId]);

  const analyze = async () => {
    if (!selectedProjectId || !canAnalyze) return;
    setLoading(true);
    setError('');
    try {
      setProjectData(await apiClient.analyzeProjectFeasibility(selectedProjectId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to analyse project feasibility.');
    } finally {
      setLoading(false);
    }
  };

  const advanceReview = async () => {
    if (!projectData) return;
    const currentStage = projectData.reviewStage;
    const nextStage = reviewStages[reviewStages.indexOf(currentStage) + 1];
    if (!reviewRoles[currentStage]?.includes(user.role)) return;
    if (!reviewComment.trim()) { setError('A reviewer comment is required.'); return; }
    const targetStage = ['ACCEPTED', 'ACCEPTED_WITH_CONDITIONS'].includes(reviewDecision) && nextStage ? nextStage : currentStage;
    try {
      const updated = await apiClient.reviewProjectFeasibility(selectedProjectId, projectData.id, { reviewStage: targetStage, decision: reviewDecision, comment: reviewComment });
      setProjectData((current) => current ? { ...current, ...updated, reviewStage: updated.reviewStage } : current);
      setReviewComment('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to advance review stage.');
    }
  };

  const project = projects.find((item) => item.projectId === selectedProjectId);
  const financial = projectData?.financialAnalysis;
  const risk = projectData?.riskAnalysis;
  const evidence = projectData?.evidenceIntelligence;
  const riskAssessment = risk?.projectRiskAssessment;
  const readiness = projectData?.investmentReadiness;
  const shariah = projectData?.shariahAssessment;
  const feasibility = projectData?.projectFeasibility;
  const nextStage = projectData ? reviewStages[reviewStages.indexOf(projectData.reviewStage) + 1] : undefined;
  const canReviewCurrentStage = projectData ? reviewRoles[projectData.reviewStage]?.includes(user.role) : false;
  const formatMetric = (value: unknown, suffix = '') => typeof value === 'number' && Number.isFinite(value)
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`
    : 'Unavailable from submitted evidence';
  const confidence = projectData?.confidence as any;
  const statusClass = (status: string) => status === 'COMPLETED' || status === 'AVAILABLE'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'PARTIAL'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-rose-100 text-rose-800';
  const priorityClass = (priority: string) => priority === 'Critical' ? 'text-rose-700' : priority === 'High' ? 'text-amber-700' : 'text-slate-600';

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600"><FileText className="h-3.5 w-3.5" /> AI Project &amp; Business Plan Analyzer</span>
            <h2 className="mt-1 text-base font-black text-slate-900 dark:text-white">Project Feasibility &amp; Cashflow Evaluation</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Evaluates real tenant-scoped project data, submitted evidence, NPV, DSCR, cashflow, risk, and funding readiness.</p>
          </div>
          <button onClick={() => void analyze()} disabled={loading || !selectedProjectId || !canAnalyze} className="flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-4 w-4 text-emerald-200" />{!canAnalyze ? 'View and Governance Only' : loading ? 'Evaluating Business Plan...' : 'Analyze Project Metrics'}</button>
        </div>
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Accessible project
          <select value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); setProjectData(null); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-900">
            <option value="">Select a project</option>
            {projects.map((item) => <option key={item.projectId} value={item.projectId}>{item.projectName} · {item.projectCode} · {item.status}</option>)}
          </select>
        </label>
        {project && <p className="text-[10px] text-slate-500">{project.sector} · Funding required: {project.countryNode?.currency || 'MYR'} {Number(project.fundingRequired).toLocaleString()} · {project.proposedShariahContract}</p>}
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 font-semibold text-rose-700">{error}</p>}
      {projectData && <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            ['Evidence Readiness', `${evidence?.scorePercent ?? 0}%`],
            ['Projected NPV', formatMetric(financial?.npv)],
            ['Projected IRR', formatMetric(financial?.irr, '%')],
            ['DSCR Coverage', formatMetric(financial?.dscr, 'x')],
            ['ROI', formatMetric(financial?.roi, '%')],
            ['Payback Period', formatMetric(financial?.paybackPeriod, ' years')],
            ['Profit Margin', formatMetric(financial?.profitMargin, '%')]
          ].map(([label, value]) => <div key={label} className="space-y-1 rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-800"><span className="block text-[10px] font-extrabold uppercase text-slate-400">{label}</span><span className="block text-xl font-black text-emerald-600">{value}</span></div>)}
        </div>
        {feasibility?.available && <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800/50 dark:bg-blue-950/20"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">Project Feasibility Score</h3><p className="text-[10px] text-slate-500">Available only where financial and operational evidence is sufficient. This is not an investment decision.</p></div><span className="text-2xl font-black text-blue-700">{feasibility.score}/100</span></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(feasibility.components).map(([label, value]) => <div key={label} className="rounded-xl bg-white p-2.5 dark:bg-slate-800"><span className="block text-[9px] font-extrabold uppercase text-slate-400">{label.replace(/([A-Z])/g, ' $1')}</span><span className="text-sm font-black text-slate-700 dark:text-slate-200">{value} pts</span></div>)}</div></div>}
        {evidence && <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">Evidence Readiness Score</h3><p className="text-[10px] text-slate-500">Measures evidence completeness and quality, not project viability.</p></div><div className="flex items-center gap-2"><span className="text-2xl font-black text-emerald-600">{evidence.scorePercent}%</span><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${statusClass(evidence.status === 'SUFFICIENT_EVIDENCE' ? 'COMPLETED' : 'PENDING')}`}>{evidence.status.replaceAll('_', ' ')}</span></div></div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(evidence.components).map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900"><span className="block text-[9px] font-extrabold uppercase text-slate-400">{label.replace(/([A-Z])/g, ' $1')}</span><span className="text-sm font-black text-slate-700 dark:text-slate-200">{value} pts</span></div>)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900 dark:text-white">AI Assessment Coverage</h3><span className="text-[10px] font-bold text-slate-400">Status · Importance · Required action</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{evidence.coverage.map((item) => <div key={item.key} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700"><div className="flex items-center justify-between gap-2"><span className="font-extrabold text-slate-800 dark:text-slate-200">{item.label}</span><span className={`rounded-full px-2 py-1 text-[9px] font-black ${statusClass(item.status)}`}>{item.status}</span></div><div className="mt-1 flex items-center justify-between gap-2 text-[10px]"><span className={`font-extrabold ${priorityClass(item.importance)}`}>{item.importance} importance</span><span className="text-right text-slate-500">{item.requiredAction}</span></div></div>)}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><h3 className="text-sm font-black text-slate-900 dark:text-white">Missing Evidence Matrix</h3><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[11px]"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-700"><th className="p-2">Evidence</th><th className="p-2">Status</th><th className="p-2">Priority</th><th className="p-2">Required action</th></tr></thead><tbody>{evidence.matrix.map((item) => <tr key={item.evidence} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60"><td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{item.evidence}</td><td className="p-2.5"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${statusClass(item.status)}`}>{item.status}</span></td><td className={`p-2.5 font-extrabold ${priorityClass(item.priority)}`}>{item.priority}</td><td className="p-2.5 text-slate-500">{item.requiredAction}</td></tr>)}</tbody></table></div></div>
          <div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><h3 className="text-sm font-black text-slate-900 dark:text-white">Recommended Next Actions</h3>{evidence.nextActions.length ? <ol className="mt-3 list-decimal space-y-2 pl-5 text-[11px] text-slate-700 dark:text-slate-300">{evidence.nextActions.map((action) => <li key={action}>{action}</li>)}</ol> : <p className="mt-3 text-[11px] text-emerald-700">No evidence action is currently pending.</p>}</div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><h3 className="text-sm font-black text-slate-900 dark:text-white">AI Confidence: {confidence?.scorePercent ?? evidence.scorePercent}%</h3><p className="mt-1 text-[10px] text-slate-500">Reason: evidence quality and completeness, not project viability.</p><ul className="mt-3 list-disc space-y-1 pl-5 text-[11px] text-slate-700 dark:text-slate-300">{(confidence?.reasons || evidence.confidenceReasons).map((reason: string) => <li key={reason}>{reason}</li>)}</ul></div></div>
        </>}
        <AIRecommendationCard title={`AI Recommendation: ${financial?.fundingReadiness || 'Review Required'}`} subtitle="Human Review Required · Financial Feasibility & Cashflow Health" recommendationText={`Cashflow source: ${String(financial?.cashflow?.source || 'Not available')}. No financial figure is assumed where it was not found in the project record or uploaded evidence.`} confidence={confidence} positiveFactors={risk?.keyAssumptions?.map((item) => `${item.name}: ${String(item.value)}`)} concerns={risk?.riskFlags?.map((item) => `${item.title}: ${item.description}`)} disclaimer="Assessment is based on tenant-scoped project data and extracted evidence. Human finance, risk, compliance, and Shariah review remains mandatory." />
        {shariah && <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800/50 dark:bg-purple-950/20"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">Shariah Structure Assessment: {shariah.structure}</h3><p className="text-[10px] text-slate-500">AI assessment only. Formal Shariah review is required before any structure is considered.</p></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">{shariah.status.replaceAll('_', ' ')}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{shariah.checks.map((check) => <div key={check.label} className="rounded-xl bg-white p-2.5 text-[11px] dark:bg-slate-800"><span className={check.status === 'COMPLETE' ? 'font-bold text-emerald-700' : 'font-bold text-rose-700'}>{check.status === 'COMPLETE' ? '✓' : '✕'} {check.label}</span></div>)}</div><div className="mt-3 grid gap-3 md:grid-cols-2"><div><span className="text-[10px] font-extrabold uppercase text-slate-400">Required information</span><ul className="mt-1 list-disc space-y-1 pl-5 text-[11px] text-slate-700 dark:text-slate-300">{shariah.requiredInformation.length ? shariah.requiredInformation.map((item) => <li key={item}>{item}</li>) : <li>No information gaps detected by the evidence parser.</li>}</ul></div><div><span className="text-[10px] font-extrabold uppercase text-slate-400">Potential Shariah concerns</span><ul className="mt-1 list-disc space-y-1 pl-5 text-[11px] text-slate-700 dark:text-slate-300">{shariah.potentialConcerns.map((item) => <li key={item}>{item}</li>)}</ul></div></div></div>}
        <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900 dark:text-white">Sensitivity Analysis</h3><span className="text-[10px] text-slate-400">Only supplied assumptions are used</span></div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[11px]"><thead><tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400 dark:border-slate-700"><th className="p-2">Scenario</th><th className="p-2">Status</th><th className="p-2">NPV</th><th className="p-2">IRR</th><th className="p-2">ROI</th><th className="p-2">Payback</th></tr></thead><tbody>{(financial?.scenarios || []).map((scenario) => <tr key={scenario.name} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60"><td className="p-2.5 font-bold">{scenario.name}</td><td className="p-2.5"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${scenario.status === 'CALCULATED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{scenario.status.replaceAll('_', ' ')}</span></td><td className="p-2.5">{formatMetric(scenario.npv)}</td><td className="p-2.5">{formatMetric(scenario.irr, '%')}</td><td className="p-2.5">{formatMetric(scenario.roi, '%')}</td><td className="p-2.5">{formatMetric(scenario.paybackPeriod, ' years')}</td></tr>)}</tbody></table></div></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900 dark:text-white">Investment Readiness Status</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${readiness?.status === 'GREEN' ? 'bg-emerald-100 text-emerald-800' : readiness?.status === 'RED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{readiness?.status || 'YELLOW'} · {readiness?.label || 'Requires Additional Information'}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><span className="rounded-xl bg-slate-50 p-2 font-bold dark:bg-slate-900">Evidence: {readiness?.evidenceStatus?.replaceAll('_', ' ')}</span><span className="rounded-xl bg-slate-50 p-2 font-bold dark:bg-slate-900">Financial: {readiness?.financialStatus?.replaceAll('_', ' ')}</span><span className="rounded-xl bg-slate-50 p-2 font-bold dark:bg-slate-900">Risk: {readiness?.riskLevel}</span><span className="rounded-xl bg-slate-50 p-2 font-bold dark:bg-slate-900">Compliance: {readiness?.complianceStatus?.replaceAll('_', ' ')}</span></div><p className="mt-3 text-[10px] text-slate-500">Human review remains mandatory. This is not an investment approval.</p></div></div>
        {riskAssessment && <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900 dark:text-white">Project Risk Assessment</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${riskAssessment.overallLevel === 'HIGH' ? 'bg-rose-100 text-rose-800' : riskAssessment.overallLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{riskAssessment.overallLevel} RISK</span></div><div className="mt-3 grid gap-3 md:grid-cols-2">{riskAssessment.risks.map((riskItem) => <div key={riskItem.category} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700"><div className="flex items-center justify-between"><span className="font-extrabold text-slate-800 dark:text-slate-200">{riskItem.category}</span><span className={`text-[10px] font-black ${riskItem.level === 'HIGH' ? 'text-rose-700' : riskItem.level === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700'}`}>{riskItem.level}</span></div><p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{riskItem.description}</p><p className="mt-1 text-[10px] text-slate-500"><strong>Impact:</strong> {riskItem.impact}</p><p className="mt-1 text-[10px] text-slate-500"><strong>Mitigation:</strong> {riskItem.mitigation}</p></div>)}</div></div>}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">Human review workflow</span><span className="rounded-full bg-purple-500/10 px-2 py-1 text-[10px] font-black text-purple-700">{projectData.reviewStage.replaceAll('_', ' ')}</span></div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold">{reviewStages.map((stage, index) => <React.Fragment key={stage}><span className={index <= reviewStages.indexOf(projectData.reviewStage) ? 'rounded-xl bg-emerald-100 px-2.5 py-1 text-emerald-800' : 'rounded-xl bg-slate-100 px-2.5 py-1 text-slate-500'}>{stage.replaceAll('_', ' ')}</span>{index < reviewStages.length - 1 && <span className="text-slate-400">→</span>}</React.Fragment>)}</div>
          {canReviewCurrentStage && <div className="mt-3 space-y-2 rounded-xl border border-purple-100 p-3 dark:border-purple-800/50"><div className="flex flex-col gap-2 sm:flex-row"><select value={reviewDecision} onChange={(event) => setReviewDecision(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-2 text-[11px] font-bold dark:border-slate-700 dark:bg-slate-900"><option value="ACCEPTED">Accept and advance</option><option value="ACCEPTED_WITH_CONDITIONS">Accept with conditions</option><option value="REQUEST_CHANGES">Request changes</option><option value="REJECTED">Reject</option></select><textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Required reviewer comment" className="min-h-9 flex-1 rounded-xl border border-slate-200 bg-white p-2 text-[11px] dark:border-slate-700 dark:bg-slate-900" /></div><button onClick={() => void advanceReview()} className="rounded-xl bg-purple-600 px-3 py-2 text-[11px] font-extrabold text-white">Record {projectData.reviewStage.replaceAll('_', ' ')}</button></div>}
          <p className="mt-2 text-[10px] text-slate-500">Every reviewer, date, decision, comment, and transition is audit logged. AI cannot approve funding.</p>
          {projectData.reviewHistory?.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-[10px]"><thead><tr className="border-b border-slate-200 text-[9px] uppercase text-slate-400 dark:border-slate-700"><th className="p-2">Stage</th><th className="p-2">Reviewer</th><th className="p-2">Date</th><th className="p-2">Decision</th><th className="p-2">Comment</th></tr></thead><tbody>{projectData.reviewHistory.map((entry, index) => <tr key={`${entry.stage}-${entry.date || entry.at}-${index}`} className="border-b border-slate-100 dark:border-slate-700/60"><td className="p-2">{entry.stage.replaceAll('_', ' ')}</td><td className="p-2">{entry.reviewerRole || 'AI System'}</td><td className="p-2">{new Date(entry.date || entry.at || '').toLocaleString()}</td><td className="p-2 font-bold">{(entry.decision || 'RECORDED').replaceAll('_', ' ')}</td><td className="p-2 text-slate-500">{entry.comment || entry.note || 'No comment recorded.'}</td></tr>)}</tbody></table></div> : null}
        </div>
        {risk?.riskFlags?.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><span className="flex items-center gap-1.5 font-extrabold"><AlertTriangle className="h-4 w-4" /> Risk flags requiring review</span><ul className="mt-2 list-disc space-y-1 pl-5">{risk.riskFlags.map((flag) => <li key={`${flag.title}-${flag.description}`}>{flag.title}: {flag.description}</li>)}</ul></div> : null}
        <AIApprovalPanel roleName={user.role} />
      </div>}
    </div>
  );
};
