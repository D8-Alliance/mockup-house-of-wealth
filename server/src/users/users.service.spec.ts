import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { UserRole } from '../policy/permissions';
import { PolicyService } from '../policy/policy.service';
import { PrismaService } from '../prisma.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const auditMock = {
  recordActor: jest.fn().mockResolvedValue(undefined),
};

const policy = new PolicyService();

const prismaMock = {
  user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  userRoleAssignment: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  organisation: { findUnique: jest.fn() },
  countryNode: { findUnique: jest.fn() },
};

function actor(role: UserRole, countryNodeId = 'CN-MYS', organisationId = 'ORG-A'): AuthenticatedUser {
  return {
    userId: 'USR-ADMIN',
    idpSubjectId: 'USR-ADMIN',
    email: 'admin@houseofwealth.local',
    name: 'Admin',
    role,
    countryNodeId,
    organisationId,
    assignedRoles: [role],
  };
}

describe('UsersService role assignment', () => {
  const service = new UsersService(
    prismaMock as unknown as PrismaService,
    auditMock as unknown as AuditService,
    policy,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects a Country Admin assigning a privileged role (role escalation)', async () => {
    await expect(
      service.assignRole('USR-TARGET', 'Super Admin', 'ORG-A', 'CN-MYS', actor('Country Admin')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.userRoleAssignment.create).not.toHaveBeenCalled();
  });

  it('rejects a Country Admin revoking a privileged role (role escalation)', async () => {
    await expect(
      service.revokeRole('USR-TARGET', 'System Administrator', 'ORG-A', 'CN-MYS', actor('Country Admin')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.userRoleAssignment.update).not.toHaveBeenCalled();
  });

  it('rejects non-admin roles from assigning at all', async () => {
    await expect(
      service.assignRole('USR-TARGET', 'Project Sponsor', 'ORG-A', 'CN-MYS', actor('Project Sponsor')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets a Country Admin assign a non-privileged role inside their own country node', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'USR-TARGET', email: 't@example.test' });
    prismaMock.organisation.findUnique.mockResolvedValue({ id: 'ORG-A' });
    prismaMock.countryNode.findUnique.mockResolvedValue({ code: 'CN-MYS' });
    prismaMock.userRoleAssignment.findUnique.mockResolvedValue(null);
    prismaMock.userRoleAssignment.create.mockResolvedValue({ id: 'assignment-1' });

    const result = await service.assignRole('USR-TARGET', 'Project Sponsor', 'ORG-A', 'CN-MYS', actor('Country Admin'));

    expect(result.success).toBe(true);
    expect(prismaMock.userRoleAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'Project_Sponsor', userId: 'USR-TARGET' }),
      }),
    );
  });

  it('rejects a Country Admin assigning into another country node', async () => {
    await expect(
      service.assignRole('USR-TARGET', 'Project Sponsor', 'ORG-B', 'CN-IDN', actor('Country Admin', 'CN-MYS')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.userRoleAssignment.create).not.toHaveBeenCalled();
  });

  it('lets a Super Admin assign a privileged role', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'USR-TARGET', email: 't@example.test' });
    prismaMock.organisation.findUnique.mockResolvedValue({ id: 'ORG-A' });
    prismaMock.countryNode.findUnique.mockResolvedValue({ code: 'CN-MYS' });
    prismaMock.userRoleAssignment.findUnique.mockResolvedValue(null);
    prismaMock.userRoleAssignment.create.mockResolvedValue({ id: 'assignment-2' });

    const result = await service.assignRole('USR-TARGET', 'Super Admin', 'ORG-A', 'CN-MYS', actor('Super Admin'));

    expect(result.success).toBe(true);
    expect(prismaMock.userRoleAssignment.create).toHaveBeenCalled();
  });

  describe('updateStatus (matrix-driven users.update)', () => {
    it('lets a System Administrator update a user status (matrix users.update)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'USR-T', email: 't@example.test', profile: null });
      prismaMock.user.update.mockResolvedValue({
        id: 'USR-T',
        email: 't@example.test',
        profile: { status: 'SUSPENDED' },
        roleAssignments: [],
      });

      const result = await service.updateStatus('USR-T', 'SUSPENDED', actor('System Administrator'));

      expect(result.id).toBe('USR-T');
      expect(prismaMock.user.update).toHaveBeenCalled();
    });

    it('lets an Organization Admin update a user status (matrix users.update)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'USR-T', email: 't@example.test', profile: null });
      prismaMock.userRoleAssignment.findFirst.mockResolvedValue({ id: 'same-tenant' });
      prismaMock.user.update.mockResolvedValue({
        id: 'USR-T',
        email: 't@example.test',
        profile: { status: 'ACTIVE' },
        roleAssignments: [],
      });

      const result = await service.updateStatus('USR-T', 'ACTIVE', actor('Organization Admin', 'CN-MYS', 'ORG-A'));

      expect(result.id).toBe('USR-T');
      expect(prismaMock.userRoleAssignment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organisationId: 'ORG-A' }) }),
      );
    });

    it('rejects a role without users.update (matrix)', async () => {
      await expect(
        service.updateStatus('USR-T', 'SUSPENDED', actor('Project Sponsor')),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });
});