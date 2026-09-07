import { Injectable } from '@nestjs/common';
import { PermissionAction, PolicyDecision, PolicyEngine, ResourceModule, UserRole } from './permissions';

@Injectable()
export class PolicyService {
  private readonly engine = new PolicyEngine();

  public evaluate(role: UserRole, resource: ResourceModule, action: PermissionAction): PolicyDecision {
    return this.engine.evaluate(role, resource, action);
  }

  public can(role: UserRole, resource: ResourceModule, action: PermissionAction): boolean {
    return this.engine.can(role, resource, action);
  }

  public accessibleResources(role: UserRole): ResourceModule[] {
    return this.engine.accessibleResources(role);
  }
}
