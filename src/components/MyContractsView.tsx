import React, { useState } from 'react';
import { 
  FileText, 
  PlusCircle, 
  CheckCircle2, 
  ChevronRight, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  SlidersHorizontal,
  PenTool,
  BarChart3,
  Building2,
  DollarSign
} from 'lucide-react';
import { ContractItem, LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface MyContractsViewProps {
  contracts: ContractItem[];
  lang: LanguageCode;
  onOpenContractWizard: () => void;
  onOpenFinancialPerf: (contract: ContractItem) => void;
}

export const MyContractsView: React.FC<MyContractsViewProps> = ({
  contracts,
  lang,
  onOpenContractWizard,
  onOpenFinancialPerf
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [selectedStatus, setSelectedStatus] = useState('All');

  const filtered = contracts.filter(c => selectedStatus === 'All' || c.status === selectedStatus);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.myContracts}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your active Mudarabah, Musharakah, and Wakalah agreements on the blockchain.
          </p>
        </div>

        <button
          onClick={onOpenContractWizard}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
        >
          <PenTool className="w-4 h-4" />
          <span>New Smart Contract</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Active Smart Contracts</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{contracts.length} Agreements</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Portfolio Investment</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">$117,500</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">+8.4% YTD</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Next Profit Distribution</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">Nov 15, 2026</span>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">14 Days</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div className="flex gap-2">
          {['All', 'Active', 'Pending', 'Matured'].map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStatus === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-200/60 dark:border-slate-700/60">
              <tr>
                <th className="px-6 py-4">Contract Details</th>
                <th className="px-6 py-4">Counterparty</th>
                <th className="px-6 py-4">Structure</th>
                <th className="px-6 py-4 text-center">Profit Split</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Current Value</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filtered.map(contract => (
                <tr key={contract.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-white">{contract.title}</div>
                        <span className="text-xs font-mono text-slate-400">{contract.id}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                    {contract.counterparty}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {contract.type}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                    {contract.profitRatio}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {contract.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="font-black text-slate-900 dark:text-white">${contract.currentValue.toLocaleString()}</div>
                    <div className="text-xs text-emerald-600 font-bold">+${contract.ytdProfit.toLocaleString()} profit</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    <button 
                      onClick={() => onOpenFinancialPerf(contract)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors inline-flex items-center gap-1"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Analytics</span>
                    </button>
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
