import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, FileText, HandCoins, Landmark, RefreshCw, Wallet } from 'lucide-react';
import { apiClient, BackendInvestmentOrder, InvestorDistribution, InvestorPosition } from '../../services/apiClient';
import { formatProjectMoney } from '../../components/sponsor/sponsorMoney';
import { PaymentInstructionsCard } from '../PaymentInstructionsCard';
import { useT } from '../i18n';

/** Profit is shown to the sen; capital in whole ringgit as elsewhere. */
const money2 = (amount: number, currency: string, locale = 'en-MY') => { try { return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); } catch { return `${currency} ${amount.toFixed(2)}`; } };

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Waiting for transfer to be confirmed', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  SETTLED: { label: 'Confirmed', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-500/10 text-slate-500' },
};

const PROFIT_SHOWN = 5;

/**
 * The investor's holdings, as the server computes them from confirmed orders and paid profit, their profit per
 * distribution period, and their orders. An order still waiting for Finance shows how to pay and can be cancelled.
 * Amounts in different currencies are never added up.
 */
export const MobilePortfolio: React.FC<{ onOpenStatements: () => void; onOpenZakat: () => void }> = ({ onOpenStatements, onOpenZakat }) => {
  const { t, locale } = useT();
  const [positions, setPositions] = useState<InvestorPosition[] | null>(null);
  const [orders, setOrders] = useState<BackendInvestmentOrder[] | null>(null);
  const [profits, setProfits] = useState<InvestorDistribution[] | null>(null);
  const [allProfits, setAllProfits] = useState(false);
  const [payFor, setPayFor] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    setError('');
    Promise.all([apiClient.getInvestmentPositions(), apiClient.getInvestmentOrders()])
      .then(([held, mine]) => { setPositions(held); setOrders(mine); })
      .catch((cause) => { setPositions((current) => current ?? []); setOrders((current) => current ?? []); setError(cause instanceof Error ? cause.message : t('Your portfolio could not be loaded.')); });
    apiClient.getMyDistributions().then(setProfits).catch(() => setProfits([]));
  }, [t]);
  useEffect(load, [load]);

  const cancel = async (order: BackendInvestmentOrder) => {
    if (!window.confirm(t('Cancel order {order}? Do this only if you have not transferred the money.', { order: order.orderNumber }))) return;
    setBusy(order.id);
    setError('');
    try {
      await apiClient.cancelInvestmentOrder(order.id, 'Cancelled by the investor before payment was confirmed');
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('The order was not cancelled.'));
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
  const date = (value: string) => new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black">{t('Portfolio')}</h1>
        <button type="button" onClick={load} aria-label={t('Refresh')} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!positions && <p className="text-sm text-slate-500">{t('Loading...')}</p>}

      {[...totals.entries()].map(([currency, row]) => (
        <section key={currency} className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-5 shadow">
          <p className="text-xs text-emerald-100/80">{t('Invested ({currency})', { currency })}</p>
          <p className="text-2xl font-black">{formatProjectMoney(row.capital, currency)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div><span className="block text-emerald-100/70">{t('Profit earned')}</span><span className="font-black text-amber-200">{money2(row.profit, currency, locale)}</span></div>
            <div><span className="block text-emerald-100/70">{t('Waiting for Finance')}</span><span className="font-black">{formatProjectMoney(row.pending, currency)}</span></div>
          </div>
        </section>
      ))}

      {positions && positions.length === 0 && !error && (
        <p className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500">{t('No investment yet. Choose a pool under Pools to start.')}</p>
      )}

      {positions?.map(position => (
        <article key={position.poolId} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div>
            <h2 className="text-sm font-black flex items-center gap-1.5"><Wallet className="w-4 h-4 text-emerald-600 shrink-0" />{position.poolName}</h2>
            <p className="text-xs text-slate-500">{position.projectName} · {position.contract}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">{t('Invested')}</span><span className="font-bold">{formatProjectMoney(position.capital, position.currency)}</span></div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">{t('Share of pool')}</span><span className="font-bold">{position.poolSharePct.toFixed(2)}%</span></div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">{t('Profit earned')}</span><span className="font-bold">{money2(position.profitEarned, position.currency, locale)}</span></div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">{t('Return so far')}</span><span className="font-bold">{position.returnPct.toFixed(2)}%</span></div>
          </div>
          {position.pendingAmount > 0 && <p className="text-[11px] text-amber-700 dark:text-amber-300">{t('{amount} more waiting for Finance to confirm the transfer.', { amount: formatProjectMoney(position.pendingAmount, position.currency) })}</p>}
        </article>
      ))}

      <h2 className="pt-2 text-sm font-black flex items-center gap-1.5"><HandCoins className="w-4 h-4 text-amber-600" />{t('Profit received')}</h2>
      {!profits && <p className="text-xs text-slate-500">{t('Loading...')}</p>}
      {profits && profits.length === 0 && <p className="text-xs text-slate-500">{t('No profit has been distributed to you yet. It appears here after each distribution period is approved.')}</p>}
      {profits && profits.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {(allProfits ? profits : profits.slice(0, PROFIT_SHOWN)).map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-3 text-xs">
              <div className="min-w-0">
                <p className="font-black truncate">{item.poolName}</p>
                <p className="text-slate-500">{item.periodName} · {date(item.earnedAt)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-sm">{money2(item.amount, item.currency, locale)}</p>
                <p className={item.paid ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-amber-700 dark:text-amber-300 font-bold'}>{item.paid ? t('Paid {date}', { date: item.paidAt ? date(item.paidAt) : '' }).trim() : t('Being paid out')}</p>
              </div>
            </div>
          ))}
          {profits.length > PROFIT_SHOWN && (
            <button type="button" onClick={() => setAllProfits(!allProfits)} className="w-full p-3 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {allProfits ? t('Show fewer') : t('Show all {count}', { count: profits.length })}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onOpenStatements} className="flex items-center justify-between gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-left text-sm font-black">
          <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-600" />{t('Statements')}</span><ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
        <button type="button" onClick={onOpenZakat} className="flex items-center justify-between gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-left text-sm font-black">
          <span className="flex items-center gap-2"><Landmark className="w-4 h-4 text-emerald-600" />{t('Zakat')}</span><ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <h2 className="pt-2 text-sm font-black">{t('My orders')}{orders ? ` (${orders.length})` : ''}</h2>
      {orders && orders.length === 0 && <p className="text-xs text-slate-500">{t('No orders yet.')}</p>}
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
              <span className={`px-2 py-1 rounded-lg font-bold ${status.className}`}>{t(status.label)}</span>
              <span className="text-slate-500">{date(order.createdAt)}</span>
            </div>
            {order.status === 'PENDING' && (
              <>
                <button type="button" onClick={() => setPayFor(payFor === order.id ? '' : order.id)} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold">
                  {payFor === order.id ? t('Hide payment details') : t('How to pay')}
                </button>
                {payFor === order.id && <PaymentInstructionsCard orderId={order.id} />}
                <button type="button" disabled={busy === order.id} onClick={() => void cancel(order)} className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 font-bold disabled:opacity-50">
                  {busy === order.id ? t('Cancelling...') : t('Cancel order')}
                </button>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
};
