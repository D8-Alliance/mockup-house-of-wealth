import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Printer,
  CreditCard
} from 'lucide-react';
import { RevenueBillingRecord } from '../../revenue/revenueManagementTypes';

interface BillingRecordsTableProps {
  billings: RevenueBillingRecord[];
  currency: 'MYR' | 'USD';
  onSelectBilling: (billing: RevenueBillingRecord) => void;
}

export const BillingRecordsTable: React.FC<BillingRecordsTableProps> = ({
  billings,
  currency,
  onSelectBilling
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const sym = currency === 'MYR' ? 'RM ' : '$';

  const filtered = billings.filter(b => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            Billing Records & Tax Invoicing Registry
          </h3>
          <p className="text-xs text-slate-500">
            Shariah-compliant formal invoices, SST tax schedules, and recurring settlement receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="p-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="Refunded">Refunded</option>
          </select>
          <button
            onClick={() => alert('Simulated Monthly Invoices Batch Exported (ZIP)')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Batch PDF Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3.5">Invoice #</th>
              <th className="p-3.5">Customer & Organization</th>
              <th className="p-3.5">Billing Interval</th>
              <th className="p-3.5">Issue / Due Date</th>
              <th className="p-3.5 text-right">Tax (6%)</th>
              <th className="p-3.5 text-right">Total Amount</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(item => {
              const amount = currency === 'MYR' ? item.totalMYR : item.totalUSD;
              const tax = currency === 'MYR' ? item.taxMYR : Math.round(item.taxMYR / 4.2);
              return (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono">
                    <span className="font-bold text-slate-900 dark:text-white block">{item.invoiceNumber}</span>
                    <span className="text-[10px] text-slate-400">{item.category}</span>
                  </td>

                  <td className="p-3.5 max-w-[200px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{item.customerName}</span>
                    <span className="text-[10px] text-slate-400 truncate block">{item.customerOrg}</span>
                  </td>

                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.billingInterval}
                    </span>
                  </td>

                  <td className="p-3.5 font-mono text-[11px]">
                    <span className="text-slate-700 dark:text-slate-300 block">Issued: {item.issueDate}</span>
                    <span className="text-slate-400 block">Due: {item.dueDate}</span>
                  </td>

                  <td className="p-3.5 text-right font-mono text-slate-500">
                    {sym}{tax.toFixed(2)}
                  </td>

                  <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {sym}{amount.toLocaleString()}
                  </td>

                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'Paid'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                        : item.status === 'Pending'
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                    }`}>
                      {item.status}
                    </span>
                  </td>

                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => onSelectBilling(item)}
                      className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-[11px] hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
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
