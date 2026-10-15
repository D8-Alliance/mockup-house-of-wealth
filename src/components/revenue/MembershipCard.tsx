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
  TrendingUp
} from 'lucide-react';
import { UserMembership, HoWCreditBalance, MembershipPlan, FeatureUsageStats } from '../../revenue/revenueTypes';
import { BackendMembershipStatus } from '../../services/apiClient';
import { formatDate } from './membershipFormat';

const lifecycleBadge: Record<BackendMembershipStatus['lifecycleStatus'], { label: string; className: string }> = {
  FREE: { label: 'Free Plan', className: 'bg-slate-500/20 text-slate-200 border-slate-400/30' },
  ACTIVE: { label: 'Active Membership', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  EXPIRING_SOON: { label: 'Expiring Soon', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  GRACE: { label: 'Expired · Grace Period', className: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

interface MembershipCardProps {
  /** Live status from the API; null until it has loaded. */
  membershipStatus: BackendMembershipStatus | null;
  onRenew: () => void;
  membership: UserMembership;
  currentPlan: MembershipPlan;
  creditBalance: HoWCreditBalance;
  featureUsage: FeatureUsageStats;
  onOpenUpgradeModal: () => void;
  onOpenCreditModal: () => void;
}

export const MembershipCard: React.FC<MembershipCardProps> = ({
  membershipStatus,
  onRenew,
  membership,
  currentPlan,
  creditBalance,
  featureUsage,
  onOpenUpgradeModal,
  onOpenCreditModal
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
  const badge = lifecycleBadge[membershipStatus?.lifecycleStatus || (isFree ? 'FREE' : 'ACTIVE')];
  const needsRenewal = membershipStatus?.lifecycleStatus === 'EXPIRING_SOON' || membershipStatus?.lifecycleStatus === 'GRACE';

  return (
    <div className={`rounded-3xl p-6 sm:p-8 bg-gradient-to-r ${getTierColor(membership.tier)} border shadow-xl text-white space-y-6`}>
      {/* Top Header & Positioning Statement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${badge.className}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {badge.label}
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
          {!isFree && (
            <button
              onClick={onRenew}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${needsRenewal ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'}`}
            >
              <Calendar className="w-4 h-4" />
              <span>Renew Plan</span>
            </button>
          )}
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
            <span>{isFree ? 'Credit Allowance Resets' : 'Plan Valid Until'}</span>
          </div>
          <div className="text-base font-extrabold text-white">
            {formatDate(membership.currentPeriodEnd)}
          </div>
          <p className="text-[11px] text-slate-300">
            {isFree
              ? 'Free plan: monthly AI credits are granted again each cycle.'
              : membershipStatus?.lifecycleStatus === 'GRACE'
                ? `Ended. Grace period until ${formatDate(membershipStatus.graceEndsAt)}, then Free plan.`
                : `${membershipStatus?.daysRemaining ?? '-'} days left. Manual renewal via ToyyibPay or AI credits.`}
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
            {isFree ? 'Free Forever (Zero Platform Fee)' : 'Last payment method used for this plan'}
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
            Reset on {formatDate(membership.currentPeriodEnd)}
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
