import { RoleDefinition, UserRole } from './types';
import { SYSTEM_ROLES } from './roles/systemRoles';
import { GOVERNANCE_ROLES } from './roles/governanceRoles';
import { OPERATIONS_ROLES } from './roles/operationsRoles';
import { INVESTOR_ROLES } from './roles/investorRoles';
import { SHARIAH_ROLES } from './roles/shariahRoles';
import { COMPLIANCE_ROLES } from './roles/complianceRoles';
import { FINANCE_ROLES } from './roles/financeRoles';
import { SUPPORT_ROLES } from './roles/supportRoles';

const ALL_USER_ROLES: UserRole[] = [
  'Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager',
  'Asset Owner', 'Asset Manager', 'Pool Manager', 'Retail Investor', 'HNWI Investor',
  'Institutional Investor', 'Corporate Investor', 'Family Office', 'Portfolio Manager',
  'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee', 'Compliance Officer', 'KYC Officer',
  'KYB Officer', 'AML Officer', 'Risk Officer', 'Fraud Analyst', 'Legal Officer', 'Finance Officer',
  'Treasury Officer', 'Settlement Officer', 'Reconciliation Officer', 'Auditor', 'Customer Support',
  'System Administrator', 'Security Administrator', 'Data Administrator', 'AI Administrator',
  'AI Model Reviewer', 'Guest'
];

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  ...SYSTEM_ROLES,
  ...GOVERNANCE_ROLES,
  ...OPERATIONS_ROLES,
  ...INVESTOR_ROLES,
  ...SHARIAH_ROLES,
  ...COMPLIANCE_ROLES,
  ...FINANCE_ROLES,
  ...SUPPORT_ROLES,
} as Record<UserRole, RoleDefinition>;

for (const role of ALL_USER_ROLES) {
  if (!ROLE_DEFINITIONS[role]) {
    console.error(`[RBAC] Missing role definition for "${role}". Add it to a role definitions file.`);
  }
}
