import React, { useCallback, useEffect, useState } from 'react';
import { Building2, PlusCircle, RefreshCw } from 'lucide-react';
import { useRBAC } from '../rbac/RBACContext';
import { apiClient, apiErrorMessage, AssetStatusCode, RegisteredAsset } from '../services/apiClient';
import { AssetDetailModal } from './AssetDetailModal';
import { AssetFormModal } from './AssetFormModal';
import { ASSET_STATUS, ASSET_TYPE_LABELS, formatMoney } from './assetLabels';

const OWNER_ROLES = new Set(['Asset Owner', 'Asset Manager']);
const REVIEWER_ROLES = new Set(['Super Admin', 'Country Admin', 'Legal Officer']);

interface AssetRegisterViewProps {
  /** Set by the dashboard's Register Asset button so the form opens straight away. */
  startRegistering?: boolean;
  onStartedRegistering?: () => void;
}

/** Real assets from the server: owners register and submit them, Country Admins and Legal Officers verify them. */
export const AssetRegisterView: React.FC<AssetRegisterViewProps> = ({ startRegistering, onStartedRegistering }) => {
  const { currentRole } = useRBAC();
  const isOwner = OWNER_ROLES.has(currentRole);
  const isReviewer = REVIEWER_ROLES.has(currentRole);
  const [assets, setAssets] = useState<RegisteredAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AssetStatusCode | 'ALL'>(isReviewer && !isOwner ? 'SUBMITTED' : 'ALL');
  const [selected, setSelected] = useState<RegisteredAsset | null>(null);
  const [form, setForm] = useState<{ asset?: RegisteredAsset } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiClient.getAssets()
      .then(setAssets)
      .catch((cause) => setError(apiErrorMessage(cause, 'Assets could not be loaded.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);
  useEffect(() => {
    if (startRegistering && isOwner) { setForm({}); onStartedRegistering?.(); }
  }, [startRegistering, isOwner, onStartedRegistering]);

  const replace = (asset: RegisteredAsset) => {
    setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
    setSelected((current) => (current && current.id === asset.id ? { ...current, ...asset } : current));
  };

  const shown = filter === 'ALL' ? assets : assets.filter((asset) => asset.status === filter);
  const verified = assets.filter((asset) => asset.status === 'VERIFIED');
  const verifiedValue = Object.entries(verified.reduce<Record<string, number>>((totals, asset) => ({ ...totals, [asset.currency]: (totals[asset.currency] ?? 0) + asset.estimatedValue }), {}));
  const awaiting = assets.filter((asset) => asset.status === 'SUBMITTED').length;
  const filters: Array<AssetStatusCode | 'ALL'> = ['ALL', 'DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'VERIFIED', 'REJECTED'];

  // The modals sit outside the animated block: its transform would make their fixed position relative to it.
  return (
    <>
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{isOwner ? 'My Assets' : 'Asset Verification'}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isOwner
              ? 'Land, buildings and machinery you offer for Shariah-compliant leasing, partnership or sale. Each asset is verified before it can be used in a pool or agreement.'
              : 'Assets submitted by owners in your country. Check the proof of ownership, then verify, request changes or reject.'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={load} title="Reload" className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          {isOwner && (
            <button type="button" onClick={() => setForm({})} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center gap-2 cursor-pointer"><PlusCircle className="w-4 h-4" />Register Asset</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assets registered', value: String(assets.filter((asset) => asset.status !== 'WITHDRAWN').length) },
          { label: 'Verified', value: String(verified.length) },
          { label: 'Awaiting verification', value: String(awaiting) },
          { label: 'Verified value', value: verifiedValue.length ? verifiedValue.map(([currency, total]) => formatMoney(total, currency)).join(' + ') : '-' },
        ].map((card) => (
          <div key={card.label} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{card.label}</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1 break-words">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {filters.map((code) => (
          <button key={code} type="button" onClick={() => setFilter(code)} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${filter === code ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {code === 'ALL' ? 'All' : ASSET_STATUS[code].label}
          </button>
        ))}
      </div>

      {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">{error}</p>}
      {!loading && !error && shown.length === 0 && (
        <div className="p-10 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">{isOwner ? (assets.length ? 'No assets with this status.' : 'You have not registered an asset yet.') : 'No assets with this status.'}</p>
        </div>
      )}

      {shown.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3">Asset</th><th className="px-4 py-3">Type</th>{isReviewer && <th className="px-4 py-3">Owner</th>}<th className="px-4 py-3 text-right">Value</th><th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((asset) => (
                <tr key={asset.id} onClick={() => setSelected(asset)} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer">
                  <td className="px-4 py-3"><div className="font-bold text-slate-900 dark:text-white">{asset.name}</div><div className="text-[11px] text-slate-400 font-mono">{asset.id}{asset.location ? ` · ${asset.location}` : ''}</div></td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{ASSET_TYPE_LABELS[asset.assetType]}</td>
                  {isReviewer && <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{asset.organisationName ?? asset.organisationId}</td>}
                  <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">{formatMoney(asset.estimatedValue, asset.currency)}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${ASSET_STATUS[asset.status].className}`}>{ASSET_STATUS[asset.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
      {selected && (
        <AssetDetailModal
          asset={selected}
          canEdit={isOwner}
          canReview={isReviewer}
          onChanged={replace}
          onEdit={() => setForm({ asset: selected })}
          onClose={() => setSelected(null)}
        />
      )}
      {form && (
        <AssetFormModal
          asset={form.asset}
          onClose={() => setForm(null)}
          onSaved={(asset) => { replace(asset); setForm(null); setSelected(asset); }}
        />
      )}
    </>
  );
};
