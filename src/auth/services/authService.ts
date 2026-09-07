import { mockAuthProvider } from './mockAuthProvider';
import { AuthState, LoginCredentials, RegisterCredentials, AuthSession, AuthUser } from '../types/authTypes';
import { UserRole } from '../../rbac/types';
import { auditLogger } from '../../audit/auditLogger';

export interface IAuthProvider {
  getAuthState(): AuthState;
  login(credentials: LoginCredentials): { success: boolean; mfaRequired?: boolean; challengeId?: string; error?: string; session?: AuthSession };
  completeMfa(challengeId: string, otpCode: string, selectedRole: UserRole): { success: boolean; error?: string; session?: AuthSession };
  register(credentials: RegisterCredentials): { success: boolean; error?: string; session?: AuthSession; user?: AuthUser };
  logout(): void;
  switchRole(targetRole: UserRole): boolean;
  setMode(mode: 'DEMO' | 'PRODUCTION'): void;
  enterAsGuest(): void;
}

class AuthService {
  private provider: IAuthProvider;

  constructor(provider: IAuthProvider) {
    this.provider = provider;
  }

  public setProvider(newProvider: IAuthProvider): void {
    this.provider = newProvider;
  }

  public getAuthState(): AuthState {
    return this.provider.getAuthState();
  }

  public login(credentials: LoginCredentials) {
    return this.provider.login(credentials);
  }

  public completeMfa(challengeId: string, otpCode: string, selectedRole: UserRole) {
    return this.provider.completeMfa(challengeId, otpCode, selectedRole);
  }

  public register(credentials: RegisterCredentials) {
    return this.provider.register(credentials);
  }

  public logout(): void {
    this.provider.logout();
  }

  public switchRole(targetRole: UserRole): boolean {
    return this.provider.switchRole(targetRole);
  }

  public setMode(mode: 'DEMO' | 'PRODUCTION'): void {
    this.provider.setMode(mode);
  }

  public enterAsGuest(): void {
    this.provider.enterAsGuest();
  }

  public requestPasswordReset(email: string): { success: boolean; message: string } {
    auditLogger.logEvent({
      userId: 'ANONYMOUS',
      organisationId: 'GLOBAL',
      countryNodeId: 'GLOBAL',
      role: 'Guest',
      action: 'PASSWORD_RESET_REQUEST' as any,
      resourceType: 'Authentication',
      resourceId: email,
      result: 'Success',
      metadata: { simulated: true }
    });
    return {
      success: true,
      message: `Demo Mode — Password reset email simulated and sent to ${email}.`
    };
  }
}

export const authService = new AuthService(mockAuthProvider);
