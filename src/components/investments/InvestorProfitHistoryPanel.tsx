import React, { useEffect, useState } from 'react';
import { Coins, RefreshCw } from 'lucide-react';
import { apiClient, InvestorDistribution } from '../../services/apiClient';
import { formatProjectMoney } from '../sponsor/sponsorMoney';

/**
 * The investor's profit from each distribution period, from the server (GET /investments/distributions):
 * earned once the distribution is approved, paid once the bank payout settles.
 */
export const InvestorProfitHistoryPanel: React.FC = () => {
  const [rows, setRows] = useState<InvestorDistribution[] | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    apiClient.getMyDistributions()
      .then(setRows)
      .catch((cause) => { setRows([]); setError(cause instanceof Error ? cause.message : 'Profit history could not be loaded.'); });
  };
  useEffect(load, []);

  const date = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 text-xs">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white"><Coins className="w-4 h-4 text-emerald-600" />Profit history</h3>
        <button type="button" onClick={load} className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>
      {error && <p className="text-rose-600 font-bold">{error}</p>}
      {rows === null && <p className="text-slate-500">Loading…</p>}
      {rows && rows.length === 0 && !error && <p className="text-slate-500">No profit has been distributed to you yet. It appears here once a pool you invested in shares a period's profit.</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="p-2">Period</th>
                <th className="p-2">Pool</th>
                <th className="p-2 text-right">Your profit</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 dark:border-slate-700/60">
                  <td className="p-2 font-bold text-slate-900 dark:text-white">{row.periodName}<span className="block font-normal text-slate-400">earned {date(row.earnedAt)}</span></td>
                  <td className="p-2">{row.poolName}</td>
                  <td className="p-2 text-right font-bold text-emerald-600">{formatProjectMoney(row.amount, row.currency)}</td>
                  <td className="p-2">
                    {row.paid
                      ? <span className="font-bold text-emerald-600">Paid to your bank{row.paidAt ? ` on ${date(row.paidAt)}` : ''}</span>
                      : <span className="font-bold text-amber-600">Waiting for payout</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
