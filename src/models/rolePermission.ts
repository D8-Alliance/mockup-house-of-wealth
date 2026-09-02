export interface PermissionModel {
  id: string;
  module: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'audit' | 'export';
  description: string;
}

export interface RoleModel {
  id: string;
  name: string;
  category: 'System Executive' | 'Operational Management' | 'Governance & Risk' | 'Participant & User';
  description: string;
  permissions: PermissionModel[];
}

export interface UserRoleAssignmentModel {
  id: string;
  userId: string;
  role: string;
  assignedBy: string;
  assignedAt: string;
  scope: 'Global' | 'Country' | 'Organisation' | 'Self';
  organisationId?: string;
  countryNodeId?: string;
}
