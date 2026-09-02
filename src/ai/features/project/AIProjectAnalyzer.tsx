import React, { useState } from 'react';
import { AIService } from '../../services/AIService';
import { AIRecommendationCard } from '../../components/AIRecommendationCard';
import { AIReviewPanel } from '../../components/AIReviewPanel';
import { AIApprovalPanel } from '../../components/AIApprovalPanel';
import { FileText, Sparkles, TrendingUp, DollarSign, CheckCircle2 } from 'lucide-react';

export const AIProjectAnalyzer: React.FC<{ user: any }> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState<any>(null);

  const mockProject = {
    projectId: 'PROJ-MYS-001',
    title: 'FELDA Agriculture Expansion',
    proposedShariahContract: 'Mudarabah',
    fundingTarget: 8000000,
    sector: 'Agriculture'
  };

  const handleAnalyzeProject = async () => {
    setLoading(true);
    const res = await AIService.analyzeProject(mockProject, user);
    setProjectData(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <FileText className="w-3.5 h-3.5" />
              AI Project & Business Plan Analyzer
            </span>
            <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
              Project Feasibility & Cashflow Evaluation
            </h2>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Evaluates business plan metrics, discounted net present value (NPV), debt service coverage ratio (DSCR), and funding readiness score.
            </p>
          </div>

          <button
            onClick={handleAnalyzeProject}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            {loading ? 'Evaluating Business Plan...' : 'Analyze Project Metrics'}
          </button>
        </div>
      </div>

      {projectData && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Project Health Score</span>
              <span className="text-xl font-black text-emerald-600 block">{projectData.recommendation.projectHealthScore}/100</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Projected NPV</span>
              <span className="text-xl font-black text-purple-600 font-mono block">{projectData.recommendation.projectedNPV}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Projected IRR</span>
              <span className="text-xl font-black text-blue-600 font-mono block">{projectData.recommendation.projectedIRR}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">DSCR Coverage</span>
              <span className="text-xl font-black text-amber-600 font-mono block">{projectData.recommendation.dscrRatio}x</span>
            </div>
          </div>

          <AIRecommendationCard
            title="Funding Readiness Assessment: High Readiness"
            subtitle="Financial Feasibility & Cashflow Health"
            recommendationText="Project demonstrates strong operating cashflow coverage (1.65x DSCR) and positive Net Present Value ($3.45M USD)."
            confidence={projectData.confidence}
            positiveFactors={projectData.recommendation.strengths}
            concerns={projectData.recommendation.weaknesses}
            disclaimer="Feasibility calculation based on submitted revenue forecasts."
          />

          <AIApprovalPanel roleName={user.role} />

          <AIReviewPanel
            aiRequestId={projectData.requestId}
            userId={user.id}
            roleName={user.role}
          />
        </div>
      )}
    </div>
  );
};
