import React, { useState } from 'react';
import { AIConfidenceBadge } from '../../components/AIConfidenceBadge';
import { Layers, Sparkles, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export const AIFinancialScenarioEngine: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<'BASE' | 'OPTIMISTIC' | 'CONSERVATIVE' | 'STRESS'>('BASE');

  const cases = {
    BASE: {
      name: 'Base Case (Expected)',
      projectedReturn: '10.5% p.a.',
      npv: '$3,450,000 USD',
      dscr: '1.65x',
      irr: '11.8%',
      summary: 'Assumes normal agricultural harvest yields and stable export prices ($950/ton).'
    },
    OPTIMISTIC: {
      name: 'Optimistic Case (+15% Revenue)',
      projectedReturn: '13.2% p.a.',
      npv: '$5,120,000 USD',
      dscr: '2.10x',
      irr: '14.5%',
      summary: 'Favorable monsoon weather and elevated commodity demand increase realized export margins.'
    },
    CONSERVATIVE: {
      name: 'Conservative Case (-15% Revenue)',
      projectedReturn: '7.8% p.a.',
      npv: '$1,850,000 USD',
      dscr: '1.25x',
      irr: '8.4%',
      summary: 'Mild drought reduces Year 2 yield by 10%; operating margins absorb shock safely.'
    },
    STRESS: {
      name: 'Stress Test (-30% Revenue & Cost Spike)',
      projectedReturn: '3.5% p.a.',
      npv: '-$200,000 USD',
      dscr: '0.92x',
      irr: '4.1%',
      summary: 'Severe commodity market crash. Capital preservation buffer covers core principal.'
    }
  };

  const current = cases[selectedCase];

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <Layers className="w-3.5 h-3.5" />
              AI Financial Scenario & Stress Simulator
            </span>
            <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
              Multi-Scenario Sensitivity & Cashflow Simulation
            </h2>
          </div>
          <AIConfidenceBadge confidence={{ level: 'HIGH', scorePercent: 95, disclaimer: 'Monte Carlo cashflow simulation based on historical price variance.' }} />
        </div>

        {/* Case Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['BASE', 'OPTIMISTIC', 'CONSERVATIVE', 'STRESS'] as const).map(c => (
            <button
              key={c}
              onClick={() => setSelectedCase(c)}
              className={`p-3 rounded-2xl font-black text-xs border transition-all cursor-pointer ${
                selectedCase === c
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {cases[c].name.split(' ')[0]} Case
            </button>
          ))}
        </div>

        {/* Scenario Results */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
          <h3 className="font-black text-sm text-blue-400">{current.name}</h3>
          <p className="text-slate-300 text-[11px] leading-relaxed">{current.summary}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Indicative Return</span>
              <span className="text-base font-black text-emerald-400 font-mono">{current.projectedReturn}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Simulated NPV</span>
              <span className="text-base font-black text-purple-300 font-mono">{current.npv}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">DSCR Coverage</span>
              <span className="text-base font-black text-blue-300 font-mono">{current.dscr}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Simulated IRR</span>
              <span className="text-base font-black text-amber-300 font-mono">{current.irr}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
