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
export function getAccessibleTabs(role: UserRole): NavTab[] {
  const roleDef = ROLE_DEFINITIONS[role];
  const tabs: NavTab[] = roleDef ? [...roleDef.accessibleTabs] : (['dashboard', 'marketplace'] as NavTab[]);
  if (!tabs.includes('membership')) {
    tabs.push('membership');
  }
  return tabs;
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
  if (tab === 'membership') return true;
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
