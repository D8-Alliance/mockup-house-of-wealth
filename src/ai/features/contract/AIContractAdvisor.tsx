import React, { useState } from 'react';
import { AIService } from '../../services/AIService';
import { AIRecommendationCard } from '../../components/AIRecommendationCard';
import { AIReviewPanel } from '../../components/AIReviewPanel';
import { AISourcePanel } from '../../components/AISourcePanel';
import { AIApprovalPanel } from '../../components/AIApprovalPanel';
import { Scale, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

export const AIContractAdvisor: React.FC<{ user: any }> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const mockProject = {
    projectId: 'PROJ-MYS-001',
    title: 'FELDA Agricultural Expansion',
    proposedShariahContract: 'Mudarabah',
    fundingTarget: 8000000,
    sector: 'Agriculture'
  };

  const handleAnalyze = async () => {
    setLoading(true);
    const res = await AIService.analyzeContract(mockProject, user);
    setAnalysis(res);
    setLoading(false);
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
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            {loading ? 'Evaluating Structure...' : 'Analyze Contract Structure'}
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span>Target Project: <strong className="text-slate-900 dark:text-white">{mockProject.title}</strong></span>
          <span>Target Capital: <strong className="text-slate-900 dark:text-white">${mockProject.fundingTarget.toLocaleString()} USD</strong></span>
          <span>Current Proposed: <strong className="text-emerald-600 font-bold">{mockProject.proposedShariahContract}</strong></span>
        </div>
      </div>

      {analysis && (
        <div className="space-y-6">
          <AIRecommendationCard
            title="Recommended Structure: Musharakah vs Mudarabah Dual Evaluation"
            subtitle="AAOIFI Standard No. 12 & Standard No. 13 Alignment"
            recommendationText={`${analysis.recommendation.primaryStructure} is recommended over Mudarabah. ${analysis.recommendation.rationale}`}
            confidence={analysis.confidence}
            positiveFactors={analysis.reasoningSummary.positiveFactors}
            concerns={analysis.reasoningSummary.concerns}
            disclaimer={analysis.recommendation.disclaimer}
          />

          <AIApprovalPanel roleName={user.role} />

          <AIReviewPanel
            aiRequestId={analysis.requestId}
            userId={user.id}
            roleName={user.role}
          />

          <AISourcePanel sources={analysis.dataSources} />
        </div>
      )}
    </div>
  );
};
