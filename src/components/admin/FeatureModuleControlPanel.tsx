import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { apiClient, FeatureModule, FeatureModuleMode } from '../../services/apiClient';

export const FeatureModuleControlPanel: React.FC = () => {
  const [modules, setModules] = useState<FeatureModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState('');
  const [error, setError] = useState('');

  const loadModules = async () => {
    setLoading(true);
    setError('');
    try {
      setModules(await apiClient.getFeatureModules());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load module controls.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadModules();
  }, []);

  const updateModule = async (module: FeatureModule, mode: FeatureModuleMode) => {
    setUpdating(module.moduleKey);
    setError('');
    try {
      const updated = await apiClient.updateFeatureModule(module.moduleKey, mode);
      setModules(current => current.map(item => item.moduleKey === updated.moduleKey ? updated : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update module status.');
    } finally {
      setUpdating('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Server-authoritative controls</span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Module Availability</h2>
          <p className="text-xs text-slate-500 mt-1">Disabled modules reject protected API requests. Manual Review routes submissions to authorised human approval.</p>
        </div>
        <button type="button" onClick={() => void loadModules()} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" title="Refresh modules">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">{error}</p>}
      {loading && <p className="text-xs text-slate-500">Loading module controls...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {modules.map(module => {
          const locked = module.moduleKey === 'FINANCIAL_LEDGER';
          return (
            <div key={module.moduleKey} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-500 shrink-0" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">{module.name}</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{module.description}</p>
                <span className="text-[10px] font-mono text-slate-400">{module.moduleKey}</span>
              </div>
              <select
                value={module.mode}
                disabled={locked || updating === module.moduleKey}
                onChange={event => void updateModule(module, event.target.value as FeatureModuleMode)}
                title={locked ? 'The financial ledger cannot be disabled' : `Set ${module.name} mode`}
                className={`shrink-0 px-2.5 py-2 rounded-xl text-xs font-bold border-0 ${module.mode === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : module.mode === 'MANUAL_REVIEW' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-200 text-slate-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="ACTIVE">Active</option>
                <option value="MANUAL_REVIEW">Manual Review</option>
                <option value="DISABLED">Inactive</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};
