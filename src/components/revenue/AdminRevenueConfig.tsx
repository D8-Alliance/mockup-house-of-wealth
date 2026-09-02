import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  Sparkles, 
  Layers, 
  Coins, 
  CheckCircle2, 
  DollarSign, 
  ShieldCheck 
} from 'lucide-react';
import { MembershipPlan, PDPPlan, ProjectPromotionPackage } from '../../revenue/revenueTypes';
import { revenueService } from '../../revenue/revenueService';

interface AdminRevenueConfigProps {
  onBack?: () => void;
}

export const AdminRevenueConfig: React.FC<AdminRevenueConfigProps> = ({ onBack }) => {
  const [plans, setPlans] = useState<MembershipPlan[]>(revenueService.getPlans());
  const [pdpPlans, setPdpPlans] = useState<PDPPlan[]>(revenueService.getPDPPlans());
  const [promoPackages, setPromoPackages] = useState<ProjectPromotionPackage[]>(revenueService.getPromotionPackages());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handlePriceChange = (planId: string, newMonthlyMYR: number) => {
    setPlans(prev => prev.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          monthlyPriceMYR: newMonthlyMYR,
          annualPriceMYR: newMonthlyMYR * 10,
          monthlyPriceUSD: Math.round(newMonthlyMYR / 4.2),
          annualPriceUSD: Math.round((newMonthlyMYR * 10) / 4.2)
        };
      }
      return p;
    }));
  };

  const handleSaveAll = () => {
    plans.forEach(p => {
      revenueService.updatePlanPrice(p.id, p.monthlyPriceMYR, p.annualPriceMYR);
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Central Revenue Architecture
            </span>
            <span className="text-xs text-slate-400 font-mono">Dynamic Config Engine</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Monetisation & Pricing Parameters
          </h2>
          <p className="text-xs text-slate-500">
            Adjust live membership tiers, PDP subscription quotas, AI credit allowances, and promotion rates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200"
            >
              Back to Dashboard
            </button>
          )}
          <button
            onClick={handleSaveAll}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'Configuration Saved!' : 'Save Dynamic Rates'}</span>
          </button>
        </div>
      </div>

      {/* Membership Tiers Config */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span>Membership Tiers & Intelligence Allowances</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">{plan.name}</span>
                <span className="font-mono text-[10px] text-purple-600 font-bold">{plan.tier}</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Monthly Price (MYR):</label>
                <input
                  type="number"
                  value={plan.monthlyPriceMYR}
                  onChange={(e) => handlePriceChange(plan.id, Number(e.target.value))}
                  disabled={plan.tier === 'FREE'}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white disabled:opacity-50"
                />
                <span className="text-[10px] text-slate-400 block font-mono">
                  ≈ ${plan.monthlyPriceUSD} USD/mo
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Monthly AI Credits:</label>
                <input
                  type="number"
                  value={plan.aiCreditsMonthly}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, aiCreditsMonthly: val } : p));
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PDP & Project Promotion Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PDP Tiers */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            <span>PDP Sponsor Subscription Plans</span>
          </h3>

          <div className="space-y-3">
            {pdpPlans.map(p => (
              <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                  <div className="text-[11px] text-slate-500">
                    Max Active Campaigns: <strong>{p.activeProjectLimit}</strong> • AI Credits: <strong>{p.aiCreditsMonthly}</strong>
                  </div>
                </div>
                <div className="font-mono font-black text-amber-600 dark:text-amber-400">
                  {p.priceMYR === 0 ? 'Free' : `RM ${p.priceMYR}/mo`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Promotion Packages */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-purple-500" />
            <span>Marketplace Promotion Rates</span>
          </h3>

          <div className="space-y-3">
            {promoPackages.map(pkg => (
              <div key={pkg.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{pkg.title}</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
                      {pkg.badgeText}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">{pkg.placement}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-black text-slate-900 dark:text-white">
                    {pkg.priceMYR === 0 ? 'Free' : `RM ${pkg.priceMYR}`}
                  </div>
                  {pkg.creditsCost > 0 && (
                    <div className="text-[10px] text-amber-500 font-bold">{pkg.creditsCost} Cr</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
