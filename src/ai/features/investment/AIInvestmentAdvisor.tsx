import React, { useState } from 'react';
import { AIService } from '../../services/AIService';
import { AIRecommendationCard } from '../../components/AIRecommendationCard';
import { PieChart, Sparkles, Filter, ShieldCheck, ArrowRight } from 'lucide-react';

export const AIInvestmentAdvisor: React.FC<{ user: any }> = ({ user }) => {
  const [riskProfile, setRiskProfile] = useState<'Conservative' | 'Moderate' | 'Balanced' | 'Growth' | 'Aggressive'>('Moderate');
  const [timeHorizonYears, setTimeHorizonYears] = useState(5);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<any>(null);

  const mockPools = [
    { poolId: 'POOL-001', poolName: 'FELDA Agriculture Expansion Pool', indicativeExpectedReturn: 10.5, investmentStructure: 'Mudarabah', sector: 'Agriculture' },
    { poolId: 'POOL-002', poolName: 'Commercial Waqf Real Estate Pool', indicativeExpectedReturn: 8.2, investmentStructure: 'Ijarah', sector: 'Real Estate' },
    { poolId: 'POOL-003', poolName: 'Southeast Asia Green Energy Sukuk Pool', indicativeExpectedReturn: 9.8, investmentStructure: 'Wakalah', sector: 'Energy' }
  ];

  const handleRunMatch = async () => {
    setLoading(true);
    const res = await AIService.matchInvestmentPools({ riskProfile, timeHorizonYears }, mockPools, user);
    setMatches(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <PieChart className="w-3.5 h-3.5" />
            AI Investor Advisor & Pool Matcher
          </span>
          <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
            Personalized Wealth Pool Matching Engine
          </h2>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Evaluates your risk appetite, horizon, and return preferences against active Shariah wealth pools.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Your Risk Profile Preference</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(['Conservative', 'Moderate', 'Balanced', 'Growth', 'Aggressive'] as const).map(rp => (
                <button
                  key={rp}
                  onClick={() => setRiskProfile(rp)}
                  className={`p-2 rounded-xl text-[10px] font-extrabold border cursor-pointer ${
                    riskProfile === rp
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {rp}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Investment Time Horizon: {timeHorizonYears} Years</label>
            <input
              type="range"
              min={1}
              max={10}
              value={timeHorizonYears}
              onChange={e => setTimeHorizonYears(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>
        </div>

        <button
          onClick={handleRunMatch}
          disabled={loading}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          {loading ? 'Matching Active Pools...' : 'Match Wealth Pools'}
        </button>
      </div>

      {matches && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
            <span>{matches.recommendation.summary}</span>
            <span className="text-[10px] text-emerald-400 italic">{matches.recommendation.disclaimer}</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {matches.recommendation.matches.map((m: any) => (
              <AIRecommendationCard
                key={m.poolId}
                title={m.poolName}
                subtitle={`Indicative Return: ${m.indicativeReturn} • Contract: ${m.contract}`}
                matchScore={m.matchScorePercent}
                recommendationText={`${m.poolName} appears potentially aligned with your stated preferences.`}
                confidence={{ level: 'HIGH', scorePercent: m.matchScorePercent, disclaimer: 'Suitability score based on input risk factors.' }}
                positiveFactors={m.reasonsForMatch}
                concerns={m.potentialConcerns}
                actions={
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">Pool ID: {m.poolId}</span>
                    <button
                      onClick={() => alert(`Navigating to order wizard for ${m.poolName}`)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      Invest in Pool <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
