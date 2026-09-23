import React, { useEffect, useState } from 'react';
import { AIReviewPanel } from '../../components/AIReviewPanel';
import { AIApprovalPanel } from '../../components/AIApprovalPanel';
import { Scale, BookOpen, Sparkles, ShieldCheck } from 'lucide-react';
import { AIService } from '../../services/AIService';
import { apiClient, BackendAiRun } from '../../../services/apiClient';
import { ContractAdvisorProject } from '../../types/aiCoreTypes';

interface ShariahAssistantProps {
  user: { id: string; role: string; organization?: string; countryCode?: string };
}

export const AIShariahAssistant: React.FC<ShariahAssistantProps> = ({ user }) => {
  const [projects, setProjects] = useState<ContractAdvisorProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [terms, setTerms] = useState('');
  const [run, setRun] = useState<BackendAiRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient.getProjects().then((items) => {
      if (cancelled) return;
      const mapped = items.map((item) => ({
        projectId: item.projectId,
        title: item.projectName,
        proposedShariahContract: item.proposedShariahContract,
        fundingTarget: Number(item.fundingRequired),
        sector: item.sector,
        organisationId: item.organisationId,
        countryNodeId: item.countryNodeId,
      }));
      setProjects(mapped);
      setSelectedProjectId(mapped[0]?.projectId || '');
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load projects.');
    });
    return () => { cancelled = true; };
  }, []);

  const project = projects.find((item) => item.projectId === selectedProjectId);

  useEffect(() => {
    if (project) {
      setTerms(`Project: ${project.title}\nSector: ${project.sector}\nProposed contract: ${project.proposedShariahContract}\n\nEnter the contract terms, clauses, or Shariah questions to analyse.`);
      setRun(null);
    }
  }, [project]);

  const handleRunAnalysis = async () => {
    if (!project || !terms.trim()) return;
    setLoading(true);
    setError('');
    setRun(null);
    try {
      const result = await AIService.analyzeShariah({
        projectId: project.projectId,
        proposedContract: project.proposedShariahContract,
        terms,
      });
      setRun(result);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Unable to run Shariah analysis.');
    } finally {
      setLoading(false);
    }
  };

  const output = run?.output;
  const recommendation = output?.recommendation || {};
  const reasoning = output?.reasoningSummary || { positiveFactors: [], concerns: [] };
  const canReview = Boolean(run && run.status === 'COMPLETED' && run.provider !== 'sandbox' && output);

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit"><Scale className="w-3.5 h-3.5" /> AI Shariah Compliance & Governance Assistant</span>
            <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">Shariah Analysis & Human Review</h2>
            <p className="text-slate-500 text-[11px] mt-0.5">AI output is advisory and must be verified by an authorised Shariah reviewer.</p>
          </div>
          <button onClick={() => void handleRunAnalysis()} disabled={loading || !project || !terms.trim()} className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg flex items-center gap-2 disabled:opacity-50"><Sparkles className="w-4 h-4" />{loading ? 'Analysing...' : 'Run Shariah Analysis'}</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="font-bold text-slate-700 dark:text-slate-300">Project
            <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} disabled={loading || projects.length === 0} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900">
              {projects.length === 0 && <option value="">Loading projects...</option>}
              {projects.map((item) => <option key={item.projectId} value={item.projectId}>{item.title}</option>)}
            </select>
          </label>
          <label className="font-bold text-slate-700 dark:text-slate-300">Contract terms / questions
            <textarea value={terms} onChange={(event) => setTerms(event.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal text-slate-900" />
          </label>
        </div>
      </div>

      {error && <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs font-semibold text-rose-700">{error}</div>}

      {run && output && (
        <div className="space-y-6">
          <div className="rounded-xl bg-slate-100 p-3 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">Provider: <strong>{run.provider}</strong> | Model: <strong>{run.model}</strong> | Status: <strong>{run.status}</strong></div>
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">AI Advisory Output</span>
            <h3 className="text-base font-black text-slate-900 dark:text-white">{String(recommendation.primaryStructure || 'Review Required')} - {project?.proposedShariahContract}</h3>
            <p className="text-slate-700 dark:text-slate-200">{String(recommendation.rationale || 'No structured rationale was returned.')}</p>
            <div className="text-[11px] text-slate-500">Confidence: {output.confidence?.level || 'LOW'} ({output.confidence?.scorePercent ?? 0}%). This is not a final Shariah determination.</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3"><h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-600" /> Positive Factors</h3><ul className="list-disc pl-5 text-slate-700 dark:text-slate-200">{reasoning.positiveFactors.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3"><h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Concerns and Risks</h3><ul className="list-disc pl-5 text-slate-700 dark:text-slate-200">{reasoning.concerns.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
          </div>
          {canReview ? <><AIApprovalPanel roleName={user.role} /><AIReviewPanel aiRequestId={run.requestId} userId={user.id} roleName={user.role} onDecisionSubmitted={async (decision, note) => { await apiClient.reviewAiDecision(run.id, { decision, justification: note || 'Human review decision recorded.' }); }} /></> : <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-800">Human sign-off is disabled until a completed non-sandbox AI run is available.</div>}
        </div>
      )}
    </div>
  );
};
