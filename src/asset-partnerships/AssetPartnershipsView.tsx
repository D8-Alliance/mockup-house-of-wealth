import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, Handshake, Plus, RefreshCw } from 'lucide-react';
import { useRBAC } from '../rbac/RBACContext';
import { apiClient, apiErrorMessage, AssetEngagement, AssetTypeCode, ListedAsset, ProjectAssetNeed } from '../services/apiClient';
import { ASSET_TYPE_LABELS } from '../assets/assetLabels';
import { EngagementDetailModal } from './EngagementDetailModal';
import { ModalPortal } from '../components/ModalPortal';
import { NeedFormModal } from './NeedFormModal';
import { ProposeEngagementModal } from './ProposeEngagementModal';
import { OfferComparisonModal } from './OfferComparisonModal';
import { AKAD_LABELS, describeTerms, ENGAGEMENT_STATUS, NEED_STATUS, nextStep, PREFERRED_AKAD_LABELS } from './partnershipLabels';

const OWNER_ROLES = ['Asset Owner', 'Asset Manager'];
const PDP_ROLES = ['Project Sponsor', 'Project Manager', 'Organization Admin'];

type Side = 'OWNER' | 'PDP' | 'REVIEWER';
type Tab = 'needs' | 'listed' | 'engagements' | 'review';

const TABS: Record<Side, { id: Tab; label: string }[]> = {
  OWNER: [{ id: 'needs', label: 'Project needs' }, { id: 'engagements', label: 'My offers & requests' }],
  PDP: [{ id: 'needs', label: 'Our asset needs' }, { id: 'listed', label: 'Offered assets' }, { id: 'engagements', label: 'Offers & requests' }],
  REVIEWER: [{ id: 'review', label: 'To review' }, { id: 'engagements', label: 'All partnerships' }],
};

const INTRO: Record<Side, string> = {
  OWNER: 'Delivery partners post what their projects need. Offer a verified asset on Ijarah (lease) or Musharakah (partnership), or answer requests for assets you chose to offer (open the asset in Asset Register and turn on "Offer to delivery partners").',
  PDP: 'Post the assets your projects need, or browse verified assets their owners offer. Negotiate an Ijarah lease or a Musharakah partnership; once agreed, Legal and Shariah approve and the asset is committed for the period.',
  REVIEWER: 'Partnerships both sides accepted wait for two approvals: Legal (the terms and the right to deal with the asset) and Shariah (the akad). The two must be given by different people outside both organisations.',
};

const DETAIL_KEYS: Record<string, string[]> = {
  LAND: ['areaValue', 'areaUnit', 'landUseCategory', 'tenure'],
  BUILDING: ['buildingUse', 'floorArea', 'floorAreaUnit', 'yearCompleted'],
  VEHICLE: ['make', 'model', 'yearOfManufacture', 'category'],
  MACHINERY: ['manufacturer', 'model', 'yearOfManufacture', 'operatingHours'],
  EQUIPMENT: ['manufacturer', 'model', 'yearOfManufacture', 'operatingHours'],
};
const summary = (asset: ListedAsset) => (DETAIL_KEYS[asset.assetType] ?? []).map((key) => (asset.details as Record<string, unknown>)[key]).filter((value) => value !== undefined && value !== '').join(' · ');

