import React from 'react';
import { useRBAC } from './RBACContext';
import { NavTab } from '../types';
import { ResourceModule, PermissionAction } from './types';
import { AuthenticationGuard } from '../auth/guards/AuthenticationGuard';
import { AuthorizationGuard } from '../auth/guards/AuthorizationGuard';

interface RoleGuardProps {
  tab?: NavTab;
  resource?: ResourceModule;
  action?: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  tab,
  resource,
  action = 'read',
  children,
  fallback
}) => {
  return (
    <AuthenticationGuard>
      <AuthorizationGuard tab={tab}>
        {children}
      </AuthorizationGuard>
    </AuthenticationGuard>
  );
};
