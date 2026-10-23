import React, { useEffect, useState } from 'react';
import { ChevronRight, ClipboardCheck, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { NavTab } from '../../types';
import { useRBAC } from '../../rbac/RBACContext';
import { openAgreementRecord, openAiEngineSection } from '../../ai/aiEngineNavigation';
import { openPartnership } from '../../asset-partnerships/partnershipNavigation';
import { openAdminSection } from '../adminNavigation';
import { formatDateTime } from '../../utils/platformTime';

type Kind = 'Asset partnership' | 'Agreement' | 'PDP application (KYB)' | 'Organisation (KYB)' | 'Asset verification' | 'KYC' | 'Project (Shariah board)';
interface ReviewItem { key: string; kind: Kind; title: string; detail: string; at?: string; open: () => void }

const has = (role: string, roles: string[]) => roles.includes(role);
const PARTNERSHIP_REVIEWERS = ['Super Admin', 'Country Admin', 'Legal Officer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'];
const AGREEMENT_REVIEWERS = ['Legal Officer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'];
const KYB_REVIEWERS = ['Super Admin', 'Country Admin', 'KYB Officer', 'Compliance Officer'];
const ASSET_VERIFIERS = ['Super Admin', 'Country Admin', 'Legal Officer'];
const KYC_REVIEWERS = ['Super Admin', 'Country Admin', 'KYC Officer', 'Compliance Officer'];
const SHARIAH_BOARD = ['Super Admin', 'Country Admin', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'];
export const MY_REVIEWS_ROLES = [...new Set([...PARTNERSHIP_REVIEWERS, ...AGREEMENT_REVIEWERS, ...KYB_REVIEWERS, ...ASSET_VERIFIERS, ...KYC_REVIEWERS, ...SHARIAH_BOARD])];

/**
 * Everything waiting for this reviewer's decision, from every queue the role can act on, in one list
 * with a link straight to each item. Each queue is loaded on its own, so one failing does not hide the rest.
 */
export const MyReviewsPanel: React.FC<{ setTab: (tab: NavTab) => void }> = ({ setTab }) => {
  const { currentRole: role } = useRBAC();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const queues: Array<Promise<ReviewItem[]>> = [];
    if (has(role, PARTNERSHIP_REVIEWERS)) queues.push(apiClient.getAssetEngagements().then((list) => list.filter((item) => item.canReview).map((item) => ({
      key: `eng-${item.id}`, kind: 'Asset partnership' as Kind, title: `${item.asset.name} for ${item.project.projectName}`,
      detail: `${item.akad === 'IJARAH' ? 'Ijarah' : 'Musharakah'} · ${item.legalApprovedAt ? 'Legal approved, Shariah pending' : item.shariahApprovedAt ? 'Shariah approved, Legal pending' : 'Legal and Shariah pending'}`,
      at: item.updatedAt, open: () => { openPartnership(item.id); setTab('asset-partnerships'); },
    }))));
    if (has(role, AGREEMENT_REVIEWERS)) queues.push(apiClient.listAgreements().then((list) => list.filter((item) => item.availableActions.length > 0).map((item) => ({
      key: `agr-${item.id}`, kind: 'Agreement' as Kind, title: `${item.title ?? item.contractType} ${item.contractNumber}`,
      detail: item.availableActions.map((action) => action.label).join(' / '), at: item.updatedAt,
      open: () => { openAgreementRecord(item.id); setTab('contracts'); },
    }))));
    if (has(role, KYB_REVIEWERS)) queues.push(apiClient.getPdpReviewQueue('SUBMITTED').then((list) => list.map((item) => ({
      key: `pdp-${item.id}`, kind: 'PDP application (KYB)' as Kind, title: item.organisationName, detail: `${item.applicationNumber} · ${item.pdpType}`,
      at: item.submittedAt, open: () => { openAdminSection('pdp_applications'); setTab('admin-center'); },
    }))));
    if (has(role, KYB_REVIEWERS)) queues.push(apiClient.getOrganisationKybQueue('SUBMITTED').then((list) => list.map((item) => ({
      key: `org-${item.id}`, kind: 'Organisation (KYB)' as Kind, title: item.name, detail: item.registrationNumber ?? '-',
      at: item.kybSubmittedAt ?? undefined, open: () => { openAdminSection('compliance_kyb'); setTab('admin-center'); },
    }))));
    if (has(role, ASSET_VERIFIERS)) queues.push(apiClient.getAssets('SUBMITTED').then((list) => list.map((item) => ({
      key: `ast-${item.id}`, kind: 'Asset verification' as Kind, title: item.name, detail: `${item.assetType.toLowerCase()} · ${item.id}`,
      at: item.submittedAt ?? undefined, open: () => setTab('assets'),
    }))));
    if (has(role, KYC_REVIEWERS)) queues.push(apiClient.getKycQueue('SUBMITTED').then((list) => list.map((item) => ({
      key: `kyc-${item.id}`, kind: 'KYC' as Kind, title: item.fullName || item.userEmail, detail: item.applicationNumber,
      open: () => { openAdminSection('compliance_kyc'); setTab('admin-center'); },
    }))));
    if (has(role, SHARIAH_BOARD)) queues.push(apiClient.getCentralMalaysiaShariahReviews().then((list) => list.filter((item) => item.status === 'PROPOSED' || item.status === 'UNDER_REVIEW').map((item) => ({
      key: `shr-${item.id}`, kind: 'Project (Shariah board)' as Kind, title: item.projectId, detail: `${item.proposedContract} · ${item.status.toLowerCase().replace('_', ' ')}`,
      open: () => { openAiEngineSection('shariah-board'); setTab('ai-engine'); },
    }))));
    const results = await Promise.all(queues.map((queue) => queue.catch(() => [] as ReviewItem[])));
    setItems(results.flat().sort((a, b) => (a.at ?? '') < (b.at ?? '') ? -1 : 1));
    setLoading(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [role]);

  const counts = (items ?? []).reduce<Record<string, number>>((all, item) => ({ ...all, [item.kind]: (all[item.kind] ?? 0) + 1 }), {});
  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white">My reviews</h3>
          {items && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${items.length ? 'bg-amber-500 text-white' : 'bg-emerald-500/10 text-emerald-700'}`}>{items.length ? `${items.length} waiting` : 'All clear'}</span>}
        </div>
        <button type="button" onClick={() => void load()} className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer" title="Refresh"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      {items && items.length > 0 && <p className="text-[11px] text-slate-500">{Object.entries(counts).map(([kind, count]) => `${count} ${kind.toLowerCase()}`).join(' · ')}. Oldest first.</p>}
      {!items && <p className="text-xs text-slate-400">Loading…</p>}
      {items && items.length === 0 && <p className="text-xs text-slate-500">Nothing is waiting for your decision.</p>}
      <ul className="divide-y divide-slate-100 dark:divide-slate-700">
        {(items ?? []).slice(0, 12).map((item) => (
          <li key={item.key}>
            <button type="button" onClick={item.open} className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-xl px-2 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">{item.kind}</span>
                <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</span>
                <span className="block text-[11px] text-slate-500 truncate">{item.detail}{item.at ? ` · ${formatDateTime(item.at)}` : ''}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
      {items && items.length > 12 && <p className="text-[11px] text-slate-400">And {items.length - 12} more in their queues.</p>}
    </div>
  );
};
