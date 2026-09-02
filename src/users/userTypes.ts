export type UserAccountStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'LOCKED' | 'DEACTIVATED';
export type MfaStatusType = 'Enabled' | 'Disabled' | 'Enforced';

export interface RoleAssignmentHistory {
  id: string;
  userId: string;
  organisationId: string;
  performedBy: string;
  oldRole: string;
  newRole: string;
  timestamp: string;
  reason: string;
  status: 'Completed' | 'Pending Approval' | 'Rejected';
}

export interface UserInvitationPayload {
  fullName: string;
  email: string;
  phone?: string;
  department: string;
  jobTitle: string;
  role: string;
  organisationId: string;
  countryNodeId: string;
}

export interface AppUser {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  organisationId: string;
  countryNodeId: string;
  status: UserAccountStatus;
  primaryRole: string;
  assignedRoles: string[];
  mfaEnabled: boolean;
  mfaStatus: MfaStatusType;
  kycLevel: 'Level 1' | 'Level 2' | 'Level 3' | 'Corporate KYB';
  verified: boolean;
  profilePhoto: string;
  lastLogin: string;
  joinedDate: string;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  roleHistory: RoleAssignmentHistory[];
}
