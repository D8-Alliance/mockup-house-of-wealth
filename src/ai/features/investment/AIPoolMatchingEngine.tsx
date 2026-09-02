import React from 'react';
import { Layers, ShieldCheck, CheckCircle, BarChart2 } from 'lucide-react';

export const AIPoolMatchingEngine: React.FC = () => {
  const breakdown = [
    { factor: 'Risk Profile Alignment', weight: '30%', score: 92, status: 'Strong Match' },
    { factor: 'Duration & Lock-in Horizon', weight: '25%', score: 88, status: 'Optimal' },
    { factor: 'Sector & Halal Compliance', weight: '20%', score: 100, status: 'Perfect' },
    { factor: 'Country Node Jurisdiction', weight: '15%', score: 100, status: 'Local Node' },
    { factor: 'Liquidity Window Frequency', weight: '10%', score: 75, status: 'Quarterly' }
  ];

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
        <div>
          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[10px] uppercase tracking-wider">
            Match Breakdown Engine
          </span>
          <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">
            Algorithmic Matching Breakdown
          </h3>
        </div>
        <span className="text-xl font-black text-emerald-600 font-mono">92.4% Composite</span>
      </div>

      <div className="space-y-3">
        {breakdown.map((b, idx) => (
          <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-800 dark:text-slate-200">{b.factor} ({b.weight})</span>
              <span className="text-emerald-600 font-mono">{b.score}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${b.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
