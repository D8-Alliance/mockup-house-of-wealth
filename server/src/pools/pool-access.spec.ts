import { ForbiddenException } from '@nestjs/common';
import { assertCanViewPool, poolVisibilityFilter } from './pool-access';
import { AuthenticatedUser } from '../auth/identity.service';

const user = (role: AuthenticatedUser['role'], organisationId = 'ORG-INVESTOR', countryNodeId = 'CN-MYS'): AuthenticatedUser => ({ userId: 'USR-1', idpSubjectId: 'USR-1', email: 'u@example.test', name: 'U', role, countryNodeId, organisationId, assignedRoles: [role] });

describe('pool access', () => {
  const pool = (status: string, organisationId = 'ORG-PDP', countryNodeId = 'CN-MYS') => ({ status, organisationId, countryNodeId });

  it('shows investors every OPEN pool in their country, and nothing else outside their organisation', () => {
    expect(() => assertCanViewPool(user('Retail Investor'), pool('OPEN'))).not.toThrow();
    expect(() => assertCanViewPool(user('Retail Investor'), pool('DRAFT'))).toThrow(ForbiddenException);
    expect(() => assertCanViewPool(user('Retail Investor', 'ORG-INVESTOR', 'CN-IDN'), pool('OPEN'))).toThrow(ForbiddenException);
    expect(poolVisibilityFilter(user('Retail Investor'))).toEqual({ OR: [{ countryNodeId: 'CN-MYS', organisationId: 'ORG-INVESTOR' }, { countryNodeId: 'CN-MYS', status: 'OPEN' }] });
  });

  it('keeps other roles, such as a delivery partner, inside their own organisation', () => {
    expect(() => assertCanViewPool(user('Project Sponsor', 'ORG-OTHER'), pool('OPEN'))).toThrow(ForbiddenException);
    expect(poolVisibilityFilter(user('Project Sponsor', 'ORG-PDP'))).toEqual({ countryNodeId: 'CN-MYS', organisationId: 'ORG-PDP' });
  });
});
