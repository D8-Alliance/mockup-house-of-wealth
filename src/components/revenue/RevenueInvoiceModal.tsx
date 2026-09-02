import React from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Building2 } from 'lucide-react';
import { RevenueTransactionItem, RevenueBillingRecord } from '../../revenue/revenueManagementTypes';

interface RevenueInvoiceModalProps {
  item: RevenueTransactionItem | RevenueBillingRecord | null;
  onClose: () => void;
}

export const RevenueInvoiceModal: React.FC<RevenueInvoiceModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const isTxn = 'paymentGateway' in item;
  const invNumber = isTxn ? (item.invoiceId || `HOW-INV-${item.id}`) : item.invoiceNumber;
  const customerName = item.customerName;
  const customerOrg = item.customerOrg;
  const date = isTxn ? item.date : item.issueDate;
  const totalMYR = isTxn ? item.amountMYR : item.totalMYR;
  const totalUSD = isTxn ? item.amountUSD : item.totalUSD;
  const taxMYR = isTxn ? item.taxMYR : item.taxMYR;
  const subtotalMYR = isTxn ? item.netMYR : item.subtotalMYR;
  const status = item.status;
  const description = isTxn ? item.description : item.lineItems?.[0]?.description || item.category;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Header & Controls */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
              SIMULATED REVENUE DATA – MVP
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Simulated Official Tax Invoice PDF Generated')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="space-y-6 text-xs">
          
          {/* Org & Invoice Info */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight">
                  HOUSE OF WEALTH (D-8)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Shariah-Compliant Multi-Currency Wealth & Syndication Node</p>
              <p className="text-[10px] text-slate-400">Kuala Lumpur Hub • Jakarta • Istanbul • Cairo</p>
              <p className="text-[10px] text-slate-400">Tax ID: MY-SST-881920-HOW</p>
            </div>

            <div className="text-right font-mono">
              <span className="text-sm font-black text-slate-900 dark:text-white block">{invNumber}</span>
              <span className="text-[11px] text-slate-500 block">Date: {date}</span>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {status}
              </span>
            </div>
          </div>

          {/* Bill To */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Billed To</span>
            <div className="font-bold text-sm text-slate-900 dark:text-white">{customerName}</div>
            <div className="text-slate-600 dark:text-slate-400">{customerOrg}</div>
            <div className="text-slate-400 text-[11px]">D-8 Country Node: {item.country}</div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-400">
                <tr>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Rate (MYR)</th>
                  <th className="p-3 text-right">Amount (MYR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{description}</td>
                  <td className="p-3 text-right font-mono">1</td>
                  <td className="p-3 text-right font-mono">RM {subtotalMYR.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">RM {subtotalMYR.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal (Net):</span>
                <span>RM {subtotalMYR.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Sales & Services Tax (6%):</span>
                <span>RM {taxMYR.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>Total Invoiced:</span>
                <span>RM {totalMYR.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>USD Equivalent:</span>
                <span>${totalUSD.toLocaleString()} USD</span>
              </div>
            </div>
          </div>

          {/* Shariah Note */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Structured in accordance with AAOIFI Shariah Financial Reporting Guidelines. Pure fee-for-service / Ujrah contract structure.</span>
          </div>

        </div>
      </div>
    </div>
  );
};
