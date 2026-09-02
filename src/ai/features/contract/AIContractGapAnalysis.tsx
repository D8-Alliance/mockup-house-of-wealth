import React, { useState } from 'react';
import { AIRiskAlert } from '../../components/AIRiskAlert';
import { AIConfidenceBadge } from '../../components/AIConfidenceBadge';
import { FileSearch, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AIContractGapAnalysis: React.FC<{ user: any }> = () => {
  const [analyzed, setAnalyzed] = useState(false);

  const gaps = [
    {
      title: 'Missing Explicit Loss-Sharing Clause',
      description: 'The uploaded contract draft omits explicit statement that capital losses must be borne strictly pro-rata to capital contribution under AAOIFI Mudarabah Standard 13.',
      severity: 'CRITICAL' as const,
      mitigation: 'Insert mandatory AAOIFI clause 4/1 regarding capital loss distribution.'
    },
    {
      title: 'Ambiguous Profit Calculation Periodicity',
      description: 'Clause 7 defines profit distribution as "periodic" without explicitly stating whether realized profits are audited quarterly or semi-annually.',
      severity: 'HIGH' as const,
      mitigation: 'Specify exact accounting cutoff date and quarterly distribution schedule.'
    },
    {
      title: 'Unclear Dispute Jurisdiction in Country Node',
      description: 'Governing law specifies D-8 SAC, but does not explicitly designate local arbitration center in Malaysia (KLRCA/AIAC).',
      severity: 'MEDIUM' as const,
      mitigation: 'Designate Asian International Arbitration Centre (AIAC) as primary forum.'
    }
  ];

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <FileSearch className="w-3.5 h-3.5" />
              Contract Gap & Clause Analyzer
            </span>
            <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
              AI Contract Completeness & Risk Gap Analysis
            </h2>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Scans draft legal text for missing Shariah protective clauses, ambiguous commercial terms, or regulatory conflicts.
            </p>
          </div>

          <button
            onClick={() => setAnalyzed(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-lg shadow-amber-600/20 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            {analyzed ? 'Re-scan Legal Text' : 'Scan Draft for Gaps'}
          </button>
        </div>
      </div>

      {analyzed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-black text-sm">3 Contract Gaps & Ambiguities Identified</h3>
            </div>
            <AIConfidenceBadge confidence={{ level: 'HIGH', scorePercent: 93, disclaimer: 'AI clause analysis requires legal and Shariah confirmation.' }} />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {gaps.map((g, idx) => (
              <AIRiskAlert
                key={idx}
                title={g.title}
                description={g.description}
                severity={g.severity}
                mitigation={g.mitigation}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
