import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { apiClient, BackendInvestmentOrder, InvestorPosition } from '../../services/apiClient';
import { formatProjectMoney } from '../../components/sponsor/sponsorMoney';

/** Profit is shown to the sen; capital in whole ringgit as elsewhere. */
const money2 = (amount: number, currency: string) => { try { return new Intl.NumberFormat('en-MY', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); } catch { return `${currency} ${amount.toFixed(2)}`; } };

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Waiting for transfer to be confirmed', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  SETTLED: { label: 'Confirmed', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-500/10 text-slate-500' },
};

/**
 * The investor's holdings, as the server computes them from confirmed orders and paid profit, and their orders.
 * An order still waiting for Finance can be cancelled here. Amounts in different currencies are never added up.
 */
export const MobilePortfolio: React.FC = () => {
  const [positions, setPositions] = useState<InvestorPosition[] | null>(null);
  const [orders, setOrders] = useState<BackendInvestmentOrder[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    setError('');
    Promise.all([apiClient.getInvestmentPositions(), apiClient.getInvestmentOrders()])
      .then(([held, mine]) => { setPositions(held); setOrders(mine); })
      .catch((cause) => { setPositions((current) => current ?? []); setOrders((current) => current ?? []); setError(cause instanceof Error ? cause.message : 'Your portfolio could not be loaded.'); });
  }, []);
  useEffect(load, [load]);

  const cancel = async (order: BackendInvestmentOrder) => {
    if (!window.confirm(`Cancel order ${order.orderNumber}? Do this only if you have not transferred the money.`)) return;
    setBusy(order.id);
    setError('');
    try {
      await apiClient.cancelInvestmentOrder(order.id, 'Cancelled by the investor before payment was confirmed');
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The order was not cancelled.');
    } finally {
      setBusy('');
    }
  };

  // One total per currency.
  const totals = new Map<string, { capital: number; pending: number; profit: number }>();
  for (const position of positions ?? []) {
    const row = totals.get(position.currency) ?? { capital: 0, pending: 0, profit: 0 };
    row.capital += position.capital;
    row.pending += position.pendingAmount;
    row.profit += position.profitEarned;
    totals.set(position.currency, row);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black">Portfolio</h1>
        <button type="button" onClick={load} aria-label="Refresh" className="p-2 rounded-xl border border-slate-200 dark:border-slate-700"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!positions && <p className="text-sm text-slate-500">Loading...</p>}

      {[...totals.entries()].map(([currency, row]) => (
        <section key={currency} className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-5 shadow">
          <p className="text-xs text-emerald-100/80">Invested ({currency})</p>
          <p className="text-2xl font-black">{formatProjectMoney(row.capital, currency)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div><span className="block text-emerald-100/70">Profit earned</span><span className="font-black text-amber-200">{money2(row.profit, currency)}</span></div>
            <div><span className="block text-emerald-100/70">Waiting for Finance</span><span className="font-black">{formatProjectMoney(row.pending, currency)}</span></div>
          </div>
        </section>
      ))}

      {positions && positions.length === 0 && !error && (
        <p className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500">No investment yet. Choose a pool under Pools to start.</p>
      )}

      {positions?.map(position => (
        <article key={position.poolId} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div>
            <h2 className="text-sm font-black flex items-center gap-1.5"><Wallet className="w-4 h-4 text-emerald-600 shrink-0" />{position.poolName}</h2>
            <p className="text-xs text-slate-500">{position.projectName} · {position.contract}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">Invested</span><span className="font-bold">{formatProjectMoney(position.capital, position.currency)}</span></div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">Share of pool</span><span className="font-bold">{position.poolSharePct.toFixed(2)}%</span></div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">Profit earned</span><span className="font-bold">{money2(position.profitEarned, position.currency)}</span></div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">Return so far</span><span className="font-bold">{position.returnPct.toFixed(2)}%</span></div>
          </div>
          {position.pendingAmount > 0 && <p className="text-[11px] text-amber-700 dark:text-amber-300">{formatProjectMoney(position.pendingAmount, position.currency)} more waiting for Finance to confirm the transfer.</p>}
        </article>
      ))}

      <h2 className="pt-2 text-sm font-black">My orders{orders ? ` (${orders.length})` : ''}</h2>
      {orders && orders.length === 0 && <p className="text-xs text-slate-500">No orders yet.</p>}
      {orders?.map(order => {
        const status = ORDER_STATUS[order.status] ?? { label: order.status, className: 'bg-slate-500/10 text-slate-500' };
        return (
          <article key={order.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-black text-sm truncate">{order.pool?.poolName ?? order.poolId}</p>
                <p className="text-slate-500 font-mono">{order.orderNumber}</p>
              </div>
              <span className="text-sm font-black whitespace-nowrap">{formatProjectMoney(Number(order.amount), order.currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={`px-2 py-1 rounded-lg font-bold ${status.className}`}>{status.label}</span>
              <span className="text-slate-500">{new Date(order.createdAt).toLocaleDateString('en-MY')}</span>
            </div>
            {order.status === 'PENDING' && (
              <button type="button" disabled={busy === order.id} onClick={() => void cancel(order)} className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 font-bold disabled:opacity-50">
                {busy === order.id ? 'Cancelling...' : 'Cancel order'}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
};
