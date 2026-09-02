import React, { ReactNode } from 'react';
import { useRBAC } from '../../rbac/RBACContext';
import { NavTab } from '../../types';
import { AccessDenied403 } from '../components/AccessDenied403';

interface AuthorizationGuardProps {
  children: ReactNode;
  tab?: NavTab;
  allowedRoles?: string[];
  onGoBack?: () => void;
}

export const AuthorizationGuard: React.FC<AuthorizationGuardProps> = ({
  children,
  tab,
  allowedRoles,
  onGoBack
}) => {
  const { currentRole, canAccessTab } = useRBAC();

  if (tab && !canAccessTab(tab)) {
    return <AccessDenied403 currentRole={currentRole} requiredRole={tab} onGoBack={onGoBack} />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
    return <AccessDenied403 currentRole={currentRole} requiredRole={allowedRoles.join(', ')} onGoBack={onGoBack} />;
  }

  return <>{children}</>;
};
