import React, { useState } from 'react';
import { ShieldAlert, TrendingUp, DollarSign, BarChart2, ShieldCheck } from 'lucide-react';
import { AIConfidenceBadge } from './AIConfidenceBadge';

export const AIRiskValuationModule: React.FC = () => {
  const [assetValuation, setAssetValuation] = useState({
    assetName: 'Jebel Ali Cold-Storage Hub #3',
    appraisedValueUSD: 14200000,
    aiEstimatedValueUSD: 15100000,
    capRatePercent: 8.2,
    collateralCoverageRatio: 1.45,
    forecastedReturnYear3: 11.4
  });

  const riskScores = [
    { label: 'Business Risk', val: 18, color: 'bg-emerald-500' },
    { label: 'Country / Sovereign Risk', val: 12, color: 'bg-blue-500' },
    { label: 'Market Volatility Risk', val: 22, color: 'bg-amber-500' },
    { label: 'Financial Liquidity Risk', val: 15, color: 'bg-purple-500' },
    { label: 'ESG Sustainability Risk', val: 8, color: 'bg-teal-500' },
    { label: 'Shariah Non-Compliance Risk', val: 4, color: 'bg-emerald-600' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Risk Scoring & Composite Safety Index */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Module 5, 9 & 10
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              AI Risk Scoring, Financial Forecast & Asset Valuation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-factor risk evaluation and Discounted Cash Flow (DCF) asset valuation engine.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">87/100</span>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Composite Safety Index</p>
            </div>
            <AIConfidenceBadge 
              confidence={{
                score: 96,
                modelName: 'D-8 Multi-Factor Risk & DCF Engine',
                dataPointsEvaluated: 21000,
                factors: [
                  { factor: 'Collateral LTV Buffer (145%)', weightPercent: 40, direction: 'Positive' },
                  { factor: 'Operating Cash Flow Predictability', weightPercent: 35, direction: 'Positive' },
                  { factor: 'Interest-Free Sukuk Structure', weightPercent: 25, direction: 'Positive' }
                ],
                auditHash: '0x99a2...77f1'
              }}
              size="md"
            />
          </div>
        </div>

        {/* Risk Scores Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {riskScores.map(r => (
            <div key={r.label} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-slate-700 dark:text-slate-300">{r.label}</span>
                <span className="font-mono text-slate-900 dark:text-white">{r.val} / 100</span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${r.color}`} style={{ width: `${r.val}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Valuation & Financial Forecast Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
        <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
          Real Estate & Infrastructure Asset Valuation Model
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Human Appraisal Value</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">${(assetValuation.appraisedValueUSD / 1000000).toFixed(2)}M USD</span>
          </div>

          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-500/20">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase block">AI Fair Value Estimate</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">${(assetValuation.aiEstimatedValueUSD / 1000000).toFixed(2)}M USD</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">+6.3% Value Upside Detected</span>
          </div>

          <div className="p-4 bg-purple-50/60 dark:bg-purple-950/20 rounded-2xl border border-purple-500/20">
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase block">3-Year Forecasted ROI</span>
            <span className="text-lg font-black text-purple-600 dark:text-purple-400">{assetValuation.forecastedReturnYear3}% p.a.</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Discount Rate: 6.5%</span>
          </div>
        </div>
      </div>

    </div>
  );
};
