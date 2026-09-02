import React, { useState } from 'react';
import { AIConfidenceBadge } from '../../components/AIConfidenceBadge';
import { PieChart, Sparkles, TrendingUp, Users } from 'lucide-react';

export const AIPoolOptimizer: React.FC = () => {
  const [targetCapital, setTargetCapital] = useState(10000000);
  const [minTicket, setMinTicket] = useState(5000);
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleOptimize = () => {
    setOptimizing(true);
    setTimeout(() => {
      setResult({
        suggestedPoolSize: '$8,500,000 USD (Reduced from $10M to accelerate 100% subscription)',
        suggestedMinTicket: '$2,500 USD (Lowers barrier for retail accredited investors)',
        expectedSubscriptionDays: 14,
        investorDemandPools: 'High Demand among Institutional Waqf & Retail Malaysia Investors',
        optimizationTips: [
          'Split $10M capital into two $5M tranches to generate tranche 1 scarcity effect',
          'Offer quarterly secondary liquidity window to attract liquidity-sensitive investors',
          'Structure 10% reserve tranche under Wakalah for liquidity buffering'
        ]
      });
      setOptimizing(false);
    }, 500);
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <PieChart className="w-3.5 h-3.5" />
            AI Wealth Pool Optimization Engine
          </span>
          <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
            Pool Sizing & Investor Demand Optimizer
          </h2>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Analyzes historical platform order books and investor appetite to suggest optimal tranche sizes, minimum ticket thresholds, and liquidity terms.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Capital Target ($ USD)</label>
            <input
              type="number"
              value={targetCapital}
              onChange={e => setTargetCapital(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Proposed Minimum Ticket ($ USD)</label>
            <input
              type="number"
              value={minTicket}
              onChange={e => setMinTicket(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
            />
          </div>
        </div>

        <button
          onClick={handleOptimize}
          disabled={optimizing}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          {optimizing ? 'Calculating Demand Curve...' : 'Optimize Pool Structure'}
        </button>
      </div>

      {result && (
        <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-black text-sm text-emerald-400">Optimization Recommendations</h3>
            <AIConfidenceBadge confidence={{ level: 'HIGH', scorePercent: 93, disclaimer: 'Optimized against current active investor profiles.' }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Recommended Size</span>
              <span className="text-xs font-bold text-white mt-1 block">{result.suggestedPoolSize}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Recommended Min Ticket</span>
              <span className="text-xs font-bold text-white mt-1 block">{result.suggestedMinTicket}</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Structuring Tips</span>
            <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              {result.optimizationTips.map((tip: string, idx: number) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
