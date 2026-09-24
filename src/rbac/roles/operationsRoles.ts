import { RoleDefinition } from '../types';

export const OPERATIONS_ROLES: Record<string, RoleDefinition> = {
  'Project Sponsor': {
    role: 'Project Sponsor',
    title: 'Project Originator & Sponsor (PDP)',
    category: 'Operational Management',
    description: 'Submits and manages large-scale green infrastructure, trade finance, and industrial capital projects for tokenization.',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    accessibleTabs: ['dashboard', 'sponsor-portal', 'ai-engine', 'marketplace', 'pooling', 'investments', 'assets', 'contracts', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['create', 'read', 'update'],
      contracts: ['create', 'read'],
      marketplace: ['read'],
      pooling: ['create', 'read'],
      ledger: ['read'],
      profile: ['read', 'update'],
      governance: ['create', 'read'],
      approvals: ['read'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: [
      'Project Proposal Submission',
      'Milestone Completion Claims'
    ],
    reportsAvailable: [
      'Project Feasibility & IRR Model',
      'Capital Utilization Progress'
    ],
    notifications: [
      'Project proposal #PRJ-881 approved by Shariah Board',
      'Milestone 2 disbursement ready for release'
    ],
    demoUser: {
      name: 'Tan Sri Azman Hashim',
      email: 'azman.sponsor@my-d8.org',
      organization: 'Malaysia Green Energy Infrastructure Consortium',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Project Manager': {
    role: 'Project Manager',
    title: 'Infrastructure Execution & Milestone Manager',
    category: 'Operational Management',
    description: 'Tracks on-ground construction, supply chain procurement, site inspections, and verifies milestone deliverables.',
    badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
    accessibleTabs: ['dashboard', 'sponsor-portal', 'ai-engine', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read', 'update'],
      contracts: ['read', 'update'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read'],
      profile: ['read', 'update'],
      governance: ['create', 'read'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['create', 'read', 'export']
    },
    approvalRights: ['Subcontractor Invoice Sign-Off', 'Site Inspection Verification', 'Milestone Deliverable Sign-Off'],
    reportsAvailable: ['Milestone Completion Tracker', 'Project Budget Variance Report'],
    notifications: ['Milestone 3 photo inspection evidence submitted', 'Material delivery verified'],
    demoUser: {
      name: 'Eng. Kamal Hidayat',
      email: 'kamal.pm@infrastructure-d8.com',
      organization: 'D-8 Infrastructure Engineering Unit',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Asset Owner': {
    role: 'Asset Owner',
    title: 'Real World Asset (RWA) Tokenizer & Owner',
    category: 'Operational Management',
    description: 'Registers physical & digital assets for tokenization, fractionalization, collateralization, and yield generation.',
    badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'admin-center', 'marketplace', 'pooling', 'investments', 'assets', 'contracts', 'wallet', 'financials', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['create', 'read', 'update', 'delete', 'export'],
      contracts: ['create', 'read', 'export'],
      marketplace: ['create', 'read', 'update'],
      pooling: ['read', 'create'],
      ledger: ['read'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['read']
    },
    approvalRights: [
      'Asset Appraisal Request Submission',
      'Fractional Token Minting Initiation'
    ],
    reportsAvailable: [
      'Individual Asset Valuation History',
      'Collateral Liquidity Ratios',
      'Asset Revenue Distribution History'
    ],
    notifications: [
      'Asset "Kuala Lumpur Port Logistics Hub" approved for tokenization',
      'Quarterly asset appraisal valuation update due'
    ],
    demoUser: {
      name: 'Rashid Khan',
      email: 'rashid.khan@realestate-d8.com',
      organization: 'Indus Asset Holdings',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Asset Manager': {
    role: 'Asset Manager',
    title: 'RWA Portfolio Yield & Facility Manager',
    category: 'Operational Management',
    description: 'Oversees day-to-day facility operations, tenant lease collection, maintenance budgets, and net operating income (NOI).',
    badgeColor: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border-emerald-600/30',
    accessibleTabs: ['dashboard', 'assets', 'financials', 'documents', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read', 'update', 'export'],
      contracts: ['read'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['create', 'read', 'export']
    },
    approvalRights: ['Property Maintenance Expense Approval', 'Tenant Lease Terms Sign-Off'],
    reportsAvailable: ['Net Operating Income (NOI) Breakdown', 'Property Occupancy & Rent Roll'],
    notifications: ['98% rental yield collected for July', 'Maintenance work order completed'],
    demoUser: {
      name: 'Selim Bayraktar',
      email: 'selim.assetmgr@turkey-properties.com',
      organization: 'Anatolia Real Estate Management',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Pool Manager': {
    role: 'Pool Manager',
    title: 'Islamic Liquidity & Waqf Pool Manager',
    category: 'Operational Management',
    description: 'Oversees liquidity pool balances, Mudarabah/Musharakah pool capital deployment, and yield distribution calculations.',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'admin-center', 'marketplace', 'pooling', 'investments', 'assets', 'contracts', 'wallet', 'financials', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read'],
      contracts: ['create', 'read', 'update', 'export'],
      marketplace: ['read'],
      pooling: ['create', 'read', 'update', 'approve', 'export'],
      ledger: ['read', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: [
      'Liquidity Rebalancing Sign-Off',
      'Pool Yield Rate Adjustment',
      'Emergency Pool Reserve Drawdown'
    ],
    reportsAvailable: [
      'Pool Capital Utilization Rate',
      'Mudarabah vs Musharakah Return Breakdown',
      'Waqf Yield Disbursement Audit'
    ],
    notifications: [
      'Pool #4 (Southeast Asia Agribusiness) reaching 95% capacity',
      'Yield disbursement batch scheduled for tomorrow 09:00 UTC'
    ],
    demoUser: {
      name: 'Farida Nur Hidayah',
      email: 'farida.hidayah@d8pools.org',
      organization: 'D-8 Central Liquidity Pool Node',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Portfolio Manager': {
    role: 'Portfolio Manager',
    title: 'Multi-Asset Portfolio Chief Strategist',
    category: 'Operational Management',
    description: 'Constructs optimized multi-asset Islamic portfolios across Sukuk, RWA, commodities, and equities.',
    badgeColor: 'bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-600/30',
    accessibleTabs: ['dashboard', 'investments', 'marketplace', 'pooling', 'financials', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read'],
      contracts: ['read'],
      marketplace: ['read', 'create'],
      pooling: ['read', 'create', 'update'],
      ledger: ['read'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['create', 'read', 'export']
    },
    approvalRights: ['Asset Rebalancing Allocation', 'Asset Weighting Optimization Approval'],
    reportsAvailable: ['Portfolio Risk Adjusted Return (Sharpe/Calmar)', 'Shariah Sector Allocation Breakdown'],
    notifications: ['Portfolio rebalancing trigger activated (+3.2% yield bump)', 'New Sukuk asset added to watch list'],
    demoUser: {
      name: 'Dr. Zulkifli Hasan',
      email: 'zulkifli.portmgr@d8wealth.org',
      organization: 'D-8 Global Wealth Management',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  }
};
