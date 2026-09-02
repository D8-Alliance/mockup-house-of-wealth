import React, { useState } from 'react';
import { 
  Building2, 
  Sparkles, 
  Check, 
  Layers, 
  Users, 
  TrendingUp, 
  FileText, 
  Zap, 
  ShieldCheck, 
  ChevronRight,
  Award
} from 'lucide-react';
import { PDPPlan, PDPSubscription } from '../../revenue/revenueTypes';
import { revenueService } from '../../revenue/revenueService';

interface PDPMembershipViewProps {
  orgId?: string;
  onSelectPlan?: (planId: string) => void;
}

export const PDPMembershipView: React.FC<PDPMembershipViewProps> = ({
  orgId = 'ORG-FELDA-MY',
  onSelectPlan
}) => {
  const [plans] = useState<PDPPlan[]>(revenueService.getPDPPlans());
  const [subscription, setSubscription] = useState<PDPSubscription>(revenueService.getPDPSubscription(orgId));
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  const handleUpgrade = (planId: string) => {
    const ok = revenueService.upgradePDPSubscription(orgId, planId);
    if (ok) {
      setSubscription(revenueService.getPDPSubscription(orgId));
      setUpgradingPlanId(null);
    }
  };

  const getTeamSeats = (tier: string) => {
    if (tier === 'FREE_PDP') return '1 Sponsor Admin Seat';
    if (tier === 'PRO_PDP') return 'Up to 5 Team / Co-op Manager Seats';
    return 'Unlimited Enterprise & Plantation Apex Seats';
  };

  const getAnalyticsType = (tier: string) => {
    if (tier === 'FREE_PDP') return 'Standard Campaign Payout Dashboard';
    if (tier === 'PRO_PDP') return 'Investor CRM, Lead Pipeline & Milestone Logs';
    return 'Apex Sovereign Data Lake & Settlement Feeds';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Statement */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-blue-500/30 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Building2 className="w-3.5 h-3.5" />
              <span>Project Development Partner (PDP) & Sponsor Suite</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Sponsor Intelligence & Campaign Syndication Plans
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Empower your cooperative, agricultural estate, or green energy entity to structure, syndicate, and manage Shariah capital campaigns with automated milestone escrow and AI prospectus tools.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 border border-white/10 shrink-0 text-right space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Org Subscription</span>
            <div className="text-lg font-black text-emerald-400">
              {subscription.tier === 'FREE_PDP' ? 'PDP Standard' : subscription.tier === 'PRO_PDP' ? 'PDP Professional' : 'PDP Apex Sponsor'}
            </div>
            <div className="text-xs text-slate-300 font-mono">Org: {subscription.orgId}</div>
          </div>
        </div>
      </div>

      {/* Grid of 3 PDP Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isCurrent = subscription.planId === plan.id;
          const isEnterprise = plan.tier === 'ENTERPRISE_PDP';
          const isPro = plan.tier === 'PRO_PDP';

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 flex flex-col justify-between transition-all relative ${
                isPro
                  ? 'bg-white dark:bg-slate-800 border-2 border-emerald-500 shadow-xl ring-4 ring-emerald-500/10'
                  : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm'
              }`}
            >
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow">
                  Recommended for PDPs
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {plan.tier === 'FREE_PDP' 
                      ? 'Single-campaign starter tier for verified cooperatives and local farm entities.'
                      : plan.tier === 'PRO_PDP'
                      ? 'Comprehensive suite for multi-project development partners and regional cooperatives.'
                      : 'Institutional governance for national apexes (FELDA, RISDA, MARA) and sovereign developers.'}
                  </p>
                </div>

                {/* Price Display */}
                <div className="py-2 border-y border-slate-100 dark:border-slate-700">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {plan.priceMYR === 0 ? 'Free' : `RM ${plan.priceMYR}`}
                    </span>
                    {plan.priceMYR > 0 && (
                      <span className="text-xs text-slate-500">/ month</span>
                    )}
                  </div>
                  {plan.priceUSD > 0 && (
                    <span className="text-[11px] text-slate-400 font-mono">≈ ${plan.priceUSD} USD</span>
                  )}
                </div>

                {/* PDP Quota Breakdown */}
                <div className="space-y-2.5 text-xs bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      Active Project Limit:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {plan.activeProjectLimit} Campaigns
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      AI Allowance:
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                      {plan.aiCreditsMonthly} Credits/mo
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-purple-500" />
                      Promotion Allowance:
                    </span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {plan.featuredAllowanceMonthly > 0 ? `${plan.featuredAllowanceMonthly} Featured / mo` : 'Standard Listing'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-500" />
                      Report Allowance:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {plan.reportAllowanceMonthly} Dossiers / mo
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      Team Members:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-[11px] text-right">
                      {getTeamSeats(plan.tier)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                      Analytics Suite:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-[11px] text-right truncate max-w-[140px]" title={getAnalyticsType(plan.tier)}>
                      {getAnalyticsType(plan.tier)}
                    </span>
                  </div>
                </div>

                {/* Features checklist */}
                <div className="space-y-2 text-xs pt-1">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA button */}
              <div className="pt-6">
                {isCurrent ? (
                  <div className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold text-xs text-center flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Current Org Plan</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isPro
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                        : 'bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                    }`}
                  >
                    <span>{plan.priceMYR === 0 ? 'Switch to Free PDP' : `Upgrade to ${plan.name}`}</span>
                    <ChevronRight className="w-4 h-4" />
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
