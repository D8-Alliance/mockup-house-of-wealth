import { UserSession, AuthState } from './authTypes';
import { UserRole } from '../rbac/types';
import { auditLogger } from '../audit/auditLogger';

class SessionManagerStore {
  private state: AuthState = {
    isAuthenticated: true,
    mode: 'DEMO',
    session: {
      sessionId: 'SES-DEMO-99201',
      userId: 'USR-PAK-001',
      userName: 'Ahmed Al-Mansoor',
      userEmail: 'ahmed.almansoor@how.org',
      organisationId: 'ORG-GULF-CAP',
      countryNodeId: 'CN-PAK',
      activeRole: 'Country Admin',
      assignedRoles: ['Country Admin', 'Super Admin', 'Project Sponsor'],
      token: 'jwt-demo-token-d8-how',
      isDemoSession: true,
      mfaVerified: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    }
  };

  public getAuthState(): AuthState {
    return { ...this.state };
  }

  public getMode(): 'DEMO' | 'PRODUCTION' {
    return this.state.mode;
  }

  public setMode(mode: 'DEMO' | 'PRODUCTION'): void {
    this.state.mode = mode;
  }

  public canSwitchToRole(targetRole: UserRole): boolean {
    if (this.state.mode === 'DEMO') {
      return true; // In DEMO mode, switching across all 36 roles is allowed
    }
    // In Production mode, role switching is strictly restricted to assigned roles
    if (!this.state.session) return false;
    return this.state.session.assignedRoles.includes(targetRole);
  }

  public switchDemoRole(newRole: UserRole): boolean {
    if (!this.canSwitchToRole(newRole)) {
      return false;
    }

    if (this.state.session) {
      const oldRole = this.state.session.activeRole;
      this.state.session.activeRole = newRole;

      // Log audit event for role switch
      auditLogger.logEvent({
        userId: this.state.session.userId,
        userName: this.state.session.userName,
        organisationId: this.state.session.organisationId,
        countryNodeId: this.state.session.countryNodeId,
        role: newRole,
        action: 'role_switch_demo',
        resourceType: 'RBAC',
        resourceId: `ROLE-${newRole}`,
        result: 'Success',
        metadata: { switchedFrom: oldRole, switchedTo: newRole, mode: this.state.mode }
      });
    }
    return true;
  }
}

export const sessionManager = new SessionManagerStore();
