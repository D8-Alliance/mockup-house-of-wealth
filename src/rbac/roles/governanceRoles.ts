import { RoleDefinition } from '../types';

export const GOVERNANCE_ROLES: Record<string, RoleDefinition> = {
  'Country Admin': {
    role: 'Country Admin',
    title: 'Country Node Regional Administrator',
    category: 'System Executive',
    description: 'Manages regional node operations, local asset registration, national Waqf pools, and jurisdiction regulatory compliance.',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'admin-center', 'marketplace', 'pooling', 'investments', 'assets', 'contracts', 'wallet', 'financials', 'beneficiaries', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['create', 'read', 'update', 'approve', 'audit', 'export'],
      contracts: ['create', 'read', 'update', 'approve', 'export'],
      marketplace: ['create', 'read', 'update', 'approve', 'export'],
      pooling: ['create', 'read', 'update', 'approve', 'export'],
      ledger: ['read', 'audit', 'export'],
      profile: ['read', 'update'],
      governance: ['read', 'approve'],
      approvals: ['read', 'approve'],
      users: ['create', 'read', 'update'],
      audit_logs: ['read', 'export'],
      reports: ['read', 'export']
    },
    approvalRights: [
      'Regional Asset Tokenization Approval',
      'Local Currency Liquidity Pool Deployment',
      'Organization Onboarding Sign-Off',
      'Regional Profit Distribution Schedule'
    ],
    reportsAvailable: [
      'National Node Economic Impact Report',
      'Regional Waqf Endowment Yield Analysis',
      'Local Sukuk Issuance Progress',
      'Jurisdiction Compliance Filing'
    ],
    notifications: [
      '3 New Real Estate Assets pending regional tokenization',
      'Monthly regional Waqf pool distribution ready for approval',
      'Compliance update required for Central Bank regulation'
    ],
    demoUser: {
      name: 'Ahmed Al-Mansoor',
      email: 'ahmed.almansoor@how.org',
      organization: 'House of Wealth - Malaysia Node',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Organization Admin': {
    role: 'Organization Admin',
    title: 'Institutional Organization Administrator',
    category: 'Operational Management',
    description: 'Controls corporate entity accounts, institutional asset portfolios, team sub-accounts, and corporate treasury pools.',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'admin-center', 'marketplace', 'pooling', 'investments', 'assets', 'contracts', 'wallet', 'financials', 'beneficiaries', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['create', 'read', 'update', 'delete', 'export'],
      contracts: ['create', 'read', 'update', 'export'],
      marketplace: ['create', 'read', 'update', 'export'],
      pooling: ['create', 'read', 'update', 'export'],
      ledger: ['read', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read', 'approve'],
      users: ['create', 'read', 'update'],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: [
      'Corporate Asset Listing Request',
      'Institutional Mudarabah Fund Allocation',
      'Internal Team Sub-Account Authorization'
    ],
    reportsAvailable: [
      'Corporate Portfolio Balance Sheet',
      'Entity Treasury Yield vs Benchmark',
      'Team Activity Audit Log'
    ],
    notifications: [
      'Corporate Sukuk maturing in 14 days ($2.5M)',
      'Sub-account trader requested contract execution approval',
      'Quarterly financial audit statement ready'
    ],
    demoUser: {
      name: 'Sultan Mansour Al-Sabah',
      email: 'sultan.sabah@gulfholding.com',
      organization: 'Gulf Islamic Investment House',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Legal Officer': {
    role: 'Legal Officer',
    title: 'Chief Legal Counsel & Smart Contract Attorney',
    category: 'Governance & Risk',
    description: 'Drafts and reviews legal prospectuses, cross-border jurisdiction agreements, and dispute resolution frameworks.',
    badgeColor: 'bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 border-indigo-600/30',
    accessibleTabs: ['dashboard', 'contracts', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read'],
      contracts: ['create', 'read', 'update', 'approve', 'export'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read', 'audit', 'export'],
      profile: ['read', 'update'],
      governance: ['create', 'read', 'update', 'approve'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read', 'audit'],
      reports: ['read', 'export']
    },
    approvalRights: ['Legal Prospectus Sign-Off', 'Cross-Border Jurisdiction Binding Contract Approval', 'Dispute Settlement Terms'],
    reportsAvailable: ['Legal Risk Exposure Matrix', 'D-8 Sovereign Regulatory Filings'],
    notifications: ['Mudarabah contract template #MUD-04 requires legal sign-off', 'New arbitration filing'],
    demoUser: {
      name: 'Advocate Tariq Mahmud',
      email: 'tariq.legal@d8law.com',
      organization: 'D-8 Legal Advisory Chamber',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Auditor': {
    role: 'Auditor',
    title: 'External Independent Auditor',
    category: 'Governance & Risk',
    description: 'Read-only access to immutable blockchain transaction hashes, smart contract code reviews, and financial statements for independent reporting.',
    badgeColor: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
    accessibleTabs: ['dashboard', 'marketplace', 'pooling', 'investments', 'assets', 'contracts', 'wallet', 'financials', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read', 'audit', 'export'],
      contracts: ['read', 'audit', 'export'],
      marketplace: ['read', 'export'],
      pooling: ['read', 'audit', 'export'],
      ledger: ['read', 'audit', 'export'],
      profile: ['read', 'update'],
      governance: ['read', 'audit', 'export'],
      approvals: ['read'],
      users: ['read'],
      audit_logs: ['read', 'audit', 'export'],
      reports: ['read', 'export']
    },
    approvalRights: [],
    reportsAvailable: [
      'Independent Audit Verification Report',
      'Cryptographic Ledger Hash Continuity Audit',
      'Smart Contract Code & Execution Verification'
    ],
    notifications: [
      'Q2 External Audit Period opened',
      '1,240 Blockchain transaction hashes ready for verification'
    ],
    demoUser: {
      name: 'Sarah Jenkins, CPA',
      email: 's.jenkins@deloitte-audit.com',
      organization: 'Independent External Audit Firm',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
    }
  }
};
