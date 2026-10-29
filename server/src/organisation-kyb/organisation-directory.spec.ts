import { ForbiddenException } from '@nestjs/common';
import { OrganisationKybService } from './organisation-kyb.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const actor = (role: string) => ({ userId: 'U1', role, countryNodeId: 'CN-MYS', organisationId: 'ORG-1' }) as unknown as AuthenticatedUser;

function setup() {
  const prisma = {
    organisation: { findMany: jest.fn(async () => [{ id: 'ORG-1', name: 'FELCRA', countryNodeId: 'CN-MYS', status: 'ACTIVE', kybStatus: 'VERIFIED_MANUAL', registrationNumber: null, createdAt: new Date(0), _count: { projects: 2, pools: 1 } }]) },
    userRoleAssignment: { findMany: jest.fn(async () => [{ organisationId: 'ORG-1', userId: 'A' }, { organisationId: 'ORG-1', userId: 'B' }]) },
  };
  return { prisma, service: new OrganisationKybService(prisma as never, {} as never) };
}

describe('organisation directory', () => {
  it('lists organisations with their people, projects and pools', async () => {
    const { service } = setup();
    expect(await service.directory(actor('Super Admin'))).toEqual([{ id: 'ORG-1', name: 'FELCRA', countryNodeId: 'CN-MYS', status: 'ACTIVE', kybStatus: 'VERIFIED_MANUAL', registrationNumber: null, createdAt: new Date(0), users: 2, projects: 2, pools: 1 }]);
  });

  it('keeps a Country Admin to their country and refuses everyone else', async () => {
    const { prisma, service } = setup();
    await service.directory(actor('Country Admin'));
    expect(prisma.organisation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { countryNodeId: 'CN-MYS' } }));
    await expect(service.directory(actor('Finance Officer'))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
