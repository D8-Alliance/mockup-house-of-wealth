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

export function getAccessibleTabs(role: UserRole): NavTab[] {
  const roleDef = ROLE_DEFINITIONS[role];
  if (!roleDef) return [];
  return ASSET_PARTNERSHIP_ROLES.has(role) ? [...roleDef.accessibleTabs, 'asset-partnerships'] : [...roleDef.accessibleTabs];
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
export function isTabAccessible(role: UserRole, tab: NavTab): boolean {
  if (tab === 'billing-transactions' || tab === 'membership') return role !== 'Guest';
  if (tab === 'asset-partnerships') return ASSET_PARTNERSHIP_ROLES.has(role);
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
