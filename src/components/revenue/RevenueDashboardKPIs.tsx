import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Zap, 
  Building2, 
  Star, 
  FileText, 
  Sparkles, 
  Layers, 
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { RevenueSummaryMetrics } from '../../revenue/revenueManagementTypes';

interface RevenueDashboardKPIsProps {
  metrics: RevenueSummaryMetrics;
  currency: 'MYR' | 'USD';
  onToggleCurrency: (c: 'MYR' | 'USD') => void;
}

export const RevenueDashboardKPIs: React.FC<RevenueDashboardKPIsProps> = ({
  metrics,
  currency,
  onToggleCurrency
}) => {
  const rate = currency === 'MYR' ? 4.2 : 1;
  const symbol = currency === 'MYR' ? 'RM ' : '$';

  const formatVal = (usdVal: number) => {
    const val = usdVal * rate;
    return `${symbol}${Math.round(val).toLocaleString()}`;
  };

  const kpiItems = [
    {
      id: 'kpi_total_revenue',
      label: 'Total Revenue',
      value: formatVal(metrics.totalRevenueUSD),
      subtext: `+${metrics.revenueGrowthPct}% vs prior cycle`,
      badge: 'Cumulative Invoiced',
      icon: <DollarSign className="w-5 h-5 text-emerald-500" />,
      accent: 'emerald',
      highlight: true
    },
    {
      id: 'kpi_mrr',
      label: 'MRR (Monthly Recurring)',
      value: formatVal(metrics.mrrUSD),
      subtext: 'Active recurring run-rate',
      badge: 'Run-Rate',
      icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
      accent: 'blue'
    },
    {
      id: 'kpi_arr',
      label: 'ARR (Annual Recurring)',
      value: formatVal(metrics.arrUSD),
      subtext: '12-Month Projected ARR',
      badge: 'Projected',
      icon: <ArrowUpRight className="w-5 h-5 text-indigo-500" />,
      accent: 'indigo'
    },
    {
      id: 'kpi_paid_members',
      label: 'Paid Members',
      value: metrics.totalPaidMembers.toLocaleString(),
      subtext: `${metrics.conversionRatePct}% conversion from free tier`,
      badge: 'Subscribers',
      icon: <Users className="w-5 h-5 text-purple-500" />,
      accent: 'purple'
    },
    {
      id: 'kpi_membership_rev',
      label: 'Membership Revenue',
      value: formatVal(metrics.membershipRevenueUSD),
      subtext: 'Plus, Pro & Enterprise tiers',
      badge: '45.6% of Total',
      icon: <Users className="w-5 h-5 text-teal-500" />,
      accent: 'teal'
    },
    {
      id: 'kpi_ai_rev',
      label: 'AI Revenue',
      value: formatVal(metrics.aiRevenueUSD),
      subtext: 'Token packages & Copilot API',
      badge: 'Utility Tokens',
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      accent: 'amber'
    },
    {
      id: 'kpi_pdp_rev',
      label: 'PDP Revenue',
      value: formatVal(metrics.pdpRevenueUSD),
      subtext: 'Sponsor subscriptions & plans',
      badge: 'Project Sponsors',
      icon: <Building2 className="w-5 h-5 text-sky-500" />,
      accent: 'sky'
    },
    {
      id: 'kpi_featured_rev',
      label: 'Featured Listing Revenue',
      value: formatVal(metrics.featuredListingRevenueUSD),
      subtext: '7D & 30D top shelf promotions',
      badge: 'Listing Badges',
      icon: <Star className="w-5 h-5 text-yellow-500" />,
      accent: 'yellow'
    },
    {
      id: 'kpi_reports_rev',
      label: 'Premium Report Revenue',
      value: formatVal(metrics.premiumReportRevenueUSD),
      subtext: 'Due diligence & Sukuk scans',
      badge: 'Research AI',
      icon: <FileText className="w-5 h-5 text-pink-500" />,
      accent: 'pink'
    },
    {
      id: 'kpi_ad_rev',
      label: 'Advertising Revenue',
      value: formatVal(metrics.advertisingRevenueUSD),
      subtext: 'Marketplace takeovers & banners',
      badge: 'Apex Sponsors',
      icon: <Sparkles className="w-5 h-5 text-rose-500" />,
      accent: 'rose'
    },
    {
      id: 'kpi_enterprise_rev',
      label: 'Enterprise Revenue',
      value: formatVal(metrics.enterpriseRevenueUSD),
      subtext: 'Sovereign node data licensing',
      badge: 'Institutional',
      icon: <Layers className="w-5 h-5 text-cyan-500" />,
      accent: 'cyan'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Executive Revenue Performance Matrix
          </h3>
          <p className="text-xs text-slate-500">Live multi-tier financial monetization stream breakdown</p>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            onClick={() => onToggleCurrency('MYR')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              currency === 'MYR' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            MYR (RM)
          </button>
          <button
            onClick={() => onToggleCurrency('USD')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              currency === 'USD' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            USD ($)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpiItems.map(item => (
          <div
            key={item.id}
            className={`p-4 sm:p-5 rounded-3xl border transition-all hover:shadow-md flex flex-col justify-between ${
              item.highlight
                ? 'bg-gradient-to-br from-emerald-500/10 via-white to-emerald-500/5 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-emerald-500/30 dark:border-emerald-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {item.label}
              </span>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                {item.icon}
              </div>
            </div>

            <div className="my-2">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {item.value}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {item.badge}
                </span>
                <span className="text-[11px] text-slate-500 truncate">
                  {item.subtext}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
