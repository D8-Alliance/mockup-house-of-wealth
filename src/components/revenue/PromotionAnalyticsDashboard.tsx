import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Eye, 
  MousePointerClick, 
  Users, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  ArrowUpRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { marketplaceMonetisationService } from '../../revenue/marketplaceMonetisationService';
import { PromotionAnalyticsSummary } from '../../revenue/marketplaceMonetisationTypes';

export const PromotionAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<PromotionAnalyticsSummary>(
    marketplaceMonetisationService.getAnalyticsSummary()
  );

  useEffect(() => {
    const unsub = marketplaceMonetisationService.subscribe(() => {
      setAnalytics(marketplaceMonetisationService.getAnalyticsSummary());
    });
    return unsub;
  }, []);

  const costPerLead = analytics.totalLeads > 0 
    ? (analytics.totalRevenueMYR / analytics.totalLeads).toFixed(2) 
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Campaigns */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Campaigns</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {analytics.totalActiveCampaigns}
          </div>
          <div className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> Pinned in Top Shelves
          </div>
        </div>

        {/* Total Views */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Promotion Views</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {analytics.totalViews.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-500 font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> +32% discovery lift
          </div>
        </div>

        {/* Total Clicks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Clicks & CTR</span>
            <MousePointerClick className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            {analytics.totalClicks.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-500 font-semibold">
            Avg CTR: <strong>{analytics.avgCTR}%</strong>
          </div>
        </div>

        {/* Total Leads */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Investor Inquiries</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {analytics.totalLeads}
          </div>
          <div className="text-[10px] text-emerald-500 font-semibold">
            Cost/Lead: <strong>RM {costPerLead}</strong>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2 col-span-2 lg:col-span-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Promotion Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            RM {analytics.totalRevenueMYR.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold">
            Marketplace Monetisation
          </div>
        </div>
      </div>

      {/* Impression Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Visualization */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Impression & Click Growth Trajectory
              </h3>
              <p className="text-xs text-slate-500">7-day aggregated promotion telemetry</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
              +18.4% Week-on-Week
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {analytics.dailyImpressionTrend.map((day, idx) => {
              const maxViews = 6000;
              const pct = Math.min(100, Math.round((day.views / maxViews) * 100));
              return (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{day.date}</span>
                    <span className="font-mono text-slate-500">
                      {day.views} views • {day.clicks} clicks • <strong className="text-emerald-600">{day.leads} leads</strong>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by Promotion Package */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Revenue by Placement Package
          </h3>

          <div className="space-y-3">
            {analytics.categoryBreakdown.map((cat, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">{cat.category}</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 font-mono">RM {cat.spendMYR}</span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>{cat.count} Active Orders</span>
                  <span>{((cat.spendMYR / analytics.totalRevenueMYR) * 100).toFixed(0)}% Share</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[10.5px] text-amber-900 dark:text-amber-300">
            <strong>Key Insight:</strong> Featured 30D and Sponsored Takeover packages generate 74% of total marketplace promotional revenue with highest lead-to-conversion ratios.
          </div>
        </div>
      </div>
    </div>
  );
};
