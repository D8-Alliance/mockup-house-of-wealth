import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FundingService } from './funding.service';
import { PolicyService } from '../policy/policy.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { FinancialLedgerService } from '../financial/financial-ledger.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const auditMock = {
  recordActor: jest.fn().mockResolvedValue(undefined),
};

const policy = new PolicyService();
const ledgerMock = {
  ensureAccount: jest.fn(),
  recordFundingDisbursementInTransaction: jest.fn(),
};

function actor(
  role: AuthenticatedUser['role'],
  countryNodeId = 'CN-MYS',
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
  project: { findUnique: jest.fn() },
  projectFeasibilityRevision: { findFirst: jest.fn() },
  projectApproval: { findFirst: jest.fn() },
  wealthPool: { findFirst: jest.fn() },
  fundingRequest: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findUniqueOrThrow: jest.fn().mockResolvedValue({ fundingRequestId: 'FRQ-1', status: 'APPROVED' }),
    create: jest.fn(),
  },
};
(prismaMock as any).$transaction = jest.fn(async (callback: (tx: any) => unknown) => callback(prismaMock));

const request = {
  fundingRequestId: 'FRQ-1',
  projectId: 'PRJ-1',
  poolId: 'POOL-1',
  organisationId: 'ORG-A',
  countryNodeId: 'CN-MYS',
  requestedAmount: '1000000',
  status: 'PENDING',
};

describe('FundingService approval', () => {
  const service = new FundingService(prismaMock as unknown as PrismaService, auditMock as unknown as AuditService, policy, ledgerMock as unknown as FinancialLedgerService);

  beforeEach(() => jest.clearAllMocks());

  it('approves a funding request inside the caller tenant scope', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, status: 'PENDING' });
    prismaMock.fundingRequest.update.mockResolvedValue({ ...request, status: 'APPROVED' });

    const result = await service.approve('FRQ-1', actor('Country Admin'));

    expect(result.status).toBe('APPROVED');
    expect(prismaMock.fundingRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
    );
    expect(auditMock.recordActor).toHaveBeenCalled();
  });

  it('lets an Organization Admin approve inside their own organisation and country (matrix approvals.approve)', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, status: 'PENDING' });
    prismaMock.fundingRequest.update.mockResolvedValue({ ...request, status: 'APPROVED' });

    const result = await service.approve('FRQ-1', actor('Organization Admin', 'CN-MYS', 'ORG-A'));

    expect(result.status).toBe('APPROVED');
    expect(prismaMock.fundingRequest.updateMany).toHaveBeenCalled();
  });

  it('rejects cross-country-node approval (cross-tenant access)', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, countryNodeId: 'CN-IDN' });

    await expect(service.approve('FRQ-1', actor('Country Admin', 'CN-MYS'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.fundingRequest.update).not.toHaveBeenCalled();
  });

  it('rejects cross-organisation approval from an org-scoped approver (cross-tenant access)', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, organisationId: 'ORG-B' });

    await expect(service.approve('FRQ-1', actor('Organization Admin', 'CN-MYS', 'ORG-A'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.fundingRequest.update).not.toHaveBeenCalled();
  });

  it('does not approve a request when the state is no longer pending', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, status: 'APPROVED' });

    await expect(service.approve('FRQ-1', actor('Super Admin'))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an approver without the approvals.approve permission', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, status: 'PENDING' });

    await expect(service.approve('FRQ-1', actor('Project Sponsor'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.fundingRequest.update).not.toHaveBeenCalled();
  });

  it('only disburses an already-approved request', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, status: 'PENDING' });

    await expect(service.disburse('FRQ-1', actor('Super Admin'))).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('FundingService sponsor request access', () => {
  const service = new FundingService(prismaMock as unknown as PrismaService, auditMock as unknown as AuditService, policy, ledgerMock as unknown as FinancialLedgerService);

  beforeEach(() => jest.clearAllMocks());

  it('allows a Project Sponsor to create a request for their assigned project', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      projectId: 'PRJ-1',
      projectSponsorId: 'USR-A',
      organisationId: 'ORG-A',
      countryNodeId: 'CN-MYS',
      status: 'APPROVED',
      fundingRequired: { lte: () => false },
    });
    prismaMock.projectFeasibilityRevision.findFirst.mockResolvedValue({ id: 'REV-1' });
    prismaMock.projectApproval.findFirst.mockResolvedValue({ id: 'APR-1' });
    prismaMock.wealthPool.findFirst.mockResolvedValue({ poolId: 'POOL-1', status: 'OPEN', currency: 'USD' });
    prismaMock.fundingRequest.create.mockResolvedValue({
      fundingRequestId: 'FRQ-NEW',
      status: 'PENDING',
      requestedAmount: '1000000',
    });

    await expect(service.request('PRJ-1', actor('Project Sponsor'))).resolves.toEqual({
      requestId: 'FRQ-NEW',
      status: 'PENDING',
    });
    expect(prismaMock.fundingRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ requestedBy: 'USR-A', projectId: 'PRJ-1' }),
    }));
  });

  it('keeps accepting requests once an approved project has moved on to pooling', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ projectId: 'PRJ-1', projectSponsorId: 'USR-A', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', status: 'POOLING', fundingRequired: { lte: () => false } });
    prismaMock.projectFeasibilityRevision.findFirst.mockResolvedValue({ id: 'REV-1' });
    prismaMock.projectApproval.findFirst.mockResolvedValue({ id: 'APR-1' });
    prismaMock.wealthPool.findFirst.mockResolvedValue({ poolId: 'POOL-1', status: 'OPEN', currency: 'USD' });
    prismaMock.fundingRequest.create.mockResolvedValue({ fundingRequestId: 'FRQ-2', status: 'PENDING', requestedAmount: '1000000' });

    await expect(service.request('PRJ-1', actor('Project Sponsor'))).resolves.toEqual({ requestId: 'FRQ-2', status: 'PENDING' });
  });

  it('rejects funding for a project that was reopened to due diligence', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ projectId: 'PRJ-1', projectSponsorId: 'USR-A', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', status: 'DUE_DILIGENCE', fundingRequired: { lte: () => false } });
    prismaMock.projectFeasibilityRevision.findFirst.mockResolvedValue({ id: 'REV-1' });
    prismaMock.projectApproval.findFirst.mockResolvedValue({ id: 'APR-1' });

    await expect(service.request('PRJ-1', actor('Project Sponsor'))).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.fundingRequest.create).not.toHaveBeenCalled();
  });

  it('rejects a Project Sponsor requesting funding for another sponsor project', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      projectId: 'PRJ-OTHER',
      projectSponsorId: 'USR-B',
      organisationId: 'ORG-A',
      countryNodeId: 'CN-MYS',
      fundingRequired: { lte: () => false },
    });

    await expect(service.request('PRJ-OTHER', actor('Project Sponsor'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.fundingRequest.create).not.toHaveBeenCalled();
  });
});
