import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Users, 
  Zap, 
  Building2, 
  ArrowUpRight,
  Activity
} from 'lucide-react';

interface RevenueChartsSectionProps {
  currency: 'MYR' | 'USD';
}

export const RevenueChartsSection: React.FC<RevenueChartsSectionProps> = ({ currency }) => {
  const [activeChart, setActiveChart] = useState<
    'TREND' | 'CATEGORY' | 'MEMBERSHIP' | 'AI_USAGE' | 'CONVERSION' | 'PDP_GROWTH'
  >('TREND');

  const rate = currency === 'MYR' ? 4.2 : 1;
  const sym = currency === 'MYR' ? 'RM ' : '$';

  // 1. Revenue Trend Data (Monthly)
  const trendData = [
    { month: 'Mar 26', membership: 14200, ai: 3800, pdp: 4200, promo: 2100, other: 1950, total: 26250 },
    { month: 'Apr 26', membership: 18500, ai: 5200, pdp: 5600, promo: 3400, other: 2400, total: 35100 },
    { month: 'May 26', membership: 22800, ai: 6900, pdp: 6800, promo: 4200, other: 3100, total: 43800 },
    { month: 'Jun 26', membership: 27400, ai: 8400, pdp: 8100, promo: 5300, other: 3900, total: 53100 },
    { month: 'Jul 26', membership: 32600, ai: 9800, pdp: 9500, promo: 6100, other: 4800, total: 62800 },
    { month: 'Aug 26', membership: 38450, ai: 11200, pdp: 11400, promo: 7200, other: 5600, total: 73850 }
  ];

  // 2. Revenue by Category
  const categoryData = [
    { name: 'Memberships', valUSD: 142500, pct: 45.6, color: 'bg-emerald-500' },
    { name: 'AI Credits', valUSD: 48900, pct: 15.6, color: 'bg-amber-500' },
    { name: 'PDP Plans', valUSD: 41200, pct: 13.2, color: 'bg-sky-500' },
    { name: 'Featured Listings', valUSD: 28650, pct: 9.2, color: 'bg-yellow-500' },
    { name: 'Advertising & Takeovers', valUSD: 21400, pct: 6.9, color: 'bg-purple-500' },
    { name: 'Premium Reports', valUSD: 16800, pct: 5.4, color: 'bg-pink-500' },
    { name: 'Enterprise Nodes', valUSD: 13000, pct: 4.1, color: 'bg-cyan-500' }
  ];

  // 3. Membership Growth (Subscribers)
  const membershipGrowthData = [
    { month: 'Mar', free: 4200, plus: 620, pro: 180, ent: 12 },
    { month: 'Apr', free: 5800, plus: 840, pro: 240, ent: 18 },
    { month: 'May', free: 7400, plus: 1080, pro: 310, ent: 25 },
    { month: 'Jun', free: 9100, plus: 1290, pro: 390, ent: 32 },
    { month: 'Jul', free: 11200, plus: 1540, pro: 470, ent: 40 },
    { month: 'Aug', free: 13800, plus: 1820, pro: 580, ent: 48 }
  ];

  // 4. AI Usage vs Revenue
  const aiUsageData = [
    { month: 'Mar', queries: '450k', tokens: '18M', revUSD: 3800 },
    { month: 'Apr', queries: '680k', tokens: '29M', revUSD: 5200 },
    { month: 'May', queries: '920k', tokens: '41M', revUSD: 6900 },
    { month: 'Jun', queries: '1.2M', tokens: '58M', revUSD: 8400 },
    { month: 'Jul', queries: '1.5M', tokens: '72M', revUSD: 9800 },
    { month: 'Aug', queries: '1.9M', tokens: '94M', revUSD: 11200 }
  ];

  // 5. Paid Conversion Funnel
  const conversionFunnel = [
    { stage: 'Total Registered Visitors', count: '48,200', pct: 100, color: 'bg-slate-500' },
    { stage: 'Active Free KYC Users', count: '13,800', pct: 28.6, color: 'bg-blue-500' },
    { stage: 'AI Tool / Scans Engaged', count: '7,450', pct: 15.5, color: 'bg-purple-500' },
    { stage: 'Paid Plan Subscribers (Plus/Pro/Ent)', count: '2,448', pct: 5.08, color: 'bg-emerald-500' },
    { stage: 'Multi-Product Spenders (AI + Promo)', count: '612', pct: 1.27, color: 'bg-amber-500' }
  ];

  // 6. PDP Growth Trajectory
  const pdpGrowthData = [
    { month: 'Mar', activePDP: 8, promotedProjects: 3, pdpRevUSD: 4200 },
    { month: 'Apr', activePDP: 12, promotedProjects: 6, pdpRevUSD: 5600 },
    { month: 'May', activePDP: 18, promotedProjects: 10, pdpRevUSD: 6800 },
    { month: 'Jun', activePDP: 24, promotedProjects: 14, pdpRevUSD: 8100 },
    { month: 'Jul', activePDP: 31, promotedProjects: 19, pdpRevUSD: 9500 },
    { month: 'Aug', activePDP: 42, promotedProjects: 26, pdpRevUSD: 11400 }
  ];

  const maxTrend = Math.max(...trendData.map(d => d.total));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Chart Selector Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Visual Monetisation Telemetry
          </span>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Monetisation Analytics & Cohort Visualizers
          </h3>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveChart('TREND')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeChart === 'TREND' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            Revenue Trend
          </button>
          <button
            onClick={() => setActiveChart('CATEGORY')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeChart === 'CATEGORY' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            By Category
          </button>
          <button
            onClick={() => setActiveChart('MEMBERSHIP')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeChart === 'MEMBERSHIP' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            Membership Growth
          </button>
          <button
            onClick={() => setActiveChart('AI_USAGE')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeChart === 'AI_USAGE' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            AI Usage
          </button>
          <button
            onClick={() => setActiveChart('CONVERSION')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeChart === 'CONVERSION' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            Paid Conversion
          </button>
          <button
            onClick={() => setActiveChart('PDP_GROWTH')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeChart === 'PDP_GROWTH' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            PDP Growth
          </button>
        </div>
      </div>

      {/* Chart 1: Revenue Trend */}
      {activeChart === 'TREND' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Monthly Invoiced Revenue Run-Rate</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              August 2026 Peak: {sym}{Math.round(73850 * rate).toLocaleString()}
            </span>
          </div>

          <div className="h-64 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {trendData.map(d => {
              const hPct = Math.round((d.total / maxTrend) * 100);
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-emerald-600">
                    {sym}{Math.round(d.total * rate / 1000)}k
                  </span>
                  <div
                    style={{ height: `${hPct}%` }}
                    className="w-full max-w-[48px] rounded-t-xl bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 group-hover:opacity-90 transition-all relative"
                  >
                    <div className="absolute inset-x-0 bottom-0 bg-emerald-700/40 rounded-t-xl h-[45%]" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 truncate">{d.month}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500 justify-center">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600" /> Memberships</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-500" /> AI Tokens</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400" /> PDP & Promotions</span>
          </div>
        </div>
      )}

      {/* Chart 2: Category Breakdown */}
      {activeChart === 'CATEGORY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            {categoryData.map(item => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {sym}{Math.round(item.valUSD * rate).toLocaleString()} ({item.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">Revenue Distribution Analysis</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Recurring memberships form the foundational anchor (45.6%), while high-margin AI utility consumption and PDP sponsor promotions drive explosive 26.4% month-on-month expansion across D-8 markets.
            </p>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Recurring Share: 58.8% • Transactional / Promo Share: 41.2%
            </div>
          </div>
        </div>
      )}

      {/* Chart 3: Membership Growth */}
      {activeChart === 'MEMBERSHIP' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">Free KYC Users</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">13,800</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-center border border-emerald-500/20">
              <span className="text-[10px] text-emerald-600 block font-bold">Plus Members</span>
              <span className="text-lg font-black text-emerald-600">1,820</span>
            </div>
            <div className="p-3 rounded-2xl bg-blue-500/10 text-center border border-blue-500/20">
              <span className="text-[10px] text-blue-600 block font-bold">Professional</span>
              <span className="text-lg font-black text-blue-600">580</span>
            </div>
            <div className="p-3 rounded-2xl bg-purple-500/10 text-center border border-purple-500/20">
              <span className="text-[10px] text-purple-600 block font-bold">Enterprise Nodes</span>
              <span className="text-lg font-black text-purple-600">48</span>
            </div>
          </div>

          <div className="h-56 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {membershipGrowthData.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full max-w-[36px] flex flex-col-reverse rounded-t-xl overflow-hidden" style={{ height: `${(m.plus + m.pro + m.ent) / 25}%` }}>
                  <div style={{ height: '70%' }} className="bg-emerald-500" title="Plus Tier" />
                  <div style={{ height: '25%' }} className="bg-blue-500" title="Pro Tier" />
                  <div style={{ height: '5%' }} className="bg-purple-600" title="Enterprise" />
                </div>
                <span className="text-[11px] font-bold text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart 4: AI Usage */}
      {activeChart === 'AI_USAGE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">Token Velocity & Credit Monetisation</h4>
            <p className="text-xs text-slate-500">Monthly breakdown of AI Shariah Copilot queries, token consumption volume, and direct token pack billing.</p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {aiUsageData.map(item => (
                <div key={item.month} className="py-2 flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{item.month} 2026</span>
                  <span className="font-mono text-slate-500">{item.queries} queries ({item.tokens} tokens)</span>
                  <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                    {sym}{Math.round(item.revUSD * rate).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <span className="text-[10px] font-black uppercase text-amber-600">Unit Economics</span>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">
              RM 0.0004 / Token Invoiced
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Average gross margin on AI token packs is 78.4% above inference infrastructure cost.
            </p>
          </div>
        </div>
      )}

      {/* Chart 5: Paid Conversion */}
      {activeChart === 'CONVERSION' && (
        <div className="space-y-4">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Visitor to Paid Subscriber Conversion Funnel</h4>
          <div className="space-y-2.5">
            {conversionFunnel.map(item => (
              <div key={item.stage} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200">{item.stage}</span>
                  <span className="font-mono text-slate-900 dark:text-white">{item.count} ({item.pct}%)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${Math.max(4, item.pct)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart 6: PDP Growth */}
      {activeChart === 'PDP_GROWTH' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-300">Active PDP Sponsors & Promoted Campaigns</span>
            <span className="text-sky-600 font-mono">August 2026: 42 Sponsors / 26 Campaigns</span>
          </div>
          <div className="h-56 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {pdpGrowthData.map(p => (
              <div key={p.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] font-mono font-bold text-sky-600">{p.activePDP} PDPs</span>
                <div style={{ height: `${(p.activePDP / 45) * 100}%` }} className="w-full max-w-[40px] rounded-t-xl bg-sky-500" />
                <span className="text-[11px] font-bold text-slate-500">{p.month}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
