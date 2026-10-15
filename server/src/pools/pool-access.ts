import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/identity.service';
import { isWithinTenantScope, tenantScopeFilter, TenantResource } from '../tenancy/tenant-scope';

/** Only investor accounts place investment orders; staff, delivery partners and asset owners do not. */
export const INVESTOR_ROLES: ReadonlySet<string> = new Set(['Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office']);

type PoolScope = TenantResource & { status: string };

/**
 * Investors can see, and invest in, any OPEN pool in their own country node, whichever
 * organisation runs it: investors and delivery partners are separate entities. Everything else
 * about a pool (drafts, terms changes, settlement) stays within the organisation that runs it.
 */
export function isOpenToInvestor(actor: AuthenticatedUser, pool: PoolScope): boolean {
  return INVESTOR_ROLES.has(actor.role) && pool.status === 'OPEN' && pool.countryNodeId === actor.countryNodeId;
}

export function assertCanViewPool(actor: AuthenticatedUser, pool: PoolScope): void {
  if (!isWithinTenantScope(actor, pool) && !isOpenToInvestor(actor, pool)) throw new ForbiddenException('Pool is outside your organisation and country scope');
}

/** Prisma `where` for pool lists: the actor's own tenant, plus OPEN pools in their country for investors. */
export function poolVisibilityFilter(actor: AuthenticatedUser): Prisma.WealthPoolWhereInput {
  const ownTenant = tenantScopeFilter(actor);
  if (!INVESTOR_ROLES.has(actor.role)) return ownTenant;
  return { OR: [ownTenant, { countryNodeId: actor.countryNodeId, status: 'OPEN' }] };
}
