import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserRole, ResourceModule, PermissionAction, RoleDefinition } from './types';
import { ROLE_DEFINITIONS } from './roleDefinitions';
import { hasPermission, getAccessibleTabs, isTabAccessible } from './rbacEngine';
import { UserProfile, NavTab } from '../types';
import { authService } from '../auth/services/authService';
import { AuthMode, AuthState } from '../auth/types/authTypes';
import { apiClient, BackendAccess, BackendUser } from '../services/apiClient';
import { shariahContentService } from '../shariah/shariahContentService';

interface RBACContextType {
  currentRole: UserRole;
  roleDef: RoleDefinition;
  setRole: (role: UserRole) => void;
  checkPermission: (resource: ResourceModule, action: PermissionAction) => boolean;
  canAccessTab: (tab: NavTab) => boolean;
  accessibleTabs: NavTab[];
  activeUser: UserProfile;
  isAuthenticated: boolean;
  guestBrowsing: boolean;
  loginUser: (role: UserRole, email?: string) => void;
  logoutUser: () => void;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  assignedRoles: UserRole[];
  tenantContext: {
    userId: string;
    organisationId: string;
    countryNodeId: string;
    role: UserRole;
  };
  currentCountryNode: string;
  currentOrgId: string;
  currentUserId: string;
  /** Replace the cached backend user after a profile save, so the header shows the new picture at once. */
  updateBackendUser: (user: BackendUser) => void;
}

// Keep a single context instance across Vite HMR re-evaluations of this module
// (e.g. when apiClient/authService change). Otherwise consumers pick up a fresh
// context object while the mounted provider still serves the old one, and
// useRBAC throws "must be used within an RBACProvider".
const rbacContextGlobal = globalThis as typeof globalThis & {
  __RBAC_CONTEXT__?: React.Context<RBACContextType | undefined>;
};
const RBACContext =
  rbacContextGlobal.__RBAC_CONTEXT__ ??
  (rbacContextGlobal.__RBAC_CONTEXT__ = createContext<RBACContextType | undefined>(undefined));

interface RBACProviderProps {
  children: ReactNode;
  currentUser: UserProfile;
  onUserRoleChange?: (updatedUser: UserProfile) => void;
}

