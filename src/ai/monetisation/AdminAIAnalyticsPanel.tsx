import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  DollarSign, 
  Users, 
  Coins, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  RefreshCw,
  Clock,
  CheckCircle2,
  PieChart as PieIcon,
  Activity
} from 'lucide-react';
import { AdminAIAnalyticsSummary, AIUsageLogEntry } from './aiMonetisationTypes';
import { aiMonetisationService } from './aiMonetisationService';

export const AdminAIAnalyticsPanel: React.FC = () => {
  const [summary, setSummary] = useState<AdminAIAnalyticsSummary>(
    aiMonetisationService.getAdminAnalyticsSummary()
  );
  const [allLogs, setAllLogs] = useState<AIUsageLogEntry[]>(
    aiMonetisationService.getAllPlatformUsageLogs()
  );

  useEffect(() => {
    const update = () => {
      setSummary(aiMonetisationService.getAdminAnalyticsSummary());
      setAllLogs(aiMonetisationService.getAllPlatformUsageLogs());
    };
    const unsubscribe = aiMonetisationService.subscribe(update);
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-xs">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-purple-300" /> Admin AI Economics & Monetisation
            </span>
            <span className="text-[11px] text-slate-300">Real-time Platform Telemetry</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white mt-1">
            Platform AI Token & Credit Analytics Suite
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Monitor aggregate AI credit burns, on-demand credit purchases, tier allocations, and LLM inference token unit economics.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center">
            <span className="text-[10px] text-slate-300 block font-bold">Top Feature</span>
            <span className="text-xs font-black text-emerald-400">{summary.mostPopularOperation}</span>
          </div>
        </div>
      </div>

      {/* 4 Core Admin KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Credits Burned</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {summary.totalPlatformCreditsBurned.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">+18.4% this week</span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10.5px] text-slate-400">
            Across all Shariah AI feature endpoints
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Credits Purchased</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {summary.totalAdditionalCreditsPurchased.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">On-demand top-up volume</span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10.5px] text-slate-400">
            Top pack: <strong>Investor Pro (250 Cr)</strong>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI Credit Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              RM {summary.totalRevenueMYR.toLocaleString()}
            </div>
            <span className="text-[10.5px] text-slate-400 font-mono">(${summary.totalRevenueUSD} USD)</span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10.5px] text-emerald-600 font-bold">
            100% Gross Margin on Virtual Units
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active AI Users</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {summary.activeAIUsersCount}
            </div>
            <span className="text-[10px] text-slate-400">Avg {summary.avgCreditsPerUser} Cr / user</span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10.5px] text-slate-400">
            68% Conversion to Plus/Pro tiers
          </div>
        </div>
      </div>

      {/* Grid of Consumption Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operation Distribution Breakdown */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              Consumption by AI Tool & Operation
            </h2>
            <span className="text-[10.5px] font-bold text-slate-400">Credit Volume %</span>
          </div>

          <div className="space-y-3">
            {summary.operationDistribution.map(op => (
              <div key={op.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: op.color }} />
                    {op.name}
                  </span>
                  <span className="font-mono text-slate-500">
                    <strong>{op.creditsBurned} Cr</strong> ({op.percentage}%) • {op.count} runs
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${op.percentage}%`, backgroundColor: op.color }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Tier Consumption Breakdown */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              AI Utilization by Membership Tier
            </h2>
            <span className="text-[10.5px] font-bold text-slate-400">User Segments</span>
          </div>

          <div className="space-y-3">
            {summary.tierDistribution.map(tier => (
              <div key={tier.tier} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-md" style={{ backgroundColor: tier.color }} />
                  <div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {tier.tier}
                    </div>
                    <span className="text-[10px] text-slate-400">{tier.usersCount} Active Subscribers</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-xs text-slate-900 dark:text-white font-mono">
                    {tier.creditsBurned} Credits
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                    {tier.percentage}% Platform Share
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cross-Platform Execution Log Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Real-Time Cross-User AI Execution Stream
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live transaction stream tracking token weights and automated Shariah credit deductions.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-[10.5px] uppercase font-bold text-slate-500">
                <th className="p-3">User & Tier</th>
                <th className="p-3">Operation</th>
                <th className="p-3">Target Entity</th>
                <th className="p-3 text-right">Cost (Credits)</th>
                <th className="p-3 text-right">Est. Inference Tokens</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {allLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-sans">
                    <div className="font-bold text-slate-900 dark:text-white">{log.userName}</div>
                    <span className="text-[9.5px] font-mono text-purple-600 bg-purple-500/10 px-1.5 py-[2px] rounded">
                      {log.userTier}
                    </span>
                  </td>
                  <td className="p-3 font-sans">
                    <div className="font-bold text-slate-900 dark:text-white">{log.operationName}</div>
                    <span className="text-[10px] text-slate-400">{log.category}</span>
                  </td>
                  <td className="p-3 font-sans text-slate-600 dark:text-slate-300">
                    {log.targetEntity || 'Global Islamic Portfolio'}
                  </td>
                  <td className="p-3 text-right font-black text-purple-600 dark:text-purple-400">
                    -{log.creditCost}
                  </td>
                  <td className="p-3 text-right text-slate-500">
                    {log.tokensConsumedEstimate.toLocaleString()}
                  </td>
                  <td className="p-3 text-slate-400 font-sans text-[10.5px]">
                    {log.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
