import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Layers, RefreshCw } from 'lucide-react';
import { apiClient, BackendPool } from '../../services/apiClient';
import { formatProjectMoney } from '../../components/sponsor/sponsorMoney';
import { useRBAC } from '../../rbac/RBACContext';
import { canInvest } from '../../rbac/menuVisibility';
import { MobilePoolDetail } from './MobilePoolDetail';

/**
 * Pools open for investment, as the server lists them for this person (an investor sees the open pools of their
 * country). An investor taps a pool to read its akad terms and invest.
 */
export const MobilePools: React.FC<{ onOpenPortfolio: () => void }> = ({ onOpenPortfolio }) => {
  const { currentRole } = useRBAC();
  const investor = canInvest(currentRole);
  const [openPool, setOpenPool] = useState<string | null>(null);
  const [pools, setPools] = useState<BackendPool[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    setPools(null);
    apiClient.getPools()
      .then(items => setPools(items.filter(pool => pool.status === 'OPEN')))
      .catch((cause) => { setPools([]); setError(cause instanceof Error ? cause.message : 'The pools could not be loaded.'); });
  }, []);
  useEffect(load, [load]);

  if (openPool) {
    return <MobilePoolDetail poolId={openPool} onBack={() => { setOpenPool(null); load(); }} onOpenPortfolio={onOpenPortfolio} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black">Open pools</h1>
        <button type="button" onClick={load} aria-label="Refresh" className="p-2 rounded-xl border border-slate-200 dark:border-slate-700"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!pools && <p className="text-sm text-slate-500">Loading pools...</p>}
      {pools && pools.length === 0 && !error && <p className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500">No pool is open for investment right now.</p>}

      {pools?.map(pool => {
        const target = pool.targetAmount ?? 0;
        const raised = pool.raisedAmount ?? 0;
        const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
        return (
          <article key={pool.poolId} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
            <div>
              <h2 className="text-sm font-black flex items-center gap-1.5"><Layers className="w-4 h-4 text-emerald-600 shrink-0" />{pool.poolName}</h2>
              {pool.projectName && <p className="text-xs text-slate-500">{pool.projectName}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">Structure</span><span className="font-bold">{pool.investmentStructure}</span></div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">Indicative return</span><span className="font-bold">{Number(pool.indicativeExpectedReturn).toFixed(2)}% a year</span></div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                <span>{formatProjectMoney(raised, pool.currency)} raised</span>
                <span>{target > 0 ? `${pct}% of ${formatProjectMoney(target, pool.currency)}` : 'No target set'}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
            </div>
            <p className="text-[11px] text-slate-400">The indicative return is not a promise: profit is shared under the pool's akad terms.</p>
            {investor && (
              <button type="button" onClick={() => setOpenPool(pool.poolId)} className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black">
                Akad terms and invest<ChevronRight className="w-4 h-4" />
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
};
