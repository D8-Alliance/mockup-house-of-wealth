import { RoleDefinition } from '../types';

export const SYSTEM_ROLES: Record<string, RoleDefinition> = {
  'Super Admin': {
    role: 'Super Admin',
    title: 'Global Platform Super Administrator',
    category: 'System Executive',
    description: 'Full root authority over all D-8 nodes, system parameters, security policies, and user administration.',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'admin-center', 'sponsor-portal', 'marketplace', 'pooling', 'investments', 'assets', 'contracts', 'wallet', 'financials', 'beneficiaries', 'documents', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read', 'export'],
      assets: ['create', 'read', 'update', 'delete', 'approve', 'audit', 'export'],
      contracts: ['create', 'read', 'update', 'delete', 'approve', 'audit', 'export'],
      marketplace: ['create', 'read', 'update', 'delete', 'approve', 'audit', 'export'],
      pooling: ['create', 'read', 'update', 'delete', 'approve', 'audit', 'export'],
      ledger: ['read', 'audit', 'export'],
      profile: ['read', 'update'],
      governance: ['create', 'read', 'update', 'delete', 'approve', 'audit', 'export'],
      approvals: ['create', 'read', 'update', 'delete', 'approve'],
      users: ['create', 'read', 'update', 'delete', 'approve'],
      audit_logs: ['read', 'audit', 'export'],
      reports: ['read', 'export']
    },
    approvalRights: [
      'Global System Schema Overrides',
      'Country Node Provisioning Sign-Off',
      'Emergency Liquidity Freeze / Unfreeze',
      'Super-Admin Role Delegation'
    ],
    reportsAvailable: [
      'Global D-8 Node Health Summary',
      'Platform Total Value Locked (TVL) Audit',
      'Cross-Border Liquidity Flow Index',
      'Root System Security Log'
    ],
    notifications: [
      'System-wide API latency spike on Malaysia Node',
      'New Country Node onboarding request from Nigeria',
      'Security anomaly detected on smart contract execution'
    ],
    demoUser: {
      name: 'Dr. Tariq Al-Hashimi',
      email: 'tariq.superadmin@how.d8.org',
      organization: 'D-8 Central Executive Council',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
    }
  },

  'System Administrator': {
    role: 'System Administrator',
    title: 'Cloud Infrastructure & DevOps Lead',
    category: 'System Executive',
    description: 'Manages Cloud Run deployment, container cluster scaling, API gateway routing, and server infrastructure health.',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    accessibleTabs: ['dashboard', 'admin-center', 'ledger', 'profile'],
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
      users: ['create', 'read', 'update', 'delete'],
      audit_logs: ['read', 'audit', 'export'],
      reports: ['read', 'export']
    },
    approvalRights: ['Server Container Scaling Approval', 'SSL/TLS Certificate Renewal', 'API Rate Limiting Config'],
    reportsAvailable: ['Server CPU & Memory Utilization', 'API Latency & Uptime SLA Report'],
    notifications: ['Node server memory usage reached 78%', 'Automated backup completed successfully'],
    demoUser: {
      name: 'Faisal Al-Otaibi',
      email: 'faisal.sysadmin@how.d8.org',
      organization: 'House of Wealth DevOps Core',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Security Administrator': {
    role: 'Security Administrator',
    title: 'Chief Information Security Officer (CISO)',
    category: 'System Executive',
    description: 'Oversees HSM key storage, zero-trust access controls, multi-factor authentication, and threat detection.',
    badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
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
      users: ['read', 'update'],
      audit_logs: ['read', 'audit', 'export'],
      reports: ['read', 'export']
    },
    approvalRights: ['HSM Key Rotation Sign-Off', 'IP Whitelist Override', 'Security Incident Isolation'],
    reportsAvailable: ['Intrusion Detection System Log', 'Penetration Testing Audit Summary'],
    notifications: ['MFA required for 3 suspicious login attempts', 'Annual SOC2 Security Audit scheduled'],
    demoUser: {
      name: 'Darius Vance',
      email: 'darius.security@how.d8.org',
      organization: 'D-8 Cyber Defense Unit',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Data Administrator': {
    role: 'Data Administrator',
    title: 'Enterprise Data Architect & Privacy Lead',
    category: 'System Executive',
    description: 'Maintains ledger data integrity, schema migrations, backup synchronization, and GDPR/D8 privacy policies.',
    badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    accessibleTabs: ['dashboard', 'admin-center', 'ledger', 'documents', 'profile'],
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
      audit_logs: ['read', 'audit', 'export'],
      reports: ['read', 'export']
    },
    approvalRights: ['Database Schema Migration Approval', 'Data Anonymization Policy Sign-Off'],
    reportsAvailable: ['Ledger Database Replicas Sync Status', 'Data Retention & Archival Log'],
    notifications: ['Daily ledger snapshot created (4.2GB)', 'Schema migration v2.4 verified'],
    demoUser: {
      name: 'Nadia Rahmani',
      email: 'nadia.data@how.d8.org',
      organization: 'D-8 Data Governance Council',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
    }
  },

  'AI Administrator': {
    role: 'AI Administrator',
    title: 'AI System Deployment & Ops Director',
    category: 'System Executive',
    description: 'Manages Gemini AI model pipelines, prompt grounding, vector embeddings, and LLM rate limit quotas.',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'admin-center', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read'],
      contracts: ['read'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: ['read'],
      users: ['read'],
      audit_logs: ['read'],
      reports: ['read', 'export']
    },
    approvalRights: ['AI Model Endpoint Deployment', 'Prompt Grounding Source Approval'],
    reportsAvailable: ['Gemini Token Usage & Cost Efficiency', 'Shariah AI Grounding Accuracy Score'],
    notifications: ['Gemini 2.5 Flash pipeline upgraded', 'Vector store updated with latest AAOIFI standards'],
    demoUser: {
      name: 'Dr. Hasan Al-Kindi',
      email: 'hasan.aiadmin@how.d8.org',
      organization: 'D-8 AI Wealth Labs',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  },

  'AI Model Reviewer': {
    role: 'AI Model Reviewer',
    title: 'AI Governance & Ethics Auditor',
    category: 'Governance & Risk',
    description: 'Audits AI recommendations for algorithmic bias, hallucination risks, and strict alignment with Islamic finance jurisprudence.',
    badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
    accessibleTabs: ['dashboard', 'ai-engine', 'admin-center', 'ledger', 'profile'],
    permissions: {
      dashboard: ['read'],
      assets: ['read'],
      contracts: ['read'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read', 'audit'],
      profile: ['read', 'update'],
      governance: ['read', 'audit'],
      approvals: ['read', 'approve'],
      users: ['read'],
      audit_logs: ['read', 'audit'],
      reports: ['read', 'export']
    },
    approvalRights: ['AI Advisory Fine-Tuning Sign-Off', 'Algorithmic Risk Flag Certification'],
    reportsAvailable: ['AI Ethics & Bias Assessment Matrix', 'Hallucination Rate & Output Verification'],
    notifications: ['Monthly AI Output Audit completed (99.4% Shariah precision)', 'Prompt review requested'],
    demoUser: {
      name: 'Dr. Fatima Zahra',
      email: 'fatima.aireviewer@how.d8.org',
      organization: 'Islamic AI Ethics Commission',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'
    }
  }
};
