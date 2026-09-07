import { RoleDefinition } from '../types';

export const FINANCE_ROLES: Record<string, RoleDefinition> = {
  'Finance Officer': {
    role: 'Finance Officer',
    title: 'Platform Chief Financial Officer & Disburser',
    category: 'Operational Management',
    description: 'Manages cash flow balances, profit disbursement schedules, Zakat calculations, tax withholdings, and ledger reconciliation.',
    badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    accessibleTabs: ['dashboard', 'marketplace', 'pooling', 'investments', 'assets', 'contracts', 'wallet', 'financials', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read'],
      contracts: ['read', 'update', 'export'],
      marketplace: ['read'],
      pooling: ['read', 'update', 'export'],
      ledger: ['create', 'read', 'update', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read', 'export'],
      reports: ['create', 'read', 'export']
    },
    approvalRights: [
      'Profit Disbursement Execution',
      'Bank Transfer & SWIFT Wire Authorization',
      'Zakat Pool Allocation Transfer'
    ],
    reportsAvailable: [
      'Financial Cash Flow & Reconciliation Statement',
      'Quarterly Profit & Loss Distribution Report',
      'Tax Withholding & Regulatory Fee Audit'
    ],
    notifications: [
      'Batch payout of $340,000 pending final treasury sign-off',
      'Bank statement auto-reconciliation complete with 100% match'
    ],
    demoUser: {
      name: 'Mohamed El-Sayed',
      email: 'mohamed.elsayed@finance.how.org',
      organization: 'House of Wealth Treasury Dept',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Treasury Officer': {
    role: 'Treasury Officer',
    title: 'Cross-Border Treasury & FX Liquidity Manager',
    category: 'Operational Management',
    description: 'Manages multi-currency foreign exchange swaps (USD/MYR/TRY/MYR/IDR), reserve ratio maintenance, and banking liquidity rails.',
    badgeColor: 'bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-600/30',
    accessibleTabs: ['dashboard', 'wallet', 'financials', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read'],
      contracts: ['read'],
      marketplace: ['read'],
      pooling: ['read', 'update'],
      ledger: ['read', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['create', 'read', 'export']
    },
    approvalRights: ['FX Hedging Swap Execution', 'Central Bank Liquidity Reserve Allocation'],
    reportsAvailable: ['Currency Liquidity & FX Risk Exposure', 'Inter-Node Treasury Clearing Balance'],
    notifications: ['TRY/USD currency swap executed ($1.2M locked at 0% Riba)', 'Treasury balance healthy'],
    demoUser: {
      name: 'Emin Yilmaz',
      email: 'emin.treasury@how.d8.org',
      organization: 'Central D-8 Treasury Rail',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Settlement Officer': {
    role: 'Settlement Officer',
    title: 'Trade Execution & Asset Delivery Settlement Manager',
    category: 'Operational Management',
    description: 'Executes Delivery-versus-Payment (DvP) trade settlements, asset transfer title deeds, and atomic blockchain swaps.',
    badgeColor: 'bg-teal-600/10 text-teal-700 dark:text-teal-300 border-teal-600/30',
    accessibleTabs: ['dashboard', 'contracts', 'wallet', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read', 'update'],
      contracts: ['read', 'update', 'approve'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: ['DvP Trade Finality Sign-Off', 'Title Deed Transfer Release'],
    reportsAvailable: ['Settlement Failure & Delay Log', 'Atomic Swap Processing Metrics'],
    notifications: ['Trade settlement batch #SET-882 finalized in 1.2 seconds', 'All transfers cleared'],
    demoUser: {
      name: 'Siti Aminah',
      email: 'siti.settlement@how.d8.org',
      organization: 'D-8 Clearing & Settlement House',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Reconciliation Officer': {
    role: 'Reconciliation Officer',
    title: 'Bank Ledger & On-Chain Reconciliation Specialist',
    category: 'Operational Management',
    description: 'Compares real-time bank SWIFT MT940 statements against on-chain ledger hashes to guarantee zero balance discrepancy.',
    badgeColor: 'bg-slate-600/10 text-slate-700 dark:text-slate-300 border-slate-600/30',
    accessibleTabs: ['dashboard', 'financials', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read'],
      contracts: ['read'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read', 'audit', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read'],
      users: ['read'],
      audit_logs: ['read', 'audit'],
      reports: ['create', 'read', 'export']
    },
    approvalRights: ['Reconciliation Discrepancy Adjustment Sign-Off'],
    reportsAvailable: ['Daily Bank vs On-Chain Reconciliation Matrix', 'Unmatched Transaction Exception Log'],
    notifications: ['Daily reconciliation complete (0 unmatched records)', 'Bank feed synced'],
    demoUser: {
      name: 'Hamza Al-Zahrani',
      email: 'hamza.recon@how.d8.org',
      organization: 'Ledger Audit Operations',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80'
    }
  }
};
