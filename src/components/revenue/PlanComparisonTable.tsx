import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  Zap
} from 'lucide-react';
import { MembershipPlan, MembershipTier, BillingInterval } from '../../revenue/revenueTypes';

interface PlanComparisonTableProps {
  plans: MembershipPlan[];
  currentTier: MembershipTier;
  onSelectPlan: (plan: MembershipPlan, interval: BillingInterval) => void;
}

export const PlanComparisonTable: React.FC<PlanComparisonTableProps> = ({
  plans,
  currentTier,
  onSelectPlan
}) => {
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [currency, setCurrency] = useState<'MYR' | 'USD'>('MYR');

  return (
    <div className="space-y-8">
      {/* Header & Toggles */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Configurable Islamic Wealth Intelligence Plans</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Transparent Membership & Intelligence Tiers
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          All platform users enjoy free access to explore Shariah opportunities. Upgrade to unlock deep AI due diligence, priority pool syndicate allocations, and cross-border risk models.
        </p>

        {/* Interval & Currency Selector Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {/* Monthly / Annual Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setInterval('monthly')}
              className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                interval === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setInterval('annual')}
              className={`px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                interval === 'annual'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>Annual (Save 17%)</span>
              <span className="px-1.5 py-[2px] bg-emerald-700 text-white rounded text-[10px]">2 mo free</span>
            </button>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setCurrency('MYR')}
              className={`px-3 py-1.5 rounded-xl cursor-pointer ${
                currency === 'MYR' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500'
              }`}
            >
              MYR (Ringgit)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-xl cursor-pointer ${
                currency === 'USD' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>
      </div>

      {/* Grid of 4 Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map(plan => {
          const isCurrent = plan.tier === currentTier;
          const price = currency === 'MYR' 
            ? (interval === 'monthly' ? plan.monthlyPriceMYR : Math.round(plan.annualPriceMYR / 12))
            : (interval === 'monthly' ? plan.monthlyPriceUSD : Math.round(plan.annualPriceUSD / 12));
          
          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 relative ${
                plan.isPopular
                  ? 'bg-white dark:bg-slate-800 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-4 ring-emerald-500/10'
                  : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="py-2 border-y border-slate-100 dark:border-slate-700">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {plan.isCustomPricing ? 'Custom' : (price === 0 ? 'Free' : `${currency === 'MYR' ? 'RM' : '$'} ${price}`)}
                    </span>
                    {!plan.isCustomPricing && price > 0 && (
                      <span className="text-xs text-slate-500">/ month</span>
                    )}
                  </div>
                  {plan.isCustomPricing ? (
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold block mt-0.5">
                      Bespoke Institutional & Sovereign Tier
                    </span>
                  ) : interval === 'annual' && price > 0 ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                      Billed annually ({currency === 'MYR' ? `RM ${plan.annualPriceMYR}` : `$${plan.annualPriceUSD}`}/yr)
                    </span>
                  ) : null}
                </div>

                {/* AI Allowance Highlight */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    AI Credits
                  </span>
                  <span className="font-mono font-black text-amber-800 dark:text-amber-200">
                    {plan.aiCreditsMonthly} / mo
                  </span>
                </div>

                {/* Feature Checklist */}
                <div className="space-y-2.5 text-xs">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">
                    Key Features Included:
                  </span>
                  {plan.featureAccess.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 font-bold text-xs cursor-default flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectPlan(plan, interval)}
                    className={`w-full py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                      plan.isPopular
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                        : 'bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                    }`}
                  >
                    <span>{plan.tier === 'FREE' ? 'Downgrade to Free' : `Select ${plan.name}`}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
