import type { AssetTypeCode } from '../services/apiClient';
import React, { Suspense, lazy } from 'react';
import { NavTab, LanguageCode, UserProfile, AssetItem, ContractItem, MarketplaceItem, BeneficiaryItem, LedgerTransaction } from '../types';
import { RoleGuard } from '../rbac/RoleGuard';
import { RoleDashboardView } from './dashboards/RoleDashboardView';
import { MyContractsView } from './MyContractsView';
import { AgreementReviewPanel } from '../ai/features/contract/AgreementReviewPanel';
import { LedgerView } from './LedgerView';
import { InvestmentsView } from './InvestmentsView';
import { InvestorPoolsPanel } from './investments/InvestorPoolsPanel';
import { InvestorPositionsPanel } from './investments/InvestorPositionsPanel';
import { InvestorProfitHistoryPanel } from './investments/InvestorProfitHistoryPanel';
import { InvestorAgreementsPanel } from './investments/InvestorAgreementsPanel';
import { PlatformOrdersPanel } from './investments/PlatformOrdersPanel';
import { LivePoolsPanel } from '../pooling/LivePoolsPanel';
import { LiveDocumentVault } from './documents/LiveDocumentVault';
import { RoleDocumentVault } from './documents/RoleDocumentVault';
import { InvestorWalletNotice } from './investments/InvestorWalletNotice';
import { InvestorPerformanceReports } from './performance/PerformanceReports';
import { WalletView } from './WalletView';
import { DocumentsView } from './DocumentsView';
import { NotificationsView } from './NotificationsView';
import { TimelineView } from './TimelineView';
import { AuditTrailView } from './AuditTrailView';
import { BeneficiariesView } from './BeneficiariesView';
import { BillingTransactionsView } from './revenue/BillingTransactionsView';
import { BackendFinancialAccount } from '../services/apiClient';
import { SponsorAgreementsView } from './sponsor/SponsorAgreementsView';
import { useRBAC } from '../rbac/RBACContext';
import { canInvest, isDeliveryPartner } from '../rbac/menuVisibility';

// The big screens load when their tab is first opened, so the first page loads faster.
const AssetRegisterView = lazy(() => import('../assets/AssetRegisterView').then((m) => ({ default: m.AssetRegisterView })));
const AssetPartnershipsView = lazy(() => import('../asset-partnerships/AssetPartnershipsView').then((m) => ({ default: m.AssetPartnershipsView })));
const AssetDiscoveryView = lazy(() => import('./AssetDiscoveryView').then((m) => ({ default: m.AssetDiscoveryView })));
const PoolingView = lazy(() => import('./PoolingView').then((m) => ({ default: m.PoolingView })));
const UserProfileSettingsView = lazy(() => import('./UserProfileSettingsView').then((m) => ({ default: m.UserProfileSettingsView })));
const FinancialsView = lazy(() => import('./FinancialsView').then((m) => ({ default: m.FinancialsView })));
const AIWealthEngineView = lazy(() => import('./AIWealthEngineView').then((m) => ({ default: m.AIWealthEngineView })));
const AdminCenterView = lazy(() => import('./AdminCenterView').then((m) => ({ default: m.AdminCenterView })));
const ProjectSponsorView = lazy(() => import('./sponsor/ProjectSponsorView').then((m) => ({ default: m.ProjectSponsorView })));
const MembershipView = lazy(() => import('./revenue/MembershipView').then((m) => ({ default: m.MembershipView })));

interface MainTabViewsProps {
  currentTab: NavTab;
  setTab: (tab: NavTab) => void;
  lang: LanguageCode;
  user: UserProfile;
  assets: AssetItem[];
  contracts: ContractItem[];
  marketplace: MarketplaceItem[];
  ledger: LedgerTransaction[];
  financialAccounts: BackendFinancialAccount[];
  onFinancialRefresh: () => Promise<void>;
  beneficiaries: BeneficiaryItem[];
  setBeneficiaries: React.Dispatch<React.SetStateAction<BeneficiaryItem[]>>;
  onOpenAssetRegister: (type?: AssetTypeCode) => void;
  assetRegisterRequested?: { type?: AssetTypeCode } | null;
  onAssetRegisterStarted?: () => void;
  onOpenContractWizard: () => void;
  onOpenFinancialPerf: (contract: ContractItem) => void;
  onOpenPdpRegister?: () => void;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export const MainTabViews: React.FC<MainTabViewsProps> = ({
  currentTab,
  setTab,
  lang,
  user,
  assets,
  contracts,
  marketplace,
  ledger,
  financialAccounts,
  onFinancialRefresh,
  beneficiaries,
  setBeneficiaries,
  onOpenAssetRegister,
  assetRegisterRequested,
  onAssetRegisterStarted,
  onOpenContractWizard,
  onOpenFinancialPerf,
  onOpenPdpRegister,
  setUser
}) => {
  const { currentRole, authMode, checkPermission } = useRBAC();
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading…</p>}>
      {currentTab === 'dashboard' && (
        <RoleGuard tab="dashboard">
          <RoleDashboardView
            user={user}
            assets={assets}
            contracts={contracts}
            lang={lang}
            setTab={setTab}
            onOpenAssetRegister={onOpenAssetRegister}
            onOpenContractWizard={onOpenContractWizard}
            onOpenPdpRegister={onOpenPdpRegister}
          />
        </RoleGuard>
      )}

