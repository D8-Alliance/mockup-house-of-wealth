import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, HandCoins, RefreshCw } from 'lucide-react';
import { apiClient, BackendFundingRequest, SettlementQueueOrder } from '../../services/apiClient';
import { formatProjectMoney } from './sponsorMoney';

const SETTLES = ['Super Admin', 'Finance Officer'];

interface FundingReviewQueueProps {
  role: string;
}

/**
 * Money waiting on staff, in their country: investor transfers for Finance to match to the bank, and
 * tranche releases for Finance to approve and the Country Admin to release.
 */
export const FundingReviewQueue: React.FC<FundingReviewQueueProps> = ({ role }) => {
  const [orders, setOrders] = useState<SettlementQueueOrder[]>([]);
  const [tranches, setTranches] = useState<BackendFundingRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [references, setReferences] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<{ id: string; note: string } | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    setError('');
    Promise.all([SETTLES.includes(role) ? apiClient.getSettlementQueue() : Promise.resolve([]), apiClient.getFundingQueue()])
      .then(([nextOrders, nextTranches]) => { setOrders(nextOrders); setTranches(nextTranches); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'The queue could not be loaded.'))
      .finally(() => setLoaded(true));
  }, [role]);
  useEffect(load, [load]);

  const act = async (id: string, run: () => Promise<unknown>) => {
    setBusy(id);
    setError('');
    try {
      await run();
      setRejecting(null);
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not go through.');
    } finally {
      setBusy('');
    }
  };

  if (!loaded) return null;
  const count = orders.length + tranches.length;

  return (
    <section id="funding-queue" className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 text-xs">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white"><HandCoins className="w-4 h-4 text-emerald-600" />Investor payments and tranche releases ({count})</h3>
        <button type="button" onClick={load} className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>
      {error && <p className="text-rose-600 font-bold">{error}</p>}
      {count === 0 && !error && <p className="text-slate-500">Nothing waiting.</p>}

      {orders.map((order) => (
        <div key={order.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span><Banknote className="inline w-3.5 h-3.5 mr-1 text-slate-500" /><strong>{order.pool.project.projectName}</strong> · {order.investorName ?? 'Investor'} · {formatProjectMoney(Number(order.amount), order.currency)}</span>
            <span className="font-bold text-blue-700 dark:text-blue-300">Payment to confirm</span>
          </div>
          <p className="text-slate-500">Order {order.orderNumber} · {order.pool.poolName} · placed {order.createdAt.slice(0, 10)}. Confirm only once the transfer is in the pool's bank account.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={references[order.id] ?? ''} onChange={(event) => setReferences({ ...references, [order.id]: event.target.value })} placeholder="Bank reference of the transfer" className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2" />
            <button type="button" disabled={busy === order.id || (references[order.id] ?? '').trim().length < 4} onClick={() => void act(order.id, () => apiClient.settleInvestmentOrder(order.id, references[order.id].trim()))} className="rounded-lg bg-emerald-600 px-3 py-2 font-black text-white disabled:opacity-50 cursor-pointer">{busy === order.id ? 'Saving…' : 'Confirm payment received'}</button>
          </div>
        </div>
      ))}

      {tranches.map((item) => (
        <div key={item.fundingRequestId} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span><HandCoins className="inline w-3.5 h-3.5 mr-1 text-slate-500" /><strong>{item.project?.projectName}</strong> · {item.milestone?.title ?? item.purpose} · {formatProjectMoney(Number(item.requestedAmount), item.currency)}</span>
            <span className="font-bold text-blue-700 dark:text-blue-300">{item.status === 'PENDING' ? 'Release to approve' : 'Approved: release the funds'}</span>
          </div>
          <p className="text-slate-500">Asked {item.requestedAt.slice(0, 10)}{item.milestone?.targetDate ? ` · tranche target ${item.milestone.targetDate.slice(0, 10)}` : ''}. Released only while the sponsor capital is deposited and the required takaful is in force.</p>
          {rejecting?.id === item.fundingRequestId ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={rejecting.note} onChange={(event) => setRejecting({ id: item.fundingRequestId, note: event.target.value })} placeholder="Why, so the project can fix it" className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2" />
              <button type="button" disabled={busy === item.fundingRequestId || rejecting.note.trim().length < 5} onClick={() => void act(item.fundingRequestId, () => apiClient.rejectFundingRequest(item.fundingRequestId, rejecting.note.trim()))} className="rounded-lg bg-rose-600 px-3 py-2 font-black text-white disabled:opacity-50 cursor-pointer">Reject release</button>
              <button type="button" onClick={() => setRejecting(null)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 font-bold cursor-pointer">Cancel</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {item.status === 'PENDING' && <button type="button" disabled={busy === item.fundingRequestId} onClick={() => void act(item.fundingRequestId, () => apiClient.approveFundingRequest(item.fundingRequestId))} className="rounded-lg bg-emerald-600 px-3 py-2 font-black text-white disabled:opacity-50 cursor-pointer">Approve release</button>}
              {item.status === 'APPROVED' && <button type="button" disabled={busy === item.fundingRequestId} onClick={() => void act(item.fundingRequestId, () => apiClient.disburseFundingRequest(item.fundingRequestId))} className="rounded-lg bg-emerald-600 px-3 py-2 font-black text-white disabled:opacity-50 cursor-pointer">Release funds</button>}
              <button type="button" onClick={() => setRejecting({ id: item.fundingRequestId, note: '' })} className="rounded-lg border border-rose-300 text-rose-700 px-3 py-2 font-bold cursor-pointer">Reject…</button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
};
