import { NavTab } from '../types';

export type UserRole = 
  | 'Super Admin'
  | 'Country Admin'
  | 'Organization Admin'
  | 'Project Sponsor'
  | 'Project Manager'
  | 'Asset Owner'
  | 'Asset Manager'
  | 'Pool Manager'
  | 'Retail Investor'
  | 'HNWI Investor'
  | 'Institutional Investor'
  | 'Corporate Investor'
  | 'Family Office'
  | 'Portfolio Manager'
  | 'Shariah Advisor'
  | 'Shariah Reviewer'
  | 'Shariah Committee'
  | 'Compliance Officer'
  | 'KYC Officer'
  | 'KYB Officer'
  | 'AML Officer'
  | 'Risk Officer'
  | 'Fraud Analyst'
  | 'Legal Officer'
  | 'Finance Officer'
  | 'Treasury Officer'
  | 'Settlement Officer'
  | 'Reconciliation Officer'
  | 'Auditor'
  | 'Customer Support'
  | 'System Administrator'
  | 'Security Administrator'
  | 'Data Administrator'
  | 'AI Administrator'
  | 'AI Model Reviewer'
  | 'Guest';

/**
 * Display groups, in the order screens list them. Labels only: permissions come from each role.
 * Delivery partners (PDP, mostly GLCs and companies such as land and plantation development
 * agencies) and asset owners (holders of land, buildings, machinery and other real assets) are
 * separate client groups, apart from platform staff. Investors, from individuals to investment
 * companies and GLCs, are Participant & User.
 */
export const ROLE_CATEGORIES = ['System Executive', 'Operational Management', 'Delivery Partner (PDP)', 'Asset Owner', 'Governance & Risk', 'Participant & User'] as const;
export type RoleCategory = typeof ROLE_CATEGORIES[number];

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'audit' | 'export';

export type ResourceModule = 
  | 'dashboard'
  | 'assets'
  | 'contracts'
  | 'marketplace'
  | 'pooling'
  | 'ledger'
  | 'profile'
  | 'governance'
  | 'approvals'
  | 'users'
  | 'audit_logs'
  | 'reports';

export interface RoleDefinition {
  role: UserRole;
  title: string;
  category: RoleCategory;
  description: string;
  badgeColor: string; // Tailwind class string for badge
  accessibleTabs: NavTab[];
  permissions: Record<ResourceModule, PermissionAction[]>;
  approvalRights: string[];
  reportsAvailable: string[];
  notifications: string[];
  demoUser: {
    name: string;
    email: string;
    organization: string;
    avatarUrl: string;
  };
}