      {currentTab === 'ai-engine' && (
        <RoleGuard tab="ai-engine">
          <AIWealthEngineView onNavigateToMembership={() => setTab('membership')} />
        </RoleGuard>
      )}

      {currentTab === 'admin-center' && (
        <RoleGuard tab="admin-center">
          <AdminCenterView onNavigate={setTab} />
        </RoleGuard>
      )}

      {currentTab === 'sponsor-portal' && (
        <RoleGuard tab="sponsor-portal">
          <ProjectSponsorView onNavigate={setTab} />
        </RoleGuard>
      )}

      {currentTab === 'assets' && (
        <RoleGuard tab="assets">
          <AssetRegisterView startRegistering={assetRegisterRequested} onStartedRegistering={onAssetRegisterStarted} onOpenAgreement={() => setTab('ai-engine')} />
        </RoleGuard>
      )}

      {currentTab === 'asset-partnerships' && (
        <RoleGuard tab="asset-partnerships">
          <AssetPartnershipsView onOpenAgreement={() => setTab('ai-engine')} onOpenContracts={() => setTab('contracts')} onOpenAssetRegister={onOpenAssetRegister} />
        </RoleGuard>
      )}

      {currentTab === 'contracts' && (
        <RoleGuard tab="contracts">
          <div className="mb-6"><AgreementReviewPanel /></div>
          {/* A delivery partner receives funding and owes profit, so it sees its pool agreements from the server. */}
          {isDeliveryPartner(currentRole) ? (
            <SponsorAgreementsView />
          ) : canInvest(currentRole) && (
            <MyContractsView
              contracts={contracts}
              lang={lang}
              onOpenContractWizard={onOpenContractWizard}
              onOpenFinancialPerf={onOpenFinancialPerf}
            />
          )}
        </RoleGuard>
      )}

      {currentTab === 'marketplace' && (
        <RoleGuard tab="marketplace">
          {/* Outside the demo the marketplace is the pools open for investment, from the database. */}
          {authMode !== 'DEMO' ? <LivePoolsPanel mode="marketplace" /> : <AssetDiscoveryView
            items={marketplace}
            lang={lang}
            onSelectInvestment={() => onOpenContractWizard()}
          />}
        </RoleGuard>
      )}

      {currentTab === 'pooling' && (
        <RoleGuard tab="pooling">
          {/* The pooling page reads projects and pools from the database in every mode. */}
          <PoolingView
            lang={lang}
            onOpenAssetRegister={() => onOpenAssetRegister()}
          />
        </RoleGuard>
      )}

      {currentTab === 'ledger' && (
        <RoleGuard tab="ledger">
          <LedgerView lang={lang} />
        </RoleGuard>
      )}

      {currentTab === 'profile' && (
        <RoleGuard tab="profile">
          <UserProfileSettingsView
            user={user}
            setUser={setUser}
            beneficiaries={beneficiaries}
            setBeneficiaries={setBeneficiaries}
            lang={lang}
            setTab={setTab}
          />
        </RoleGuard>
      )}

      {currentTab === 'investments' && (
        <RoleGuard tab="investments">
          {canInvest(currentRole) ? (
            <div className="space-y-4">
              <InvestorPositionsPanel />
              <InvestorProfitHistoryPanel />
              <InvestorPerformanceReports />
              <InvestorAgreementsPanel />
              <InvestorPoolsPanel />
            </div>
          ) : authMode !== 'DEMO' ? (
            <PlatformOrdersPanel />
          ) : (
            <InvestmentsView
              lang={lang}
              onNavigateMarketplace={() => setTab('marketplace')}
            />
          )}
        </RoleGuard>
      )}

      {currentTab === 'wallet' && (
        <RoleGuard tab="wallet">
          {authMode !== 'DEMO' && canInvest(currentRole)
            ? <InvestorWalletNotice onOpenInvestments={() => setTab('investments')} onOpenFinancials={() => setTab('financials')} />
            : <WalletView accounts={financialAccounts} onRefresh={onFinancialRefresh} />}
        </RoleGuard>
      )}

      {currentTab === 'financials' && (
        <RoleGuard tab="financials">
          <FinancialsView />
        </RoleGuard>
      )}

      {currentTab === 'documents' && (
        <RoleGuard tab="documents">
          {/* Project documents need project read access (marketplace:read on the server); other roles get their own documents. */}
          {/* The server gives auditors no project access; their Documents tab holds the performance reports to verify. */}
          {authMode === 'DEMO' ? <DocumentsView /> : checkPermission('marketplace', 'read') && currentRole !== 'Auditor' ? <LiveDocumentVault /> : <RoleDocumentVault role={currentRole} />}
        </RoleGuard>
      )}

      {currentTab === 'beneficiaries' && (
        <RoleGuard tab="beneficiaries">
          <BeneficiariesView
            beneficiaries={beneficiaries}
            setBeneficiaries={setBeneficiaries}
            lang={lang}
          />
        </RoleGuard>
      )}

      {currentTab === 'membership' && (
        <RoleGuard tab="membership">
          <MembershipView userId={user.id} userRole={user.role} />
        </RoleGuard>
      )}

      {currentTab === 'billing-transactions' && <BillingTransactionsView />}
    </Suspense>
  );
};
