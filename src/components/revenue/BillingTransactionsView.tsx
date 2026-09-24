import React, { useEffect, useState } from 'react';
import { Download, Receipt, RefreshCw } from 'lucide-react';
import { apiClient, BackendTransaction } from '../../services/apiClient';

export const BillingTransactionsView: React.FC = () => {
  const [transactions, setTransactions] = useState<BackendTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const refresh = () => { setLoading(true); apiClient.getMembershipTransactions().then(setTransactions).finally(() => setLoading(false)); };
  useEffect(refresh, []);
  const visible = filter === 'ALL' ? transactions : transactions.filter((item) => item.type === filter);
  return <div className="space-y-5 animate-fadeIn">
    <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><span className="text-[10px] uppercase font-black tracking-wider text-emerald-300">Account Finance</span><h1 className="text-2xl font-black mt-1">Billing & Transactions</h1><p className="text-xs text-slate-300 mt-1">Membership, AI credits and project promotion payments in one history.</p></div>
      <button onClick={refresh} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
    </div>
    <div className="flex gap-2 overflow-x-auto">{['ALL', 'MEMBERSHIP', 'AI_CREDIT_TOP_UP', 'AI_CREDIT_USAGE', 'PROJECT_PROMOTION'].map((item) => <button key={item} onClick={() => setFilter(item)} className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${filter === item ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>{item === 'ALL' ? 'All transactions' : item.replaceAll('_', ' ')}</button>)}</div>
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden">{loading ? <div className="p-8 text-center text-sm text-slate-500">Loading transactions...</div> : visible.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No transactions found.</div> : <div className="divide-y divide-slate-100 dark:divide-slate-700">{visible.map((item) => <div key={`${item.type}-${item.id}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-start gap-3"><div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600"><Receipt className="w-4 h-4" /></div><div><div className="font-bold text-sm text-slate-900 dark:text-white">{item.description}</div><div className="text-[10px] text-slate-500 mt-1">{new Date(item.createdAt).toLocaleString()} • {item.method} • {item.status}</div>{item.invoiceNumber && <div className="text-[10px] font-mono text-purple-600 mt-1">{item.invoiceNumber}</div>}</div></div><div className="flex items-center gap-3"><div className="text-right"><div className="font-black text-sm text-slate-900 dark:text-white">{item.amountMYR ? `RM ${item.amountMYR.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : item.credits ? `${item.credits > 0 ? '+' : ''}${item.credits} Credits` : 'RM 0.00'}</div><div className="text-[10px] text-slate-500">{item.status}</div></div>{item.receiptAvailable && <button onClick={() => void apiClient.downloadTransactionReceipt(item.id)} className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700" title="Download receipt"><Download className="w-4 h-4" /></button>}</div></div>)}</div>}</div>
  </div>;
};
