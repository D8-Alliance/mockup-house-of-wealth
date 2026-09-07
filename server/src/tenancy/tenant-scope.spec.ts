import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/identity.service';
import { assertTenantScope, isWithinTenantScope, tenantScopeFilter } from './tenant-scope';

function actor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 'USR-A',
    idpSubjectId: 'USR-A',
    email: 'a@example.test',
    name: 'A',
    role: 'Super Admin',
    countryNodeId: 'CN-MYS',
    organisationId: 'ORG-A',
    assignedRoles: ['Super Admin'],
    ...overrides,
  };
}

const resource = { countryNodeId: 'CN-MYS', organisationId: 'ORG-B' };

describe('tenant scope enforcement', () => {
  it('lets a Super Admin operate on any tenant', () => {
    expect(isWithinTenantScope(actor(), { countryNodeId: 'CN-XYZ', organisationId: 'ORG-ANY' })).toBe(true);
    expect(tenantScopeFilter(actor())).toEqual({});
    expect(() => assertTenantScope(actor(), { countryNodeId: 'CN-XYZ', organisationId: 'ORG-ANY' })).not.toThrow();
  });

  it('scopes a Country Admin to country node only (organisation is a wildcard)', () => {
    const ca = actor({ role: 'Country Admin', assignedRoles: ['Country Admin'] });
    expect(isWithinTenantScope(ca, resource)).toBe(true);
    expect(isWithinTenantScope(ca, { ...resource, countryNodeId: 'CN-IDN' })).toBe(false);
    expect(tenantScopeFilter(ca)).toEqual({ countryNodeId: 'CN-MYS' });
  });

  it('requires BOTH organisation and country match for org-scoped roles', () => {
    const pm = actor({ role: 'Project Manager', organisationId: 'ORG-A', assignedRoles: ['Project Manager'] });

    expect(isWithinTenantScope(pm, { ...resource, organisationId: 'ORG-A' })).toBe(true);
    // Same country, different organisation -> denied (the cross-tenant gap).
    expect(isWithinTenantScope(pm, resource)).toBe(false);
    // Same organisation, different country -> denied.
    expect(isWithinTenantScope(pm, { ...resource, countryNodeId: 'CN-IDN', organisationId: 'ORG-A' })).toBe(false);
    expect(tenantScopeFilter(pm)).toEqual({ countryNodeId: 'CN-MYS', organisationId: 'ORG-A' });
  });

  it('throws a ForbiddenException from assertTenantScope when out of scope', () => {
    const orgAdmin = actor({ role: 'Organization Admin', organisationId: 'ORG-A', assignedRoles: ['Organization Admin'] });

    expect(() => assertTenantScope(orgAdmin, resource, 'Funding request')).toThrow(ForbiddenException);
    expect(() => assertTenantScope(orgAdmin, { ...resource, organisationId: 'ORG-A' }, 'Funding request')).not.toThrow();
  });
});