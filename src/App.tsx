import React, { useState, useEffect } from 'react';
import { NavTab, LanguageCode, UserProfile, AssetItem, ContractItem, MarketplaceItem, PaymentAccount, BeneficiaryItem } from './types';
import { LANGUAGES } from './data/translations';
import { 
  INITIAL_ASSETS, 
  INITIAL_CONTRACTS, 
  INITIAL_MARKETPLACE, 
  INITIAL_LEDGER,
  INITIAL_PAYMENT_ACCOUNTS,
  INITIAL_BENEFICIARIES
} from './data/initialData';

import { RBACProvider, useRBAC } from './rbac/RBACContext';
import { TenancyProvider } from './tenancy/TenancyContext';
import { RoleSwitcherBar } from './rbac/RoleSwitcherBar';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { MainTabViews } from './components/MainTabViews';

import { CodeReviewModal } from './components/CodeReviewModal';
import { ContractWizardModal } from './components/ContractWizardModal';
import { ContractFinancialPerfModal } from './components/ContractFinancialPerfModal';
import { AssetRegistrationWizardModal } from './components/AssetRegistrationWizardModal';
import { PDPRegistrationModal } from './pdp/components/PDPRegistrationModal';
import { LoginModal } from './components/auth/LoginModal';

function MainAppContent() {
  const [currentTab, setTab] = useState<NavTab>('dashboard');
  const [lang, setLang] = useState<LanguageCode>('en');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const { activeUser, showLoginModal, setShowLoginModal } = useRBAC();

  const [user, setUser] = useState<UserProfile>(activeUser);

  useEffect(() => {
    setUser(activeUser);
  }, [activeUser.role, activeUser.name]);

  const [assets, setAssets] = useState<AssetItem[]>(INITIAL_ASSETS);
  const [contracts, setContracts] = useState<ContractItem[]>(INITIAL_CONTRACTS);
  const [marketplace] = useState<MarketplaceItem[]>(INITIAL_MARKETPLACE);
  const [ledger] = useState(INITIAL_LEDGER);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(INITIAL_PAYMENT_ACCOUNTS);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryItem[]>(INITIAL_BENEFICIARIES);

  // Modal controls
  const [codeReviewOpen, setCodeReviewOpen] = useState(false);
  const [contractWizardOpen, setContractWizardOpen] = useState(false);
  const [assetRegisterOpen, setAssetRegisterOpen] = useState(false);
  const [pdpRegisterOpen, setPdpRegisterOpen] = useState(false);
  const [selectedContractPerf, setSelectedContractPerf] = useState<ContractItem | null>(null);

  const currentLangObj = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const isRtl = currentLangObj.dir === 'rtl';

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleAddAsset = (newAsset: AssetItem) => {
    setAssets([newAsset, ...assets]);
    setAssetRegisterOpen(false);
    setTab('assets');
  };

  const handleAddContract = (newContract: ContractItem) => {
    setContracts([newContract, ...contracts]);
    setContractWizardOpen(false);
    setTab('contracts');
  };

  return (
    <div 
      dir={isRtl ? 'rtl' : 'ltr'} 
      className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200"
    >
      <RoleSwitcherBar />

      <Navbar
        currentTab={currentTab}
        setTab={setTab}
        lang={lang}
        setLang={setLang}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={user}
        onOpenCodeReview={() => setCodeReviewOpen(true)}
        onOpenPdpRegister={() => setPdpRegisterOpen(true)}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MainTabViews
          currentTab={currentTab}
          setTab={setTab}
          lang={lang}
          user={user}
          assets={assets}
          contracts={contracts}
          marketplace={marketplace}
          ledger={ledger}
          paymentAccounts={paymentAccounts}
          setPaymentAccounts={setPaymentAccounts}
          beneficiaries={beneficiaries}
          setBeneficiaries={setBeneficiaries}
          onOpenAssetRegister={() => setAssetRegisterOpen(true)}
          onOpenContractWizard={() => setContractWizardOpen(true)}
          onOpenFinancialPerf={(c) => setSelectedContractPerf(c)}
          onOpenPdpRegister={() => setPdpRegisterOpen(true)}
          setUser={setUser}
        />
      </main>

      <Footer setTab={setTab} />

      {codeReviewOpen && <CodeReviewModal onClose={() => setCodeReviewOpen(false)} />}
      {contractWizardOpen && (
        <ContractWizardModal 
          onClose={() => setContractWizardOpen(false)} 
          onSubmitContract={handleAddContract}
        />
      )}
      {assetRegisterOpen && (
        <AssetRegistrationWizardModal 
          onClose={() => setAssetRegisterOpen(false)} 
          onSubmitAsset={handleAddAsset}
        />
      )}
      {pdpRegisterOpen && (
        <PDPRegistrationModal
          isOpen={pdpRegisterOpen}
          onClose={() => setPdpRegisterOpen(false)}
        />
      )}
      {selectedContractPerf && (
        <ContractFinancialPerfModal 
          contract={selectedContractPerf} 
          onClose={() => setSelectedContractPerf(null)} 
        />
      )}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  );
}

export default function App() {
  const initialUser: UserProfile = {
    id: 'USR-8821',
    name: 'Ahmed Al-Mansoor',
    email: 'ahmed.almansoor@how.org',
    role: 'Country Admin',
    organization: 'House of Wealth - Pakistan Node',
    country: 'Pakistan',
    countryCode: 'PK',
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    joinedDate: 'March 2024',
    kycLevel: 'Level 3 Verified',
    preferredCurrency: 'USD',
    autoZakatPercent: 2.5,
    twoFactorEnabled: true,
    notifyEmail: true,
    notifyPush: true,
    notifySMS: false,
    timezone: 'Asia/Karachi'
  };

  return (
    <RBACProvider initialUser={initialUser}>
      <TenancyProvider>
        <MainAppContent />
      </TenancyProvider>
    </RBACProvider>
  );
}
