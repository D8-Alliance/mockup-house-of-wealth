import React, { useState } from 'react';
import { useRBAC } from '../../rbac/RBACContext';
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
  Clock 
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
  onOpenAssetRegister: () => void;
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
  const { currentRole, roleDef, checkPermission } = useRBAC();
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
                {roleDef.category} • {currentRole}
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                AAOIFI Certified Node
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, {user.name}
            </h1>

            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              {roleDef.description}
            </p>
          </div>

          {/* Role Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onOpenPdpRegister && (
              <button
                type="button"
                onClick={onOpenPdpRegister}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all"
              >
                <Building2 className="w-4 h-4" />
                <span>PDP Onboarding</span>
              </button>
            )}

            {checkPermission('assets', 'create') && (
              <button
                type="button"
                onClick={onOpenAssetRegister}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Asset</span>
              </button>
            )}

            {checkPermission('contracts', 'create') && (
              <button
                type="button"
                onClick={onOpenContractWizard}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-600 flex items-center gap-2 cursor-pointer"
              >
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Issue Contract</span>
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
      {onOpenPdpRegister && (
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

      {/* Core Modules Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-500" />
            <h4 className="font-black text-slate-900 dark:text-white text-sm">Asset Holdings</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {assets.length} Tokenized Real World Assets currently listed in the portfolio.
          </p>
          <button 
            onClick={() => setTab('assets')}
            className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Assets</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-blue-500" />
            <h4 className="font-black text-slate-900 dark:text-white text-sm">Islamic Smart Contracts</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {contracts.length} Active Mudarabah, Musharakah, and Wakalah agreements.
          </p>
          <button 
            onClick={() => setTab('contracts')}
            className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Contracts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-purple-500" />
            <h4 className="font-black text-slate-900 dark:text-white text-sm">Marketplace & Liquidity</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Discover tokenized Sukuk offerings and Waqf pool allocations across D-8 nations.
          </p>
          <button 
            onClick={() => setTab('marketplace')}
            className="text-xs font-extrabold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Explore Opportunities</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
