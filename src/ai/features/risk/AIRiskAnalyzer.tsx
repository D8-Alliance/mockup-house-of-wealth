import React, { useState } from 'react';
import { AIRiskAlert } from '../../components/AIRiskAlert';
import { AIConfidenceBadge } from '../../components/AIConfidenceBadge';
import { AIReviewPanel } from '../../components/AIReviewPanel';
import { AIApprovalPanel } from '../../components/AIApprovalPanel';
import { ShieldAlert, Sparkles, Activity } from 'lucide-react';

export const AIRiskAnalyzer: React.FC<{ user: any }> = ({ user }) => {
  const [analyzed, setAnalyzed] = useState(false);

  const riskCategories = [
    { category: 'Liquidity Risk', score: 7, level: 'HIGH' as const, reason: '5-year pool lockup with secondary exchange volume pending growth.', mitigation: 'Maintain 10% cash reserve in liquidity buffer.' },
    { category: 'Commodity Price Risk', score: 6, level: 'MEDIUM' as const, reason: 'Crude Palm Oil export price fluctuations impact net operating margin.', mitigation: 'Hedge 40% of harvest output via forward sales agreements.' },
    { category: 'Shariah Non-Compliance Risk', score: 1, level: 'LOW' as const, reason: 'Zero debt leverage, zero non-halal revenues detected.', mitigation: 'Annual Shariah board audit.' },
    { category: 'Operational Execution Risk', score: 3, level: 'LOW' as const, reason: 'PDP has 15+ years of operational history in palm oil refining.', mitigation: 'Standard quarterly milestone tracking.' }
  ];

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <ShieldAlert className="w-3.5 h-3.5" />
              AI Multi-Factor Risk Assessment Engine
            </span>
            <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
              Enterprise Risk Evaluation (10 Categories)
            </h2>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Evaluates Financial, Market, Operational, Liquidity, Legal, Regulatory, Shariah, Execution, Fraud, and Reputation risks.
            </p>
          </div>

          <button
            onClick={() => setAnalyzed(true)}
            className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-lg shadow-rose-600/20 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-rose-200" />
            {analyzed ? 'Re-evaluate Risk Metrics' : 'Evaluate Project Risks'}
          </button>
        </div>
      </div>

      {analyzed && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white">
            <h3 className="font-black text-sm text-rose-400">Risk Matrix Output: Overall Score 4.2 / 10 (Moderate Risk)</h3>
            <AIConfidenceBadge confidence={{ level: 'HIGH', scorePercent: 94, disclaimer: 'Risk metrics evaluated against regional benchmark database.' }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {riskCategories.map((rc, idx) => (
              <AIRiskAlert
                key={idx}
                title={`${rc.category} (Score: ${rc.score}/10)`}
                description={rc.reason}
                severity={rc.level}
                mitigation={rc.mitigation}
              />
            ))}
          </div>

          <AIApprovalPanel roleName="Risk Officer" />

          <AIReviewPanel
            aiRequestId="AI-RISK-9901"
            userId={user.id}
            roleName={user.role}
          />
        </div>
      )}
    </div>
  );
};
