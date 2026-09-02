import { AuthUser, AuthSession, LoginCredentials, AuthState } from '../types/authTypes';
import { DEMO_PERSONAS } from './demoPersonas';
import { mfaService } from './mfaService';
import { auditLogger } from '../../audit/auditLogger';
import { UserRole } from '../../rbac/types';

export class MockAuthProvider {
  private currentSession: AuthSession | null = {
    sessionId: 'SES-DEMO-2026-99',
    user: DEMO_PERSONAS['Country Admin'],
    token: 'mock-jwt-token-d8-how',
    isDemoSession: true,
    mfaVerified: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  };

  private mode: 'DEMO' | 'PRODUCTION' = 'DEMO';

  public getAuthState(): AuthState {
    const isAuth = !!this.currentSession;
    let status: AuthState['status'] = isAuth ? 'authenticated' : 'unauthenticated';

    if (this.currentSession?.user.status === 'SUSPENDED') {
      status = 'accountSuspended';
    } else if (this.currentSession?.user.status === 'LOCKED') {
      status = 'accountLocked';
    }

    return {
      isAuthenticated: isAuth && status === 'authenticated',
      session: this.currentSession,
      mode: this.mode,
      status
    };
  }

  public setMode(mode: 'DEMO' | 'PRODUCTION'): void {
    this.mode = mode;
  }

  public login(credentials: LoginCredentials): { success: boolean; mfaRequired?: boolean; challengeId?: string; error?: string; session?: AuthSession } {
    const selectedRole = credentials.selectedRole || 'Country Admin';
    const persona = DEMO_PERSONAS[selectedRole] || DEMO_PERSONAS['Country Admin'];

    // Check account status
    if (persona.status === 'SUSPENDED') {
      auditLogger.logEvent({
        userId: persona.userId,
        organisationId: persona.organisationId,
        countryNodeId: persona.countryNodeId,
        role: selectedRole,
        action: 'LOGIN_FAILED' as any,
        resourceType: 'Authentication',
        resourceId: persona.email,
        result: 'Denied',
        metadata: { reason: 'Account is suspended' }
      });
      return { success: false, error: 'Account is suspended. Please contact your Organization Admin.' };
    }

    if (persona.status === 'LOCKED') {
      auditLogger.logEvent({
        userId: persona.userId,
        organisationId: persona.organisationId,
        countryNodeId: persona.countryNodeId,
        role: selectedRole,
        action: 'ACCOUNT_LOCKED' as any,
        resourceType: 'Authentication',
        resourceId: persona.email,
        result: 'Denied',
        metadata: { reason: 'Account is locked' }
      });
      return { success: false, error: 'Account is locked due to security policy.' };
    }

    if (persona.status === 'PENDING') {
      return { success: false, error: 'Account is pending verification. Please verify your email / KYB.' };
    }

    // Check MFA
    const requiresMfa = mfaService.requiresMfa(selectedRole, persona.mfaStatus);
    if (requiresMfa) {
      const challenge = mfaService.createChallenge(persona.userId);
      return {
        success: false,
        mfaRequired: true,
        challengeId: challenge.challengeId,
        error: 'Multi-Factor Authentication (MFA) code required.'
      };
    }

    // Direct Login Success
    const newSession: AuthSession = {
      sessionId: `SES-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      user: { ...persona, activeRole: selectedRole },
      token: `mock-jwt-token-${Math.random().toString(36).substring(2)}`,
      isDemoSession: this.mode === 'DEMO',
      mfaVerified: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };

    this.currentSession = newSession;

    auditLogger.logEvent({
      userId: persona.userId,
      organisationId: persona.organisationId,
      countryNodeId: persona.countryNodeId,
      role: selectedRole,
      action: 'LOGIN_SUCCESS' as any,
      resourceType: 'Authentication',
      resourceId: persona.email,
      result: 'Success',
      metadata: { loginType: 'EmailPassword', mode: this.mode }
    });

    return { success: true, session: newSession };
  }

  public completeMfa(challengeId: string, otpCode: string, selectedRole: UserRole): { success: boolean; error?: string; session?: AuthSession } {
    const persona = DEMO_PERSONAS[selectedRole] || DEMO_PERSONAS['Country Admin'];
    const mfaRes = mfaService.verifyOtp(challengeId, otpCode, {
      userId: persona.userId,
      orgId: persona.organisationId,
      countryId: persona.countryNodeId,
      role: selectedRole
    });

    if (!mfaRes.success) {
      return { success: false, error: mfaRes.error || 'MFA Verification failed.' };
    }

    const newSession: AuthSession = {
      sessionId: `SES-MFA-${Date.now()}`,
      user: { ...persona, activeRole: selectedRole },
      token: `mock-jwt-mfa-token-${Math.random().toString(36).substring(2)}`,
      isDemoSession: this.mode === 'DEMO',
      mfaVerified: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };

    this.currentSession = newSession;

    auditLogger.logEvent({
      userId: persona.userId,
      organisationId: persona.organisationId,
      countryNodeId: persona.countryNodeId,
      role: selectedRole,
      action: 'LOGIN_SUCCESS' as any,
      resourceType: 'Authentication',
      resourceId: persona.email,
      result: 'Success',
      metadata: { mfaCompleted: true }
    });

    return { success: true, session: newSession };
  }

  public logout(): void {
    if (this.currentSession) {
      auditLogger.logEvent({
        userId: this.currentSession.user.userId,
        organisationId: this.currentSession.user.organisationId,
        countryNodeId: this.currentSession.user.countryNodeId,
        role: this.currentSession.user.activeRole,
        action: 'LOGOUT' as any,
        resourceType: 'Authentication',
        resourceId: this.currentSession.sessionId,
        result: 'Success',
        metadata: { logoutTime: new Date().toISOString() }
      });
    }
    this.currentSession = null;
    sessionStorage.clear();
  }

  public switchRole(targetRole: UserRole): boolean {
    if (!this.currentSession) return false;

    if (this.mode === 'PRODUCTION') {
      if (!this.currentSession.user.assignedRoles.includes(targetRole)) {
        auditLogger.logEvent({
          userId: this.currentSession.user.userId,
          organisationId: this.currentSession.user.organisationId,
          countryNodeId: this.currentSession.user.countryNodeId,
          role: this.currentSession.user.activeRole,
          action: 'ACCESS_DENIED' as any,
          resourceType: 'RBAC',
          resourceId: targetRole,
          result: 'Denied',
          metadata: { reason: 'Unauthorized role switch attempt in Production Mode' }
        });
        return false;
      }
    }

    const oldRole = this.currentSession.user.activeRole;
    this.currentSession.user.activeRole = targetRole;

    auditLogger.logEvent({
      userId: this.currentSession.user.userId,
      organisationId: this.currentSession.user.organisationId,
      countryNodeId: this.currentSession.user.countryNodeId,
      role: targetRole,
      action: (this.mode === 'DEMO' ? 'ROLE_SELECTED_DEMO' : 'ROLE_CHANGED') as any,
      resourceType: 'RBAC',
      resourceId: targetRole,
      result: 'Success',
      metadata: { switchedFrom: oldRole, switchedTo: targetRole, mode: this.mode }
    });

    return true;
  }
}

export const mockAuthProvider = new MockAuthProvider();
