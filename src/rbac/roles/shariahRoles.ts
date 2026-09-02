import { RoleDefinition } from '../types';

export const SHARIAH_ROLES: Record<string, RoleDefinition> = {
  'Shariah Advisor': {
    role: 'Shariah Advisor',
    title: 'AAOIFI Shariah Governance Board Scholar',
    category: 'Governance & Risk',
    description: 'Evaluates asset structures, smart contract terms, and liquidity pool rules for AAOIFI Shariah compliance and issues Fatwa certificates.',
    badgeColor: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border-emerald-600/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'admin-center', 'marketplace', 'pooling', 'investments', 'assets', 'contracts', 'wallet', 'financials', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read', 'approve', 'audit'],
      contracts: ['read', 'approve', 'audit'],
      marketplace: ['read', 'approve'],
      pooling: ['read', 'approve', 'audit'],
      ledger: ['read', 'audit'],
      profile: ['read', 'update'],
      governance: ['create', 'read', 'update', 'approve', 'audit', 'export'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read', 'audit'],
      reports: ['read', 'export']
    },
    approvalRights: [
      'Fatwa Compliance Certificate Issuance',
      'Contract Shariah Veto / Reject',
      'Non-Compliant Asset De-listing Order'
    ],
    reportsAvailable: [
      'D-8 Shariah Compliance Audit Log',
      'Riba & Gharar Screening Matrix',
      'Zakat Calculation Verification Certificate'
    ],
    notifications: [
      '4 New Mudarabah Contracts waiting for Fatwa certification',
      'Annual AAOIFI Shariah Compliance Audit due'
    ],
    demoUser: {
      name: 'Sheikh Prof. Dr. Imran Usmani',
      email: 'sheikh.imran@shariahboard.d8.org',
      organization: 'Central D-8 Shariah Supreme Board',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Shariah Reviewer': {
    role: 'Shariah Reviewer',
    title: 'Shariah Audit & Contract Inspector',
    category: 'Governance & Risk',
    description: 'Performs line-by-line contract inspections, transactional audits, and verifies profit-sharing ratio accuracy before Fatwa issuance.',
    badgeColor: 'bg-teal-600/10 text-teal-700 dark:text-teal-300 border-teal-600/30',
    accessibleTabs: ['dashboard', 'contracts', 'assets', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read', 'audit'],
      contracts: ['read', 'audit', 'export'],
      marketplace: ['read'],
      pooling: ['read', 'audit'],
      ledger: ['read', 'audit'],
      profile: ['read', 'update'],
      governance: ['read', 'audit'],
      approvals: ['read'],
      users: ['read'],
      audit_logs: ['read', 'audit'],
      reports: ['read', 'export']
    },
    approvalRights: ['Preliminary Shariah Inspection Clearance'],
    reportsAvailable: ['Contract Clause Non-Compliance Finding', 'Impermissible Revenue Audit'],
    notifications: ['Inspection complete for Sukuk contract #SKK-109', 'Clarification requested on Murabaha markup rate'],
    demoUser: {
      name: 'Ustadh Bilal Al-Azhari',
      email: 'bilal.reviewer@shariah-audit.org',
      organization: 'D-8 Shariah Executive Review Committee',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Shariah Committee': {
    role: 'Shariah Committee',
    title: 'Supreme Shariah Board Committee Member',
    category: 'Governance & Risk',
    description: 'Votes on platform-wide Shariah rulings, resolves scholar disputes, and sets uniform AAOIFI standard guidelines for D-8 nations.',
    badgeColor: 'bg-emerald-700/10 text-emerald-800 dark:text-emerald-200 border-emerald-700/30',
    accessibleTabs: ['dashboard', 'contracts', 'assets', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read', 'approve'],
      contracts: ['read', 'approve'],
      marketplace: ['read'],
      pooling: ['read', 'approve'],
      ledger: ['read', 'audit'],
      profile: ['read', 'update'],
      governance: ['create', 'read', 'update', 'approve', 'export'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: ['Supreme Fatwa Council Resolution Approval', 'Systemic Shariah Standard Amendment'],
    reportsAvailable: ['Supreme Shariah Council Annual Resolution', 'Cross-Border Shariah Harmonization Index'],
    notifications: ['Quarterly Shariah Supreme Council voting session open', '3 Resolution items pending vote'],
    demoUser: {
      name: 'Mufti Muhammad Arshad',
      email: 'mufti.arshad@shariahcouncil.org',
      organization: 'D-8 Supreme Shariah Committee',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
    }
  }
};
