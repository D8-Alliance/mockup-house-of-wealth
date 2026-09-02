import React, { useState } from 'react';
import { 
  DollarSign, 
  Download, 
  RotateCcw, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Building2,
  Users
} from 'lucide-react';
import { RevenueTransactionItem } from '../../revenue/revenueManagementTypes';
import { revenueManagementService } from '../../revenue/revenueManagementService';

interface RevenueTransactionsTableProps {
  transactions: RevenueTransactionItem[];
  userRole: string;
  currency: 'MYR' | 'USD';
  onViewInvoice: (txn: RevenueTransactionItem) => void;
}

export const RevenueTransactionsTable: React.FC<RevenueTransactionsTableProps> = ({
  transactions,
  userRole,
  currency,
  onViewInvoice
}) => {
  const canRefund = userRole === 'Super Admin' || userRole === 'Finance Officer' || userRole === 'Finance';
  const isReadOnly = userRole === 'Auditor';

  const rate = currency === 'MYR' ? 4.2 : 1;
  const sym = currency === 'MYR' ? 'RM ' : '$';

  const handleRefund = (txnId: string) => {
    if (window.confirm(`Issue formal simulated refund for Transaction ${txnId}?`)) {
      revenueManagementService.issueRefund(txnId);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'Membership':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'AI Credits':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'PDP Subscription':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      case 'Featured Listing':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'Marketplace Advertising':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'Premium Report':
        return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Revenue Invoicing & Transaction Ledger
          </h3>
          <p className="text-xs text-slate-500">
            Real-time financial audit trail across D-8 clearing nodes and payment gateways.
          </p>
        </div>

        <button
          onClick={() => alert('Simulated Financial Ledger CSV Exported')}
          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" /> Export Ledger CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3.5">Txn ID / Date</th>
              <th className="p-3.5">Customer & Org</th>
              <th className="p-3.5">Revenue Category</th>
              <th className="p-3.5">Item Description</th>
              <th className="p-3.5 text-right">Gross Amount</th>
              <th className="p-3.5 text-center">Gateway</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.map(txn => {
              const displayAmount = currency === 'MYR' ? txn.amountMYR : txn.amountUSD;
              return (
                <tr key={txn.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono">
                    <span className="font-bold text-slate-900 dark:text-white block">{txn.id}</span>
                    <span className="text-[10px] text-slate-400">{txn.date}</span>
                  </td>

                  <td className="p-3.5 max-w-[200px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{txn.customerName}</span>
                    <span className="text-[10px] text-slate-400 truncate block">{txn.customerOrg} • {txn.country}</span>
                  </td>

                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadge(txn.category)}`}>
                      {txn.category}
                    </span>
                  </td>

                  <td className="p-3.5 max-w-[240px]">
                    <span className="text-slate-700 dark:text-slate-300 font-medium block line-clamp-1">{txn.description}</span>
                    {txn.promotionBadge && txn.promotionBadge !== 'None' && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Badge: {txn.promotionBadge}
                      </span>
                    )}
                  </td>

                  <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {sym}{displayAmount.toLocaleString()}
                    <span className="text-[10px] text-slate-400 font-normal block">Tax: {sym}{Math.round(txn.taxMYR * (currency === 'MYR' ? 1 : 1/4.2))}</span>
                  </td>

                  <td className="p-3.5 text-center">
                    <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[120px]">
                      {txn.paymentGateway}
                    </span>
                  </td>

                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      txn.status === 'Paid'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                        : txn.status === 'Pending'
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                    }`}>
                      {txn.status}
                    </span>
                  </td>

                  <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => onViewInvoice(txn)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] cursor-pointer"
                    >
                      Invoice
                    </button>
                    {canRefund && txn.status === 'Paid' && !isReadOnly && (
                      <button
                        onClick={() => handleRefund(txn.id)}
                        className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 font-bold text-[11px] cursor-pointer border border-rose-500/20"
                        title="Simulate Refund"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
