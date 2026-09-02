import { RoleDefinition, UserRole } from './types';
import { SYSTEM_ROLES } from './roles/systemRoles';
import { GOVERNANCE_ROLES } from './roles/governanceRoles';
import { OPERATIONS_ROLES } from './roles/operationsRoles';
import { INVESTOR_ROLES } from './roles/investorRoles';
import { SHARIAH_ROLES } from './roles/shariahRoles';
import { COMPLIANCE_ROLES } from './roles/complianceRoles';
import { FINANCE_ROLES } from './roles/financeRoles';
import { SUPPORT_ROLES } from './roles/supportRoles';

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
