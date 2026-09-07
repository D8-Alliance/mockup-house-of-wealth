import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserRole, ResourceModule, PermissionAction, RoleDefinition } from './types';
import { ROLE_DEFINITIONS } from './roleDefinitions';
import { hasPermission, getAccessibleTabs, isTabAccessible } from './rbacEngine';
import { UserProfile, NavTab } from '../types';
import { authService } from '../auth/services/authService';
import { AuthState } from '../auth/types/authTypes';

interface RBACContextType {
  currentRole: UserRole;
  roleDef: RoleDefinition;
  setRole: (role: UserRole) => void;
  checkPermission: (resource: ResourceModule, action: PermissionAction) => boolean;
  canAccessTab: (tab: NavTab) => boolean;
  accessibleTabs: NavTab[];
  activeUser: UserProfile;
  isAuthenticated: boolean;
  loginUser: (role: UserRole, email?: string) => void;
  logoutUser: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  authMode: 'DEMO' | 'PRODUCTION';
  setAuthMode: (mode: 'DEMO' | 'PRODUCTION') => void;
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
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

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
  const [currentRole, setCurrentRoleState] = useState<UserRole>('Country Admin');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [authMode, setAuthModeState] = useState<'DEMO' | 'PRODUCTION'>('DEMO');

  useEffect(() => {
    const state = authService.getAuthState();
    setAuthState(state);
    if (state.session?.user.activeRole) {
      setCurrentRoleState(state.session.user.activeRole);
    }
  }, []);

  const roleDef = ROLE_DEFINITIONS[currentRole] || ROLE_DEFINITIONS['Guest'];

  const setAuthMode = (mode: 'DEMO' | 'PRODUCTION') => {
    setAuthModeState(mode);
    authService.setMode(mode);
    setAuthState(authService.getAuthState());
  };

  const setRole = (newRole: UserRole) => {
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
  };

  const logoutUser = () => {
    authService.logout();
    setAuthState(authService.getAuthState());
    setCurrentRoleState('Guest');
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
    name: isAuthenticated ? (sessionUser?.name || roleDef.demoUser.name) : 'Guest Visitor',
    email: isAuthenticated ? (sessionUser?.email || roleDef.demoUser.email) : 'visitor@public-d8.org',
    organization: isAuthenticated ? (sessionUser?.organisationName || roleDef.demoUser.organization) : 'Public Visitor',
    avatarUrl: isAuthenticated ? (sessionUser?.avatarUrl || roleDef.demoUser.avatarUrl) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
  };

  const tenantContext = {
    userId: sessionUser?.userId || 'USR-GUEST',
    organisationId: sessionUser?.organisationId || 'ORG-PUBLIC',
    countryNodeId: sessionUser?.countryNodeId || 'CN-MYS',
    role: currentRole
  };

  const assignedRoles: UserRole[] = sessionUser?.assignedRoles || [currentRole];

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
        loginUser,
        logoutUser,
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
