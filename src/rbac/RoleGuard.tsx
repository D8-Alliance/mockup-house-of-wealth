import React from 'react';
import { useRBAC } from './RBACContext';
import { NavTab } from '../types';
import { ResourceModule, PermissionAction } from './types';
import { AuthenticationGuard } from '../auth/guards/AuthenticationGuard';
import { AuthorizationGuard } from '../auth/guards/AuthorizationGuard';
import { AccessDenied403 } from '../auth/components/AccessDenied403';

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
  const { currentRole, checkPermission } = useRBAC();

  const hasResourcePermission = !resource || checkPermission(resource, action);

  if (!hasResourcePermission) {
    if (fallback !== undefined) return <>{fallback}</>;
    return <AccessDenied403 currentRole={currentRole} requiredRole={`${resource} : ${action}`} />;
  }

  return (
    <AuthenticationGuard>
      <AuthorizationGuard tab={tab}>
        {children}
      </AuthorizationGuard>
    </AuthenticationGuard>
  );
};
