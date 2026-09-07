import { ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PolicyService } from '../policy/policy.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const auditMock = {
  recordActor: jest.fn().mockResolvedValue(undefined),
};

const policy = new PolicyService();

function actor(
  role: AuthenticatedUser['role'],
  countryNodeId: string,
  organisationId = 'ORG-A',
): AuthenticatedUser {
  return {
    userId: 'USR-A',
    idpSubjectId: 'USR-A',
    email: 'a@example.test',
    name: 'A',
    role,
    countryNodeId,
    organisationId,
    assignedRoles: [role],
  };
}

const prismaMock = {
  project: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  organisation: { findFirst: jest.fn() },
};

describe('ProjectsService list tenant scoping (country admin sees only its own country)', () => {
  const service = new ProjectsService(prismaMock as unknown as PrismaService, auditMock as unknown as AuditService, policy);

  beforeEach(() => jest.clearAllMocks());

  it('lets a Super Admin list across all countries (unfiltered)', async () => {
    await service.list(actor('Super Admin', 'CN-MYS'));

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('restricts a Country Admin to rows in its own country node only', async () => {
    await service.list(actor('Country Admin', 'CN-MYS'));

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { countryNodeId: 'CN-MYS' } }),
    );
  });

  it('uses a different country node for a different Country Admin', async () => {
    await service.list(actor('Country Admin', 'CN-IDN'));

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { countryNodeId: 'CN-IDN' } }),
    );
  });

  it('restricts an org-scoped role to its organisation AND country', async () => {
    await service.list(actor('Organization Admin', 'CN-MYS', 'ORG-A'));

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { countryNodeId: 'CN-MYS', organisationId: 'ORG-A' } }),
    );
  });

  it('rejects reading projects when the role has no marketplace.read permission', async () => {
    await expect(service.list(actor('Project Manager', 'CN-MYS'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.project.findMany).not.toHaveBeenCalled();
  });
});