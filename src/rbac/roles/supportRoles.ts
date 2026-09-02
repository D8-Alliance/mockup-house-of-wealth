import { RoleDefinition } from '../types';

export const SUPPORT_ROLES: Record<string, RoleDefinition> = {
  'Customer Support': {
    role: 'Customer Support',
    title: 'Customer Support & Helpdesk Specialist',
    category: 'Operational Management',
    description: 'Assists investors and asset owners with account settings, identity verification inquiries, payout issues, and system guidance.',
    badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30',
    accessibleTabs: ['dashboard', 'profile', 'marketplace', 'assets'],
    permissions: {
      dashboard: ['read'],
      assets: ['read'],
      contracts: ['read'],
      marketplace: ['read'],
      pooling: ['read'],
      ledger: ['read'],
      profile: ['read', 'update'],
      governance: ['read'],
      approvals: [],
      users: ['read'],
      audit_logs: [],
      reports: ['read']
    },
    approvalRights: [],
    reportsAvailable: [
      'User Support Ticket Resolution Rate',
      'Common Helpdesk Queries Breakdown'
    ],
    notifications: [
      '5 New Support tickets submitted regarding bank verification',
      'User #USR-9921 requested avatar update assistance'
    ],
    demoUser: {
      name: 'Youssef Mansour',
      email: 'support.youssef@how.org',
      organization: 'House of Wealth Global Helpdesk',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80'
    }
  },

  'Guest': {
    role: 'Guest',
    title: 'Guest / Public Visitor',
    category: 'Participant & User',
    description: 'Limited public view of the D-8 House of Wealth ecosystem, marketplace offerings, and educational Shariah finance resources.',
    badgeColor: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
    accessibleTabs: ['dashboard', 'marketplace'],
    permissions: {
      dashboard: ['read'],
      assets: ['read'],
      contracts: [],
      marketplace: ['read'],
      pooling: [],
      ledger: [],
      profile: [],
      governance: [],
      approvals: [],
      users: [],
      audit_logs: [],
      reports: []
    },
    approvalRights: [],
    reportsAvailable: [
      'D-8 Islamic Circular Economy Overview'
    ],
    notifications: [
      'Welcome to House of Wealth! Register to unlock full investment features.'
    ],
    demoUser: {
      name: 'Guest Visitor',
      email: 'visitor@public-d8.org',
      organization: 'Prospective D-8 Participant',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
    }
  }
};
