import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  FileText, 
  RefreshCw, 
  Zap, 
  Megaphone 
} from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';
import { 
  RevenueFilterState, 
  RevenueTransactionItem, 
  RevenueBillingRecord 
} from '../../revenue/revenueManagementTypes';
import { revenueManagementService } from '../../revenue/revenueManagementService';
import { RevenueHubHeader } from './RevenueHubHeader';
import { RevenueDashboardKPIs } from './RevenueDashboardKPIs';
import { RevenueDashboardFilters } from './RevenueDashboardFilters';
import { RevenueChartsSection } from './RevenueChartsSection';
import { RevenueTransactionsTable } from './RevenueTransactionsTable';
import { BillingRecordsTable } from './BillingRecordsTable';
import { SubscriptionStatusTable } from './SubscriptionStatusTable';
import { AICreditSalesTab } from './AICreditSalesTab';
import { PromotionSalesTab } from './PromotionSalesTab';
import { RevenueInvoiceModal } from './RevenueInvoiceModal';

export const RevenueManagementHub: React.FC = () => {
  const { currentRole, activeUser } = useRBAC();
  const [currency, setCurrency] = useState<'MYR' | 'USD'>('MYR');
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'TRANSACTIONS' | 'BILLINGS' | 'SUBSCRIPTIONS' | 'AI_CREDITS' | 'PROMOTIONS'
  >('OVERVIEW');

  const [selectedInvoiceItem, setSelectedInvoiceItem] = useState<
    RevenueTransactionItem | RevenueBillingRecord | null
  >(null);

  const isSuperAdmin = currentRole === 'Super Admin' || currentRole === 'System Administrator';
  const isFinance = currentRole === 'Finance Officer' || currentRole === 'Treasury Officer';
  const isAuditor = currentRole === 'Auditor';
  const isCountryAdmin = currentRole === 'Country Admin';
  const isPDP = currentRole === 'Project Sponsor' || currentRole === 'Project Manager';
  const isInvestor = currentRole.includes('Investor') || currentRole === 'Retail Investor' || currentRole === 'HNWI Investor';

  const defaultCountry = isCountryAdmin ? 'Malaysia' : 'ALL';

  const initialFilterState: RevenueFilterState = {
    dateRange: '30D',
    country: defaultCountry,
    organisation: isPDP ? (activeUser.organization || 'FELDA Technoplant Sdn Bhd') : 'ALL',
    revenueType: 'ALL',
    membershipTier: 'ALL',
    userType: 'ALL',
    searchQuery: ''
  };

  const [filters, setFilters] = useState<RevenueFilterState>(initialFilterState);
  const [metrics, setMetrics] = useState(revenueManagementService.getMetrics());

  useEffect(() => {
    const unsub = revenueManagementService.subscribe(() => {
      setMetrics({ ...revenueManagementService.getMetrics() });
    });
    return unsub;
  }, []);

  const rawTransactions = useMemo(() => {
    return revenueManagementService.getTransactions(currentRole, activeUser.email, activeUser.organization);
  }, [currentRole, activeUser]);

  const rawBillings = useMemo(() => {
    return revenueManagementService.getBillings(currentRole, activeUser.email, activeUser.organization);
  }, [currentRole, activeUser]);

  const rawSubscriptions = useMemo(() => {
    return revenueManagementService.getSubscriptions(currentRole, activeUser.organization);
  }, [currentRole, activeUser]);

  const rawAICreditSales = useMemo(() => {
    return revenueManagementService.getAICreditSales(currentRole);
  }, [currentRole]);

  const rawPromotionSales = useMemo(() => {
    return revenueManagementService.getPromotionSales(currentRole, activeUser.organization);
  }, [currentRole, activeUser]);

  const filteredTransactions = useMemo(() => {
    return rawTransactions.filter(t => {
      if (filters.country !== 'ALL' && t.country !== filters.country) return false;
      if (filters.organisation !== 'ALL' && t.customerOrg !== filters.organisation) return false;
      if (filters.revenueType !== 'ALL' && t.category !== filters.revenueType) return false;
      if (filters.membershipTier !== 'ALL' && t.membershipTier !== filters.membershipTier) return false;
      if (filters.userType !== 'ALL' && t.userType !== filters.userType) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const match = t.customerName.toLowerCase().includes(q) ||
          t.customerOrg.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [rawTransactions, filters]);

  const scopedMetrics = useMemo(() => {
    if (isSuperAdmin || isFinance || isAuditor) return metrics;
    const totalMYR = rawTransactions.reduce((acc, t) => acc + (t.status === 'Paid' ? t.amountMYR : 0), 0);
    const totalUSD = rawTransactions.reduce((acc, t) => acc + (t.status === 'Paid' ? t.amountUSD : 0), 0);
    return {
      ...metrics,
      totalRevenueMYR: totalMYR,
      totalRevenueUSD: totalUSD,
      mrrUSD: Math.round(totalUSD * 0.15),
      arrUSD: Math.round(totalUSD * 1.8),
      totalPaidMembers: rawTransactions.length
    };
  }, [metrics, rawTransactions, isSuperAdmin, isFinance, isAuditor]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <RevenueHubHeader
        currentRole={currentRole}
        isSuperAdmin={isSuperAdmin}
        isFinance={isFinance}
        isAuditor={isAuditor}
        isCountryAdmin={isCountryAdmin}
        isPDP={isPDP}
        isInvestor={isInvestor}
        userOrg={activeUser.organization}
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Revenue Dashboard
        </button>

        <button
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'TRANSACTIONS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" /> Transactions ({filteredTransactions.length})
        </button>

        <button
          onClick={() => setActiveTab('BILLINGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'BILLINGS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Billing Records ({rawBillings.length})
        </button>

        <button
          onClick={() => setActiveTab('SUBSCRIPTIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'SUBSCRIPTIONS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Subscriptions ({rawSubscriptions.length})
        </button>

        <button
          onClick={() => setActiveTab('AI_CREDITS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'AI_CREDITS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" /> AI Credits ({rawAICreditSales.length})
        </button>

        <button
          onClick={() => setActiveTab('PROMOTIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'PROMOTIONS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" /> Promotions ({rawPromotionSales.length})
        </button>
      </div>

      {/* Multi-Dimensional Filters Bar */}
      <RevenueDashboardFilters
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => setFilters(initialFilterState)}
        userCountryScope="Malaysia"
        isCountryLocked={isCountryAdmin}
      />

      {/* Content Panels */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <RevenueDashboardKPIs
            metrics={scopedMetrics}
            currency={currency}
            onToggleCurrency={setCurrency}
          />
          <RevenueChartsSection currency={currency} />
        </div>
      )}

      {activeTab === 'TRANSACTIONS' && (
        <RevenueTransactionsTable
          transactions={filteredTransactions}
          userRole={currentRole}
          currency={currency}
          onViewInvoice={setSelectedInvoiceItem}
        />
      )}

      {activeTab === 'BILLINGS' && (
        <BillingRecordsTable
          billings={rawBillings}
          currency={currency}
          onSelectBilling={setSelectedInvoiceItem}
        />
      )}

      {activeTab === 'SUBSCRIPTIONS' && (
        <SubscriptionStatusTable
          subscriptions={rawSubscriptions}
          currency={currency}
        />
      )}

      {activeTab === 'AI_CREDITS' && (
        <AICreditSalesTab
          creditSales={rawAICreditSales}
          currency={currency}
        />
      )}

      {activeTab === 'PROMOTIONS' && (
        <PromotionSalesTab
          promotionSales={rawPromotionSales}
          currency={currency}
        />
      )}

      {selectedInvoiceItem && (
        <RevenueInvoiceModal
          item={selectedInvoiceItem}
          onClose={() => setSelectedInvoiceItem(null)}
        />
      )}
    </div>
  );
};
