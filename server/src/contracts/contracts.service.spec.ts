import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { PolicyService } from '../policy/policy.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const actor: AuthenticatedUser = {
  userId: 'USR-A', idpSubjectId: 'SUB-A', email: 'a@example.test', name: 'A',
  role: 'Organization Admin', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Organization Admin'],
};

const prisma = {
  organisation: { findFirst: jest.fn() },
  contract: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  contractEvent: { create: jest.fn() },
  contractVersion: { create: jest.fn(), findFirst: jest.fn() },
  contractParty: { create: jest.fn() },
  contractApproval: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
};
const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };

describe('ContractsService lifecycle and tenant boundaries', () => {
  const service = new ContractsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    new PolicyService(),
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates a tenant-scoped draft and records an event', async () => {
    prisma.organisation.findFirst.mockResolvedValue({ id: 'ORG-A' });
    prisma.contract.create.mockResolvedValue({ id: 'CON-A', status: 'DRAFT' });

    const result = await service.create({
      contractNumber: 'HOW-001', contractType: 'MUDARABAH', organisationId: 'ORG-A', countryNodeId: 'CN-MYS',
    }, actor);

    expect(result.id).toBe('CON-A');
    expect(prisma.contractEvent.create).toHaveBeenCalled();
    expect(audit.recordActor).toHaveBeenCalled();
  });

  it('rejects creation outside the actor tenant', async () => {
    await expect(service.create({
      contractNumber: 'HOW-002', contractType: 'MUDARABAH', organisationId: 'ORG-B', countryNodeId: 'CN-MYS',
    }, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.contract.create).not.toHaveBeenCalled();
  });

  it('rejects invalid lifecycle transitions', async () => {
    prisma.contract.findUnique.mockResolvedValue({ id: 'CON-A', status: 'DRAFT', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', versions: [], parties: [], approvals: [], events: [] });

    await expect(service.transition('CON-A', { status: 'ACTIVE' }, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.contract.update).not.toHaveBeenCalled();
  });
});
