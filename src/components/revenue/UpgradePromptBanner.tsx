import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { MembershipTier } from '../../revenue/revenueTypes';

interface UpgradePromptBannerProps {
  title?: string;
  subtitle?: string;
  requiredTier?: MembershipTier;
  onViewPlans: () => void;
  compact?: boolean;
  className?: string;
}

export const UpgradePromptBanner: React.FC<UpgradePromptBannerProps> = ({
  title = 'Unlock Advanced AI Intelligence',
  subtitle = 'Available with Wealth Pooling Plus & Professional tiers. Enhance your portfolio decision-making with deep AAOIFI clause screening and predictive scenario modeling.',
  requiredTier = 'PLUS',
  onViewPlans,
  compact = false,
  className = ''
}) => {
  const getBadge = () => {
    switch (requiredTier) {
      case 'ENTERPRISE':
        return 'Available with Wealth Pooling Enterprise';
      case 'PROFESSIONAL':
        return 'Available with Wealth Pooling Professional';
      default:
        return 'Available with Wealth Pooling Plus';
    }
  };

  if (compact) {
    return (
      <div className={`p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-[2px] rounded-full border border-emerald-500/20">
                {getBadge()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Investing in open pools remains free. Upgrade unlocks deep AI tools & automated scans.
            </p>
          </div>
        </div>

        <button
          onClick={onViewPlans}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>View Plans</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-emerald-500/30 text-white shadow-lg space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3 h-3" />
            <span>{getBadge()}</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
            {title}
          </h3>
          <p className="text-xs text-slate-300">
            {subtitle}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={onViewPlans}
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer transform hover:scale-105"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>View Membership Plans</span>
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Open access guarantee: Membership is never a requirement to invest or participate in Shariah asset pools.</span>
      </div>
    </div>
  );
};
