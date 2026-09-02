import React, { useState } from 'react';
import { 
  ProfitDistributionRecord, 
  CapitalCall, 
  ExitRequest 
} from './PoolingTypes';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Users, 
  FileSpreadsheet,
  Plus
} from 'lucide-react';

interface ProfitDistributionViewProps {
  distributions: ProfitDistributionRecord[];
  capitalCalls: CapitalCall[];
  exitRequests: ExitRequest[];
}

export const ProfitDistributionView: React.FC<ProfitDistributionViewProps> = ({
  distributions,
  capitalCalls,
  exitRequests
}) => {
  const [activeTab, setActiveTab] = useState<'payouts' | 'calls' | 'exits'>('payouts');

  return (
    <div className="space-y-6">
      
      {/* Tab Controls */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 text-xs font-extrabold gap-6">
        <button
          onClick={() => setActiveTab('payouts')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'payouts' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Profit Distribution Logs ({distributions.length})
        </button>

        <button
          onClick={() => setActiveTab('calls')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'calls' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Capital Calls ({capitalCalls.length})
        </button>

        <button
          onClick={() => setActiveTab('exits')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'exits' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Liquidity Exit Requests ({exitRequests.length})
        </button>
      </div>

      {/* 1. PROFIT DISTRIBUTION LOGS */}
      {activeTab === 'payouts' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Mudarabah & Musharakah Payout History
            </h4>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
              AAOIFI Certified Yield Ledger
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
            {distributions.map(dist => (
              <div key={dist.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-400">{dist.id}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{dist.poolName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Gross Profit: ${dist.grossProfitAmount.toLocaleString()} • Mudarib Fee: {dist.mudaribSharePercent}% • Date: {dist.distributionDate}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                      +${dist.investorPayoutAmount.toLocaleString()} USD
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{dist.txHash}</span>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {dist.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. CAPITAL CALLS */}
      {activeTab === 'calls' && (
        <div className="space-y-4">
          {capitalCalls.map(call => (
            <div key={call.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {call.id} • Due: {call.dueDate}
                </span>
                <h4 className="font-black text-xs text-slate-900 dark:text-white mt-1">{call.poolName}</h4>
                <p className="text-[11px] text-slate-500">{call.purpose}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  ${call.calledAmount.toLocaleString()} USD
                </span>
                <button onClick={() => alert(`Capital Call ${call.id} fulfilled.`)} className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer hover:bg-emerald-700">
                  Fulfill Call
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. EXIT REQUESTS */}
      {activeTab === 'exits' && (
        <div className="space-y-4">
          {exitRequests.map(req => (
            <div key={req.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400">{req.id} • Submitted: {req.requestDate}</span>
                <h4 className="font-black text-xs text-slate-900 dark:text-white mt-1">{req.poolName}</h4>
                <p className="text-[11px] text-slate-500">{req.tokenUnits} Tokens • Discount: {req.discountPercent}%</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  ${req.requestedAmount.toLocaleString()} USD
                </span>
                <button onClick={() => alert(`Exit Request ${req.id} listed on Secondary Market.`)} className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                  List on Marketplace
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
