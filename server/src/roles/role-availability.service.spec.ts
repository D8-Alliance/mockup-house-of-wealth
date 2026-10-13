import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoleAvailabilityService } from './role-availability.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const superAdmin: AuthenticatedUser = { userId: 'USR-SUPER', idpSubjectId: 'USR-SUPER', email: 's@example.test', name: 'S', role: 'Super Admin', countryNodeId: 'CN-MYS', organisationId: 'ORG-PUBLIC', assignedRoles: ['Super Admin'] };

describe('RoleAvailabilityService', () => {
  let rows: { role: string; enabled: boolean }[];
  const prisma = {
    roleAvailability: {
      findMany: jest.fn(async () => rows.filter((row) => !row.enabled).map(({ role }) => ({ role }))),
      upsert: jest.fn(async ({ create }: { create: { role: string; enabled: boolean } }) => {
        rows = [...rows.filter((row) => row.role !== create.role), { role: create.role, enabled: create.enabled }];
      }),
    },
  };
  const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
  let service: RoleAvailabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    rows = [];
    service = new RoleAvailabilityService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  });

  it('treats every role as enabled until a Super Admin switches one off', async () => {
    const list = await service.list();
    expect(list.every((entry) => entry.enabled)).toBe(true);
    expect(list.find((entry) => entry.role === 'Super Admin')?.locked).toBe(true);
    expect(list.find((entry) => entry.role === 'Retail Investor')?.locked).toBe(false);
  });

  it('disables a role at once (no stale cache), audits the change, and enables it again', async () => {
    await service.disabledRoles(); // warm the cache
    await service.update('Legal Officer', false, superAdmin);
    expect(await service.isEnabled('Legal Officer')).toBe(false);
    expect(audit.recordActor).toHaveBeenCalledWith(superAdmin, expect.objectContaining({ action: 'role.disable', resourceId: 'Legal Officer' }));
    expect(prisma.roleAvailability.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { role: 'Legal_Officer' } }));

    await service.update('Legal Officer', true, superAdmin);
    expect(await service.isEnabled('Legal Officer')).toBe(true);
  });

  it('never disables Super Admin or Guest, and rejects unknown roles', async () => {
    await expect(service.update('Super Admin', false, superAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update('Guest', false, superAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update('Chief Wizard', false, superAdmin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.roleAvailability.upsert).not.toHaveBeenCalled();
  });
});
