import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ACTION_KEY,
  RESOURCE_KEY,
  ROLES_KEY,
  SKIP_AUTH_KEY,
} from './roles.decorator';
import { PermissionAction, ResourceModule, UserRole } from '../policy/permissions';
import { PolicyService } from '../policy/policy.service';
import { AuthenticatedRequest } from './oidc.guard';

/**
 * Applies role and resource-permission checks against the server-side policy
 * engine after the OidcGuard has established identity.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyService: PolicyService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipAuth) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const resource = this.reflector.getAllAndOverride<ResourceModule | undefined>(RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const action = this.reflector.getAllAndOverride<PermissionAction>(ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && !resource) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // The application is multi-tenant. Resolve the caller's effective server
    // role from the IdP. For the scaffold we map directly; a production system
    // would read `app_metadata.role` from the verified claims.
    const effectiveRole: UserRole = user.role as UserRole;

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(effectiveRole)) {
      throw new ForbiddenException(`Role "${effectiveRole}" is not allowed here`);
    }

    if (resource && action) {
      const decision = this.policyService.evaluate(effectiveRole, resource, action);
      if (!decision.allowed) {
        throw new ForbiddenException(decision.reason);
      }
    }

    return true;
  }
}
