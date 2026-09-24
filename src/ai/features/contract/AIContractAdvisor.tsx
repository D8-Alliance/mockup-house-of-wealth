import React, { useEffect, useState } from 'react';
import { AIService } from '../../services/AIService';
import { ContractAdvisorProject } from '../../types/aiCoreTypes';
import { apiClient } from '../../../services/apiClient';
import { AIRecommendationCard } from '../../components/AIRecommendationCard';
import { AIReviewPanel } from '../../components/AIReviewPanel';
import { AISourcePanel } from '../../components/AISourcePanel';
import { AIApprovalPanel } from '../../components/AIApprovalPanel';
import { Scale, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

interface AIContractAdvisorProps {
  user: { id: string; role: string; organization?: string; countryCode?: string };
  project?: ContractAdvisorProject;
}

export const AIContractAdvisor: React.FC<AIContractAdvisorProps> = ({ user, project: projectOverride }) => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ContractAdvisorProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectOverride?.projectId || '');
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof AIService.analyzeContract>> | null>(null);
  const [error, setError] = useState('');
  const canReview = ['Super Admin', 'AI Administrator', 'AI Model Reviewer', 'Shariah Reviewer', 'Shariah Committee', 'Compliance Officer', 'Risk Officer'].includes(user.role);

  useEffect(() => {
    if (projectOverride) {
      setProjects([projectOverride]);
      setSelectedProjectId(projectOverride.projectId);
      return;
    }

    let cancelled = false;
    apiClient.getProjects()
      .then((backendProjects) => {
        if (cancelled) return;
        const mappedProjects = backendProjects.map((item) => ({
          projectId: item.projectId,
          title: item.projectName,
          proposedShariahContract: item.proposedShariahContract,
          fundingTarget: Number(item.fundingRequired),
          sector: item.sector,
          organisationId: item.organisationId,
          countryNodeId: item.countryNodeId,
          currency: item.countryNode?.currency || 'MYR',
        }));
        setProjects(mappedProjects);
        setSelectedProjectId(mappedProjects[0]?.projectId || '');
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load projects.');
      });

    return () => { cancelled = true; };
  }, [projectOverride]);

  const project = projects.find((item) => item.projectId === selectedProjectId);

  const handleAnalyze = async () => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      setAnalysis(await AIService.analyzeContract(project, user));
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Unable to analyze the contract.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <Scale className="w-3.5 h-3.5" />
              AI Contract Advisor • Shariah Structuring
            </span>
            <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
              Islamic Contract Structure Advisory & Analysis
            </h2>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Evaluates cashflow profiles and asset backings to suggest optimal Shariah contracts (Mudarabah, Musharakah, Wakalah, Ijarah, Murabaha).
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !project}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            {loading ? 'Evaluating Structure...' : 'Analyze Contract Structure'}
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
           <label className="flex items-center gap-2">
             <span>Project:</span>
             <select
               value={selectedProjectId}
               onChange={(event) => { setSelectedProjectId(event.target.value); setAnalysis(null); }}
               disabled={loading || projects.length === 0}
               className="rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-slate-900"
             >
               {projects.length === 0 && <option value="">Loading projects...</option>}
               {projects.map((item) => <option key={item.projectId} value={item.projectId}>{item.title}</option>)}
             </select>
           </label>
           {project ? <>
              <span>Funding Required: <strong className="text-slate-900 dark:text-white">{new Intl.NumberFormat(undefined, { style: 'currency', currency: project.currency || 'MYR', maximumFractionDigits: 0 }).format(project.fundingTarget)}</strong></span>
              <span>Sponsor Proposed Structure: <strong className="text-emerald-600 font-bold">{project.proposedShariahContract}</strong></span>
           </> : <span>No projects available for the current tenant.</span>}
         </div>
      </div>

      {error && <p role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">{error}</p>}

      {analysis && (
        <div className="space-y-6">
           <AIRecommendationCard
             title={`Recommended Structure: ${analysis.recommendation.primaryStructure || 'Review Required'} vs ${project.proposedShariahContract}`}
             subtitle="AI advisory output requiring authorised human review"
              recommendationText={`${analysis.recommendation.primaryStructure || 'Review Required'} is being considered against ${project.proposedShariahContract}. ${analysis.recommendation.rationale || 'No structured rationale was returned.'}`}
            confidence={analysis.confidence}
            positiveFactors={analysis.reasoningSummary.positiveFactors}
            concerns={analysis.reasoningSummary.concerns}
            disclaimer={analysis.recommendation.disclaimer}
          />

           {canReview && <>
             <AIApprovalPanel roleName={user.role} />
             <AIReviewPanel
               aiRequestId={analysis.requestId}
               userId={user.id}
               roleName={user.role}
               onDecisionSubmitted={async (decision, note) => {
                 if (!analysis.runId) throw new Error('AI run identifier is missing.');
                 await apiClient.reviewAiDecision(analysis.runId, {
                   decision,
                   justification: note || 'Human review decision recorded.',
                 });
               }}
             />
           </>}

          <AISourcePanel sources={analysis.dataSources} />
        </div>
      )}
    </div>
  );
};
