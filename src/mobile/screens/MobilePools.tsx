import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Layers, RefreshCw } from 'lucide-react';
import { apiClient, BackendPool } from '../../services/apiClient';
import { formatProjectMoney } from '../../components/sponsor/sponsorMoney';
import { useRBAC } from '../../rbac/RBACContext';
import { canInvest } from '../../rbac/menuVisibility';
import { MobilePoolDetail } from './MobilePoolDetail';
import { useT } from '../i18n';

/**
 * Pools open for investment, as the server lists them for this person (an investor sees the open pools of their
 * country). An investor taps a pool to read its akad terms and invest. Below them, pools that have raised their
 * target, to read only: the platform's track record (no new orders are taken).
 */
export const MobilePools: React.FC<{ onOpenPortfolio: () => void; onOpenKyc: () => void }> = ({ onOpenPortfolio, onOpenKyc }) => {
  const { t } = useT();
  const { currentRole } = useRBAC();
  const investor = canInvest(currentRole);
  const [openPool, setOpenPool] = useState<string | null>(null);
  const [pools, setPools] = useState<BackendPool[] | null>(null);
  const [funded, setFunded] = useState<BackendPool[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    setPools(null);
    apiClient.getPools()
      .then(items => { setPools(items.filter(pool => pool.status === 'OPEN')); setFunded(items.filter(pool => pool.status === 'FULL' || pool.status === 'CLOSED')); })
      .catch((cause) => { setPools([]); setFunded([]); setError(cause instanceof Error ? cause.message : t('The pools could not be loaded.')); });
  }, [t]);
  useEffect(load, [load]);

  if (openPool) {
    return <MobilePoolDetail poolId={openPool} onBack={() => { setOpenPool(null); load(); }} onOpenPortfolio={onOpenPortfolio} onOpenKyc={onOpenKyc} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black">{t('Open pools')}</h1>
        <button type="button" onClick={load} aria-label={t('Refresh')} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!pools && <p className="text-sm text-slate-500">{t('Loading pools...')}</p>}
      {pools && pools.length === 0 && !error && <p className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500">{t('No pool is open for investment right now.')}</p>}

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
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">{t('Structure')}</span><span className="font-bold">{pool.investmentStructure}</span></div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">{t('Indicative return')}</span><span className="font-bold">{t('{pct}% a year', { pct: Number(pool.indicativeExpectedReturn).toFixed(2) })}</span></div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                <span>{t('{amount} raised', { amount: formatProjectMoney(raised, pool.currency) })}</span>
                <span>{target > 0 ? t('{pct}% of {amount}', { pct, amount: formatProjectMoney(target, pool.currency) }) : t('No target set')}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
            </div>
            <p className="text-[11px] text-slate-400">{t("The indicative return is not a promise: profit is shared under the pool's akad terms.")}</p>
            {investor && (
              <button type="button" onClick={() => setOpenPool(pool.poolId)} className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black">
                {t('Akad terms and invest')}<ChevronRight className="w-4 h-4" />
              </button>
            )}
          </article>
        );
      })}

      {funded.length > 0 && (
        <section className="space-y-3 pt-2">
          <div>
            <h2 className="text-sm font-black flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" />{t('Fully funded')}</h2>
            <p className="text-[11px] text-slate-500">{t('These pools raised their target and take no new investment.')}</p>
          </div>
          {funded.map(pool => {
            const target = pool.targetAmount ?? 0;
            const raised = pool.raisedAmount ?? 0;
            return (
              <article key={pool.poolId} className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black">{pool.poolName}</h3>
                    {pool.projectName && <p className="text-xs text-slate-500">{pool.projectName}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">{pool.projectSuspended ? t('Suspended') : t('Fully funded')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="block text-slate-500">{t('Raised')}</span><span className="font-bold">{formatProjectMoney(raised, pool.currency)}</span></div>
                  <div><span className="block text-slate-500">{t('Target')}</span><span className="font-bold">{formatProjectMoney(target, pool.currency)}</span></div>
                  <div><span className="block text-slate-500">{t('Investors')}</span><span className="font-bold">{pool.investorCount ?? 0}</span></div>
                </div>
                <p className="text-[11px] text-slate-500">{pool.investmentStructure}</p>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};
