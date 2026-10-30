import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, CircleDollarSign, Hourglass, Layers, TrendingUp } from 'lucide-react';
import { apiClient, BackendInvestmentOrder, InvestorPosition } from '../../services/apiClient';
import { formatProjectMoney } from '../../components/sponsor/sponsorMoney';
import type { MobileTab } from '../MobileShell';

/**
 * Categorical slots in fixed order (the validated default palette: light and dark steps, adjacent pairs pass
 * CVD and normal-vision separation). Three light steps sit under 3:1 on the surface, so every slice also carries
 * a visible label in the legend. A seventh pool and beyond fold into "Other".
 */
const VIZ_STYLE = `
.wp-viz { --viz-surface: #ffffff; --viz-track: #e7e6e2; --s1: #2a78d6; --s2: #eb6834; --s3: #1baf7a; --s4: #eda100; --s5: #e87ba4; --s6: #008300; --s-other: #9b9a94; }
@media (prefers-color-scheme: dark) {
  .wp-viz { --viz-surface: #0f172a; --viz-track: #2a2a28; --s1: #3987e5; --s2: #d95926; --s3: #199e70; --s4: #c98500; --s5: #d55181; --s6: #008300; --s-other: #6f6e69; }
}`;
const SLOTS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];

const money2 = (amount: number, currency: string) => { try { return new Intl.NumberFormat('en-MY', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); } catch { return `${currency} ${amount.toFixed(2)}`; } };

