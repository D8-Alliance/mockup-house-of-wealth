import React, { useEffect, useState } from 'react';
import { ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { apiClient, AssetTypeCode, ProjectAssetNeed } from '../../services/apiClient';
import { ASSET_TYPE_LABELS } from '../../assets/assetLabels';
import { PREFERRED_AKAD_LABELS } from '../../asset-partnerships/partnershipLabels';
import { NavTab } from '../../types';

const machine = (type: string) => type === 'MACHINERY' || type === 'EQUIPMENT';
const typesMatch = (needType: string, assetType: string) => needType === assetType || (machine(needType) && machine(assetType));

/**
 * For an asset owner: the latest projects looking for assets in the country. With a verified asset of
 * that type the owner can offer it; without one, they are invited to register it first.
 */
export const DashboardOpenNeedsPanel: React.FC<{ setTab: (tab: NavTab) => void; onOpenAssetRegister: (type?: AssetTypeCode) => void }> = ({ setTab, onOpenAssetRegister }) => {
  const [needs, setNeeds] = useState<ProjectAssetNeed[] | null>(null);
  const [verifiedTypes, setVerifiedTypes] = useState<AssetTypeCode[]>([]);

  useEffect(() => {
    apiClient.getAssetNeeds().then((list) => setNeeds(list.filter((need) => need.status === 'OPEN'))).catch(() => setNeeds([]));
    apiClient.getAssets('VERIFIED').then((list) => setVerifiedTypes(list.map((asset) => asset.assetType))).catch(() => setVerifiedTypes([]));
  }, []);

  return (
    <section className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-emerald-500/30 shadow-md space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />Projects looking for assets
            {needs && needs.length > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px]">{needs.length} open</span>}
          </h3>
          <p className="text-[11px] text-slate-500">Delivery partners in your country need these assets. Offer one you have registered, or register it first.</p>
        </div>
        {needs && needs.length > 0 && <button type="button" onClick={() => setTab('asset-partnerships')} className="text-xs font-extrabold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer">See all<ChevronRight className="w-3.5 h-3.5" /></button>}
      </div>

      {needs === null ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : needs.length === 0 ? (
        <p className="text-xs text-slate-400">No delivery partner is looking for assets right now. You will be notified when one is.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {needs.slice(0, 4).map((need) => {
            const canOffer = verifiedTypes.some((type) => typesMatch(need.assetType, type));
            const offered = need.myEngagementIds?.length ?? 0;
            return (
              <div key={need.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="text-sm font-bold text-slate-900 dark:text-white">{need.title}</div>
                <div className="text-[11px] text-slate-500">{need.project.projectName} · {need.project.organisationName}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  <strong>{need.quantity} × {ASSET_TYPE_LABELS[need.assetType]}</strong>
                  {need.startDate || need.endDate ? ` · ${need.startDate ?? '?'} to ${need.endDate ?? '?'}` : ''}
                  {need.location ? ` · ${need.location}` : ''}
                  {` · ${PREFERRED_AKAD_LABELS[need.preferredAkad ?? 'EITHER']}`}
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">{offered ? `You made ${offered} offer${offered > 1 ? 's' : ''}` : ''}</span>
                  {canOffer ? (
                    <button type="button" onClick={() => setTab('asset-partnerships')} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer">Offer an asset</button>
                  ) : (
                    <button type="button" onClick={() => onOpenAssetRegister(need.assetType)} title={`You have no verified ${ASSET_TYPE_LABELS[need.assetType].toLowerCase()} yet`} className="px-3 py-1.5 rounded-xl border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" />Register {ASSET_TYPE_LABELS[need.assetType].toLowerCase()}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
