import React, { useState } from 'react';
import { AIRecommendationCard } from '../../components/AIRecommendationCard';
import { AIReviewPanel } from '../../components/AIReviewPanel';
import { AIApprovalPanel } from '../../components/AIApprovalPanel';
import { Scale, CheckCircle2, AlertTriangle, BookOpen, Sparkles, ShieldCheck } from 'lucide-react';

export const AIShariahAssistant: React.FC<{ user: any }> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const mockShariahAssessment = {
    overallRating: 'Potentially Shariah-Compliant (Pending Human Board Signoff)',
    confidence: { level: 'HIGH' as const, scorePercent: 95, disclaimer: 'AI Shariah analysis is advisory. Authorised Shariah Board decision required.' },
    positiveFactors: [
      'Underlying project business activity (Palm Oil Agriculture & Refining) is 100% Halal certified',
      'No interest-bearing (Riba) debt leverage detected in balance sheet',
      'Revenue model relies strictly on realized asset sales and operational yield'
    ],
    concerns: [
      'Late payment penalty mechanism must be designated strictly as charity (Tawarruq/Sadaqah) without sponsor income recognition',
      'Short-term idle fund placement must adhere strictly to Islamic money market instruments'
    ],
    questionsForShariahBoard: [
      'Does the 1.5% Mudarib management fee represent a fair market rate without guaranteed return masking?',
      'Is the proposed asset co-ownership title transfer mechanism in Malaysia legally binding under Syariah court principles?'
    ],
    aaoifiStandards: [
      'AAOIFI Standard No. 12 (Sharika / Musharakah)',
      'AAOIFI Standard No. 13 (Mudarabah)',
      'AAOIFI Standard No. 21 (Financial Paper / Sukuk)'
    ]
  };

  const handleRunAnalysis = () => {
    setLoading(true);
    setTimeout(() => {
      setAnalyzed(true);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <Scale className="w-3.5 h-3.5" />
              AI Shariah Compliance & Governance Assistant
            </span>
            <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
              Automated Shariah Review & AAOIFI Standards Alignment
            </h2>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Assists Shariah scholars and compliance officers by auditing contract terms against AAOIFI Fatwas and identifying potential Shariah non-compliance risks.
            </p>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            {loading ? 'Evaluating Shariah Compliance...' : 'Run Shariah Compliance Audit'}
          </button>
        </div>
      </div>

      {analyzed && (
        <div className="space-y-6">
          <AIRecommendationCard
            title="Shariah Compliance Status: Potentially Compliant"
            subtitle="AAOIFI Standards Benchmark Audit"
            recommendationText="The proposed Mudarabah structure and agricultural asset backing demonstrate zero Riba, zero Gharar, and zero Maysir in core operations."
            confidence={mockShariahAssessment.confidence}
            positiveFactors={mockShariahAssessment.positiveFactors}
            concerns={mockShariahAssessment.concerns}
            disclaimer="AI-generated analysis. Final Shariah determination requires authorised human Shariah Board review."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Questions for Shariah Scholar */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                Suggested Focus Questions for Shariah Board
              </h3>
              <ul className="space-y-2">
                {mockShariahAssessment.questionsForShariahBoard.map((q, idx) => (
                  <li key={idx} className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 font-semibold text-slate-800 dark:text-slate-200">
                    {idx + 1}. {q}
                  </li>
                ))}
              </ul>
            </div>

            {/* Applicable AAOIFI Standards */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Applicable AAOIFI Standards
              </h3>
              <div className="space-y-2">
                {mockShariahAssessment.aaoifiStandards.map((std, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 font-bold text-emerald-900 dark:text-emerald-300">
                    {std}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <AIApprovalPanel roleName="Shariah Reviewer" />

          <AIReviewPanel
            aiRequestId="AI-SHARIAH-8890"
            userId={user.id}
            roleName={user.role}
          />
        </div>
      )}
    </div>
  );
};
