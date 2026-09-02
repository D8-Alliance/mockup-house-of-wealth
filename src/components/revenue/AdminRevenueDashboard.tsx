import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Zap, 
  Building2, 
  Star, 
  FileText, 
  Sparkles, 
  Download, 
  Calendar,
  AlertCircle,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { RevenueMetric } from '../../revenue/revenueTypes';

interface AdminRevenueDashboardProps {
  metrics: RevenueMetric;
  onOpenConfig?: () => void;
}

export const AdminRevenueDashboard: React.FC<AdminRevenueDashboardProps> = ({
  metrics,
  onOpenConfig
}) => {
  const [timeframe, setTimeframe] = useState<'6m' | '1y' | 'all'>('6m');

  const streamBreakdown = [
    { label: 'Membership Subscriptions', amountUSD: metrics.membershipRevenueUSD, pct: 47.5, color: 'bg-emerald-500', icon: <Users className="w-4 h-4 text-emerald-500" /> },
    { label: 'AI Utility Credits', amountUSD: metrics.aiRevenueUSD, pct: 16.9, color: 'bg-amber-500', icon: <Zap className="w-4 h-4 text-amber-500" /> },
    { label: 'PDP / Sponsor Plans', amountUSD: metrics.pdpRevenueUSD, pct: 14.8, color: 'bg-blue-500', icon: <Building2 className="w-4 h-4 text-blue-500" /> },
    { label: 'Project Promotions', amountUSD: metrics.listingRevenueUSD, pct: 9.8, color: 'bg-purple-500', icon: <Star className="w-4 h-4 text-purple-500" /> },
    { label: 'Marketplace Banners', amountUSD: metrics.advertisingRevenueUSD, pct: 6.0, color: 'bg-pink-500', icon: <Sparkles className="w-4 h-4 text-pink-500" /> },
    { label: 'Premium Research Reports', amountUSD: metrics.premiumReportRevenueUSD, pct: 3.6, color: 'bg-indigo-500', icon: <FileText className="w-4 h-4 text-indigo-500" /> },
    { label: 'Enterprise Nodes', amountUSD: metrics.enterpriseRevenueUSD, pct: 1.4, color: 'bg-slate-500', icon: <TrendingUp className="w-4 h-4 text-slate-500" /> },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header with Prototype Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Executive Finance Hub
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Simulated Revenue Data
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Revenue & Monetisation Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Multi-stream revenue orchestration across Memberships, AI Credits, PDP Sponsorships, and Featured Listings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenConfig && (
            <button
              onClick={onOpenConfig}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow hover:opacity-90 transition-all cursor-pointer"
            >
              Configure Pricing & Tiers
            </button>
          )}
          <button
            onClick={() => alert('Simulated Financial Audit Ledger CSV Exported')}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Gross Invoiced</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ${metrics.totalRevenueUSD.toLocaleString()} <span className="text-xs text-slate-400 font-normal font-mono">USD</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +24.8% vs last quarter
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monthly Recurring Revenue (MRR)</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ${metrics.mrrUSD.toLocaleString()} <span className="text-xs text-slate-400 font-normal font-mono">USD</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Active recurring memberships & PDP
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Annual Run-Rate (ARR)</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ${metrics.arrUSD.toLocaleString()} <span className="text-xs text-slate-400 font-normal font-mono">USD</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Annualized projection
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paid Active Subscribers</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.totalPaidMembers.toLocaleString()} <span className="text-xs text-slate-400 font-normal">users</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-bold">
            8.4% conversion from Free
          </div>
        </div>

      </div>

      {/* Breakdown by Stream & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Streams List */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            Revenue Composition by Stream
          </h3>
          <div className="space-y-3">
            {streamBreakdown.map((s, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    {s.icon}
                    {s.label}
                  </span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    ${s.amountUSD.toLocaleString()} ({s.pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div className={`${s.color} h-2 rounded-full`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend Bars */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              6-Month Gross Trajectory
            </h3>
            <span className="text-xs font-mono text-emerald-600 font-bold">+180% 6M Growth</span>
          </div>

          <div className="grid grid-cols-6 gap-2 h-44 items-end pt-4">
            {metrics.monthlyTrend.map((m, idx) => {
              const maxVal = 75000;
              const heightPct = Math.min(100, Math.round((m.total / maxVal) * 100));
              return (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-mono text-slate-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    ${Math.round(m.total / 1000)}k
                  </div>
                  <div 
                    className="w-full bg-emerald-500 group-hover:bg-emerald-600 rounded-xl transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {m.month.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
