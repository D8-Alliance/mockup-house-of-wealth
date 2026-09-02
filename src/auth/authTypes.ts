import { UserRole } from '../rbac/types';

export interface UserSession {
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  organisationId: string;
  countryNodeId: string;
  activeRole: UserRole;
  assignedRoles: UserRole[];
  token: string;
  isDemoSession: boolean;
  mfaVerified: boolean;
  expiresAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  session: UserSession | null;
  mode: 'DEMO' | 'PRODUCTION';
}
