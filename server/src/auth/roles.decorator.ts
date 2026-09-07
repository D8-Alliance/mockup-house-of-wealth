import { SetMetadata, applyDecorators } from '@nestjs/common';
import { PermissionAction, ResourceModule, UserRole } from '../policy/permissions';

export const ROLES_KEY = 'roles';
export const RESOURCE_KEY = 'resource';
export const ACTION_KEY = 'action';
export const SKIP_AUTH_KEY = 'skip-auth';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const RequirePermission = (resource: ResourceModule, action: PermissionAction) =>
  applyDecorators(SetMetadata(RESOURCE_KEY, resource), SetMetadata(ACTION_KEY, action));
export const Public = () => SetMetadata(SKIP_AUTH_KEY, true);
