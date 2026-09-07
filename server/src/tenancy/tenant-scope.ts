import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/identity.service';

export interface TenantResource {
  countryNodeId: string;
  organisationId: string;
}

/**
 * Tests whether an actor may operate on a resource owned by the given
 * organisation and country node.
 *
 * RULES
 * - Super Admin is global and may touch any tenant.
 * - Country Admin is scoped to their country node; organisation is a wildcard.
 * - Every other role must match BOTH organisation and country node.
 */
export function isWithinTenantScope(actor: AuthenticatedUser, resource: TenantResource): boolean {
  if (actor.role === 'Super Admin') return true;
  if (actor.countryNodeId !== resource.countryNodeId) return false;
  if (actor.role === 'Country Admin') return true;
  return actor.organisationId === resource.organisationId;
}

/**
 * Prisma `where` fragment restricting a list query to the actor's tenant scope.
 * Used to filter collections into the caller's tenant instead of rejecting them.
 */
export function tenantScopeFilter(actor: AuthenticatedUser): { countryNodeId?: string; organisationId?: string } {
  if (actor.role === 'Super Admin') return {};
  if (actor.role === 'Country Admin') return { countryNodeId: actor.countryNodeId };
  return { countryNodeId: actor.countryNodeId, organisationId: actor.organisationId };
}

/** Throws a ForbiddenException when the actor is outside the resource's tenant scope. */
export function assertTenantScope(
  actor: AuthenticatedUser,
  resource: TenantResource,
  label = 'Resource',
): void {
  if (!isWithinTenantScope(actor, resource)) {
    const scope = actor.role === 'Country Admin' ? 'country' : 'organisation and country';
    throw new ForbiddenException(`${label} is outside your ${scope} scope`);
  }
}