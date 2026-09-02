import React, { useState } from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Globe, 
  CheckCircle2, 
  AlertTriangle, 
  Wifi, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { INITIAL_COUNTRY_NODES } from '../../countryNodes/mockCountryNodes';

export const SystemMonitoringPanel: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState('Just now');

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastRefreshed(new Date().toLocaleTimeString());
    }, 500);
  };

  const nodeStats = INITIAL_COUNTRY_NODES.map(node => ({
    ...node,
    latency: Math.floor(18 + Math.random() * 24) + 'ms',
    uptime: '99.98%',
    tps: Math.floor(120 + Math.random() * 80) + ' tx/s',
    blockHeight: '14,892,10' + Math.floor(Math.random() * 9),
    stateSync: 'Synchronized'
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Infrastructure Pulse
            </span>
            <span className="text-xs text-slate-400 font-mono">D-8 Sovereign Multi-Node Telemetry</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            System & Node Infrastructure Monitoring
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time latency, ledger synchronization, smart contract execution health, and API gateway throughput across regional hubs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow cursor-pointer transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Health Status</span>
          </button>
        </div>
      </div>

      {/* Global Health Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Global Cluster Uptime</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">99.992%</span>
            <span className="text-xs text-emerald-600 font-bold">Optimal</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mean Network Latency</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">28ms</span>
            <span className="text-xs text-slate-400">Edge Routed</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Country Nodes</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{INITIAL_COUNTRY_NODES.length} / 8</span>
            <span className="text-xs text-emerald-600 font-bold">100% Online</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ledger Throughput</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">1,420 TPS</span>
            <span className="text-xs text-slate-400">Peak 4,000</span>
          </div>
        </div>
      </div>

      {/* Country Nodes Cluster Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Sovereign Country Node Telemetry Status
            </h3>
            <p className="text-xs text-slate-500">
              Distributed validator instances and cryptographic gateway endpoints.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Last refreshed: {lastRefreshed}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">Node Jurisdiction</th>
                <th className="py-3 px-3">Regulatory Authority</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Latency</th>
                <th className="py-3 px-3 text-center">Throughput</th>
                <th className="py-3 px-3 text-center">Sync State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {nodeStats.map(node => (
                <tr key={node.countryNodeId} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <img src={node.flagUrl} alt={node.countryName} className="w-5 h-3.5 object-cover rounded shadow-xs" />
                      <div>
                        <span>{node.countryName}</span>
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 ml-1.5">({node.countryNodeId})</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 text-xs">
                    {node.regulatoryProfile}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>ACTIVE</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                    {node.latency}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                    {node.tps}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{node.stateSync}</span>
                    </span>
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
