import React from 'react';
import { Globe2, Coins, Users, ShieldCheck, Building2, FileCheck, TrendingUp, Zap, ExternalLink, Lock, ChevronRight } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { AssetItem, ContractItem, NavTab } from '../../types';

interface ExecutiveDashboardWidgetsProps {
  currentRole: string;
  assets: AssetItem[];
  contracts: ContractItem[];
  setTab: (tab: NavTab) => void;
  onQuickApprove: (title: string) => void;
}

export const ExecutiveDashboardWidgets: React.FC<ExecutiveDashboardWidgetsProps> = ({
  currentRole,
  assets,
  contracts,
  setTab,
  onQuickApprove
}) => {
  if (currentRole === 'Super Admin') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Global D-8 Nodes" value="8 / 8 Active" sub="100% Uptime" icon={<Globe2 className="w-5 h-5 text-purple-500" />} />
          <MetricCard label="Platform Total Value Locked" value="$148.5M USD" sub="+18.4% YoY Growth" icon={<Coins className="w-5 h-5 text-emerald-500" />} />
          <MetricCard label="Total D-8 System Users" value="14,280" sub="across 8 Nations" icon={<Users className="w-5 h-5 text-blue-500" />} />
          <MetricCard label="Root System Health" value="99.98%" sub="0 Critical Alerts" icon={<ShieldCheck className="w-5 h-5 text-teal-500" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-purple-500" />
              <span>D-8 Regional Country Node Status</span>
            </h3>
            <div className="space-y-3">
              {[
                { country: 'Pakistan (PK)', code: 'PK', tvl: '$42.1M', status: 'Optimal', latency: '12ms' },
                { country: 'Turkey (TR)', code: 'TR', tvl: '$31.8M', status: 'Optimal', latency: '18ms' },
                { country: 'Indonesia (ID)', code: 'ID', tvl: '$28.4M', status: 'Optimal', latency: '24ms' },
                { country: 'Malaysia (MY)', code: 'MY', tvl: '$22.0M', status: 'Optimal', latency: '15ms' },
                { country: 'Nigeria (NG)', code: 'NG', tvl: '$12.2M', status: 'Syncing', latency: '45ms' },
                { country: 'Egypt (EG)', code: 'EG', tvl: '$12.0M', status: 'Optimal', latency: '32ms' }
              ].map((node, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 dark:text-white">{node.country}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-slate-500">{node.tvl} TVL</span>
                    <span className="font-mono text-slate-400">{node.latency}</span>
                    <span className="px-2 py-0.5 rounded-md font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {node.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Super-Admin Controls</span>
            </h3>
            <div className="space-y-2 text-xs">
              <button onClick={() => alert("Global System Audit initiated.")} className="w-full p-3 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 font-bold rounded-xl text-left flex items-center justify-between cursor-pointer">
                <span>Trigger Global Audit Run</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </button>
              <button onClick={() => alert("Emergency Liquidity Freeze dialogue active.")} className="w-full p-3 bg-rose-500/10 text-rose-600 font-bold rounded-xl text-left flex items-center justify-between cursor-pointer border border-rose-500/20">
                <span>Emergency Protocol Gate</span>
                <Lock className="w-4 h-4" />
              </button>
              <button onClick={() => setTab('ledger')} className="w-full p-3 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 font-bold rounded-xl text-left flex items-center justify-between cursor-pointer">
                <span>View Immutable Cryptographic Logs</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentRole === 'Country Admin') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Regional Node TVL" value="$42,100,000 USD" sub="Pakistan Node #1" icon={<Building2 className="w-5 h-5 text-emerald-500" />} />
          <MetricCard label="Active Local Assets" value={assets.length.toString()} sub="Verified & Tokenized" icon={<Coins className="w-5 h-5 text-blue-500" />} />
          <MetricCard label="Active Smart Sukuk" value={contracts.length.toString()} sub="Mudarabah & Musharakah" icon={<FileCheck className="w-5 h-5 text-teal-500" />} />
          <MetricCard label="Regional Yield YTD" value="9.45% Avg" sub="Net Distribution" icon={<TrendingUp className="w-5 h-5 text-amber-500" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-500" />
                <span>Regional Approval Queue</span>
              </h3>
              <span className="text-xs text-slate-500 font-bold">2 Pending Sign-offs</span>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">Karachi Logistics Hub Tokenization ($12,500,000)</h4>
                  <p className="text-[11px] text-slate-500">Requested by Indus Logistics Group • Shariah Screened</p>
                </div>
                <button onClick={() => onQuickApprove("Karachi Logistics Hub")} className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer">
                  Approve Regional Listing
                </button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">Lahore Green Sukuk Pool ($5,000,000)</h4>
                  <p className="text-[11px] text-slate-500">Mudarabah Structure • AAOIFI Fatwa Verified</p>
                </div>
                <button onClick={() => onQuickApprove("Lahore Green Sukuk Pool")} className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer">
                  Approve Regional Listing
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Regional Quick Tools</h3>
            <div className="space-y-2 text-xs">
              <button onClick={() => setTab('assets')} className="w-full p-3 bg-slate-100 dark:bg-slate-700/60 font-bold rounded-xl text-left flex justify-between cursor-pointer">
                <span>Manage Regional Assets ({assets.length})</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button onClick={() => setTab('pooling')} className="w-full p-3 bg-slate-100 dark:bg-slate-700/60 font-bold rounded-xl text-left flex justify-between cursor-pointer">
                <span>National Waqf Pool Overview</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button onClick={() => setTab('ledger')} className="w-full p-3 bg-slate-100 dark:bg-slate-700/60 font-bold rounded-xl text-left flex justify-between cursor-pointer">
                <span>Inspect Audit Ledger</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
