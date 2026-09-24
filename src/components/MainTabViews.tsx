import React from 'react';
import { NavTab, LanguageCode, UserProfile, AssetItem, ContractItem, MarketplaceItem, PaymentAccount, BeneficiaryItem, LedgerTransaction } from '../types';
import { RoleGuard } from '../rbac/RoleGuard';
import { RoleDashboardView } from './dashboards/RoleDashboardView';
import { MyAssetsView } from './MyAssetsView';
import { MyContractsView } from './MyContractsView';
import { AssetDiscoveryView } from './AssetDiscoveryView';
import { PoolingView } from './PoolingView';
import { LedgerView } from './LedgerView';
import { UserProfileSettingsView } from './UserProfileSettingsView';
import { InvestmentsView } from './InvestmentsView';
import { WalletView } from './WalletView';
import { FinancialsView } from './FinancialsView';
import { DocumentsView } from './DocumentsView';
import { NotificationsView } from './NotificationsView';
import { TimelineView } from './TimelineView';
import { AuditTrailView } from './AuditTrailView';
import { AIWealthEngineView } from './AIWealthEngineView';
import { AdminCenterView } from './AdminCenterView';
import { ProjectSponsorView } from './sponsor/ProjectSponsorView';
import { MembershipView } from './revenue/MembershipView';
import { BeneficiariesView } from './BeneficiariesView';
import { BillingTransactionsView } from './revenue/BillingTransactionsView';

interface MainTabViewsProps {
  currentTab: NavTab;
  setTab: (tab: NavTab) => void;
  lang: LanguageCode;
  user: UserProfile;
  assets: AssetItem[];
  contracts: ContractItem[];
  marketplace: MarketplaceItem[];
  ledger: LedgerTransaction[];
  paymentAccounts: PaymentAccount[];
  setPaymentAccounts: React.Dispatch<React.SetStateAction<PaymentAccount[]>>;
  beneficiaries: BeneficiaryItem[];
  setBeneficiaries: React.Dispatch<React.SetStateAction<BeneficiaryItem[]>>;
  onOpenAssetRegister: () => void;
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
  paymentAccounts,
  setPaymentAccounts,
  beneficiaries,
  setBeneficiaries,
  onOpenAssetRegister,
  onOpenContractWizard,
  onOpenFinancialPerf,
  onOpenPdpRegister,
  setUser
}) => {
  return (
    <>
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
          <AdminCenterView />
        </RoleGuard>
      )}

      {currentTab === 'sponsor-portal' && (
        <RoleGuard tab="sponsor-portal">
          <ProjectSponsorView />
        </RoleGuard>
      )}

      {currentTab === 'assets' && (
        <RoleGuard tab="assets">
          <MyAssetsView
            assets={assets}
            lang={lang}
            onOpenAssetRegister={onOpenAssetRegister}
            onOpenContractWizard={onOpenContractWizard}
          />
        </RoleGuard>
      )}

      {currentTab === 'contracts' && (
        <RoleGuard tab="contracts">
          <MyContractsView
            contracts={contracts}
            lang={lang}
            onOpenContractWizard={onOpenContractWizard}
            onOpenFinancialPerf={onOpenFinancialPerf}
          />
        </RoleGuard>
      )}

      {currentTab === 'marketplace' && (
        <RoleGuard tab="marketplace">
          <AssetDiscoveryView
            items={marketplace}
            lang={lang}
            onSelectInvestment={() => onOpenContractWizard()}
          />
        </RoleGuard>
      )}

      {currentTab === 'pooling' && (
        <RoleGuard tab="pooling">
          <PoolingView
            lang={lang}
            onOpenAssetRegister={onOpenAssetRegister}
          />
        </RoleGuard>
      )}

      {currentTab === 'ledger' && (
        <RoleGuard tab="ledger">
          <LedgerView transactions={ledger} lang={lang} />
        </RoleGuard>
      )}

      {currentTab === 'profile' && (
        <RoleGuard tab="profile">
          <UserProfileSettingsView
            user={user}
            setUser={setUser}
            paymentAccounts={paymentAccounts}
            setPaymentAccounts={setPaymentAccounts}
            beneficiaries={beneficiaries}
            setBeneficiaries={setBeneficiaries}
            lang={lang}
          />
        </RoleGuard>
      )}

      {currentTab === 'investments' && (
        <RoleGuard tab="investments">
          <InvestmentsView
            lang={lang}
            onNavigateMarketplace={() => setTab('marketplace')}
          />
        </RoleGuard>
      )}

      {currentTab === 'wallet' && (
        <RoleGuard tab="wallet">
          <WalletView />
        </RoleGuard>
      )}

      {currentTab === 'financials' && (
        <RoleGuard tab="financials">
          <FinancialsView />
        </RoleGuard>
      )}

      {currentTab === 'documents' && (
        <RoleGuard tab="documents">
          <DocumentsView />
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
    </>
  );
};
