import { UserRole, ResourceModule, PermissionAction } from './types';
import { ROLE_DEFINITIONS } from './roleDefinitions';
import { NavTab } from '../types';

/**
 * Checks whether a given role has permission to perform an action on a resource module.
 */
export function hasPermission(
  role: UserRole,
  resource: ResourceModule,
  action: PermissionAction
): boolean {
  const roleDef = ROLE_DEFINITIONS[role];
  if (!roleDef) return false;
  
  const allowedActions = roleDef.permissions[resource] || [];
  return allowedActions.includes(action);
}

/**
 * Returns the list of accessible navigation tabs for a given role.
 */
/**
 * Asset partnerships: asset owners offer verified assets to delivery partners' projects; Legal and
 * Shariah approve. Mirrors the roles in server/src/asset-partnerships/asset-partnerships.controller.ts.
 */
const ASSET_PARTNERSHIP_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['Asset Owner', 'Asset Manager', 'Project Sponsor', 'Project Manager', 'Organization Admin', 'Super Admin', 'Country Admin', 'Legal Officer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee']);

/** Asset Register: owners register assets, reviewers verify them. Mirrors server/src/assets/assets.controller.ts. */
const ASSET_REGISTER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['Asset Owner', 'Asset Manager', 'Super Admin', 'Country Admin', 'Legal Officer']);

export function getAccessibleTabs(role: UserRole): NavTab[] {
  const roleDef = ROLE_DEFINITIONS[role];
  if (!roleDef) return [];
  const tabs = roleDef.accessibleTabs.filter((tab) => tab !== 'assets' || ASSET_REGISTER_ROLES.has(role));
  if (ASSET_REGISTER_ROLES.has(role) && !tabs.includes('assets')) tabs.push('assets');
  return ASSET_PARTNERSHIP_ROLES.has(role) ? [...tabs, 'asset-partnerships'] : tabs;
}

/**
 * Checks whether a role can perform approvals in a specific domain.
 */
export function canApproveWorkflow(role: UserRole, workflowName: string): boolean {
  const roleDef = ROLE_DEFINITIONS[role];
  if (!roleDef) return false;
  return roleDef.approvalRights.some(right => 
    right.toLowerCase().includes(workflowName.toLowerCase())
  );
}

/**
 * Checks whether a role has read access to a specific tab.
 */
/** Platform staff do not hold a membership or pay subscriptions; billing is for members and administrators. */
const NO_BILLING_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['Guest', 'Finance Officer', 'Risk Officer', 'Compliance Officer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee', 'Legal Officer', 'KYC Officer', 'KYB Officer', 'AML Officer', 'Auditor', 'AI Model Reviewer', 'Fraud Analyst']);

export function isTabAccessible(role: UserRole, tab: NavTab): boolean {
  if (tab === 'billing-transactions' || tab === 'membership') return !NO_BILLING_ROLES.has(role);
  if (tab === 'asset-partnerships') return ASSET_PARTNERSHIP_ROLES.has(role);
  if (tab === 'assets') return ASSET_REGISTER_ROLES.has(role);
  const roleDef = ROLE_DEFINITIONS[role];
  if (!roleDef) return false;
  return roleDef.accessibleTabs.includes(tab);
}

/**
 * Returns the full role definition object for a role.
 */
export function getRoleDefinition(role: UserRole) {
  return ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS['Guest'];
}