export const RBACProvider: React.FC<RBACProviderProps> = ({
  children,
  currentUser,
  onUserRoleChange
}) => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());
  const [currentRole, setCurrentRoleState] = useState<UserRole>('Guest');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [guestBrowsing, setGuestBrowsing] = useState<boolean>(false);
  const [authMode, setAuthModeState] = useState<AuthMode>(authService.getAuthState().mode);
  const [backendAccess, setBackendAccess] = useState<BackendAccess | null>(null);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);

  const syncBackendIdentity = () => Promise.all([apiClient.getCurrentAccess(), apiClient.getCurrentUser()])
    .then(([access, user]) => {
      setBackendAccess(access);
      setBackendUser(user);
      setCurrentRoleState(access.role as UserRole);
      onUserRoleChange?.({
        ...currentUser,
        id: user.id,
        name: user.name,
        email: user.email,
        role: access.role as UserRole,
        organization: access.organisationId,
        organizationName: access.organisationId,
      });
    });

  useEffect(() => {
    void authService.initialize().then(() => {
      const state = authService.getAuthState();
      setAuthState(state);
      if (state.session?.user.activeRole) setCurrentRoleState(state.session.user.activeRole);
      if (state.isAuthenticated) return syncBackendIdentity()
        .catch(() => {
          authService.logout();
          setAuthState(authService.getAuthState());
          setCurrentRoleState('Guest');
          setBackendAccess(null);
          setBackendUser(null);
        });
    }).catch((error: unknown) => {
      console.error('OIDC initialization failed:', error);
      authService.logout();
      setAuthState(authService.getAuthState());
      setCurrentRoleState('Guest');
      setBackendAccess(null);
      setBackendUser(null);
    });
  }, []);

  const roleDef = ROLE_DEFINITIONS[currentRole] || ROLE_DEFINITIONS['Guest'];

  const setAuthMode = (mode: AuthMode) => {
    setAuthModeState(mode);
    authService.setMode(mode);
    shariahContentService.setMode(mode);
    setAuthState(authService.getAuthState());
  };

  const setRole = (newRole: UserRole) => {
    if (backendAccess && !backendAccess.assignedRoles.includes(newRole)) return;
    const success = authService.switchRole(newRole);
    if (success) {
      setCurrentRoleState(newRole);
      setAuthState(authService.getAuthState());
      const newRoleDef = ROLE_DEFINITIONS[newRole];
      if (newRoleDef && onUserRoleChange) {
        const updatedUser: UserProfile = {
          ...currentUser,
          role: newRole,
          name: newRoleDef.demoUser.name,
          email: newRoleDef.demoUser.email,
          organization: newRoleDef.demoUser.organization,
          avatarUrl: newRoleDef.demoUser.avatarUrl
        };
        onUserRoleChange(updatedUser);
      }
    }
  };

  const loginUser = (role: UserRole, email?: string) => {
    setCurrentRoleState(role);
    setAuthState(authService.getAuthState());
    setGuestBrowsing(false);
    const newRoleDef = ROLE_DEFINITIONS[role];
    if (newRoleDef && onUserRoleChange) {
      const updatedUser: UserProfile = {
        ...currentUser,
        role: role,
        name: newRoleDef.demoUser.name,
        email: email || newRoleDef.demoUser.email,
        organization: newRoleDef.demoUser.organization,
        avatarUrl: newRoleDef.demoUser.avatarUrl
      };
      onUserRoleChange(updatedUser);
    }
    if (authService.getAuthState().isAuthenticated) {
      void syncBackendIdentity().catch(() => undefined);
    }
  };

  const logoutUser = () => {
    authService.logout();
    setAuthState(authService.getAuthState());
    setCurrentRoleState('Guest');
    setGuestBrowsing(false);
  };

  const enterGuestMode = () => {
    authService.enterAsGuest();
    setAuthState(authService.getAuthState());
    setCurrentRoleState('Guest');
    setGuestBrowsing(true);
  };

  const exitGuestMode = () => {
    setGuestBrowsing(false);
  };

  const checkPermission = (resource: ResourceModule, action: PermissionAction) => {
    return hasPermission(currentRole, resource, action);
  };

  const canAccessTab = (tab: NavTab) => {
    return isTabAccessible(currentRole, tab);
  };

  const accessibleTabs = getAccessibleTabs(currentRole);

  const isAuthenticated = authState.isAuthenticated;
  const sessionUser = authState.session?.user;

  const activeUser: UserProfile = {
    ...currentUser,
    id: sessionUser?.userId || 'GUEST-001',
    role: currentRole,
    name: isAuthenticated ? (backendUser?.name || sessionUser?.name || roleDef.demoUser.name) : 'Guest Visitor',
    email: isAuthenticated ? (backendUser?.email || sessionUser?.email || roleDef.demoUser.email) : 'visitor@public-d8.org',
    organization: isAuthenticated ? (sessionUser?.organisationName || roleDef.demoUser.organization) : 'Public Visitor',
    avatarUrl: isAuthenticated ? ((typeof backendUser?.profile?.avatarUrl === 'string' && backendUser.profile.avatarUrl) || sessionUser?.avatarUrl || roleDef.demoUser.avatarUrl) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
  };

  const tenantContext = {
    userId: backendAccess?.userId || sessionUser?.userId || 'USR-GUEST',
    organisationId: backendAccess?.organisationId || sessionUser?.organisationId || 'ORG-PUBLIC',
    countryNodeId: backendAccess?.countryNodeId || sessionUser?.countryNodeId || 'CN-MYS',
    role: currentRole
  };

  const assignedRoles: UserRole[] = (backendAccess?.assignedRoles as UserRole[]) || sessionUser?.assignedRoles || [currentRole];

  return (
    <RBACContext.Provider
      value={{
        currentRole,
        roleDef,
        setRole,
        checkPermission,
        canAccessTab,
        accessibleTabs,
        activeUser,
        isAuthenticated,
        guestBrowsing,
        loginUser,
        updateBackendUser: setBackendUser,
        logoutUser,
        enterGuestMode,
        exitGuestMode,
        showLoginModal,
        setShowLoginModal,
        authMode,
        setAuthMode,
        assignedRoles,
        tenantContext,
        currentCountryNode: tenantContext.countryNodeId,
        currentOrgId: tenantContext.organisationId,
        currentUserId: tenantContext.userId
      }}
    >
      {children}
    </RBACContext.Provider>
  );
};

export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};
