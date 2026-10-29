import React, { useEffect, useState } from 'react';
import { PieChart, RefreshCw } from 'lucide-react';
import { apiClient, InvestorPosition } from '../../services/apiClient';
import { formatProjectMoney } from '../sponsor/sponsorMoney';

/**
 * The investor's holding in each pool, from the server: capital Finance has confirmed, the share of
 * the pool it makes up, and profit earned and paid. Orders still waiting for confirmation are shown
 * apart and earn nothing yet.
 */
export const InvestorPositionsPanel: React.FC = () => {
  const [positions, setPositions] = useState<InvestorPosition[] | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    apiClient.getInvestmentPositions()
      .then(setPositions)
      .catch((cause) => { setPositions([]); setError(cause instanceof Error ? cause.message : 'Positions could not be loaded.'); });
  };
  useEffect(load, []);

  // Totals only make sense in one currency; pools in other currencies are listed but not summed.
  const currency = positions?.[0]?.currency ?? 'MYR';
  const same = (positions ?? []).filter((position) => position.currency === currency);
  const totals = {
    capital: same.reduce((sum, position) => sum + position.capital, 0),
    pending: same.reduce((sum, position) => sum + position.pendingAmount, 0),
    earned: same.reduce((sum, position) => sum + position.profitEarned, 0),
    paid: same.reduce((sum, position) => sum + position.profitPaid, 0),
  };

  return (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 text-xs">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white"><PieChart className="w-4 h-4 text-emerald-600" />My positions</h3>
        <button type="button" onClick={load} className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>
      {error && <p className="text-rose-600 font-bold">{error}</p>}
      {positions === null && <p className="text-slate-500">Loading…</p>}
      {positions && positions.length === 0 && !error && <p className="text-slate-500">You have no investments yet. Choose an open pool below to invest.</p>}

      {positions && positions.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              ['Invested (confirmed)', formatProjectMoney(totals.capital, currency), 'text-slate-900 dark:text-white'],
              ['Awaiting confirmation', formatProjectMoney(totals.pending, currency), 'text-amber-600'],
              ['Profit earned', formatProjectMoney(totals.earned, currency), 'text-emerald-600'],
              ['Profit paid to your bank', formatProjectMoney(totals.paid, currency), 'text-emerald-600'],
            ] as const).map(([label, value, tone]) => (
              <div key={label} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
                <span className="text-[10px] font-bold text-slate-400 block">{label}</span>
                <span className={`text-base font-black ${tone}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="p-2">Pool</th>
                  <th className="p-2 text-right">Invested</th>
                  <th className="p-2 text-right">Share of pool</th>
                  <th className="p-2 text-right">Profit earned</th>
                  <th className="p-2 text-right">Paid out</th>
                  <th className="p-2 text-right">Return</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.poolId} className="border-t border-slate-100 dark:border-slate-700/60 align-top">
                    <td className="p-2">
                      <span className="font-black text-slate-900 dark:text-white block">{position.poolName}</span>
                      <span className="text-slate-500">
                        {position.projectName} · {position.contract}{position.investorProfitSharePct !== null ? ` · your side ${position.investorProfitSharePct}%` : ''} · pool {position.poolStatus.toLowerCase()}
                      </span>
                      {position.pendingAmount > 0 && (
                        <span className="block text-amber-600 font-semibold">{formatProjectMoney(position.pendingAmount, position.currency)} awaiting Finance's confirmation</span>
                      )}
                    </td>
                    <td className="p-2 text-right font-bold">{formatProjectMoney(position.capital, position.currency)}</td>
                    <td className="p-2 text-right">{position.poolSharePct}%</td>
                    <td className="p-2 text-right font-bold text-emerald-600">{formatProjectMoney(position.profitEarned, position.currency)}</td>
                    <td className="p-2 text-right">{formatProjectMoney(position.profitPaid, position.currency)}</td>
                    <td className="p-2 text-right font-bold">{position.returnPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">Return is profit earned so far against your confirmed investment; indicative returns are not guaranteed.</p>
        </>
      )}
    </section>
  );
};
