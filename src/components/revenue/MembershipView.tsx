import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CreditCard, 
  FileText, 
  Coins, 
  Layers, 
  ShieldCheck, 
  Download, 
  Building2,
  Table,
  Lock,
  ArrowRight
} from 'lucide-react';
import { 
  MembershipPlan, 
  UserMembership, 
  HoWCreditBalance, 
  CreditTransaction, 
  PremiumReportItem, 
  BillingRecord, 
  BillingInterval,
  MembershipTier,
  FeatureUsageStats
} from '../../revenue/revenueTypes';
import { revenueService } from '../../revenue/revenueService';
import { MembershipCard } from './MembershipCard';
import { PlanComparisonTable } from './PlanComparisonTable';
import { FeatureMatrixTable } from './FeatureMatrixTable';
import { PDPMembershipView } from './PDPMembershipView';
import { UpgradeModal } from './UpgradeModal';
import { CancelDowngradeModal } from './CancelDowngradeModal';
import { CreditBalanceModal } from './CreditBalanceModal';
import { PremiumReportsCatalog } from './PremiumReportsCatalog';
import { FutureRevenueSection } from './FutureRevenueSection';
import { BillingTransactionsView } from './BillingTransactionsView';
import { apiClient } from '../../services/apiClient';

interface MembershipViewProps {
  userId?: string;
  userRole?: string;
}

