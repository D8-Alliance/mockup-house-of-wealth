import React, { useState } from 'react';
import { BrainCircuit, Zap, RefreshCw, PieChart, ShieldCheck, Coins, CheckCircle2 } from 'lucide-react';
import { AIInvestorInputs, AIInvestorRecommendation } from './AITypes';
import { AIRecommendationCard } from './AIRecommendationCard';
import { AIConfidenceBadge } from './AIConfidenceBadge';

export const AIInvestorAdvisorModule: React.FC = () => {
  const [inputs, setInputs] = useState<AIInvestorInputs>({
    age: 38,
    incomeUSD: 120000,
    riskProfile: 'Balanced',
    investmentGoal: 'Regular Income & Zakat Purified',
    timeHorizonYears: 5,
    preferredCurrency: 'USD'
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [recommendation, setRecommendation] = useState<AIInvestorRecommendation>({
    suitablePools: [
      { id: 'POOL-101', name: 'Islamabad Diplomatic Enclave Residential Sukuk', matchPercent: 96, yield: '8.5% p.a.', contract: 'Ijarah', risk: 'Low Risk (A+)' },
      { id: 'POOL-102', name: 'Malaysia SME Halal Export Supply Chain', matchPercent: 91, yield: '11.2% p.a.', contract: 'Mudarabah', risk: 'Medium Risk (A)' },
      { id: 'POOL-103', name: 'Indonesia Micro-Hydro Irrigation Waqf Pool', matchPercent: 88, yield: '6.2% p.a.', contract: 'Waqf', risk: 'Low Risk (A)' }
    ],
    expectedROIPercent: 9.4,
    overallRiskGrade: 'Low-to-Moderate (Balanced)',
    diversificationScore: 92,
    sectorAllocation: [
      { sector: 'Property & Logistics', percent: 45, color: 'bg-emerald-500' },
      { sector: 'SME / Trade Finance', percent: 30, color: 'bg-blue-500' },
      { sector: 'Green Sukuk Infrastructure', percent: 15, color: 'bg-amber-500' },
      { sector: 'Social Impact / Waqf', percent: 10, color: 'bg-purple-500' }
    ],
    explanation: 'Based on your age (38) and income ($120k/yr), a 45/30/15/10 asset mix optimizes inflation defense while securing quarterly AAOIFI purified distributions.',
    confidence: {
      score: 95,
      modelName: 'Gemini 3.6 Flash • Portfolio Net Optimization',
      dataPointsEvaluated: 18450,
      factors: [
        { factor: 'Income to Allocation Ratio', weightPercent: 35, direction: 'Positive' },
        { factor: 'Zakat Auto-Purification Compliance', weightPercent: 30, direction: 'Positive' },
        { factor: 'D-8 Cross-Border Sovereign Risk', weightPercent: 20, direction: 'Positive' },
        { factor: 'Market Volatility Shield', weightPercent: 15, direction: 'Neutral' }
      ],
      auditHash: '0x91fa...e82b'
    }
  });

  const handleRunAdvisor = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      // Dynamically adjust returns based on risk profile
      let targetYield = 8.5;
      if (inputs.riskProfile === 'Aggressive' || inputs.riskProfile === 'Growth') targetYield = 12.8;
      if (inputs.riskProfile === 'Conservative') targetYield = 6.4;

      setRecommendation(prev => ({
        ...prev,
        expectedROIPercent: targetYield,
        explanation: `Re-calculated portfolio for Age ${inputs.age}, Risk '${inputs.riskProfile}' and Goal '${inputs.investmentGoal}'. Recommends ${targetYield}% target ROI.`
      }));
    }, 700);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Inputs Form */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Module 1
            </span>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-0.5">
              AI Investment Advisor
            </h3>
          </div>
          <BrainCircuit className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Age</label>
              <input 
                type="number" 
                value={inputs.age} 
                onChange={e => setInputs({ ...inputs, age: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Annual Income (USD)</label>
              <input 
                type="number" 
                step={5000}
                value={inputs.incomeUSD} 
                onChange={e => setInputs({ ...inputs, incomeUSD: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Risk Profile</label>
            <select 
              value={inputs.riskProfile}
              onChange={e => setInputs({ ...inputs, riskProfile: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
            >
              <option value="Conservative">Conservative (Capital Defense)</option>
              <option value="Moderate">Moderate (Steady Yield)</option>
              <option value="Balanced">Balanced (Growth & Income)</option>
              <option value="Growth">Growth (SME Trade Equity)</option>
              <option value="Aggressive">Aggressive (High Yield Venture)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Investment Goal</label>
            <select 
              value={inputs.investmentGoal}
              onChange={e => setInputs({ ...inputs, investmentGoal: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
            >
              <option value="Regular Income & Zakat Purified">Regular Income & Zakat Purified</option>
              <option value="Capital Preservation">Capital Preservation</option>
              <option value="Wealth Accumulation">Wealth Accumulation</option>
              <option value="Aggressive Impact">Aggressive Impact</option>
            </select>
          </div>

          <button 
            onClick={handleRunAdvisor}
            disabled={isAnalyzing}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running AI Profiling Algorithm...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Generate Recommended Strategy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recommended Output Dashboard */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Recommended Allocation Strategy
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Yield: <strong className="text-emerald-600 dark:text-emerald-400">{recommendation.expectedROIPercent}% p.a.</strong> • Risk: {recommendation.overallRiskGrade}
              </p>
            </div>

            <AIConfidenceBadge confidence={recommendation.confidence} size="md" />
          </div>

          {/* Diversification Chart Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Diversification Score</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black">{recommendation.diversificationScore}/100</span>
            </div>
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
              {recommendation.sectorAllocation.map(s => (
                <div key={s.sector} className={`${s.color} h-full`} style={{ width: `${s.percent}%` }} title={`${s.sector} (${s.percent}%)`} />
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              {recommendation.sectorAllocation.map(s => (
                <div key={s.sector} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                  <span className="text-slate-600 dark:text-slate-400 font-bold">{s.sector} ({s.percent}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rationale Explanation */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong className="text-emerald-800 dark:text-emerald-400 font-bold block mb-1">AI Recommendation Insight:</strong>
            {recommendation.explanation}
          </div>

          {/* Top Suitable Pools Grid */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Suitable Pools Matched
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recommendation.suitablePools.map(pool => (
                <div key={pool.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {pool.matchPercent}% Match
                  </span>
                  <h5 className="font-extrabold text-slate-900 dark:text-white line-clamp-2">{pool.name}</h5>
                  <div className="text-[11px] text-slate-500">
                    <div>Yield: <strong className="text-emerald-600">{pool.yield}</strong></div>
                    <div>Type: {pool.contract}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
