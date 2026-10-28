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

/**
 * Platform reviewers (Finance, Risk, Compliance, Shariah, the committee) decide on projects that any organisation
 * of their country submitted for review. They see a project once it is submitted, never another organisation's draft.
 */
export const PROJECT_REVIEWER_ROLES = ['Finance Officer', 'Risk Officer', 'Compliance Officer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee', 'AI Model Reviewer'];

export function canReviewProject(actor: AuthenticatedUser, project: TenantResource & { status: string }): boolean {
  return PROJECT_REVIEWER_ROLES.includes(actor.role) && actor.countryNodeId === project.countryNodeId && project.status !== 'DRAFT';
}

/** Read access to a project: its own tenant, or a reviewer of its country once it is submitted. */
/**
 * Finance staff of a country confirm money for any organisation in it; the postings belong to that
 * organisation's books. Call only after checking the actor may act on the resource: the copy passes the
 * ledger's tenant checks while keeping the actor's own user id and role for the audit trail.
 */
export function postingOnBehalfOf(actor: AuthenticatedUser, resource: TenantResource): AuthenticatedUser {
  return { ...actor, organisationId: resource.organisationId, countryNodeId: resource.countryNodeId };
}

export function assertProjectAccess(actor: AuthenticatedUser, project: TenantResource & { status: string }, label = 'Project'): void {
  if (isWithinTenantScope(actor, project) || canReviewProject(actor, project)) return;
  throw new ForbiddenException(`${label} is outside your scope`);
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