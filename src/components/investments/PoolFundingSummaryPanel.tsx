import React from 'react';
import { Layers, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiClient, BackendPool } from '../../services/apiClient';

const money = (value: number, currency: string) => `${currency === 'MYR' ? 'RM' : currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * What a delivery partner (and any role that is not finance, settlement or compliance staff) sees of the money in its
 * pools: totals only. How much is raised against the target and how many investors hold confirmed capital, never who
 * they are or what each put in; that stays with the platform (server: ORDER_DETAIL_ROLES).
 */
export const PoolFundingSummaryPanel: React.FC = () => {
  const [pools, setPools] = React.useState<BackendPool[] | null>(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(() => {
    setError('');
    void apiClient.getPools()
      .then(setPools)
      .catch((cause) => { setPools([]); setError(cause instanceof Error ? cause.message : 'The pools could not be loaded.'); });
  }, []);
  React.useEffect(load, [load]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-2 border border-indigo-500/20">
            Pool Funding
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Funding Raised</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Confirmed investor capital in each pool you can see, as totals.</p>
        </div>
        <button type="button" onClick={load} className="self-start md:self-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <p className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-slate-600 dark:text-slate-300">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <span>Investors contract with the pool through the platform, so who they are and how much each invested is kept by the platform (PDPA). Questions for investors go through the platform: updates, quarterly reports and notifications.</span>
      </p>

      {error && <p role="alert" className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 p-4 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!pools && <p className="text-sm text-slate-500">Loading...</p>}
      {pools && pools.length === 0 && !error && <p className="text-sm text-slate-500">No pool to show yet.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(pools ?? []).map((pool) => {
          const raised = Number(pool.raisedAmount ?? 0);
          const target = Number(pool.targetAmount ?? 0);
          return (
            <div key={pool.poolId} className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500 shrink-0" />{pool.poolName}</p>
                  <p className="text-[11px] text-slate-500">{pool.projectName ?? ''} · {pool.investmentStructure}</p>
                </div>
                <span className="shrink-0 text-[10px] font-black rounded-full px-2 py-0.5 bg-slate-500/10 text-slate-600 dark:text-slate-300">{pool.status}</span>
              </div>
              {target > 0 && <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (raised / target) * 100)}%` }} /></div>}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-slate-400 font-bold">Raised</p><p className="font-black text-slate-900 dark:text-white">{money(raised, pool.currency)}</p></div>
                <div><p className="text-slate-400 font-bold">Target</p><p className="font-black text-slate-900 dark:text-white">{money(target, pool.currency)}</p></div>
                <div><p className="text-slate-400 font-bold">Investors</p><p className="font-black text-slate-900 dark:text-white">{pool.investorCount ?? 0}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
