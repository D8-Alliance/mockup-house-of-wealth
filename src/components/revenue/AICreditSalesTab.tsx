import React from 'react';
import { Zap, Sparkles, TrendingUp, Cpu, Download } from 'lucide-react';
import { AICreditSaleRecord } from '../../revenue/revenueManagementTypes';

interface AICreditSalesTabProps {
  creditSales: AICreditSaleRecord[];
  currency: 'MYR' | 'USD';
}

export const AICreditSalesTab: React.FC<AICreditSalesTabProps> = ({
  creditSales,
  currency
}) => {
  const sym = currency === 'MYR' ? 'RM ' : '$';

  const totalTokensSold = creditSales.reduce((acc, s) => acc + s.tokenCount, 0);
  const totalTokensConsumed = creditSales.reduce((acc, s) => acc + s.consumedSoFar, 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total AI Tokens Invoiced</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {(totalTokensSold / 1000000).toFixed(2)}M <span className="text-xs text-slate-400">Tokens</span>
          </div>
          <p className="text-[11px] text-slate-500">Includes Copilot API & Shariah scans</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consumption Velocity</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {((totalTokensConsumed / totalTokensSold) * 100).toFixed(1)}% <span className="text-xs text-emerald-500 font-bold">Active</span>
          </div>
          <p className="text-[11px] text-slate-500">{(totalTokensConsumed / 1000).toLocaleString()}k tokens utilized</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">AI Gross Margin</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            78.4%
          </div>
          <p className="text-[11px] text-slate-500">Above Gemini API inference cost</p>
        </div>
      </div>

      {/* Credit Sales Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              AI Utility Credit Sales & Quota Packages
            </h3>
            <p className="text-xs text-slate-500">
              Purchases of AI Due Diligence scan quotas, Smart Contract auditor credits, and API bundles.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Sale ID / Date</th>
                <th className="p-3.5">Customer & Organization</th>
                <th className="p-3.5">Package Title</th>
                <th className="p-3.5">Tokens Granted</th>
                <th className="p-3.5">Usage Intent</th>
                <th className="p-3.5">Consumption Progress</th>
                <th className="p-3.5 text-right">Invoiced Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {creditSales.map(sale => {
                const amount = currency === 'MYR' ? sale.priceMYR : sale.priceUSD;
                const consumedPct = Math.min(100, Math.round((sale.consumedSoFar / sale.tokenCount) * 100));
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono">
                      <span className="font-bold text-slate-900 dark:text-white block">{sale.id}</span>
                      <span className="text-[10px] text-slate-400">{sale.date}</span>
                    </td>

                    <td className="p-3.5 max-w-[180px]">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{sale.customerName}</span>
                      <span className="text-[10px] text-slate-400 truncate block">{sale.customerOrg} • {sale.country}</span>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        {sale.packageTitle}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {(sale.tokenCount / 1000).toLocaleString()}k
                    </td>

                    <td className="p-3.5 max-w-[200px] text-slate-600 dark:text-slate-400 truncate">
                      {sale.usagePurpose}
                    </td>

                    <td className="p-3.5 min-w-[140px]">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                        <span>{consumedPct}%</span>
                        <span>{(sale.consumedSoFar / 1000).toFixed(0)}k used</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${consumedPct}%` }} />
                      </div>
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {sym}{amount.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
