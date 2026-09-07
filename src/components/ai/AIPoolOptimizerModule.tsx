import React, { useState } from 'react';
import { Sliders, PieChart, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { AIConfidenceBadge } from './AIConfidenceBadge';

export const AIPoolOptimizerModule: React.FC = () => {
  const [rebalancingList, setRebalancingList] = useState([
    { asset: 'Real Estate Sukuk (Kuala Lumpur & KL)', currentPct: 55, targetPct: 40, action: 'Reduce 15%', reason: 'Overconcentrated in single-market property sector' },
    { asset: 'SME Trade Finance (Malaysia Mudarabah)', currentPct: 20, targetPct: 30, action: 'Increase 10%', reason: 'Boost short-term liquidity & net yield' },
    { asset: 'Green Infrastructure Waqf (Indonesia Solar)', currentPct: 15, targetPct: 20, action: 'Increase 5%', reason: 'Enhance ESG rating & inflation resilience' },
    { asset: 'Liquid Reserve / Cash Buffer', currentPct: 10, targetPct: 10, action: 'Maintain', reason: 'Optimal operational buffer' }
  ]);

  const [applied, setApplied] = useState(false);

  const handleApplyRebalance = () => {
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Module 4 & 6
          </span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            AI Pool Matching & Portfolio Optimizer
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated rebalancing algorithms optimizing risk-adjusted returns and D-8 regional diversification.
          </p>
        </div>

        <AIConfidenceBadge 
          confidence={{
            score: 93,
            modelName: 'Markowitz Shariah Efficient Frontier Model',
            dataPointsEvaluated: 15600,
            factors: [
              { factor: 'Yield Optimization Impact', weightPercent: 45, direction: 'Positive' },
              { factor: 'Sector Concentration Risk Mitigation', weightPercent: 35, direction: 'Positive' },
              { factor: 'Liquidity Buffer Adequacy', weightPercent: 20, direction: 'Positive' }
            ],
            auditHash: '0x11a9...44c2'
          }}
          size="md"
        />
      </div>

      {/* Rebalancing Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
            Recommended Asset Rebalancing Matrix
          </h4>
          <button
            onClick={handleApplyRebalance}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-colors"
          >
            {applied ? '✓ Rebalancing Orders Submitted' : 'Execute AI Rebalance'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60">
                <th className="p-3">Asset Class</th>
                <th className="p-3">Current %</th>
                <th className="p-3">AI Target %</th>
                <th className="p-3">Suggested Action</th>
                <th className="p-3">Optimization Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {rebalancingList.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{row.asset}</td>
                  <td className="p-3 font-mono text-slate-500">{row.currentPct}%</td>
                  <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{row.targetPct}%</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                      row.action.includes('Reduce') 
                        ? 'bg-rose-500/10 text-rose-600' 
                        : row.action.includes('Increase') 
                        ? 'bg-emerald-500/10 text-emerald-600' 
                        : 'bg-slate-500/10 text-slate-600'
                    }`}>
                      {row.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
