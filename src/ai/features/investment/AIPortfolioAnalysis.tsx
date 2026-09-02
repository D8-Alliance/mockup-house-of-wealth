import React from 'react';
import { AIConfidenceBadge } from '../../components/AIConfidenceBadge';
import { PieChart, ShieldAlert, Sparkles, Activity } from 'lucide-react';

export const AIPortfolioAnalysis: React.FC = () => {
  const sectors = [
    { name: 'Agriculture & Agri-Tech', percent: 65, color: 'bg-emerald-500' },
    { name: 'Commercial Real Estate Waqf', percent: 25, color: 'bg-purple-500' },
    { name: 'Cash & Short-Term Sukuk', percent: 10, color: 'bg-blue-500' }
  ];

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <PieChart className="w-3.5 h-3.5" />
              AI Portfolio Diversification Engine
            </span>
            <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
              Portfolio Health & Concentration Analysis
            </h2>
          </div>
          <AIConfidenceBadge confidence={{ level: 'HIGH', scorePercent: 96, disclaimer: 'Portfolio telemetry based on active allocations.' }} />
        </div>

        {/* Breakdown bar */}
        <div className="space-y-2">
          <span className="font-bold text-slate-700 dark:text-slate-300 block">Sector Allocation Breakdown</span>
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
            {sectors.map((s, idx) => (
              <div key={idx} className={`h-full ${s.color}`} style={{ width: `${s.percent}%` }} />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] pt-1">
            {sectors.map((s, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${s.color}`} />
                <span className="font-bold text-slate-700 dark:text-slate-300">{s.name}: {s.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1">
          <span className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Concentration Observation
          </span>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
            Your portfolio holds <strong>65% concentration in Agriculture</strong>. To optimize risk-adjusted returns and insulate against seasonal harvest yield fluctuations, consider allocating 15% toward Infrastructure Sukuk or Healthcare Waqf.
          </p>
        </div>
      </div>
    </div>
  );
};