/** Asset owners and delivery partners bring verified assets into projects; Legal and Shariah approve. */
export const AssetPartnershipsView: React.FC<{ onOpenAgreement?: () => void; onOpenContracts?: () => void; onOpenAssetRegister?: (type?: AssetTypeCode) => void }> = ({ onOpenAgreement, onOpenContracts, onOpenAssetRegister }) => {
  const { currentRole, tenantContext } = useRBAC();
  const side: Side = OWNER_ROLES.includes(currentRole) ? 'OWNER' : PDP_ROLES.includes(currentRole) ? 'PDP' : 'REVIEWER';
  const [tab, setTab] = useState<Tab>(TABS[side][0].id);
  const [needs, setNeeds] = useState<ProjectAssetNeed[]>([]);
  const [listed, setListed] = useState<ListedAsset[]>([]);
  const [engagements, setEngagements] = useState<AssetEngagement[]>([]);
  const [typeFilter, setTypeFilter] = useState<AssetTypeCode | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AssetEngagement | null>(null);
  const [offerFor, setOfferFor] = useState<ProjectAssetNeed | null>(null);
  const [requestFor, setRequestFor] = useState<ListedAsset | null>(null);
  const [needForm, setNeedForm] = useState(false);
  const [compareNeedId, setCompareNeedId] = useState<string | null>(null);
  const [compareRefresh, setCompareRefresh] = useState(0);

  useEffect(() => setTab(TABS[side][0].id), [side]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [engagementList, needList, listedList] = await Promise.all([
        apiClient.getAssetEngagements(),
        side === 'REVIEWER' ? Promise.resolve([]) : apiClient.getAssetNeeds(),
        side === 'PDP' ? apiClient.getListedAssets(typeFilter || undefined) : Promise.resolve([]),
      ]);
      setEngagements(engagementList);
      setNeeds(needList);
      setListed(listedList);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Asset partnerships could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [side, typeFilter]);

  useEffect(() => { void load(); }, [load, currentRole]);

  const replace = (engagement: AssetEngagement) => {
    setCompareRefresh((value) => value + 1);
    setEngagements((current) => [engagement, ...current.filter((item) => item.id !== engagement.id)]);
    setSelected(engagement);
    void load();
  };

  const toReview = engagements.filter((engagement) => engagement.canReview);
  const actionNeeded = engagements.filter((engagement) => engagement.canRespond).length;
  const shown = tab === 'review' ? toReview : engagements;

  const engagementList = (list: AssetEngagement[]) => (
    list.length === 0
      ? <p className="p-6 text-center text-xs text-slate-400">{tab === 'review' ? 'Nothing waits for your review.' : 'No offers or requests yet.'}</p>
      : (
        <div className="space-y-2">
          {list.map((engagement) => {
            const status = ENGAGEMENT_STATUS[engagement.status];
            return (
              <button type="button" key={engagement.id} onClick={() => setSelected(engagement)} className="w-full text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 bg-white dark:bg-slate-800 cursor-pointer">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{engagement.asset.name} <span className="font-normal text-slate-400">→</span> {engagement.project.projectName}</div>
                    <div className="text-xs text-slate-500">{engagement.direction === 'OFFER' ? 'Offer' : 'Request'} · {AKAD_LABELS[engagement.akad]} · {describeTerms(engagement.akad, engagement.terms)} · {engagement.startDate} to {engagement.endDate}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${status.className}`}>{status.label}</span>
                </div>
                <div className={`mt-1 text-[11px] font-bold ${engagement.canRespond || engagement.canReview ? 'text-amber-600' : 'text-slate-400'}`}>{nextStep(engagement)}</div>
              </button>
            );
          })}
        </div>
      )
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 mb-2"><Handshake className="w-3.5 h-3.5" />Asset partnerships</span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{side === 'OWNER' ? 'Put your assets to work' : side === 'PDP' ? 'Source assets for your projects' : 'Asset partnership review'}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-3xl">{INTRO[side]}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => void load()} title="Refresh" className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          {side === 'PDP' && <button type="button" onClick={() => setNeedForm(true)} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"><Plus className="w-4 h-4" />Post an asset need</button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS[side].map((item) => (
          <button type="button" key={item.id} onClick={() => setTab(item.id)} className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${tab === item.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
            {item.label}
            {item.id === 'engagements' && actionNeeded > 0 && <span className="ml-1.5 px-1.5 rounded-full bg-amber-500 text-white">{actionNeeded}</span>}
            {item.id === 'review' && toReview.length > 0 && <span className="ml-1.5 px-1.5 rounded-full bg-amber-500 text-white">{toReview.length}</span>}
          </button>
        ))}
      </div>

      {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">{error}</p>}

      {tab === 'needs' && (
        needs.length === 0 ? <p className="p-6 text-center text-xs text-slate-400">{loading ? 'Loading…' : side === 'OWNER' ? 'No delivery partner in your country has posted an asset need yet.' : 'You have not posted an asset need. Use "Post an asset need".'}</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {needs.map((need) => {
              const status = NEED_STATUS[need.status];
              const offered = need.myEngagementIds?.length ?? 0;
              return (
                <div key={need.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0"><ClipboardList className="w-4 h-4 text-emerald-600 shrink-0" /><span className="font-bold text-sm text-slate-900 dark:text-white">{need.title}</span></div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="text-xs text-slate-500">{need.project.projectName} · {need.project.organisationName}</div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div><dt className="text-slate-400 font-bold">Asset</dt><dd>{need.quantity} × {ASSET_TYPE_LABELS[need.assetType]}</dd></div>
                    <div><dt className="text-slate-400 font-bold">Period</dt><dd>{need.startDate || need.endDate ? `${need.startDate ?? '?'} to ${need.endDate ?? '?'}` : 'Flexible'}</dd></div>
                    <div><dt className="text-slate-400 font-bold">Where</dt><dd>{need.location || '-'}</dd></div>
                    <div><dt className="text-slate-400 font-bold">Preferred akad</dt><dd>{PREFERRED_AKAD_LABELS[need.preferredAkad ?? 'EITHER']}</dd></div>
                  </dl>
                  {need.description && <p className="text-xs text-slate-600 dark:text-slate-300">{need.description}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    {side === 'OWNER' ? (
                      <>
                        <span className="text-[11px] text-slate-400">{offered ? `You made ${offered} offer${offered > 1 ? 's' : ''}` : ''}</span>
                        <button type="button" onClick={() => setOfferFor(need)} className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">Offer an asset</button>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] text-slate-400">{need.offerCount ?? 0} offer(s) · {need.approvedCount} of {need.quantity} approved</span>
                        {(need.offerCount ?? 0) > 0 && <button type="button" onClick={() => setCompareNeedId(need.id)} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">Compare offers</button>}
                        {need.status !== 'FILLED' && <button type="button" onClick={() => void apiClient.setAssetNeedStatus(need.id, need.status === 'OPEN' ? 'CLOSED' : 'OPEN').then(load).catch((cause) => setError(apiErrorMessage(cause, 'Not changed.')))} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer">{need.status === 'OPEN' ? 'Close' : 'Reopen'}</button>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'listed' && (
        <div className="space-y-3">
          <select aria-label="Type of asset" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AssetTypeCode | '')} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer">
            <option value="">All types</option>
            {(Object.keys(ASSET_TYPE_LABELS) as AssetTypeCode[]).map((type) => <option key={type} value={type}>{ASSET_TYPE_LABELS[type]}</option>)}
          </select>
          {listed.length === 0 ? <p className="p-6 text-center text-xs text-slate-400">{loading ? 'Loading…' : 'No verified asset is offered in your country yet.'}</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listed.map((asset) => (
                <div key={asset.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{asset.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 whitespace-nowrap">Verified</span>
                  </div>
                  <div className="text-xs text-slate-500">{ASSET_TYPE_LABELS[asset.assetType]}{asset.region ? ` · ${asset.region}` : ''}{summary(asset) ? ` · ${summary(asset)}` : ''}</div>
                  {asset.offerTerms && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                      <div>Open to: <strong>{PREFERRED_AKAD_LABELS[asset.offerTerms.preferredAkad]}</strong>{asset.offerTerms.availableFrom ? ` · from ${asset.offerTerms.availableFrom}` : ''}{asset.offerTerms.availableUntil ? ` until ${asset.offerTerms.availableUntil}` : ''}</div>
                      {asset.offerTerms.indicativeTerms && <div>Indicative: {asset.offerTerms.indicativeTerms}</div>}
                    </div>
                  )}
                  {asset.committed.length > 0 && <div className="text-[11px] text-slate-500">Committed: {asset.committed.map((period) => `${period.startDate} to ${period.endDate}`).join('; ')}</div>}
                  {asset.isEncumbered && <div className="flex items-center gap-1 text-[11px] text-amber-700"><AlertTriangle className="w-3 h-3" />Under financing: the financier must consent</div>}
                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button type="button" onClick={() => setRequestFor(asset)} className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">Ask to use</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(tab === 'engagements' || tab === 'review') && engagementList(shown)}

      {/* Above the sticky header: this page is inside an animated (transformed) container. */}
      <ModalPortal>
        {compareNeedId && !selected && <OfferComparisonModal needId={compareNeedId} refreshKey={compareRefresh} onOpen={(engagement) => setSelected(engagement)} onClose={() => setCompareNeedId(null)} />}
        {selected && <EngagementDetailModal engagement={selected} isSuperAdmin={currentRole === 'Super Admin'} onChanged={replace} onClose={() => setSelected(null)} onOpenAgreement={onOpenAgreement ? () => { setSelected(null); onOpenAgreement(); } : undefined} onOpenContracts={onOpenContracts ? () => { setSelected(null); onOpenContracts(); } : undefined} />}
        {offerFor && <ProposeEngagementModal mode="OFFER" need={offerFor} organisationId={tenantContext.organisationId} onClose={() => setOfferFor(null)} onRegisterAsset={onOpenAssetRegister ? (type) => { setOfferFor(null); onOpenAssetRegister(type); } : undefined} onCreated={(engagement) => { setOfferFor(null); setTab('engagements'); replace(engagement); }} />}
        {requestFor && <ProposeEngagementModal mode="REQUEST" asset={requestFor} organisationId={tenantContext.organisationId} onClose={() => setRequestFor(null)} onCreated={(engagement) => { setRequestFor(null); setTab('engagements'); replace(engagement); }} />}
        {needForm && <NeedFormModal organisationId={tenantContext.organisationId} onClose={() => setNeedForm(false)} onCreated={() => { setNeedForm(false); setTab('needs'); void load(); }} />}
      </ModalPortal>
    </div>
  );
};
