import { AuthMode, AuthUser, AuthSession, LoginCredentials, RegisterCredentials, AuthState } from '../types/authTypes';
import { DEMO_PERSONAS } from './demoPersonas';
import { mfaService } from './mfaService';
import { auditLogger } from '../../audit/auditLogger';
import { UserRole } from '../../rbac/types';
import { SINGLE_ROLE_MODE } from '../../rbac/runtimeConfig';

// The mock backend (AUTH_MODE=mock) reads identity claims from the first
// segment of the bearer token, so a demo session must carry the persona it was
// actually created for. Roles stay server-authoritative: the backend uses these
// claims only to look the user up, then reads role assignments from the database.
function mockSessionToken(user: AuthUser): string {
  if (SINGLE_ROLE_MODE) {
    return `${btoa(JSON.stringify({ mock: 'mock-user', countryNode: 'CN-MYS', org: 'ORG-PUBLIC' }))}.demo-token`;
  }
  const claims = {
    mock: user.userId.replace(/^USR-/, ''),
    role: user.activeRole,
    countryNode: user.countryNodeId,
    org: user.organisationId
  };
  const base64 = btoa(JSON.stringify(claims));
  return `${base64.split('+').join('-').split('/').join('_').split('=').join('')}.demo-token`;
}

export class MockAuthProvider {
  // App opens as a public Guest on the landing page. A session is only created
  // after the user completes the identity-gateway sign-in flow.
  private currentSession: AuthSession | null = null;

  private mode: AuthMode = 'DEMO';

  // Accounts created through the public Register flow (DEMO mode). Registered
  // users can subsequently sign in with the same email + the selected role.
  private registered: Record<string, { credentials: RegisterCredentials; user: AuthUser }> = {};

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

  public setMode(mode: AuthMode): void {
    this.mode = mode;
  }

  /**
   * Enter the app as an unauthenticated-but-browsing public Guest.
   * Creates a Guest-session so role guards see an authenticated (Guest) actor
   * and the public marketplace/dashboard render, while no real identity is
   * granted. Sign-in upgrades this to a persona session.
   */
  public enterAsGuest(): void {
    const persona = DEMO_PERSONAS['Guest'] || DEMO_PERSONAS['Country Admin'];
    const sessionUser: AuthUser = { ...persona, activeRole: 'Guest' };
    this.currentSession = {
      sessionId: 'SES-GUEST-PUBLIC',
      user: sessionUser,
      token: mockSessionToken(sessionUser),
      isDemoSession: true,
      mfaVerified: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };
  }

  public login(credentials: LoginCredentials): { success: boolean; mfaRequired?: boolean; challengeId?: string; error?: string; session?: AuthSession } {
    const selectedRole = credentials.selectedRole || 'Country Admin';

    // A registered (self-signed up) account takes priority over demo personas.
    const emailKey = credentials.email?.trim().toLowerCase();
    const registeredEntry = emailKey ? this.registered[emailKey] : undefined;
    const persona = registeredEntry
      ? { ...registeredEntry.user, activeRole: registeredEntry.user.assignedRoles[0] }
      : DEMO_PERSONAS[selectedRole] || DEMO_PERSONAS['Country Admin'];

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
    const requiresMfa = this.mode === 'PRODUCTION' && mfaService.requiresMfa(selectedRole, persona.mfaStatus);
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
    const sessionUser: AuthUser = { ...persona, activeRole: selectedRole };
    const newSession: AuthSession = {
      sessionId: `SES-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      user: sessionUser,
      token: mockSessionToken(sessionUser),
        isDemoSession: this.mode !== 'PRODUCTION',
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

  /**
   * Register a new organisation user through the public identity gateway.
   * - DEMO mode:      provisions a local account + session immediately.
   * - PRODUCTION mode: routes to the backend write path (server-side policy
   *                    governs who may create accounts); a stub for this demo.
   */
  public register(credentials: RegisterCredentials): { success: boolean; error?: string; session?: AuthSession; user?: AuthUser } {
    const emailKey = credentials.email.trim().toLowerCase();

    if (!credentials.name || !credentials.email || !credentials.password || !credentials.organisation) {
      return { success: false, error: 'Please complete all required fields.' };
    }

    if (this.registered[emailKey]) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    const user: AuthUser = {
      userId: `USR-REG-${Date.now().toString(36).toUpperCase()}`,
      name: credentials.name.trim(),
      email: credentials.email.trim(),
      organisationId: `ORG-REG-${Date.now().toString(36).toUpperCase()}`,
      organisationName: credentials.organisation.trim(),
      countryNodeId: credentials.countryNodeId,
      countryName: credentials.countryName,
      assignedRoles: [credentials.selectedRole],
      activeRole: credentials.selectedRole,
      status: 'ACTIVE',
      mfaStatus: 'Disabled',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
    };

    this.registered[emailKey] = { credentials, user };

    auditLogger.logEvent({
      userId: user.userId,
      organisationId: user.organisationId,
      countryNodeId: user.countryNodeId,
      role: user.activeRole,
      action: 'REGISTER' as any,
      resourceType: 'Authentication',
      resourceId: user.email,
      result: 'Success',
      metadata: { mode: this.mode, accountSource: this.mode === 'DEMO' ? 'localhost' : 'backend' }
    });

    if (this.mode === 'PRODUCTION') {
      // Production write-path handled by the backend; auto-login is deferred.
      return { success: true, user };
    }

    const newSession: AuthSession = {
      sessionId: `SES-REG-${Date.now()}`,
      user: { ...user, activeRole: user.activeRole },
      token: mockSessionToken(user),
      isDemoSession: true,
      mfaVerified: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };
    this.currentSession = newSession;
    return { success: true, session: newSession, user };
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

    const sessionUser: AuthUser = { ...persona, activeRole: selectedRole };
    const newSession: AuthSession = {
      sessionId: `SES-MFA-${Date.now()}`,
      user: sessionUser,
      token: mockSessionToken(sessionUser),
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
