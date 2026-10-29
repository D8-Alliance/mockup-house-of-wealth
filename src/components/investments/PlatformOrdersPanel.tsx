import React from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { apiClient, BackendInvestmentOrder } from '../../services/apiClient';

const money = (value: number, currency: string) => `${currency === 'MYR' ? 'RM' : currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  SETTLED: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  CANCELLED: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

const STATUS_LABEL: Record<string, string> = { PENDING: 'Waiting for Finance', SETTLED: 'Settled', CANCELLED: 'Cancelled' };

/**
 * Investor orders in the viewer's scope, as the database has them: every country for Super Admin,
 * their own organisation or country for the other staff roles. Staff do not hold a portfolio of their own.
 */
export const PlatformOrdersPanel: React.FC = () => {
  const [orders, setOrders] = React.useState<BackendInvestmentOrder[] | null>(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(() => {
    setError('');
    void apiClient.getInvestmentOrders()
      .then(setOrders)
      .catch((cause) => { setOrders([]); setError(cause instanceof Error ? cause.message : 'The orders could not be loaded.'); });
  }, []);
  React.useEffect(load, [load]);

  // Totals per currency and status; amounts in different currencies are never added together.
  const totals = React.useMemo(() => {
    const byCurrency = new Map<string, { settled: number; pending: number }>();
    for (const order of orders ?? []) {
      const row = byCurrency.get(order.currency) ?? { settled: 0, pending: 0 };
      if (order.status === 'SETTLED') row.settled += Number(order.amount);
      if (order.status === 'PENDING') row.pending += Number(order.amount);
      byCurrency.set(order.currency, row);
    }
    return [...byCurrency.entries()];
  }, [orders]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-2 border border-indigo-500/20">
            Investor Orders
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Investments Across Pools</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Every investor order in your scope, and whether Finance has matched its payment to the bank.</p>
        </div>
        <button type="button" onClick={load} className="self-start md:self-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Orders</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{orders ? orders.length : 'Loading...'}</p>
          <p className="text-[11px] text-slate-500 mt-1">{orders ? `${orders.filter(order => order.status === 'PENDING').length} waiting for Finance` : ''}</p>
        </div>
        {totals.length === 0 && orders && (
          <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm sm:col-span-1 lg:col-span-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settled</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">None yet</p>
          </div>
        )}
        {totals.map(([currency, row]) => (
          <div key={currency} className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settled ({currency})</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{money(row.settled, currency)}</p>
            <p className="text-[11px] text-slate-500 mt-1">{money(row.pending, currency)} waiting for Finance</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          <h3 className="font-black text-sm text-slate-900 dark:text-white">Latest orders</h3>
          <span className="text-[11px] text-slate-400">(up to 100)</span>
        </div>
        {error && <p className="px-5 py-4 text-xs text-rose-600">{error}</p>}
        {!orders && <p className="px-5 py-4 text-xs text-slate-500">Loading...</p>}
        {orders && orders.length === 0 && !error && <p className="px-5 py-6 text-xs text-slate-500">No investor has placed an order yet.</p>}
        {orders && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400">
                <tr className="text-left">
                  <th className="px-5 py-3 font-black">Order</th>
                  <th className="px-5 py-3 font-black">Pool</th>
                  <th className="px-5 py-3 font-black text-right">Amount</th>
                  <th className="px-5 py-3 font-black">Placed</th>
                  <th className="px-5 py-3 font-black">Payment reference</th>
                  <th className="px-5 py-3 font-black">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className="px-5 py-3 font-mono text-slate-500 whitespace-nowrap">{order.orderNumber}</td>
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{order.pool?.poolName ?? order.poolId}</td>
                    <td className="px-5 py-3 text-right font-mono whitespace-nowrap">{money(Number(order.amount), order.currency)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 font-mono">{order.paymentReference ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-md font-extrabold border whitespace-nowrap ${STATUS_STYLE[order.status] ?? STATUS_STYLE.CANCELLED}`}>{STATUS_LABEL[order.status] ?? order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
