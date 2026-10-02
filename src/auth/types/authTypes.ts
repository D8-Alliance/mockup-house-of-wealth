import { UserRole } from '../../rbac/types';

export type UserAccountStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'LOCKED' | 'DEACTIVATED';
export type MfaStatusType = 'Enabled' | 'Disabled' | 'Enforced';
export type AuthMode = 'DEMO' | 'PRE_PRODUCTION' | 'PRODUCTION';

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  organisationId: string;
  organisationName: string;
  countryNodeId: string;
  countryName: string;
  assignedRoles: UserRole[];
  activeRole: UserRole;
  status: UserAccountStatus;
  mfaStatus: MfaStatusType;
  kycLevel?: string;
  avatarUrl?: string;
}

export interface AuthSession {
  sessionId: string;
  user: AuthUser;
  token: string;
  isDemoSession: boolean;
  mfaVerified: boolean;
  expiresAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  session: AuthSession | null;
  mode: AuthMode;
  status: 'authenticated' | 'unauthenticated' | 'sessionExpired' | 'sessionLoading' | 'accountLocked' | 'accountSuspended';
}

export interface LoginCredentials {
  email: string;
  password?: string;
  selectedRole?: UserRole;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  organisation: string;
  countryNodeId: string;
  countryName: string;
  selectedRole: UserRole;
  /** IDs created by the backend sign-up (demo mode); when set the session uses them. */
  userId?: string;
  organisationId?: string;
}

export interface MfaChallenge {
  challengeId: string;
  userId: string;
  channel: 'SMS' | 'AuthenticatorApp' | 'Email';
  expiresInSeconds: number;
  maxAttempts: number;
  attemptsRemaining: number;
}

export interface PasswordResetRequest {
  email: string;
  timestamp: string;
  simulatedSent: boolean;
}
