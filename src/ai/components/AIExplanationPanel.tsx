import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface AIExplanationPanelProps {
  positiveFactors: string[];
  concerns: string[];
}

export const AIExplanationPanel: React.FC<AIExplanationPanelProps> = ({ positiveFactors, concerns }) => {
  return (
    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-3 text-xs">
      <span className="font-extrabold text-slate-900 dark:text-white block uppercase tracking-wider text-[10px]">
        Decision Factors & Key Observations
      </span>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Positive Factors */}
        <div className="space-y-1.5 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
          <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Supporting Factors
          </span>
          <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px] list-disc list-inside">
            {positiveFactors.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>

        {/* Concerns */}
        <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
          <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Potential Concerns & Review Items
          </span>
          <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px] list-disc list-inside">
            {concerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
