import { RoleDefinition } from '../types';

export const COMPLIANCE_ROLES: Record<string, RoleDefinition> = {
  'Compliance Officer': {
    role: 'Compliance Officer',
    title: 'AML / KYC & Regulatory Compliance Officer',
    category: 'Governance & Risk',
    description: 'Monitors anti-money laundering (AML), sanctions list checking, KYC verification levels, and regulatory reporting.',
    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'admin-center', 'marketplace', 'pooling', 'investments', 'assets', 'contracts', 'wallet', 'financials', 'beneficiaries', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read', 'audit'],
      contracts: ['read', 'audit'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read', 'audit', 'export'],
      profile: ['read', 'update'],
      governance: ['read', 'audit'],
      approvals: ['read', 'approve'],
      users: ['read', 'update', 'approve'],
      audit_logs: ['read', 'audit', 'export'],
      reports: ['read', 'export']
    },
    approvalRights: [
      'KYC Level 3 Verification Sign-Off',
      'Suspicious Transaction Hold / Release',
      'PEP & Sanction Clearance'
    ],
    reportsAvailable: [
      'AML & Sanction Screening Incident Log',
      'High-Value Cross-Border Transfer Report',
      'KYC Audit & Verification Stats'
    ],
    notifications: [
      'Flagged transaction hash #0x8f... requires manual AML review',
      '12 Investor KYC Level 3 applications pending approval'
    ],
    demoUser: {
      name: 'Amina Bello',
      email: 'amina.bello@compliance.d8.org',
      organization: 'D-8 Regulatory Compliance Unit',
      avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80'
    }
  },

  'KYC Officer': {
    role: 'KYC Officer',
    title: 'Individual Identity Verification Specialist',
    category: 'Governance & Risk',
    description: 'Verifies individual passport documents, facial biometric scans, proof of address, and PEP screening checks.',
    badgeColor: 'bg-rose-600/10 text-rose-700 dark:text-rose-300 border-rose-600/30',
    accessibleTabs: ['dashboard', 'admin-center', 'documents', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read'],
      contracts: ['read'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read', 'approve'],
      users: ['read', 'update', 'approve'],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: ['Individual Identity Level 1/2/3 Approval', 'Document Resubmission Request'],
    reportsAvailable: ['KYC Queue Processing Time Metrics', 'Document Fraud Flag Rate'],
    notifications: ['18 Individual identity documents waiting in queue', 'Biometric match passed for user #USR-4401'],
    // Matches the 'KYC Officer' persona in src/auth/services/demoPersonas.ts (USR-KYC-013).
    demoUser: {
      name: 'Aisyah binti Kamal',
      email: 'aisyah.kamal@sc.my',
      organization: 'D-8 Secretariat',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'
    }
  },

  'KYB Officer': {
    role: 'KYB Officer',
    title: 'Corporate Entity & Business Verification Lead',
    category: 'Governance & Risk',
    description: 'Audits corporate registration licenses, ultimate beneficial ownership (UBO) structures, and corporate bank details.',
    badgeColor: 'bg-pink-600/10 text-pink-700 dark:text-pink-300 border-pink-600/30',
    accessibleTabs: ['dashboard', 'admin-center', 'documents', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read'],
      contracts: ['read'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read', 'approve'],
      users: ['read', 'update', 'approve'],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: ['Corporate Entity Onboarding Clearance', 'UBO Structure Sign-Off'],
    reportsAvailable: ['Corporate Entity Due Diligence Audit', 'UBO Concentration Report'],
    notifications: ['Corporate onboarding application from Gulf Capital Holdings requires UBO sign-off', 'License verified'],
    demoUser: {
      name: 'Omer Faruk Kara',
      email: 'omer.kyb@compliance.how.org',
      organization: 'Corporate Due Diligence Unit',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  },

  'AML Officer': {
    role: 'AML Officer',
    title: 'Anti-Money Laundering & Sanctions Specialist',
    category: 'Governance & Risk',
    description: 'Conducts automated and manual sanctions checks (OFAC/UN/EU), monitoring transaction flow Velocity and suspicious activity reports (SAR).',
    badgeColor: 'bg-red-600/10 text-red-700 dark:text-red-300 border-red-600/30',
    accessibleTabs: ['dashboard', 'admin-center', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read'],
      contracts: ['read'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read', 'audit', 'export'],
      profile: ['read', 'update'],
      governance: ['read', 'audit'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read', 'audit', 'export'],
      reports: ['create', 'read', 'export']
    },
    approvalRights: ['Suspicious Activity Report (SAR) Filing Approval', 'Account Freeze Order'],
    reportsAvailable: ['AML Sanctions Screening Audit', 'High Risk Transaction Summary'],
    notifications: ['OFAC screening check passed with 0 false positives', '1 Transaction frozen pending review'],
    demoUser: {
      name: 'Zubair Al-Mansur',
      email: 'zubair.aml@compliance.d8.org',
      organization: 'Financial Crime Enforcement Unit',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Risk Officer': {
    role: 'Risk Officer',
    title: 'Enterprise Risk & Valuation Officer',
    category: 'Governance & Risk',
    description: 'Evaluates collateral sufficiency, default risks, asset valuation volatility, and overall platform Value-at-Risk (VaR).',
    badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
    accessibleTabs: ['dashboard', 'marketplace', 'pooling', 'investments', 'assets', 'contracts', 'wallet', 'financials', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['read', 'audit'],
      contracts: ['read', 'audit'],
      marketplace: ['read'],
      pooling: ['read', 'audit'],
      ledger: ['read', 'export'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read', 'export'],
      reports: ['read', 'export']
    },
    approvalRights: [
      'Collateral LTV Limit Authorization',
      'Risk Rating Tier Assignment (Low/Medium/High)',
      'Asset Valuation Discount Rate Sign-Off'
    ],
    reportsAvailable: [
      'Platform Portfolio Value-at-Risk (VaR)',
      'Liquidity Stress Test Analysis',
      'Collateral Concentration Exposure'
    ],
    notifications: [
      'Commodity pool collateral ratio dropped near threshold (72%)',
      'Stress test simulation complete for Real Estate assets'
    ],
    demoUser: {
      name: 'Kenji Takahashi',
      email: 'kenji.takahashi@riskanalytics.io',
      organization: 'D-8 Enterprise Risk Committee',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Fraud Analyst': {
    role: 'Fraud Analyst',
    title: 'Fraud Prevention & Cyber Anomaly Specialist',
    category: 'Governance & Risk',
    description: 'Analyzes device fingerprinting, session hijacking attempts, account takeover risks, and fraudulent withdrawal requests.',
    badgeColor: 'bg-amber-700/10 text-amber-800 dark:text-amber-200 border-amber-700/30',
    accessibleTabs: ['dashboard', 'admin-center', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read'],
      contracts: ['read'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read', 'audit'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read', 'approve'],
      users: ['read', 'update'],
      audit_logs: ['read', 'audit', 'export'],
      reports: ['read', 'export']
    },
    approvalRights: ['Fraudulent Account Lock Approval', 'Suspicious Withdrawal Cancellation'],
    reportsAvailable: ['Fraud Anomaly Detection Matrix', 'Device Fingerprint Audit Log'],
    notifications: ['Account takeover risk score 0.02 (Very Low)', 'Unusual login location blocked'],
    demoUser: {
      name: 'Yusuf Ibrahim',
      email: 'yusuf.fraud@security.how.org',
      organization: 'Fraud Intelligence Center',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  }
};
