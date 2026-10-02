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
import { apiClient, apiErrorMessage, BackendMembershipStatus } from '../../services/apiClient';
import { formatDate } from './membershipFormat';

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
      // Membership itself comes from the API (refreshMembership), not the local mock store.
      setFeatureUsage(revenueService.getFeatureUsage(userId));
      setTransactions(revenueService.getCreditTransactions(userId));
      setReports(revenueService.getPremiumReports());
      setBillingRecords(revenueService.getBillingRecords(userId));
    });
    return unsub;
  }, [userId]);

  const refreshCreditBalance = () => apiClient.getMembershipCreditSummary().then(summary => setCreditBalance({
    userId: summary.userId,
    totalCredits: summary.totalPoolCredits,
    usedCredits: summary.usedThisMonth,
    availableCredits: summary.availableBalance,
    monthlyAllowance: summary.monthlyAllowance,
    purchasedCredits: summary.purchasedCredits ?? summary.additionalCredits,
    resetDate: summary.resetDate,
  })).catch(() => undefined);

  const [membershipStatus, setMembershipStatus] = useState<BackendMembershipStatus | null>(null);
  const refreshMembership = () => apiClient.getMembershipStatus().then((status) => {
    setMembershipStatus(status);
    setMembership({
      userId: status.userId,
      planId: status.planId,
      tier: status.tier as MembershipTier,
      billingInterval: status.billingInterval,
      status: 'Active',
      currentPeriodStart: status.currentPeriodStart,
      currentPeriodEnd: status.currentPeriodEnd,
      autoRenew: status.autoRenew,
      paymentMethodSummary: status.paymentMethodSummary,
      aiCreditsRemaining: status.aiCreditsRemaining,
      aiCreditsTotal: status.aiCreditsTotal,
    });
  }).catch(() => undefined);

  useEffect(() => {
    void refreshCreditBalance();
    void refreshMembership();
  }, []);

  // ToyyibPay sends the payer back with ?status_id=&billcode=&order_id=. Confirm the
  // payment with the API (which re-checks ToyyibPay) instead of trusting the query string.
  const [paymentNotice, setPaymentNotice] = useState<{ tone: 'success' | 'pending' | 'error'; text: string } | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('order_id');
    if (!paymentId) return;
    window.history.replaceState(null, '', window.location.pathname);
    setPaymentNotice({ tone: 'pending', text: 'Confirming your ToyyibPay payment…' });
    void apiClient.verifyMembershipPayment(paymentId)
      .then((result) => {
        const product = result.productType === 'MEMBERSHIP' ? 'membership plan' : 'AI credits';
        if (result.status === 'PAID') setPaymentNotice({ tone: 'success', text: `Payment received. Your ${product} ${result.productType === 'MEMBERSHIP' ? 'is now active' : 'have been added'}.` });
        else if (result.status === 'FAILED') setPaymentNotice({ tone: 'error', text: 'ToyyibPay reported the payment as unsuccessful. You have not been charged for this order.' });
        else setPaymentNotice({ tone: 'pending', text: 'ToyyibPay has not confirmed this payment yet. Refresh this page in a few minutes.' });
        void refreshCreditBalance();
        void refreshMembership();
      })
      .catch((cause) => setPaymentNotice({ tone: 'error', text: apiErrorMessage(cause, 'Unable to confirm the payment.') }));
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

  // Errors propagate so UpgradeModal can show them to the user.
  const handleConfirmUpgrade = async (planId: string, interval: BillingInterval, method: string, creditsToApply = 0) => {
    const result = await apiClient.upgradeMembership({ planId, billingInterval: interval, paymentMethod: method, creditsToApply }) as { paymentUrl?: string };
    if (result.paymentUrl) {
      window.location.assign(result.paymentUrl);
      return;
    }
    await Promise.all([refreshMembership(), refreshCreditBalance()]);
    window.dispatchEvent(new Event('ai-credits-changed'));
    setSelectedPlanForUpgrade(null);
  };

  // Renewal re-buys the current plan and interval; the backend extends from the current end date.
  const handleRenew = () => {
    if (currentPlan.tier === 'FREE') return;
    setSelectedPlanForUpgrade({ plan: currentPlan, interval: membership.billingInterval });
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

  const handleTopUpCredits = async (packageId: string, method: string) => {
    const payment = await apiClient.topUpMembershipCredits(packageId, method);
    if (payment.paymentUrl) {
      window.location.assign(payment.paymentUrl);
      return;
    }
    await refreshCreditBalance();
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {paymentNotice && (
        <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-start justify-between gap-3 ${
          paymentNotice.tone === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300'
            : paymentNotice.tone === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/50 dark:text-rose-300'
              : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-300'
        }`}>
          <span>{paymentNotice.text}</span>
          <button onClick={() => setPaymentNotice(null)} className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer">Dismiss</button>
        </div>
      )}
      {membershipStatus && (membershipStatus.lifecycleStatus === 'EXPIRING_SOON' || membershipStatus.lifecycleStatus === 'GRACE') && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          membershipStatus.lifecycleStatus === 'GRACE'
            ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/50 dark:text-rose-300'
            : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-300'
        }`}>
          <div className="text-sm">
            <div className="font-black">
              {membershipStatus.lifecycleStatus === 'GRACE'
                ? `Your ${membershipStatus.planName} plan ended on ${formatDate(membershipStatus.currentPeriodEnd)}`
                : `Your ${membershipStatus.planName} plan ends in ${membershipStatus.daysRemaining} day${membershipStatus.daysRemaining === 1 ? '' : 's'}`}
            </div>
            <div className="text-xs mt-0.5 opacity-90">
              {membershipStatus.lifecycleStatus === 'GRACE'
                ? `Plan features stay available until ${formatDate(membershipStatus.graceEndsAt)}. After that the account moves to the Free plan.`
                : `Renew before ${formatDate(membershipStatus.currentPeriodEnd)} to keep your plan. Renewing early adds a full period after the current end date.`}
            </div>
          </div>
          <button onClick={handleRenew} className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">Renew now</button>
        </div>
      )}
      {/* Membership Dashboard Header Card */}
      <MembershipCard
        membershipStatus={membershipStatus}
        onRenew={handleRenew}
        membership={membership}
        currentPlan={currentPlan}
        creditBalance={creditBalance}
        featureUsage={featureUsage}
        onOpenUpgradeModal={() => setSelectedPlanForUpgrade({ plan: currentPlan.tier === 'FREE' ? plans[1] : plans[2], interval: 'monthly' })}
        onOpenCreditModal={() => setShowCreditModal(true)}
        onOpenDowngradeModal={() => setCancelDowngradeState('downgrade')}
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
          membershipStatus={membershipStatus}
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
