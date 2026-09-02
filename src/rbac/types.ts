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
  category: 'System Executive' | 'Operational Management' | 'Governance & Risk' | 'Participant & User';
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
