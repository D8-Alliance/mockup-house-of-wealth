import { AppUser, UserAccountStatus, UserInvitationPayload, MfaStatusType, RoleAssignmentHistory } from './userTypes';
import { INITIAL_APP_USERS } from './mockUsers';
import { auditLogger } from '../audit/auditLogger';

class UserServiceStore {
  private users: AppUser[] = [...INITIAL_APP_USERS];

  public getAllUsers(): AppUser[] {
    return [...this.users];
  }

  public getUserById(id: string): AppUser | undefined {
    return this.users.find(u => u.userId === id || (u as any).id === id);
  }

  public getUsersByOrganisation(organisationId: string): AppUser[] {
    return this.users.filter(u => u.organisationId === organisationId);
  }

  public getUsersByCountryNode(countryNodeId: string): AppUser[] {
    return this.users.filter(u => u.countryNodeId === countryNodeId);
  }

  public inviteUser(payload: UserInvitationPayload, performedBy: string): AppUser {
    const userId = `USR-${payload.countryNodeId.replace('CN-', '')}-${Math.floor(100 + Math.random() * 900)}`;
    const newUser: AppUser = {
      userId,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone || '+60 12 000 0000',
      department: payload.department,
      jobTitle: payload.jobTitle,
      organisationId: payload.organisationId,
      countryNodeId: payload.countryNodeId,
      status: 'PENDING',
      primaryRole: payload.role,
      assignedRoles: [payload.role],
      mfaEnabled: false,
      mfaStatus: 'Disabled',
      kycLevel: 'Level 1',
      verified: false,
      profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      lastLogin: 'Never',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: performedBy,
      updatedBy: performedBy,
      roleHistory: [
        {
          id: `RH-${Date.now()}`,
          userId,
          organisationId: payload.organisationId,
          performedBy,
          oldRole: 'None',
          newRole: payload.role,
          timestamp: new Date().toISOString(),
          reason: 'Initial Invitation & Onboarding Assignment',
          status: 'Completed'
        }
      ]
    };

    this.users.unshift(newUser);

    auditLogger.logEvent({
      userId: performedBy,
      organisationId: payload.organisationId,
      countryNodeId: payload.countryNodeId,
      role: 'Organization Admin',
      action: 'user_invite' as any,
      resourceType: 'User',
      resourceId: userId,
      result: 'Success',
      metadata: { email: payload.email, invitedRole: payload.role }
    });

    return newUser;
  }

  public completeOnboarding(userId: string): AppUser | undefined {
    const idx = this.users.findIndex(u => u.userId === userId || (u as any).id === userId);
    if (idx === -1) return undefined;

    this.users[idx] = {
      ...this.users[idx],
      status: 'ACTIVE',
      mfaEnabled: true,
      mfaStatus: 'Enabled',
      verified: true,
      lastLogin: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    auditLogger.logEvent({
      userId,
      organisationId: this.users[idx].organisationId,
      countryNodeId: this.users[idx].countryNodeId,
      role: this.users[idx].primaryRole,
      action: 'user_onboarding_complete' as any,
      resourceType: 'User',
      resourceId: userId,
      result: 'Success'
    });

    return this.users[idx];
  }

  public updateUserStatus(userId: string, status: UserAccountStatus, performedBy: string, reason?: string): AppUser | undefined {
    const idx = this.users.findIndex(u => u.userId === userId || (u as any).id === userId);
    if (idx === -1) return undefined;

    const oldStatus = this.users[idx].status;
    this.users[idx] = {
      ...this.users[idx],
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: performedBy
    };

    let actionName: any = 'user_update';
    if (status === 'ACTIVE') actionName = 'user_activate';
    else if (status === 'SUSPENDED') actionName = 'user_suspend';
    else if (status === 'DEACTIVATED') actionName = 'user_deactivate';

    auditLogger.logEvent({
      userId: performedBy,
      organisationId: this.users[idx].organisationId,
      countryNodeId: this.users[idx].countryNodeId,
      role: 'Organization Admin',
      action: actionName,
      resourceType: 'User',
      resourceId: userId,
      result: 'Success',
      metadata: { oldStatus, newStatus: status, reason }
    });

    return this.users[idx];
  }

  public assignRoles(userId: string, primaryRole: string, assignedRoles: string[], performedBy: string, reason: string): AppUser | undefined {
    const idx = this.users.findIndex(u => u.userId === userId || (u as any).id === userId);
    if (idx === -1) return undefined;

    const user = this.users[idx];
    const oldRolesStr = user.assignedRoles.join(', ');
    const newRolesStr = assignedRoles.join(', ');

    const newHistoryEntry: RoleAssignmentHistory = {
      id: `RH-${Date.now()}`,
      userId,
      organisationId: user.organisationId,
      performedBy,
      oldRole: oldRolesStr,
      newRole: newRolesStr,
      timestamp: new Date().toISOString(),
      reason,
      status: 'Completed'
    };

    this.users[idx] = {
      ...user,
      primaryRole,
      assignedRoles,
      roleHistory: [newHistoryEntry, ...(user.roleHistory || [])],
      updatedAt: new Date().toISOString(),
      updatedBy: performedBy
    };

    auditLogger.logEvent({
      userId: performedBy,
      organisationId: user.organisationId,
      countryNodeId: user.countryNodeId,
      role: 'Organization Admin',
      action: 'role_assignment_change' as any,
      resourceType: 'User',
      resourceId: userId,
      result: 'Success',
      metadata: { oldRoles: oldRolesStr, newRoles: newRolesStr, reason }
    });

    return this.users[idx];
  }
}

export const userService = new UserServiceStore();