/** An SVG ring segment from one fraction of the circle to another (0 = 12 o'clock, clockwise). */
function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const point = (fraction: number) => {
    const angle = fraction * 2 * Math.PI - Math.PI / 2;
    return `${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`;
  };
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${point(from)} A ${r} ${r} 0 ${large} 1 ${point(to)}`;
}

interface Slice { key: string; name: string; value: number; color: string }

/**
 * The investor's home: what they hold at a glance. Totals, how much Finance has confirmed, where the money is by
 * pool, profit by pool, and the latest orders, all from GET /investments/positions and /investments/orders.
 * Only the main currency is drawn; holdings in another currency are listed in Portfolio.
 */
export const MobileInvestorDashboard: React.FC<{ onOpen: (tab: MobileTab) => void }> = ({ onOpen }) => {
  const [positions, setPositions] = useState<InvestorPosition[] | null>(null);
  const [orders, setOrders] = useState<BackendInvestmentOrder[]>([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiClient.getInvestmentPositions(), apiClient.getInvestmentOrders()])
      .then(([held, mine]) => { setPositions(held); setOrders(mine); })
      .catch((cause) => { setPositions([]); setError(cause instanceof Error ? cause.message : 'Your investments could not be loaded.'); });
  }, []);

  // The currency holding the most capital is drawn; amounts in different currencies are never added together.
  const currency = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const position of positions ?? []) byCurrency.set(position.currency, (byCurrency.get(position.currency) ?? 0) + position.capital + position.pendingAmount);
    return [...byCurrency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'MYR';
  }, [positions]);
  const held = (positions ?? []).filter(position => position.currency === currency);
  const otherCurrencies = new Set((positions ?? []).map(position => position.currency).filter(code => code !== currency)).size;
  const capital = held.reduce((sum, position) => sum + position.capital, 0);
  const pending = held.reduce((sum, position) => sum + position.pendingAmount, 0);
  const profit = held.reduce((sum, position) => sum + position.profitEarned, 0);
  const returnPct = capital > 0 ? (profit / capital) * 100 : 0;
  const confirmedShare = capital + pending > 0 ? capital / (capital + pending) : 0;

  const slices: Slice[] = useMemo(() => {
    const ranked = [...held].filter(position => position.capital > 0).sort((a, b) => b.capital - a.capital);
    const top = ranked.slice(0, 6).map((position, index) => ({ key: position.poolId, name: position.poolName, value: position.capital, color: SLOTS[index] }));
    const rest = ranked.slice(6).reduce((sum, position) => sum + position.capital, 0);
    return rest > 0 ? [...top, { key: 'other', name: 'Other pools', value: rest, color: 'var(--s-other)' }] : top;
  }, [held]);
  const focus = slices.find(slice => slice.key === selected) ?? null;
  const profitRows = [...held].sort((a, b) => b.profitEarned - a.profitEarned);
  const maxProfit = Math.max(1, ...profitRows.map(position => position.profitEarned));

  if (!positions) return <p className="text-sm text-slate-500">Loading your investments...</p>;
  if (error) return <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>;
  if (held.length === 0) {
    return (
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 text-center space-y-3">
        <Layers className="w-10 h-10 mx-auto text-emerald-600" />
        <p className="text-sm font-black">No investment yet</p>
        <p className="text-xs text-slate-500">Your holdings, profit and orders appear here once you invest in a pool.</p>
        <button type="button" onClick={() => onOpen('pools')} className="w-full py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black">See open pools</button>
      </section>
    );
  }

  // Donut geometry: a 2-unit surface gap separates neighbouring slices.
  const size = 180;
  const r = 70;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  let cursor = 0;
  const gap = slices.length > 1 ? 0.006 : 0;

  return (
    <div className="wp-viz space-y-4">
      <style>{VIZ_STYLE}</style>

      {/* Headline */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-5 shadow">
        <p className="text-xs text-emerald-100/80">Invested ({currency})</p>
        <p className="text-3xl font-black">{formatProjectMoney(capital, currency)}</p>
        <div className="mt-3 flex items-center gap-4 text-xs">
          <span><span className="block text-emerald-100/70">Profit earned</span><span className="font-black text-amber-200 text-sm">{money2(profit, currency)}</span></span>
          <span><span className="block text-emerald-100/70">Return so far</span><span className="font-black text-sm">{returnPct.toFixed(2)}%</span></span>
        </div>
        {otherCurrencies > 0 && <p className="mt-2 text-[11px] text-emerald-100/70">Holdings in {otherCurrencies} other currenc{otherCurrencies === 1 ? 'y are' : 'ies are'} in Portfolio.</p>}
      </section>

      {/* Tiles: the confirmation meter, and two counts */}
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col items-center text-center col-span-1">
          <svg viewBox="0 0 100 100" className="w-24 h-24" role="img" aria-label={`${Math.round(confirmedShare * 100)}% of your money confirmed by Finance`}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--viz-track)" strokeWidth="10" />
            {confirmedShare > 0 && <path d={confirmedShare >= 1 ? 'M 50 10 A 40 40 0 1 1 49.99 10' : arc(50, 50, 40, 0, confirmedShare)} fill="none" stroke="var(--s3)" strokeWidth="10" strokeLinecap="round" />}
            <text x="50" y="55" textAnchor="middle" className="fill-slate-900 dark:fill-white" fontSize="18" fontWeight="800">{Math.round(confirmedShare * 100)}%</text>
          </svg>
          <p className="mt-1 text-xs font-black">Confirmed by Finance</p>
          <p className="text-[11px] text-slate-500">{pending > 0 ? `${formatProjectMoney(pending, currency)} waiting` : 'Nothing waiting'}</p>
        </section>
        <div className="grid grid-rows-2 gap-3">
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
            <p className="text-[11px] text-slate-500 flex items-center gap-1"><Layers className="w-3.5 h-3.5" />Pools held</p>
            <p className="text-xl font-black">{held.length}</p>
          </section>
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
            <p className="text-[11px] text-slate-500 flex items-center gap-1"><Hourglass className="w-3.5 h-3.5" />Orders waiting</p>
            <p className="text-xl font-black">{orders.filter(order => order.status === 'PENDING').length}</p>
          </section>
        </div>
      </div>

      {/* Allocation donut, with a labelled legend that is also the way to pick a slice */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <h2 className="text-sm font-black flex items-center gap-2"><CircleDollarSign className="w-4 h-4 text-emerald-600" />Where your money is</h2>
        <div className="flex justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48" role="img" aria-label="Invested capital by pool">
            {slices.length === 1
              ? <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={slices[0].color} strokeWidth="26" />
              : slices.map(slice => {
                const from = cursor / total;
                cursor += slice.value;
                const to = cursor / total;
                const dimmed = focus && focus.key !== slice.key;
                return (
                  <path
                    key={slice.key}
                    d={arc(size / 2, size / 2, r, from + gap, to - gap)}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={focus?.key === slice.key ? 30 : 26}
                    opacity={dimmed ? 0.35 : 1}
                    onClick={() => setSelected(selected === slice.key ? null : slice.key)}
                    style={{ cursor: 'pointer' }}
                  >
                    <title>{`${slice.name}: ${formatProjectMoney(slice.value, currency)} (${((slice.value / total) * 100).toFixed(1)}%)`}</title>
                  </path>
                );
              })}
            <text x={size / 2} y={size / 2 - 6} textAnchor="middle" className="fill-slate-500" fontSize="11">{focus ? `${((focus.value / total) * 100).toFixed(1)}%` : 'Total'}</text>
            <text x={size / 2} y={size / 2 + 14} textAnchor="middle" className="fill-slate-900 dark:fill-white" fontSize="15" fontWeight="800">{formatProjectMoney(focus ? focus.value : total, currency)}</text>
          </svg>
        </div>
        <ul className="space-y-1.5">
          {slices.map(slice => (
            <li key={slice.key}>
              <button type="button" onClick={() => setSelected(selected === slice.key ? null : slice.key)} aria-pressed={selected === slice.key} className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs ${selected === slice.key ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: slice.color }} />
                <span className="flex-1 min-w-0 truncate font-bold">{slice.name}</span>
                <span className="text-slate-500 whitespace-nowrap">{formatProjectMoney(slice.value, currency)}</span>
                <span className="w-12 text-right font-black whitespace-nowrap">{((slice.value / total) * 100).toFixed(1)}%</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Profit by pool: one series, so one hue; each bar carries its value */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <h2 className="text-sm font-black flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" />Profit earned by pool</h2>
        {profitRows.every(position => position.profitEarned === 0) && <p className="text-xs text-slate-500">No profit has been distributed yet. It appears here after each distribution.</p>}
        {profitRows.some(position => position.profitEarned > 0) && profitRows.map(position => (
          <div key={position.poolId} className="space-y-1">
            <div className="flex justify-between gap-2 text-xs"><span className="font-bold truncate">{position.poolName}</span><span className="font-black whitespace-nowrap">{money2(position.profitEarned, currency)}</span></div>
            <div className="h-2.5 rounded-full bg-[var(--viz-track)] overflow-hidden" role="img" aria-label={`${position.poolName}: ${money2(position.profitEarned, currency)}, ${position.returnPct.toFixed(2)}% return`}>
              <div className="h-full rounded-full" style={{ width: `${(position.profitEarned / maxProfit) * 100}%`, background: 'var(--s1)' }} />
            </div>
            <p className="text-[11px] text-slate-500">{position.returnPct.toFixed(2)}% return on {formatProjectMoney(position.capital, currency)}</p>
          </div>
        ))}
      </section>

      {/* Latest orders */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
        <h2 className="text-sm font-black">Latest orders</h2>
        {orders.slice(0, 3).map(order => (
          <div key={order.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0"><span className="block font-bold truncate">{order.pool?.poolName ?? order.poolId}</span><span className="block text-slate-500">{new Date(order.createdAt).toLocaleDateString('en-MY')}</span></span>
            <span className="text-right whitespace-nowrap"><span className="block font-black">{formatProjectMoney(Number(order.amount), order.currency)}</span><span className="block text-slate-500">{order.status === 'SETTLED' ? 'Confirmed' : order.status === 'PENDING' ? 'Waiting for Finance' : 'Cancelled'}</span></span>
          </div>
        ))}
        <button type="button" onClick={() => onOpen('portfolio')} className="w-full flex items-center justify-center gap-1 pt-2 text-sm font-black text-emerald-700 dark:text-emerald-400">Full portfolio<ChevronRight className="w-4 h-4" /></button>
      </section>
    </div>
  );
};
