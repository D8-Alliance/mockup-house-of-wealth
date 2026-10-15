import React, { useEffect, useState } from 'react';
import { Download, Receipt, RefreshCw } from 'lucide-react';
import { apiClient, apiErrorMessage, BackendTransaction } from '../../services/apiClient';

const statusStyles: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  Paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  INITIATED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  FAILED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  CANCELLED: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  REFUNDED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
};

export const BillingTransactionsView: React.FC = () => {
  const [transactions, setTransactions] = useState<BackendTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [checkingId, setCheckingId] = useState('');
  const [error, setError] = useState('');
  const refresh = () => { setLoading(true); apiClient.getMembershipTransactions().then(setTransactions).finally(() => setLoading(false)); };
  useEffect(refresh, []);
  // Re-checks the bill with ToyyibPay; settles it if it has been paid since the last callback.
  const checkPaymentStatus = async (paymentId: string) => {
    setCheckingId(paymentId);
    setError('');
    try {
      await apiClient.verifyMembershipPayment(paymentId);
      refresh();
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Unable to check the payment status.'));
    } finally {
      setCheckingId('');
    }
  };
  // Abandons an unpaid checkout and returns any AI credits held for it.
  const cancelPayment = async (paymentId: string) => {
    if (!window.confirm('Cancel this unpaid ToyyibPay checkout? Any AI credits held for it will be returned.')) return;
    setCheckingId(paymentId);
    setError('');
    try {
      await apiClient.cancelMembershipPayment(paymentId);
      window.dispatchEvent(new Event('ai-credits-changed'));
      refresh();
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Unable to cancel the payment.'));
    } finally {
      setCheckingId('');
    }
  };
  const visible = filter === 'ALL' ? transactions : filter === 'GATEWAY' ? transactions.filter((item) => item.method === 'ToyyibPay') : transactions.filter((item) => item.type === filter);
  return <div className="space-y-5 animate-fadeIn">
    <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><span className="text-[10px] uppercase font-black tracking-wider text-emerald-300">Account Finance</span><h1 className="text-2xl font-black mt-1">Billing & Transactions</h1><p className="text-xs text-slate-300 mt-1">Membership, AI credits, project promotion and ToyyibPay payments in one history.</p></div>
      <button onClick={refresh} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
    </div>
    <div className="flex gap-2 overflow-x-auto">{['ALL', 'GATEWAY', 'MEMBERSHIP', 'AI_CREDIT_TOP_UP', 'AI_CREDIT_USAGE', 'PROJECT_PROMOTION'].map((item) => <button key={item} onClick={() => setFilter(item)} className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${filter === item ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>{item === 'ALL' ? 'All transactions' : item === 'GATEWAY' ? 'ToyyibPay payments' : item.replaceAll('_', ' ')}</button>)}</div>
    {error && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</div>}
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden">{loading ? <div className="p-8 text-center text-sm text-slate-500">Loading transactions...</div> : visible.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No transactions found.</div> : <div className="divide-y divide-slate-100 dark:divide-slate-700">{visible.map((item) => {
      const awaitingGateway = Boolean(item.paymentId) && (item.status === 'PENDING' || item.status === 'INITIATED');
      return <div key={`${item.type}-${item.id}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0"><div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600"><Receipt className="w-4 h-4" /></div><div className="min-w-0">
          <div className="font-bold text-sm text-slate-900 dark:text-white">{item.description}{item.simulated && <span className="ml-2 align-middle px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[9px] font-black" title="Simulated payment: nothing was charged">DEMO</span>}</div>
          <div className="text-[10px] text-slate-500 mt-1">{new Date(item.createdAt).toLocaleString()} • {item.method}</div>
          {item.invoiceNumber && <div className="text-[10px] font-mono text-purple-600 mt-1 break-all">{item.invoiceNumber}</div>}
          {(item.gatewayBillCode || item.gatewayTransactionId) && <div className="text-[10px] font-mono text-slate-500 mt-1 break-all">ToyyibPay bill {item.gatewayBillCode || '-'}{item.gatewayTransactionId ? ` • ref ${item.gatewayTransactionId}` : ''}</div>}
          {item.fpxFeeMYR ? <div className="text-[10px] text-slate-500 mt-1">+ RM {item.fpxFeeMYR.toFixed(2)} FPX fee charged by ToyyibPay</div> : null}
          {item.status === 'FAILED' && item.failureReason && <div className="text-[10px] text-rose-600 mt-1">{item.failureReason}</div>}
        </div></div>
        <div className="flex items-center gap-3"><div className="text-right"><div className="font-black text-sm text-slate-900 dark:text-white">{item.amountMYR ? `RM ${item.amountMYR.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : item.credits ? `${item.credits > 0 ? '+' : ''}${item.credits} Credits` : 'RM 0.00'}</div><span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${statusStyles[item.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>{item.status}</span></div>
          {awaitingGateway && <button onClick={() => void checkPaymentStatus(item.paymentId!)} disabled={checkingId === item.paymentId} className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold disabled:opacity-50">{checkingId === item.paymentId ? 'Checking…' : 'Check status'}</button>}
          {awaitingGateway && <button onClick={() => void cancelPayment(item.paymentId!)} disabled={checkingId === item.paymentId} className="px-2.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-bold disabled:opacity-50">Cancel</button>}
          {item.receiptAvailable && <button onClick={() => void apiClient.downloadTransactionReceipt(item.id)} className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700" title="Download receipt"><Download className="w-4 h-4" /></button>}
        </div>
      </div>;
    })}</div>}</div>
  </div>;
};
