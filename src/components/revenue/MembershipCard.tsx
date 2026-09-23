import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  CreditCard, 
  Coins, 
  Zap, 
  ShieldCheck, 
  FileText,
  Search,
  Scale,
  ArrowDownRight,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { UserMembership, HoWCreditBalance, MembershipPlan, FeatureUsageStats } from '../../revenue/revenueTypes';

interface MembershipCardProps {
  membership: UserMembership;
  currentPlan: MembershipPlan;
  creditBalance: HoWCreditBalance;
  featureUsage: FeatureUsageStats;
  onOpenUpgradeModal: () => void;
  onOpenCreditModal: () => void;
  onOpenDowngradeModal: () => void;
  onOpenCancelModal: () => void;
}

export const MembershipCard: React.FC<MembershipCardProps> = ({
  membership,
  currentPlan,
  creditBalance,
  featureUsage,
  onOpenUpgradeModal,
  onOpenCreditModal,
  onOpenDowngradeModal,
  onOpenCancelModal
}) => {
  const percentCredits = Math.round((creditBalance.availableCredits / (creditBalance.totalCredits || 1)) * 100);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ENTERPRISE':
        return 'from-purple-900 via-indigo-950 to-slate-900 border-purple-500/40 text-purple-200';
      case 'PROFESSIONAL':
        return 'from-slate-900 via-blue-950 to-slate-900 border-blue-500/40 text-blue-200';
      case 'PLUS':
        return 'from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/40 text-emerald-200';
      default:
        return 'from-slate-900 via-slate-800 to-slate-900 border-slate-700 text-slate-300';
    }
  };

  const isFree = membership.tier === 'FREE';

  return (
    <div className={`rounded-3xl p-6 sm:p-8 bg-gradient-to-r ${getTierColor(membership.tier)} border shadow-xl text-white space-y-6`}>
      {/* Top Header & Positioning Statement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Active Membership
            </span>
            <span className="text-xs text-slate-400 font-mono">User: {membership.userId}</span>
            {membership.status === 'Cancelled' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Cancellation Scheduled
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {currentPlan.name}
            </h2>
            <span className="text-sm font-semibold text-slate-300">
              {currentPlan.monthlyPriceMYR === 0 
                ? 'Free Tier (Standard Intelligence)' 
                : `RM ${currentPlan.monthlyPriceMYR} / month (${membership.billingInterval})`}
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-1.5 max-w-xl">
            Access to premium wealth intelligence, AI tools, analytics and ecosystem services.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenUpgradeModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isFree ? 'Upgrade to Plus / Pro' : 'Change Plan'}</span>
          </button>
          
          <button
            onClick={onOpenCreditModal}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Top Up Credits</span>
          </button>

          {!isFree && (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenDowngradeModal}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                title="Downgrade to Free Tier"
              >
                <ArrowDownRight className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenCancelModal}
                className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                title="Cancel Subscription"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Dashboard Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AI Credits Gauge */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Wealth Pooling AI Utility Credits
            </span>
            <span className="font-mono font-black text-white">
              {creditBalance.availableCredits} / {creditBalance.totalCredits}
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(5, percentCredits))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-300">
            <span>Monthly grant: {currentPlan.aiCreditsMonthly}</span>
            <span className="text-emerald-400 font-semibold">{percentCredits}% available</span>
          </div>
        </div>

        {/* Renewal Information */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Renewal Date & Cycle</span>
          </div>
          <div className="text-base font-extrabold text-white">
            {membership.currentPeriodEnd}
          </div>
          <p className="text-[11px] text-slate-300">
            {membership.autoRenew ? 'Auto-renews next cycle. No lock-in.' : 'Subscription set to end on renewal date.'}
          </p>
        </div>

        {/* Billing Method */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <span>Billing Settlement</span>
          </div>
          <div className="text-base font-extrabold text-white truncate">
            {membership.paymentMethodSummary}
          </div>
          <p className="text-[11px] text-slate-300">
            {isFree ? 'Free Forever (Zero Platform Fee)' : 'Simulated Sandbox Billing Engine'}
          </p>
        </div>
      </div>

      {/* Feature Usage Tracker Bar */}
      <div className="pt-2 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] uppercase tracking-wider text-slate-300 font-bold">
            Feature Usage This Month:
          </span>
          <span className="text-[11px] text-emerald-400 font-medium">
            Reset on {membership.currentPeriodEnd}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> AI Queries</span>
              <span className="font-mono font-bold text-white">{featureUsage.aiAssistantQueriesUsed} / {featureUsage.aiAssistantQueriesLimit}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1"><Search className="w-3 h-3 text-blue-400" /> Due Diligence</span>
              <span className="font-mono font-bold text-white">{featureUsage.aiDueDiligenceScansUsed} / {featureUsage.aiDueDiligenceScansLimit}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1"><Scale className="w-3 h-3 text-purple-400" /> Contract Scans</span>
              <span className="font-mono font-bold text-white">{featureUsage.aiContractScansUsed} / {featureUsage.aiContractScansLimit}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-emerald-400" /> Reports Unlocked</span>
              <span className="font-mono font-bold text-white">{featureUsage.premiumReportsUnlocked} / {featureUsage.premiumReportsLimit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
