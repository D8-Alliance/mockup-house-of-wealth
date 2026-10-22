import type { AssetTypeCode } from '../../services/apiClient';
import React, { useState } from 'react';
import { useRBAC } from '../../rbac/RBACContext';
import { canInvest, canSeePdpOnboarding, canSubmitProject } from '../../rbac/menuVisibility';
import { requestProjectRegistration } from '../sponsor/sponsorNavigation';
import { DashboardActivityPanel } from './DashboardActivityPanel';
import { DashboardOpenNeedsPanel } from './DashboardOpenNeedsPanel';
import { canDraftAgreement, openAiEngineSection } from '../../ai/aiEngineNavigation';
import { UserProfile, AssetItem, ContractItem, LanguageCode, NavTab } from '../../types';
import { 
  Building2, 
  Coins, 
  ShieldCheck, 
  Plus, 
  FileCheck, 
  CheckCircle2, 
  ChevronRight, 
  Globe2, 
  Award, 
  Clock,
  HandCoins,
  Handshake,
  FolderKanban,
  TrendingUp
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { ExecutiveDashboardWidgets } from './ExecutiveDashboardWidgets';
import { apiClient, DashboardSummary } from '../../services/apiClient';

interface RoleDashboardViewProps {
  user: UserProfile;
  assets: AssetItem[];
  contracts: ContractItem[];
  lang: LanguageCode;
  setTab: (tab: NavTab) => void;
  onOpenAssetRegister: (type?: AssetTypeCode) => void;
  onOpenContractWizard: () => void;
  onOpenPdpRegister?: () => void;
}

export const RoleDashboardView: React.FC<RoleDashboardViewProps> = ({
  user,
  assets,
  contracts,
  setTab,
  onOpenAssetRegister,
  onOpenContractWizard,
  onOpenPdpRegister
}) => {
  const { currentRole, roleDef, checkPermission, canAccessTab, tenantContext, isAuthenticated } = useRBAC();
  // The organisation the user acts for, e.g. "FELCRA", shown under their name.
  const [organisationName, setOrganisationName] = useState('');
  React.useEffect(() => {
    if (!isAuthenticated) { setOrganisationName(''); return; }
    void apiClient.getCurrentUser()
      .then((me) => setOrganisationName(me.assignedRoles.find((role) => role.organisationId === tenantContext.organisationId && role.organisationName)?.organisationName ?? ''))
      .catch(() => setOrganisationName(''));
  }, [isAuthenticated, tenantContext.organisationId]);
  // A delivery partner's own projects, for the projects card.
  const [projectSummary, setProjectSummary] = useState<string | null>(null);
  React.useEffect(() => {
    if (!canSubmitProject(currentRole) || currentRole === 'Super Admin' || currentRole === 'Country Admin') { setProjectSummary(null); return; }
    void apiClient.getProjects()
      .then((list) => {
        const own = list.filter((project) => project.organisationId === tenantContext.organisationId);
        const drafts = own.filter((project) => project.status === 'DRAFT').length;
        setProjectSummary(`${own.length} project${own.length === 1 ? '' : 's'}${own.length ? `: ${drafts} draft, ${own.length - drafts} submitted or further` : ' yet. Register your first one.'}`);
      })
      .catch(() => setProjectSummary(null));
  }, [currentRole, tenantContext.organisationId]);
  // Real counts for the asset card, for the roles that register or verify assets.
  const [assetSummary, setAssetSummary] = useState<string | null>(null);
  React.useEffect(() => {
    if (!['Asset Owner', 'Asset Manager', 'Country Admin', 'Legal Officer', 'Super Admin'].includes(currentRole)) { setAssetSummary(null); return; }
    void apiClient.getAssets()
      .then((list) => {
        const active = list.filter((asset) => asset.status !== 'WITHDRAWN');
        const verified = active.filter((asset) => asset.status === 'VERIFIED').length;
        const waiting = active.filter((asset) => asset.status === 'SUBMITTED').length;
        setAssetSummary(`${active.length} asset${active.length === 1 ? '' : 's'} registered: ${verified} verified, ${waiting} awaiting verification.`);
      })
      .catch(() => setAssetSummary(null));
  }, [currentRole]);
  const quickLinks = ([
    { tab: 'sponsor-portal', title: 'My Projects', text: projectSummary ?? 'Register projects, upload evidence and follow their review.', action: 'Open Sponsor Portal', icon: <FolderKanban className="w-5 h-5 text-amber-500" />, linkClass: 'text-amber-600 dark:text-amber-400' },
    { tab: 'assets', title: 'Asset Holdings', text: assetSummary ?? 'Land, buildings and machinery registered for Shariah-compliant use.', action: 'View Assets', icon: <Building2 className="w-5 h-5 text-emerald-500" />, linkClass: 'text-emerald-600 dark:text-emerald-400' },
    { tab: 'asset-partnerships', title: 'Asset Partnerships', text: 'Assets offered to projects, project asset needs, and offers waiting for a response.', action: 'Open Asset Partnerships', icon: <Handshake className="w-5 h-5 text-emerald-500" />, linkClass: 'text-emerald-600 dark:text-emerald-400' },
    { tab: 'contracts', title: 'Islamic Contracts', text: 'Your Islamic agreements and where each one is in Legal and Shariah review.', action: 'View Contracts', icon: <Coins className="w-5 h-5 text-blue-500" />, linkClass: 'text-blue-600 dark:text-blue-400' },
    { tab: 'pooling', title: 'Wealth Pools', text: 'Browse open Mudarabah and Waqf pools and their funding progress.', action: 'Explore Pools', icon: <HandCoins className="w-5 h-5 text-emerald-500" />, linkClass: 'text-emerald-600 dark:text-emerald-400' },
    { tab: 'investments', title: 'My Investments', text: 'Track your pool participations, profit distributions and exit requests.', action: 'View Investments', icon: <TrendingUp className="w-5 h-5 text-blue-500" />, linkClass: 'text-blue-600 dark:text-blue-400' },
    { tab: 'marketplace', title: 'Marketplace & Liquidity', text: 'Discover Sukuk offerings and Waqf pool allocations across D-8 nations.', action: 'Explore Opportunities', icon: <Globe2 className="w-5 h-5 text-purple-500" />, linkClass: 'text-purple-600 dark:text-purple-400' },
  ] satisfies { tab: NavTab; title: string; text: string; action: string; icon: React.ReactNode; linkClass: string }[])
    // Only investors invest; a delivery partner or asset owner has no investments to track.
    .filter(link => canAccessTab(link.tab) && (link.tab !== 'investments' || canInvest(currentRole)))
    .filter(link => link.tab !== 'sponsor-portal' || projectSummary !== null)
    .slice(0, 3);
  // PDP onboarding is offered only to visitors and the roles that deliver projects, pools or assets.
  const showPdpOnboarding = !!onOpenPdpRegister && canSeePdpOnboarding(currentRole);
  const [approvalActionDone, setApprovalActionDone] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  React.useEffect(() => {
    void apiClient.getDashboardSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  const handleQuickApprove = (itemTitle: string) => {
    setApprovalActionDone(itemTitle);
    setTimeout(() => setApprovalActionDone(null), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Role Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-700/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${roleDef.badgeColor}`}>
                {roleDef.category === currentRole ? currentRole : `${roleDef.category} • ${currentRole}`}
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Shariah Governance
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, {user.name}
            </h1>

            {isAuthenticated && currentRole !== 'Guest' && (
              <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                <Building2 className="w-4 h-4" />
                {organisationName || tenantContext.organisationId}
                <span className="font-mono text-[11px] font-normal text-slate-400">{organisationName ? tenantContext.organisationId : ''}</span>
              </p>
            )}

            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              {roleDef.description}
            </p>
          </div>

          {/* Role Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {showPdpOnboarding && (
              <button
                type="button"
                onClick={onOpenPdpRegister}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all"
              >
                <Building2 className="w-4 h-4" />
                <span>PDP Onboarding</span>
              </button>
            )}

            {(currentRole === 'Asset Owner' || currentRole === 'Asset Manager') && (
              <button
                type="button"
                onClick={() => onOpenAssetRegister()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Asset</span>
              </button>
            )}

            {canSubmitProject(currentRole) && canAccessTab('sponsor-portal') && (
              <button
                type="button"
                onClick={() => { requestProjectRegistration(); setTab('sponsor-portal'); }}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Submit New Project</span>
              </button>
            )}

            {/* Agreements go through the real chain (draft, Legal review, Shariah review) in Agreement Generation. */}
            {canDraftAgreement(currentRole) && canAccessTab('ai-engine') && (
              <button
                type="button"
                onClick={() => { openAiEngineSection('agreement-generation'); setTab('ai-engine'); }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-600 flex items-center gap-2 cursor-pointer"
              >
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Draft Agreement</span>
              </button>
            )}

            {currentRole === 'Guest' && (
              <button
                type="button"
                onClick={() => setTab('marketplace')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Marketplace</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PDP Onboarding Opportunity Banner */}
      {showPdpOnboarding && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900/40 via-purple-950/20 to-slate-900/60 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Delivery Partner Architecture
              </span>
              <span className="text-xs text-slate-400 font-mono">D-8 Wealth Pooling</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Are you a Pool, Product, or Project Delivery Partner (PDP)?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
              Complete the 10-step institutional onboarding to register your organisation, certify Shariah governance, submit bank settlement coordinates, and originate D-8 wealth pools.
            </p>
          </div>
          <button
            onClick={onOpenPdpRegister}
            className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md shadow-purple-600/30 shrink-0 cursor-pointer flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            <span>Start PDP Registration</span>
          </button>
        </div>
      )}

      {/* Toast Notification for Approvals */}
      {approvalActionDone && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>Action Recorded: "{approvalActionDone}" approved & cryptographically logged on D-8 Ledger.</span>
        </div>
      )}

      {/* Executive Dashboards */}
      <ExecutiveDashboardWidgets
        currentRole={currentRole}
        assets={assets}
        contracts={contracts}
        setTab={setTab}
        onQuickApprove={handleQuickApprove}
      />

      {/* Database-backed dashboard summary */}
      {['Investor', 'Asset Owner', 'Organization Admin', 'Pool Manager', 'Customer Support', 'Guest', 'Shariah Advisor', 'Compliance Officer', 'Risk Officer', 'Finance Officer', 'Auditor'].includes(currentRole) && !['Super Admin', 'Country Admin'].includes(currentRole) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Project Value" value={summary ? `$${summary.totalProjectValue.toLocaleString()}` : 'Loading...'} sub="Database total" icon={<Coins className="w-5 h-5 text-emerald-500" />} />
          <MetricCard label="Funding Required" value={summary ? `$${summary.fundingRequired.toLocaleString()}` : 'Loading...'} sub={`${summary?.projectCount ?? 0} projects in scope`} icon={<FileCheck className="w-5 h-5 text-blue-500" />} />
          <MetricCard label="Active Pools" value={summary ? summary.activePoolCount.toString() : 'Loading...'} sub="Database count" icon={<Award className="w-5 h-5 text-teal-500" />} />
          <MetricCard label="Active Contracts" value={summary ? summary.contractCount.toString() : 'Loading...'} sub="Database count" icon={<Clock className="w-5 h-5 text-amber-500" />} />
        </div>
      )}

      {isAuthenticated && (currentRole === 'Asset Owner' || currentRole === 'Asset Manager') && <DashboardOpenNeedsPanel setTab={setTab} onOpenAssetRegister={onOpenAssetRegister} />}

      {isAuthenticated && currentRole !== 'Guest' && <DashboardActivityPanel setTab={setTab} />}

      {/* Core Modules Quick Grid: only modules this role can open, so no link leads to Access Denied */}
      {quickLinks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickLinks.map(link => (
            <div key={link.tab} className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-3">
              <div className="flex items-center gap-2">
                {link.icon}
                <h4 className="font-black text-slate-900 dark:text-white text-sm">{link.title}</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{link.text}</p>
              <button
                onClick={() => setTab(link.tab)}
                className={`text-xs font-extrabold ${link.linkClass} hover:underline flex items-center gap-1 cursor-pointer`}
              >
                <span>{link.action}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
