import { RoleDefinition } from '../types';

export const INVESTOR_ROLES: Record<string, RoleDefinition> = {
  'Retail Investor': {
    role: 'Retail Investor',
    title: 'Individual Islamic Retail Investor',
    category: 'Participant & User',
    description: 'Participates in fractionalized Sukuk, Mudarabah contracts, Waqf pools, micro-investments, and automated Zakat calculations.',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'marketplace', 'pooling', 'investments', 'wallet', 'financials', 'beneficiaries', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read'],
      contracts: ['read', 'create', 'export'],
      marketplace: ['read', 'create'],
      pooling: ['read', 'create'],
      ledger: ['read', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: [],
      users: [],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: [],
    reportsAvailable: [
      'Personal Investment Yield Statement',
      'Zakat Calculation & Payment Summary',
      'Wasiyyah Distribution Schedule'
    ],
    notifications: [
      'Received $1,250 Mudarabah profit share from Agribusiness Pool',
      'New Sukuk opportunity matches your low-risk criteria'
    ],
    demoUser: {
      name: 'Zainab Al-Farsi',
      email: 'zainab.farsi@investor.me',
      organization: 'Private Wealth Investor',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'
    }
  },

  'HNWI Investor': {
    role: 'HNWI Investor',
    title: 'High Net Worth Individual Accredited Investor',
    category: 'Participant & User',
    description: 'Accredited investor access to priority Sukuk tranches, private equity Musharakah deals, and bespoke wealth advisory.',
    badgeColor: 'bg-purple-600/10 text-purple-700 dark:text-purple-300 border-purple-600/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'marketplace', 'pooling', 'investments', 'wallet', 'financials', 'beneficiaries', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read', 'export'],
      contracts: ['create', 'read', 'export'],
      marketplace: ['create', 'read', 'export'],
      pooling: ['create', 'read', 'export'],
      ledger: ['read', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: [],
      users: [],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: ['Private Syndicate Terms Acceptance'],
    reportsAvailable: ['Bespoke HNWI Portfolio Analytics', 'Tax Optimization & Zakat Advisory'],
    notifications: ['Exclusive VIP tranche opened for Istanbul Harbor Sukuk', 'Personal Relationship Manager assigned'],
    demoUser: {
      name: 'Dr. Tariq Mansour',
      email: 'tariq.hnwi@investor.pk',
      organization: 'Private Wealth Accredited Member',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Institutional Investor': {
    role: 'Institutional Investor',
    title: 'Institutional Wealth & Sovereign Fund Manager',
    category: 'Participant & User',
    description: 'Manages multi-million dollar sovereign, takaful, and institutional capital deployments with custom risk parameters.',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'marketplace', 'pooling', 'investments', 'wallet', 'financials', 'beneficiaries', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read', 'export'],
      contracts: ['create', 'read', 'export'],
      marketplace: ['create', 'read', 'export'],
      pooling: ['create', 'read', 'export'],
      ledger: ['read', 'audit', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: [
      'Institutional Syndicate Allocation',
      'Custom Sukuk Subscription Execution'
    ],
    reportsAvailable: [
      'Institutional Portfolio Yield & Risk Matrix',
      'Sovereign Capital Deployment Audit'
    ],
    notifications: [
      'Institutional allocation unlocked for $5M Pakistan Sukuk Pool',
      'Quarterly dividend disbursement credited to custody account'
    ],
    demoUser: {
      name: 'Malik Jahangir Khan',
      email: 'jahangir.inst@pak-sovereign.org',
      organization: 'Pakistan Sovereign Islamic Investment Fund',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Corporate Investor': {
    role: 'Corporate Investor',
    title: 'Corporate Treasury Surplus Capital Investor',
    category: 'Participant & User',
    description: 'Deploys corporate idle liquidity into short-term Murabaha, trade finance Sukuk, and liquid Mudarabah pools.',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    accessibleTabs: ['dashboard', 'marketplace', 'pooling', 'investments', 'wallet', 'financials', 'beneficiaries', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read'],
      contracts: ['create', 'read', 'export'],
      marketplace: ['create', 'read'],
      pooling: ['create', 'read'],
      ledger: ['read', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: ['Corporate Liquidity Sweep Authorization'],
    reportsAvailable: ['Corporate Treasury Yield Statement', 'Liquidity Duration & Risk Exposure'],
    notifications: ['Short-term Murabaha pool matured ($500,000 returned + 5.2% profit)', 'Treasury sweep executed'],
    demoUser: {
      name: 'Ahmad Subandi',
      email: 'ahmad.subandi@indocorporate.co.id',
      organization: 'PT Nusantara Corporate Treasury',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Family Office': {
    role: 'Family Office',
    title: 'Single & Multi-Family Office Wealth Manager',
    category: 'Participant & User',
    description: 'Manages multi-generational family wealth, intergenerational Waqf trusts, Wasiyyah estate planning, and impact capital.',
    badgeColor: 'bg-amber-600/10 text-amber-700 dark:text-amber-300 border-amber-600/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'marketplace', 'pooling', 'investments', 'wallet', 'financials', 'beneficiaries', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read', 'export'],
      contracts: ['create', 'read', 'export'],
      marketplace: ['create', 'read', 'export'],
      pooling: ['create', 'read', 'export'],
      ledger: ['read', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read'],
      users: ['create', 'read', 'update'],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: ['Waqf Endowment Trust Allocation', 'Intergenerational Estate Distribution Approval'],
    reportsAvailable: ['Family Estate Asset Distribution Statement', 'Impact Waqf Social ROI Analysis'],
    notifications: ['Waqf trust endowment distributed $120,000 to educational scholarships', 'Annual family audit ready'],
    demoUser: {
      name: 'Sharifah Maryam Al-Kaf',
      email: 'maryam.fo@alkaf-family.com',
      organization: 'Al-Kaf Family Office & Endowment',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    }
  }
};
