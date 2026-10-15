import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Sparkles, Upload, CheckCircle2 } from 'lucide-react';
import { AIApprovalPanel } from '../../components/AIApprovalPanel';
import { AIRecommendationCard } from '../../components/AIRecommendationCard';
import { apiClient, apiErrorMessage, BackendEvidenceRequirement, BackendFeasibilityAssessment, BackendProject } from '../../../services/apiClient';
import { canReopenProject, isProjectLocked } from '../../../services/projectLock';
import { AISectionContainer } from './AISectionContainer';

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
  const [reviewEvidence, setReviewEvidence] = useState('');
  const [evidenceRequirements, setEvidenceRequirements] = useState<BackendEvidenceRequirement[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState('');
  const [evidenceNotice, setEvidenceNotice] = useState('');
  // After a final decision the analysis and evidence are locked until a Country Admin reopens the project.
  const selectedProjectStatus = projects.find((item) => item.projectId === selectedProjectId)?.status;
  const projectLocked = isProjectLocked(selectedProjectStatus);
  const canAnalyze = !projectLocked && ['Project Sponsor', 'Project Manager', 'Finance Officer', 'Risk Officer', 'Compliance Officer', 'Country Admin', 'Organization Admin', 'AI Model Reviewer', 'Shariah Reviewer'].includes(user.role);
  // Mirrors the @Roles guard on POST /projects/:id/evidence/:evidenceType/upload.
  const canUploadEvidence = !projectLocked && ['Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager'].includes(user.role);
  const [reopening, setReopening] = useState(false);

  const reopenProject = async () => {
    if (!selectedProjectId) return;
    const reason = window.prompt('Reason for reopening this project (recorded in the audit trail). Funding and pooling stop and all feasibility approvals are superseded.');
    if (!reason?.trim()) return;
    setReopening(true);
    setError('');
    try {
      await apiClient.reopenProject(selectedProjectId, reason.trim());
      const [items, latest] = await Promise.all([apiClient.getProjects(), apiClient.getLatestProjectFeasibility(selectedProjectId)]);
      setProjects(items);
      setProjectData(latest);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Unable to reopen the project.'));
    } finally {
      setReopening(false);
    }
  };

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

  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    setEvidenceRequirements([]);
    setEvidenceNotice('');
    apiClient.getProjectEvidenceRequirements(selectedProjectId)
      .then((items) => { if (!cancelled) setEvidenceRequirements(items); })
      .catch(() => { if (!cancelled) setEvidenceRequirements([]); });
    return () => { cancelled = true; };
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

  const uploadEvidence = async (evidenceType: string, file: File) => {
    if (!selectedProjectId || !canUploadEvidence) return;
    const projectId = selectedProjectId;
    setUploadingEvidence(evidenceType);
    setError('');
    setEvidenceNotice('');
    try {
      const requirement = await apiClient.uploadProjectEvidence(projectId, evidenceType, file);
      if (requirement.uploadedDocumentId) await apiClient.analyzeProjectDocument(projectId, requirement.uploadedDocumentId);
      // Re-running feasibility creates a new DRAFT run, which would discard the
      // review progress of a run already in human review. Only refresh while
      // the current run is still a draft.
      if (canAnalyze && (!projectData || projectData.reviewStage === 'DRAFT')) {
        setProjectData(await apiClient.analyzeProjectFeasibility(projectId));
      } else if (projectData) {
        setEvidenceNotice(`Evidence recorded. The assessment is in ${projectData.reviewStage.replaceAll('_', ' ')}, so scores were not recalculated; run a new analysis to include this evidence.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to upload and verify evidence.');
    } finally {
      // Always resync: the upload may have succeeded even if analysis failed.
      await apiClient.getProjectEvidenceRequirements(projectId).then(setEvidenceRequirements).catch(() => undefined);
      setUploadingEvidence('');
    }
  };

  const verifyEvidence = async (evidenceType: string) => {
    if (!selectedProjectId) return;
    try {
      await apiClient.verifyProjectEvidence(selectedProjectId, evidenceType);
      // Only refresh: re-running the analysis would create a new revision, reset every
      // approval to DRAFT and cost credits. The reviewer re-runs it explicitly when needed.
      setEvidenceRequirements(await apiClient.getProjectEvidenceRequirements(selectedProjectId));
      setEvidenceNotice('Evidence verified. Run the analysis again to include it in the feasibility scores.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify evidence.');
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
      const updated = await apiClient.reviewProjectFeasibility(selectedProjectId, projectData.id, { reviewStage: targetStage, decision: reviewDecision, comment: reviewComment, supportingEvidence: reviewEvidence.split('\n').map((item) => item.trim()).filter(Boolean) });
      setProjectData((current) => current ? { ...current, ...updated, reviewStage: updated.reviewStage } : current);
      setReviewComment('');
      setReviewEvidence('');
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
  const canVerifyEvidence = !projectLocked && ['Super Admin', 'Country Admin', 'Organization Admin', 'Finance Officer', 'Risk Officer', 'Compliance Officer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee'].includes(user.role);
  const formatMetric = (value: unknown, suffix = '') => typeof value === 'number' && Number.isFinite(value)
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`
    : 'Unavailable from submitted evidence';
  const confidence = projectData?.confidence as any;
  const statusClass = (status: string) => status === 'COMPLETED' || status === 'AVAILABLE' || status === 'VERIFIED'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'PARTIAL' || status === 'UPLOADED' || status === 'AI_PROCESSING'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-rose-100 text-rose-800';
  const priorityClass = (priority: string) => priority === 'Critical' ? 'text-rose-700' : priority === 'High' ? 'text-amber-700' : 'text-slate-600';
  const evidenceTypeFor = (name: string) => name === 'Financial Model' || name === 'Financial Model Evidence' ? 'FINANCIAL_MODEL' : name === 'Cashflow Forecast' || name === 'Cashflow Projection' ? 'CASHFLOW_FORECAST' : name === 'Valuation Report' || name === 'Asset Valuation' ? 'ASSET_VALUATION' : name === 'Legal Documents' || name === 'Legal Ownership Documents' ? 'LEGAL_OWNERSHIP' : undefined;
  const requirementFor = (name: string) => evidenceRequirements.find((item) => item.evidenceType === evidenceTypeFor(name));
  const readinessLabels: Record<string, string> = { projectData: 'Project Data', requiredDocuments: 'Required Documents', financialAssumptions: 'Financial Assumptions', supportingEvidence: 'Supporting Evidence' };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600"><FileText className="h-3.5 w-3.5" /> AI Project &amp; Business Plan Analyzer</span>
            <h2 className="mt-1 text-base font-black text-slate-900 dark:text-white">Project Feasibility &amp; Cashflow Evaluation</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Evaluates real tenant-scoped project data, submitted evidence, NPV, DSCR, cashflow, risk, and funding readiness.</p>
          </div>
          <button onClick={() => void analyze()} disabled={loading || !selectedProjectId || !canAnalyze} className="flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-4 w-4 text-emerald-200" />{projectLocked ? 'Locked after approval' : !canAnalyze ? 'View and Governance Only' : loading ? 'Evaluating Business Plan...' : 'Analyze Project Metrics'}</button>
        </div>
        {projectLocked && (
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-[11px] text-slate-600 dark:text-slate-300"><strong>Locked after approval.</strong> This project is {selectedProjectStatus?.replaceAll('_', ' ')}, so the feasibility analysis, evidence and contract structuring can no longer change. A Country Admin can reopen it before funds are committed; reopening returns it to due diligence and stops funding.</p>
            {canReopenProject(selectedProjectStatus, user.role) && <button onClick={() => void reopenProject()} disabled={reopening} className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700">{reopening ? 'Reopening...' : 'Reopen project'}</button>}
          </div>
        )}
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Accessible project
          <select value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); setProjectData(null); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-900">
            <option value="">Select a project</option>
            {projects.map((item) => <option key={item.projectId} value={item.projectId}>{item.projectName} · {item.projectCode} · {item.status}</option>)}
          </select>
        </label>
        {project && <p className="text-[10px] text-slate-500">{project.sector} · Funding required: {project.countryNode?.currency || 'MYR'} {Number(project.fundingRequired).toLocaleString()} · {project.proposedShariahContract}</p>}
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 font-semibold text-rose-700">{error}</p>}
      {evidenceNotice && <p role="status" className="rounded-xl bg-amber-50 p-3 font-semibold text-amber-800">{evidenceNotice}</p>}
      {projectData && <AISectionContainer>
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
         {readiness && <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">Investment Readiness</h3><p className="text-[10px] text-slate-500">AI recommends a readiness status only. It does not approve investment.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${readiness.status === 'GREEN' ? 'bg-emerald-100 text-emerald-800' : readiness.status === 'RED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{readiness.status} · {readiness.label}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{(readiness.reasons || [{ category: 'Evidence', status: readiness.evidenceStatus, detail: readiness.evidenceStatus }, { category: 'Financial', status: readiness.financialStatus, detail: readiness.financialStatus }, { category: 'Risk', status: readiness.riskLevel, detail: readiness.riskLevel }, { category: 'Compliance', status: readiness.complianceStatus, detail: readiness.complianceStatus }]).map((reason) => <div key={reason.category} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900"><span className="block text-[9px] font-extrabold uppercase text-slate-400">{reason.category}</span><span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{reason.status.replaceAll('_', ' ')}</span><span className="mt-1 block text-[10px] text-slate-500">{reason.detail}</span></div>)}</div><div className="mt-3 grid gap-3 md:grid-cols-2"><div><span className="text-[10px] font-extrabold uppercase text-slate-400">Review can proceed after</span><ul className="mt-1 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">{(readiness.reviewCanProceedAfter || []).map((item) => <li key={item.requirement} className={item.complete ? 'text-emerald-700' : 'text-amber-700'}>{item.complete ? '✓' : '○'} {item.requirement}</li>)}</ul></div><div><span className="text-[10px] font-extrabold uppercase text-slate-400">Recommended next step</span><p className="mt-1 text-[11px] text-slate-700 dark:text-slate-300">{readiness.recommendedNextStep || 'Continue authorised human review.'}</p></div></div><p className="mt-3 text-[10px] font-bold text-slate-500">{readiness.disclaimer}</p></div>}
        {evidence && <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
             <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 title="Evidence Readiness evaluates data completeness, document availability, and supporting evidence quality before financial feasibility assessment. It does not indicate whether a project is financially good or bad." className="text-sm font-black text-slate-900 dark:text-white">Evidence Readiness Score</h3><p className="text-[10px] text-slate-500">Measures how complete the submitted information is. It is not a financial viability score.</p><p className="mt-1 text-[10px] text-slate-500">{evidence.methodology || 'Evidence Readiness evaluates data completeness, document availability, and supporting evidence quality before financial feasibility assessment.'}</p></div><div className="flex items-center gap-2"><span className="text-2xl font-black text-emerald-600">{evidence.scorePercent}%</span><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${statusClass(evidence.status === 'SUFFICIENT_EVIDENCE' ? 'COMPLETED' : 'PENDING')}`}>{evidence.status.replaceAll('_', ' ')}</span></div></div>
             <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[10px] text-slate-500 dark:bg-slate-900"><p className="font-extrabold uppercase tracking-wider text-slate-400">Calculation</p><p className="mt-1">Current score contribution = earned points / maximum weight. Evidence Readiness is evaluated before the separate Project Feasibility Score.</p></div>
             <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(readinessLabels).map(([key, label]) => { const weight = evidence.weights?.[key as keyof NonNullable<typeof evidence.weights>] ?? ({ projectData: 30, requiredDocuments: 25, financialAssumptions: 30, supportingEvidence: 15 }[key as keyof typeof readinessLabels]); const contribution = evidence.contributions?.[key as keyof NonNullable<typeof evidence.contributions>] ?? evidence.components[key as keyof typeof evidence.components]; return <div key={key} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900"><span className="block text-[9px] font-extrabold uppercase text-slate-400">{label}</span><span className="text-sm font-black text-slate-700 dark:text-slate-200">{contribution}/{weight}</span><span className="block text-[9px] text-slate-400">Current contribution</span></div>; })}</div>
          </div>
           <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">AI Assessment Coverage</h3><p className="mt-1 text-[10px] text-slate-500">Resolve each evidence gap directly from this section.</p></div><span className="text-[10px] font-bold text-slate-400">Status · Priority · Action</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{evidence.coverage.map((item) => { const requirement = requirementFor(item.label); const evidenceType = evidenceTypeFor(item.label); const currentStatus = requirement?.uploadedDocumentId ? requirement.status : item.status; return <div key={item.key} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700"><div className="flex items-center justify-between gap-2"><span className="font-extrabold text-slate-800 dark:text-slate-200">{item.label}</span><span className={`rounded-full px-2 py-1 text-[9px] font-black ${statusClass(currentStatus)}`}>{currentStatus}</span></div><div className="mt-1 flex items-start justify-between gap-2 text-[10px]"><div><span className={`font-extrabold ${priorityClass(requirement?.priority || item.importance)}`}>{requirement?.priority || item.importance} priority</span><p className="mt-1 text-slate-500">{requirement?.description || item.requiredAction}</p></div>{canUploadEvidence && evidenceType && currentStatus !== 'VERIFIED' ? <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-emerald-600 px-2 py-1.5 text-[9px] font-bold text-white hover:bg-emerald-700"><Upload className="h-3 w-3" />Upload<input type="file" className="hidden" accept={requirement?.requiredFormat.split(',').map((format) => `.${format.trim().toLowerCase()}`).join(',')} disabled={Boolean(uploadingEvidence)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEvidence(evidenceType, file); event.currentTarget.value = ''; }} /></label> : currentStatus === 'VERIFIED' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}</div></div>; })}</div></div>
           <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><h3 className="text-sm font-black text-slate-900 dark:text-white">Missing Evidence Matrix</h3><p className="mt-1 text-[10px] text-slate-500">Upload the required evidence to trigger extraction, validation, and human verification.</p><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[11px]"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-700"><th className="p-2">Evidence</th><th className="p-2">Status</th><th className="p-2">Priority</th><th className="p-2">Required format</th><th className="p-2">Description / action</th><th className="p-2">Upload</th></tr></thead><tbody>{evidence.matrix.map((item) => { const requirement = requirementFor(item.evidence); const evidenceType = evidenceTypeFor(item.evidence); return <tr key={item.evidence} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60"><td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{item.evidence}</td><td className="p-2.5"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${statusClass(requirement?.uploadedDocumentId ? requirement.status : item.status)}`}>{requirement?.uploadedDocumentId ? requirement.status : item.status}</span></td><td className={`p-2.5 font-extrabold ${priorityClass(requirement?.priority || item.priority)}`}>{requirement?.priority || item.priority}</td><td className="p-2.5 text-slate-500">{requirement?.requiredFormat || 'PDF, XLSX, CSV'}</td><td className="p-2.5 text-slate-500">{requirement?.description || item.requiredAction}</td><td className="p-2.5">{canUploadEvidence && evidenceType && requirement?.status !== 'VERIFIED' ? <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700"><Upload className="h-3 w-3" />{uploadingEvidence === evidenceType ? 'Processing...' : 'Upload'}<input type="file" className="hidden" accept={requirement?.requiredFormat.split(',').map((format) => `.${format.trim().toLowerCase()}`).join(',')} disabled={Boolean(uploadingEvidence)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEvidence(evidenceType, file); event.currentTarget.value = ''; }} /></label> : requirement?.status === 'VERIFIED' ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3 w-3" />Verified</span> : null}</td></tr>; })}</tbody></table></div></div>
           {evidenceRequirements.some((item) => item.uploadedDocumentId) && <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800/50 dark:bg-blue-950/20"><h3 className="text-sm font-black text-slate-900 dark:text-white">Evidence Verification</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{evidenceRequirements.filter((item) => item.uploadedDocumentId).map((item) => <div key={item.id} className="rounded-xl border border-blue-100 bg-white p-3 dark:border-blue-800 dark:bg-slate-800"><div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-800 dark:text-slate-200">{item.evidenceType.replaceAll('_', ' ')}</span><span className={`rounded-full px-2 py-1 text-[9px] font-black ${statusClass(item.status)}`}>{item.status}</span></div><p className="mt-2 text-[10px] text-slate-500">Document: {item.uploadedDocument?.fileName || 'Uploaded document'}</p><p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">Validation: {item.verificationResult?.validationResult || 'AI verification pending.'}</p>{item.verificationResult?.missingFields?.length ? <p className="mt-1 text-[10px] text-rose-700">Missing information: {item.verificationResult.missingFields.join(', ')}</p> : null}{(() => { const flags = item.verificationResult?.integrityFlags ?? item.uploadedDocument?.integrity?.flags ?? []; return flags.length ? <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[10px] text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"><p className="font-black">⚠ Document integrity: check before verifying</p><ul className="mt-1 list-disc pl-4">{flags.map((flag) => <li key={flag.code}>{flag.message}</li>)}</ul><p className="mt-1 opacity-80">These are signals, not proof of tampering. Compare with the original from the issuer.</p></div> : null; })()}<p className="mt-1 text-[10px] font-bold text-slate-600">Confidence: {item.confidenceScore}% · Human review required</p></div>)}</div></div>}
          <div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><h3 className="text-sm font-black text-slate-900 dark:text-white">Recommended Next Actions</h3>{evidence.nextActions.length ? <ol className="mt-3 list-decimal space-y-2 pl-5 text-[11px] text-slate-700 dark:text-slate-300">{evidence.nextActions.map((action) => <li key={action}>{action}</li>)}</ol> : <p className="mt-3 text-[11px] text-emerald-700">No evidence action is currently pending.</p>}</div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><h3 className="text-sm font-black text-slate-900 dark:text-white">AI Confidence: {confidence?.scorePercent ?? evidence.scorePercent}%</h3><p className="mt-1 text-[10px] text-slate-500">Reason: evidence quality and completeness, not project viability.</p><ul className="mt-3 list-disc space-y-1 pl-5 text-[11px] text-slate-700 dark:text-slate-300">{(confidence?.reasons || evidence.confidenceReasons).map((reason: string) => <li key={reason}>{reason}</li>)}</ul></div></div>
        </>}
        <AIRecommendationCard title={`AI Recommendation: ${financial?.fundingReadiness || 'Review Required'}`} subtitle="Human Review Required · Financial Feasibility & Cashflow Health" recommendationText={`Cashflow source: ${String(financial?.cashflow?.source || 'Not available')}. No financial figure is assumed where it was not found in the project record or uploaded evidence.`} confidence={confidence} positiveFactors={risk?.keyAssumptions?.map((item) => `${item.name}: ${String(item.value)}`)} concerns={risk?.riskFlags?.map((item) => `${item.title}: ${item.description}`)} disclaimer="Assessment is based on tenant-scoped project data and extracted evidence. Human finance, risk, compliance, and Shariah review remains mandatory." />
        {canVerifyEvidence && evidenceRequirements.some((item) => item.status === 'AI_PRECHECKED' || item.status === 'REQUIRES_REVIEW') && <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800/50 dark:bg-amber-950/20"><h3 className="text-sm font-black text-slate-900 dark:text-white">Human Evidence Verification</h3><p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">AI pre-checks are advisory. Only an authorised human reviewer can mark evidence as verified.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{evidenceRequirements.filter((item) => (item.status === 'AI_PRECHECKED' || item.status === 'REQUIRES_REVIEW') && item.uploadedDocumentId).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 dark:bg-slate-800"><div><span className="block text-[10px] font-extrabold text-slate-800 dark:text-slate-200">{item.evidenceType.replaceAll('_', ' ')}</span><span className="text-[9px] text-slate-500">{item.uploadedDocument?.fileName || 'Uploaded evidence'}</span></div><button onClick={() => void verifyEvidence(item.evidenceType)} className="rounded-xl bg-amber-600 px-2.5 py-1.5 text-[9px] font-bold text-white hover:bg-amber-700">Verify as reviewer</button></div>)}</div></div>}
         {shariah && <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800/50 dark:bg-purple-950/20"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">Shariah Structure Assessment: {shariah.structure}</h3><p className="text-[10px] text-slate-500">Proposed Structure Detected. AI identifies the proposed contract but does not provide Shariah approval.</p></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">{shariah.status.replaceAll('_', ' ')}</span></div><div className="mt-3 flex flex-wrap items-center gap-1 text-[9px] font-extrabold uppercase text-slate-500">{(shariah.statusFlow || ['DETECTED', 'REQUIRES_INFORMATION', 'READY_FOR_SHARIAH_REVIEW', 'REVIEWED_BY_SHARIAH_REVIEWER']).map((stage, index, stages) => <React.Fragment key={stage}><span className={`rounded-full px-2 py-1 ${stage === shariah.status || (stage === 'REVIEWED_BY_SHARIAH_REVIEWER' && shariah.humanReviewStatus === 'REVIEWED') ? 'bg-purple-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-800'}`}>{stage.replaceAll('_', ' ')}</span>{index < stages.length - 1 && <span>↓</span>}</React.Fragment>)}</div><div className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-white p-3 dark:bg-slate-800"><span className="text-[10px] font-extrabold uppercase text-slate-400">AI Assessment</span><ul className="mt-1 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">{(shariah.assessment || shariah.checks.filter((check) => check.status === 'COMPLETE').map((check) => check.label)).map((item) => <li key={item} className="font-bold text-emerald-700">✓ {item}</li>)}</ul></div><div className="rounded-xl bg-white p-3 dark:bg-slate-800"><span className="text-[10px] font-extrabold uppercase text-slate-400">Missing information</span><ul className="mt-1 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">{(shariah.missingInformation || shariah.requiredInformation).length ? (shariah.missingInformation || shariah.requiredInformation).map((item) => <li key={item} className="font-bold text-rose-700">✕ {item}</li>) : <li className="text-emerald-700">No information gaps detected.</li>}</ul></div></div><div className="mt-3 rounded-xl bg-white p-3 dark:bg-slate-800"><span className="text-[10px] font-extrabold uppercase text-slate-400">Human Shariah governance</span><p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Status: {shariah.humanReviewStatus?.replaceAll('_', ' ') || 'NOT REVIEWED'}. A qualified Shariah reviewer must complete the final determination.</p><p className="mt-2 text-[10px] font-bold text-purple-700 dark:text-purple-300">{shariah.disclaimer || 'AI assessment is not a Shariah ruling or approval. Final determination requires qualified Shariah review.'}</p></div></div>}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900 dark:text-white">Sensitivity Analysis</h3><span className="text-[10px] text-slate-400">Only supplied assumptions are used</span></div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[11px]"><thead><tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400 dark:border-slate-700"><th className="p-2">Scenario</th><th className="p-2">Status</th><th className="p-2">NPV</th><th className="p-2">IRR</th><th className="p-2">ROI</th><th className="p-2">Payback</th></tr></thead><tbody>{(financial?.scenarios || []).map((scenario) => <tr key={scenario.name} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60"><td className="p-2.5 font-bold">{scenario.name}</td><td className="p-2.5"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${scenario.status === 'CALCULATED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{scenario.status.replaceAll('_', ' ')}</span></td><td className="p-2.5">{formatMetric(scenario.npv)}</td><td className="p-2.5">{formatMetric(scenario.irr, '%')}</td><td className="p-2.5">{formatMetric(scenario.roi, '%')}</td><td className="p-2.5">{formatMetric(scenario.paybackPeriod, ' years')}</td></tr>)}</tbody></table></div></div>
         {riskAssessment && <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900 dark:text-white">Project Risk Assessment</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${riskAssessment.overallLevel === 'HIGH' ? 'bg-rose-100 text-rose-800' : riskAssessment.overallLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{riskAssessment.overallLevel} PROJECT RISK</span></div><div className="mt-3 grid gap-3 md:grid-cols-2">{riskAssessment.risks.map((riskItem) => <div key={riskItem.category} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700"><div className="flex items-center justify-between"><div><span className="font-extrabold text-slate-800 dark:text-slate-200">{riskItem.category}</span><span className="ml-2 text-[9px] font-bold uppercase text-slate-400">{riskItem.type === 'INFORMATION' ? 'Information Risk' : 'Project Risk'}</span></div><span className={`text-[10px] font-black ${riskItem.level === 'HIGH' ? 'text-rose-700' : riskItem.level === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700'}`}>{riskItem.level}</span></div><p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300"><strong>Reason:</strong> {riskItem.reason || riskItem.description}</p><p className="mt-1 text-[10px] text-slate-500"><strong>Impact:</strong> {riskItem.impact}</p><p className="mt-1 text-[10px] text-slate-500"><strong>Mitigation Action:</strong> {riskItem.mitigationAction || riskItem.mitigation}</p></div>)}</div></div>}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">Human review workflow</span><span className="rounded-full bg-purple-500/10 px-2 py-1 text-[10px] font-black text-purple-700">{projectData.reviewStage.replaceAll('_', ' ')}</span></div>
           <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold">{reviewStages.map((stage, index) => <React.Fragment key={stage}><span className={index < reviewStages.indexOf(projectData.reviewStage) ? 'rounded-xl bg-emerald-100 px-2.5 py-1 text-emerald-800' : index === reviewStages.indexOf(projectData.reviewStage) ? 'rounded-xl bg-purple-100 px-2.5 py-1 text-purple-800' : 'rounded-xl bg-slate-100 px-2.5 py-1 text-slate-500'}>{stage.replaceAll('_', ' ')}</span>{index < reviewStages.length - 1 && <span className="text-slate-400">→</span>}</React.Fragment>)}</div>
           <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[10px] text-slate-600 dark:bg-slate-900 dark:text-slate-300"><strong>Current status:</strong> {projectData.reviewStage === 'DRAFT' ? 'AI DRAFT · AWAITING SUBMISSION' : projectData.reviewStage === 'FINAL_DECISION' ? 'FINAL DECISION' : 'IN REVIEW'} · <strong>Responsibility:</strong> {projectData.roleResponsibility?.join(', ') || 'Project submission and readiness for formal review'}</div>
           {canReviewCurrentStage && <div className="mt-3 space-y-2 rounded-xl border border-purple-100 p-3 dark:border-purple-800/50"><div className="flex flex-col gap-2 sm:flex-row"><select value={reviewDecision} onChange={(event) => setReviewDecision(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-2 text-[11px] font-bold dark:border-slate-700 dark:bg-slate-900"><option value="ACCEPTED">Approved and advance</option><option value="ACCEPTED_WITH_CONDITIONS">Approved with conditions</option><option value="REQUEST_CHANGES">Request changes</option><option value="REJECTED">Rejected</option></select><textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Required reviewer comment" className="min-h-9 flex-1 rounded-xl border border-slate-200 bg-white p-2 text-[11px] dark:border-slate-700 dark:bg-slate-900" /></div><textarea value={reviewEvidence} onChange={(event) => setReviewEvidence(event.target.value)} placeholder="Supporting evidence references (one per line)" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white p-2 text-[11px] dark:border-slate-700 dark:bg-slate-900" /><button onClick={() => void advanceReview()} className="rounded-xl bg-purple-600 px-3 py-2 text-[11px] font-extrabold text-white">Record {projectData.reviewStage.replaceAll('_', ' ')}</button></div>}
          <p className="mt-2 text-[10px] text-slate-500">Every reviewer, date, decision, comment, and transition is audit logged. AI cannot approve funding.</p>
           {projectData.reviewHistory?.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-[10px]"><thead><tr className="border-b border-slate-200 text-[9px] uppercase text-slate-400 dark:border-slate-700"><th className="p-2">Stage</th><th className="p-2">Reviewer</th><th className="p-2">Role</th><th className="p-2">Date</th><th className="p-2">Status</th><th className="p-2">Decision</th><th className="p-2">Comment</th><th className="p-2">Supporting Evidence</th></tr></thead><tbody>{projectData.reviewHistory.map((entry, index) => <tr key={`${entry.stage}-${entry.date || entry.at}-${index}`} className="border-b border-slate-100 dark:border-slate-700/60"><td className="p-2">{entry.stage.replaceAll('_', ' ')}</td><td className="p-2">{entry.reviewer || entry.reviewerId || 'Human reviewer'}</td><td className="p-2">{entry.reviewerRole || 'Reviewer'}</td><td className="p-2">{new Date(entry.date || entry.at || '').toLocaleString()}</td><td className="p-2 font-bold">{(entry.status || 'IN_REVIEW').replaceAll('_', ' ')}</td><td className="p-2 font-bold">{(entry.decision || 'RECORDED').replaceAll('_', ' ')}</td><td className="p-2 text-slate-500">{entry.comment || entry.note || 'No comment recorded.'}</td><td className="p-2 text-slate-500">{entry.supportingEvidence?.join(', ') || 'None recorded.'}</td></tr>)}</tbody></table></div> : null}
        </div>
        {risk?.riskFlags?.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><span className="flex items-center gap-1.5 font-extrabold"><AlertTriangle className="h-4 w-4" /> Risk flags requiring review</span><ul className="mt-2 list-disc space-y-1 pl-5">{risk.riskFlags.map((flag) => <li key={`${flag.title}-${flag.description}`}>{flag.title}: {flag.description}</li>)}</ul></div> : null}
        <AIApprovalPanel roleName={user.role} />
      </AISectionContainer>}
    </div>
  );
};