export const MembershipView: React.FC<MembershipViewProps> = ({ 
  userId = 'USR-8821',
  userRole = 'investor'
}) => {
  const [plans, setPlans] = useState<MembershipPlan[]>(revenueService.getPlans());
  const [membership, setMembership] = useState<UserMembership>(revenueService.getUserMembership(userId));
  const [creditBalance, setCreditBalance] = useState<HoWCreditBalance>({ userId, totalCredits: 0, usedCredits: 0, availableCredits: 0, monthlyAllowance: 0, purchasedCredits: 0, resetDate: '' });
  const [featureUsage, setFeatureUsage] = useState<FeatureUsageStats>(revenueService.getFeatureUsage(userId));
  const [transactions, setTransactions] = useState<CreditTransaction[]>(revenueService.getCreditTransactions(userId));
  const [reports, setReports] = useState<PremiumReportItem[]>(revenueService.getPremiumReports());
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>(revenueService.getBillingRecords(userId));
  const [aiModuleDisabled, setAiModuleDisabled] = useState(false);

  // Determine initial tab based on user role (RBAC)
  const isSponsor = userRole === 'sponsor' || userRole === 'pdp';
  const [activeTab, setActiveTab] = useState<'plans' | 'matrix' | 'pdp' | 'reports' | 'credits' | 'billing' | 'future'>(
    isSponsor ? 'pdp' : 'plans'
  );

  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<{ plan: MembershipPlan; interval: BillingInterval } | null>(null);
  const [cancelDowngradeState, setCancelDowngradeState] = useState<'downgrade' | 'cancel' | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);

  useEffect(() => {
    const unsub = revenueService.subscribe(() => {
      setPlans(revenueService.getPlans());
      setMembership(revenueService.getUserMembership(userId));
      setFeatureUsage(revenueService.getFeatureUsage(userId));
      setTransactions(revenueService.getCreditTransactions(userId));
      setReports(revenueService.getPremiumReports());
      setBillingRecords(revenueService.getBillingRecords(userId));
    });
    return unsub;
  }, [userId]);

  useEffect(() => {
    void apiClient.getMembershipCreditSummary().then(summary => setCreditBalance({
      userId: summary.userId,
      totalCredits: summary.totalPoolCredits,
      usedCredits: summary.usedThisMonth,
      availableCredits: summary.availableBalance,
      monthlyAllowance: summary.monthlyAllowance,
      purchasedCredits: summary.purchasedCredits ?? summary.additionalCredits,
      resetDate: summary.resetDate,
    })).catch(() => undefined);
  }, []);

  useEffect(() => {
    void apiClient.getFeatureModules()
      .then(modules => setAiModuleDisabled(modules.some(module => module.moduleKey === 'AI_INTELLIGENCE' && module.mode === 'DISABLED')))
      .catch(() => setAiModuleDisabled(false));
  }, []);

  if (aiModuleDisabled) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900 text-white border border-amber-500/30 shadow-xl space-y-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">AI Membership Unavailable</span>
        <h1 className="text-2xl font-black">AI plans and credits are temporarily hidden</h1>
        <p className="text-sm text-slate-300 max-w-2xl">
          AI Intelligence is not active while its provider integration is being completed. AI subscriptions, credit purchases, and AI allowances are unavailable until Platform Administration re-enables the module.
        </p>
      </div>
    );
  }

  const currentPlan = plans.find(p => p.id === membership.planId) || plans[0];

  const handleSelectPlan = (plan: MembershipPlan, interval: BillingInterval) => {
    setSelectedPlanForUpgrade({ plan, interval });
  };

  const handleSelectTierFromMatrix = (tier: MembershipTier) => {
    const targetPlan = plans.find(p => p.tier === tier) || plans[1];
    setSelectedPlanForUpgrade({ plan: targetPlan, interval: 'monthly' });
  };

  const handleConfirmUpgrade = async (planId: string, interval: BillingInterval, method: string) => {
    try {
      const updatedMembership = await apiClient.upgradeMembership({ planId, billingInterval: interval, paymentMethod: method });
      setMembership(updatedMembership as UserMembership);
      setSelectedPlanForUpgrade(null);
    } catch (error) {
      console.error('Membership upgrade failed', error);
    }
  };

  const handleConfirmCancelDowngrade = () => {
    if (cancelDowngradeState === 'downgrade') {
      revenueService.downgradeMembership(userId);
    } else if (cancelDowngradeState === 'cancel') {
      revenueService.cancelMembership(userId);
    }
    setCancelDowngradeState(null);
  };

  const handleUnlockReport = (reportId: string) => {
    revenueService.unlockPremiumReport(reportId, userId);
  };

  const handleTopUpCredits = async (credits: number, _priceMYR: number, _priceUSD: number, method: string) => {
    const packageId = credits === 50 ? 'topup_50' : credits === 275 ? 'topup_250' : credits === 1150 ? 'topup_1000' : 'topup_3000';
    await apiClient.topUpMembershipCredits(packageId, method);
    const summary = await apiClient.getMembershipCreditSummary();
    setCreditBalance({ userId: summary.userId, totalCredits: summary.totalPoolCredits, usedCredits: summary.usedCredits, availableCredits: summary.availableBalance, monthlyAllowance: summary.monthlyAllowance, purchasedCredits: summary.purchasedCredits ?? 0, resetDate: summary.resetDate });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Membership Dashboard Header Card */}
      <MembershipCard
        membership={membership}
        currentPlan={currentPlan}
        creditBalance={creditBalance}
        featureUsage={featureUsage}
        onOpenUpgradeModal={() => setSelectedPlanForUpgrade({ plan: currentPlan.tier === 'FREE' ? plans[1] : plans[2], interval: 'monthly' })}
        onOpenCreditModal={() => setShowCreditModal(true)}
        onOpenDowngradeModal={() => setCancelDowngradeState('downgrade')}
        onOpenCancelModal={() => setCancelDowngradeState('cancel')}
      />

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold overflow-x-auto">
        {[
          { id: 'plans', label: 'Intelligence Plans', icon: <Sparkles className="w-4 h-4 text-emerald-500" /> },
          { id: 'matrix', label: '16-Feature Matrix', icon: <Table className="w-4 h-4 text-teal-500" /> },
          { id: 'pdp', label: 'PDP Sponsor Suite', icon: <Building2 className="w-4 h-4 text-blue-500" /> },
          { id: 'reports', label: `Dossiers (${reports.length})`, icon: <FileText className="w-4 h-4 text-purple-500" /> },
          { id: 'credits', label: `AI Credits (${creditBalance.availableCredits})`, icon: <Coins className="w-4 h-4 text-amber-500" /> },
          { id: 'billing', label: `Billing & Receipts (${billingRecords.length})`, icon: <CreditCard className="w-4 h-4 text-blue-500" /> },
          { id: 'future', label: 'Future Roadmap', icon: <ShieldCheck className="w-4 h-4 text-rose-500" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Plans View */}
      {activeTab === 'plans' && (
        <PlanComparisonTable
          plans={plans}
          currentTier={membership.tier}
          onSelectPlan={handleSelectPlan}
        />
      )}

      {/* Comprehensive 16-Feature Matrix */}
      {activeTab === 'matrix' && (
        <FeatureMatrixTable
          currentTier={membership.tier}
          onSelectPlan={handleSelectTierFromMatrix}
        />
      )}

      {/* PDP Sponsor Suite */}
      {activeTab === 'pdp' && (
        <PDPMembershipView
          orgId="ORG-FELDA-MY"
        />
      )}

      {/* Premium Reports Catalog */}
      {activeTab === 'reports' && (
        <PremiumReportsCatalog
          reports={reports}
          userTier={membership.tier}
          availableCredits={creditBalance.availableCredits}
          onUnlockReport={handleUnlockReport}
          onOpenUpgradeModal={() => setSelectedPlanForUpgrade({ plan: plans[1], interval: 'monthly' })}
        />
      )}

      {/* Credits Ledger Tab */}
      {activeTab === 'credits' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                Wealth Pooling AI Credits Usage & Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Track token consumption across Shariah screening, AI deep scans, and report unlocks.
              </p>
            </div>
            <button
              onClick={() => setShowCreditModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
            >
              <Coins className="w-4 h-4" />
              <span>Purchase Credits</span>
            </button>
          </div>

          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{tx.description}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{tx.timestamp} • {tx.type}</div>
                </div>
                <div className="text-right">
                  <div className={`font-mono font-black text-sm ${tx.isDebit ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {tx.isDebit ? `-${tx.amount}` : `+${tx.amount}`}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">Bal: {tx.balanceAfter}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing & Invoices Tab */}
      {activeTab === 'billing' && (
        <BillingTransactionsView />
      )}

      {/* Future Regulatory Revenue Tab */}
      {activeTab === 'future' && (
        <FutureRevenueSection />
      )}

      {/* Upgrade Checkout Modal */}
      {selectedPlanForUpgrade && (
        <UpgradeModal
          plan={selectedPlanForUpgrade.plan}
          interval={selectedPlanForUpgrade.interval}
          onClose={() => setSelectedPlanForUpgrade(null)}
          onConfirm={handleConfirmUpgrade}
        />
      )}

      {/* Cancel / Downgrade Modal */}
      {cancelDowngradeState && (
        <CancelDowngradeModal
          membership={membership}
          mode={cancelDowngradeState}
          onClose={() => setCancelDowngradeState(null)}
          onConfirm={handleConfirmCancelDowngrade}
        />
      )}

      {/* Credits Top-up Modal */}
      {showCreditModal && (
        <CreditBalanceModal
          creditBalance={creditBalance}
          transactions={transactions}
          onClose={() => setShowCreditModal(false)}
          onTopUp={handleTopUpCredits}
        />
      )}

    </div>
  );
};
