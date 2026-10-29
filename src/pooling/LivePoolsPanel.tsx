import React from 'react';
import { Layers, Plus, RefreshCw } from 'lucide-react';
import { apiClient, BackendPool } from '../services/apiClient';
import { useRBAC } from '../rbac/RBACContext';
import { canManagePools } from '../rbac/menuVisibility';
import { PDPPoolCreationModal } from '../pdp/components/PDPPoolCreationModal';

const money = (value: number, currency: string) => `${currency === 'MYR' ? 'RM' : currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  PAUSED: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  FULL: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  CLOSED: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

/** Status moves the server allows (pools.service transitionStatus). */
const NEXT: Record<string, Array<'OPEN' | 'PAUSED' | 'FULL' | 'CLOSED'>> = { OPEN: ['PAUSED', 'FULL', 'CLOSED'], PAUSED: ['OPEN', 'CLOSED'], FULL: ['CLOSED'], CLOSED: [] };
const ACTION_LABEL: Record<string, string> = { OPEN: 'Reopen', PAUSED: 'Pause', FULL: 'Mark full', CLOSED: 'Close' };

interface LivePoolsPanelProps {
  /** Marketplace shows only pools taking money; Wealth Pooling shows every pool in scope and lets managers act. */
  mode: 'manage' | 'marketplace';
}

/** Wealth pools as the database has them, with the money Finance has settled into each. */
export const LivePoolsPanel: React.FC<LivePoolsPanelProps> = ({ mode }) => {
  const { currentRole } = useRBAC();
  const [pools, setPools] = React.useState<BackendPool[] | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const manager = mode === 'manage' && canManagePools(currentRole);

  const load = React.useCallback(() => {
    setError('');
    void apiClient.getPools()
      .then(setPools)
      .catch((cause) => { setPools([]); setError(cause instanceof Error ? cause.message : 'The pools could not be loaded.'); });
  }, []);
  React.useEffect(load, [load]);

  const changeStatus = async (pool: BackendPool, status: 'OPEN' | 'PAUSED' | 'FULL' | 'CLOSED') => {
    const note = window.prompt(`${ACTION_LABEL[status]} "${pool.poolName}": reason (recorded in the audit trail)`);
    if (note === null) return;
    setBusy(pool.poolId);
    setError('');
    try {
      await apiClient.setPoolStatus(pool.poolId, status, note.trim() || undefined);
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pool status did not change.');
    } finally {
      setBusy('');
    }
  };

  const shown = (pools ?? []).filter(pool => mode === 'manage' || pool.status === 'OPEN');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 mb-2 border border-emerald-500/20">
            {mode === 'manage' ? 'Wealth Pooling' : 'Asset Marketplace'}
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{mode === 'manage' ? 'Wealth Pools' : 'Pools Open For Investment'}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {mode === 'manage'
              ? 'Every pool in your scope, what it has raised against its project\'s funding target, and its status.'
              : 'Pools currently taking investor money. Investors place orders from the Investments tab after KYC.'}
          </p>
        </div>
        <div className="flex gap-2 self-start md:self-auto">
          <button type="button" onClick={load} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {manager && (
            <button type="button" onClick={() => setCreating(true)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer">
              <Plus className="w-4 h-4" /> Open a pool
            </button>
          )}
        </div>
      </div>

      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!pools && <p className="text-xs text-slate-500">Loading pools...</p>}
      {pools && shown.length === 0 && !error && (
        <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-center text-sm text-slate-500">
          {mode === 'manage' ? 'No wealth pool has been opened yet. A pool is opened from an approved project.' : 'No pool is open for investment right now.'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map(pool => {
          const target = pool.targetAmount ?? 0;
          const raised = pool.raisedAmount ?? 0;
          const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
          return (
            <div key={pool.poolId} className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5"><Layers className="w-4 h-4 text-emerald-600 shrink-0" /><span className="truncate">{pool.poolName}</span></h3>
                  <p className="text-[11px] text-slate-500 truncate">{pool.projectName ?? pool.projectId}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border shrink-0 ${STATUS_STYLE[pool.status] ?? STATUS_STYLE.CLOSED}`}>{pool.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="block text-slate-400 font-bold">Structure</span><span className="font-bold text-slate-700 dark:text-slate-200">{pool.investmentStructure}</span></div>
                <div><span className="block text-slate-400 font-bold">Indicative return</span><span className="font-bold text-slate-700 dark:text-slate-200">{Number(pool.indicativeExpectedReturn).toFixed(2)}% p.a.</span></div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>{money(raised, pool.currency)} settled</span>
                  <span>{target > 0 ? `${pct}% of ${money(target, pool.currency)}` : 'No target set'}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {manager && (NEXT[pool.status] ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {NEXT[pool.status].map(status => (
                    <button key={status} type="button" disabled={busy === pool.poolId} onClick={() => void changeStatus(pool, status)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer">
                      {ACTION_LABEL[status]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {manager && (
        <PDPPoolCreationModal isOpen={creating} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />
      )}
    </div>
  );
};
