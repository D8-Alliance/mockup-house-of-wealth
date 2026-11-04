import React, { useCallback, useEffect, useState } from 'react';
import { apiClient, apiErrorMessage, RefundQueueOrder } from '../../services/apiClient';

const money = (currency: string, amount: number) => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Investors to pay back because their pool missed its minimum by the closing date. Finance transfers each
 * amount in full to the investor's bank account, then records the bank reference here; the server takes the
 * capital out of the pool in the ledger and tells the investor.
 */
export const RefundQueuePanel: React.FC<{ hideWhenEmpty?: boolean }> = ({ hideWhenEmpty }) => {
  const [orders, setOrders] = useState<RefundQueueOrder[] | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const load = useCallback(() => { apiClient.getRefundQueue().then(setOrders).catch((cause) => { setOrders([]); setError(apiErrorMessage(cause, 'Refunds could not be loaded.')); }); }, []);
  useEffect(load, [load]);

  const refund = async (order: RefundQueueOrder) => {
    setBusy(order.id);
    setError('');
    setDone('');
    try {
      await apiClient.refundInvestmentOrder(order.id, refs[order.id].trim());
      setDone(`${order.orderNumber}: refund recorded and the investor told.`);
      load();
    } catch (cause) { setError(apiErrorMessage(cause, 'The refund was not recorded.')); } finally { setBusy(''); }
  };

  if (hideWhenEmpty && orders?.length === 0 && !error && !done) return null;
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-3 text-xs">
      <div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">Refunds</h3>
        <p className="text-slate-500">These pools did not reach their minimum by the closing date, so the money goes back in full. Transfer each amount to the investor's bank account, then record the bank reference.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {done && <p role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 font-bold text-emerald-700 dark:text-emerald-300">{done}</p>}
      {!orders && !error && <p className="text-slate-500">Loading...</p>}
      {orders?.length === 0 && <p className="text-slate-500">No refund to make.</p>}
      {orders && orders.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="p-2.5">Investor</th><th className="p-2.5">Pool</th><th className="p-2.5 text-right">Amount</th><th className="p-2.5">Paid in with</th><th className="p-2.5">Refund</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100 dark:border-slate-700 align-top">
                  <td className="p-2.5"><p className="font-bold">{order.investorName ?? order.investorUserId}</p><p className="text-[11px] text-slate-500">{order.orderNumber}</p></td>
                  <td className="p-2.5"><p className="font-bold">{order.pool.poolName}</p><p className="text-[11px] text-slate-500">{order.pool.project.projectName}{order.pool.minimumRaise ? ` · minimum ${money(order.currency, Number(order.pool.minimumRaise))}` : ''}</p></td>
                  <td className="p-2.5 text-right font-black">{money(order.currency, Number(order.amount))}</td>
                  <td className="p-2.5 text-[11px] text-slate-500">{order.paymentReference ?? '-'}</td>
                  <td className="p-2.5 min-w-[240px]">
                    <div className="flex gap-1.5">
                      <input value={refs[order.id] ?? ''} onChange={(event) => setRefs((current) => ({ ...current, [order.id]: event.target.value }))} placeholder="Bank reference of the refund" className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2" />
                      <button type="button" disabled={busy === order.id || (refs[order.id] ?? '').trim().length < 4} onClick={() => void refund(order)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 font-bold text-white cursor-pointer disabled:opacity-50">{busy === order.id ? 'Saving…' : 'Refunded'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
