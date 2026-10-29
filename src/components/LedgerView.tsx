import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  Copy,
  PieChart,
  RefreshCw,
  Layers,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { apiClient, BackendLedgerTransaction, HashChainStatus } from '../services/apiClient';
import { useRBAC } from '../rbac/RBACContext';
import { formatProjectMoney } from './sponsor/sponsorMoney';

interface LedgerViewProps {
  lang: LanguageCode;
}

/** Roles that may recompute the hash chains (GET /admin/audit/integrity). */
const INTEGRITY_ROLES = ['Super Admin', 'Auditor'];

const TYPE_LABELS: Record<string, string> = {
  INVESTMENT_CONTRIBUTION: 'Investment',
  FUNDING_DISBURSEMENT: 'Tranche release',
  FUNDING: 'Funding',
  DISTRIBUTION: 'Profit distribution',
  PAYMENT_RECEIPT: 'Payment received',
  REFUND: 'Refund',
  ZAKAT_PAYMENT: 'Zakat',
  INTERNAL_TRANSFER: 'Transfer',
  REVERSAL: 'Reversal',
};

const TYPE_TONES: Record<string, string> = {
  INVESTMENT_CONTRIBUTION: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  FUNDING_DISBURSEMENT: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  DISTRIBUTION: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  REFUND: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  REVERSAL: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const typeLabel = (type: string) => TYPE_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
/** A balanced transaction's size: the sum of its debit lines. */
const amountOf = (tx: BackendLedgerTransaction) => tx.entries.filter(e => e.direction === 'DEBIT').reduce((sum, e) => sum + Number(e.amount), 0);

/**
 * The platform's double-entry ledger as the server records it: every movement of money is one
 * transaction whose debit and credit lines balance. Read only; postings come from investments,
 * tranche releases, distributions, refunds and zakat.
 */
export const LedgerView: React.FC<LedgerViewProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const { currentRole } = useRBAC();
  const [transactions, setTransactions] = useState<BackendLedgerTransaction[] | null>(null);
  const [error, setError] = useState('');
  const [chain, setChain] = useState<HashChainStatus | null>(null);
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () => {
    setError('');
    apiClient.getFinancialLedger()
      .then(setTransactions)
      .catch(cause => { setTransactions([]); setError(cause instanceof Error ? cause.message : 'The ledger could not be loaded.'); });
    if (INTEGRITY_ROLES.includes(currentRole)) {
      apiClient.getHashChainIntegrity()
        .then(report => setChain(report.chains.find(item => item.chain === 'LEDGER') ?? null))
        .catch(() => setChain(null));
    }
  };
  useEffect(load, [currentRole]);

  const all = transactions ?? [];
  const types = useMemo(() => [...new Set(all.map(tx => tx.transactionType))], [all]);
  const q = search.toLowerCase();
  const filtered = all.filter(tx =>
    (filterType === 'All' || tx.transactionType === filterType) &&
    [tx.transactionNumber, tx.description, tx.referenceId].some(v => (v || '').toLowerCase().includes(q))
  );

  // Totals per currency would need a split; the platform posts in the country currency, so take the first.
  const currency = all[0]?.currency ?? 'MYR';
  const volume = all.filter(tx => tx.currency === currency && tx.status === 'POSTED').reduce((sum, tx) => sum + amountOf(tx), 0);

  const handleExport = () => {
    const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = filtered.flatMap(tx => tx.entries.map(entry => [
      tx.transactionNumber,
      new Date(tx.createdAt).toISOString(),
      tx.transactionType,
      tx.description,
      `${tx.referenceType}:${tx.referenceId}`,
      entry.account?.accountCode ?? entry.accountId,
      entry.direction,
      Number(entry.amount),
      entry.currency,
      tx.status,
    ].map(csvCell).join(',')));
    const csv = [
      ['Transaction', 'Posted at', 'Type', 'Description', 'Reference', 'Account', 'Direction', 'Amount', 'Currency', 'Status'].map(csvCell).join(','),
      ...rows,
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
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
            Double-entry ledger of investments, tranche releases, profit distributions, refunds and zakat, sealed in a hash chain.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button onClick={load} title="Refresh" className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            title={filtered.length === 0 ? 'There are no ledger records to export' : `Export ${filtered.length} filtered transactions (one row per debit or credit line) as CSV`}
            className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-600 dark:text-emerald-400 font-bold px-4 py-2.5 rounded-xl border border-emerald-500/30 transition-all cursor-pointer text-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Integrity of the ledger hash chain, for the roles allowed to recompute it. */}
      {chain && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${chain.valid ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'}`}>
          {chain.valid ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
          <div>
            <p className="font-black">{chain.valid ? 'Ledger hash chain intact' : 'Ledger hash chain broken'}</p>
            <p>
              {chain.sealedCount.toLocaleString()} transactions sealed{chain.unsealedCount ? `, ${chain.unsealedCount} waiting for the next seal` : ''}.
              {chain.firstBreak && ` First break at record ${chain.firstBreak.sequence}: ${chain.firstBreak.reason}`}
            </p>
          </div>
        </div>
      )}

      {/* Summary: computed from the server's records. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {([
          [Layers, 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400', 'Posted volume', formatProjectMoney(volume, currency)],
          [PieChart, 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400', 'Ledger transactions', `${all.length.toLocaleString()} Tx`],
          [CheckCircle2, 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400', 'Last posting', all[0] ? new Date(all[0].createdAt).toLocaleString() : '—'],
        ] as const).map(([Icon, tone, label, value]) => (
          <div key={label} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${tone}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {['All', ...types].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === type
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {type === 'All' ? 'All' : typeLabel(type)}
            </button>
          ))}
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by transaction number, description or reference..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {error && <p className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-200/60 dark:border-slate-700/60">
              <tr>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Transaction</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Lines</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {transactions === null && (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-xs text-slate-500">Loading…</td></tr>
              )}
              {transactions !== null && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-xs text-slate-500">No ledger transactions{all.length ? ' match this filter' : ' yet'}.</td></tr>
              )}
              {filtered.map(tx => {
                const created = new Date(tx.createdAt);
                const open = openId === tx.id;
                return (
                  <React.Fragment key={tx.id}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{created.toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">{created.toLocaleTimeString()}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          <span>{tx.transactionNumber}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(tx.transactionNumber)}
                            title="Copy transaction number"
                            className="hover:text-emerald-700 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${TYPE_TONES[tx.transactionType] ?? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                          {typeLabel(tx.transactionType)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-800 dark:text-slate-200">
                        {tx.description}
                        <span className="block text-[10px] text-slate-400 font-mono">{tx.referenceType} · {tx.referenceId}</span>
                      </td>

                      <td className="px-6 py-4 text-right font-black whitespace-nowrap text-slate-900 dark:text-white">
                        {formatProjectMoney(amountOf(tx), tx.currency)}
                      </td>

                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <button onClick={() => setOpenId(open ? null : tx.id)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
                          {tx.entries.length} {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {tx.status === 'POSTED' ? (
                          <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-500 inline-block" title="Posted">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-500">{tx.status}</span>
                        )}
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                        <td colSpan={7} className="px-6 py-3">
                          <table className="w-full text-xs">
                            <tbody>
                              {tx.entries.map(entry => (
                                <tr key={entry.id}>
                                  <td className="py-1 font-mono text-slate-600 dark:text-slate-300">{entry.account?.accountCode ?? entry.accountId}</td>
                                  <td className="py-1 text-slate-400">{entry.description ?? ''}</td>
                                  <td className={`py-1 text-right font-bold ${entry.direction === 'DEBIT' ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {entry.direction === 'DEBIT' ? 'Dr' : 'Cr'} {formatProjectMoney(Number(entry.amount), entry.currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
