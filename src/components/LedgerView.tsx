import React, { useState } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  Copy, 
  ExternalLink,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { LedgerTransaction, LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface LedgerViewProps {
  transactions: LedgerTransaction[];
  lang: LanguageCode;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  transactions,
  lang
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [filterType, setFilterType] = useState('All');
  const [searchHash, setSearchHash] = useState('');

  const filtered = transactions.filter(tx => {
    const matchesSearch = tx.hash.toLowerCase().includes(searchHash.toLowerCase()) ||
                          tx.description.toLowerCase().includes(searchHash.toLowerCase());
    const matchesType = filterType === 'All' || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleExport = () => {
    const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = filtered.map(tx => [
      tx.id,
      tx.date,
      tx.time,
      tx.hash,
      tx.type,
      tx.description,
      tx.isPositive ? tx.amount : -tx.amount,
      tx.balanceAfter,
      tx.status
    ].map(csvCell).join(','));
    const csv = [
      ['ID', 'Date', 'Time', 'Transaction Hash', 'Type', 'Description', 'Amount', 'Balance After', 'Status'].map(csvCell).join(','),
      ...rows
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.ledger}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Append-only, hash-chained ledger of disbursals, profit distributions, and Zakat deductions.
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          title={filtered.length === 0 ? 'There are no ledger records to export' : `Export ${filtered.length} filtered ledger records as CSV`}
          className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-600 dark:text-emerald-400 font-bold px-4 py-2.5 rounded-xl border border-emerald-500/30 transition-all cursor-pointer shrink-0 text-xs"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Wallet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Current E-Wallet Balance</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">$45,200.00</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Auto-Compounded Yields</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">$3,850.00</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Verified Ledger Records</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">1,204 Tx</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {['All', 'Inflow', 'Outflow', 'Profit Share', 'Reinvestment'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === type
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchHash}
            onChange={e => setSearchHash(e.target.value)}
            placeholder="Search by transaction hash or description..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-200/60 dark:border-slate-700/60">
              <tr>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Transaction Hash</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Balance After</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-slate-900 dark:text-white">{tx.date}</div>
                    <div className="text-[10px] text-slate-400">{tx.time}</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      <span>{tx.hash}</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(tx.hash)} 
                        title="Copy Hash" 
                        className="hover:text-emerald-700 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      tx.type === 'Inflow' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : tx.type === 'Outflow'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : tx.type === 'Profit Share'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      {tx.type}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-xs font-medium text-slate-800 dark:text-slate-200">
                    {tx.description}
                  </td>

                  <td className={`px-6 py-4 text-right font-black whitespace-nowrap ${
                    tx.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                  }`}>
                    {tx.isPositive ? '+' : '-'}${tx.amount.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-right font-mono text-xs text-slate-400 whitespace-nowrap">
                    ${tx.balanceAfter.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-500 inline-block" title="Completed">
                      <CheckCircle2 className="w-4 h-4" />
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
