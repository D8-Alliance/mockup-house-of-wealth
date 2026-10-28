import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { FundingService } from './funding.service';
import { PolicyService } from '../policy/policy.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { FinancialLedgerService } from '../financial/financial-ledger.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../capital-takaful/safeguard-facts', () => ({ safeguardFacts: jest.fn().mockResolvedValue(null) }));

const auditMock = {
  recordActor: jest.fn().mockResolvedValue(undefined),
};

const policy = new PolicyService();
const ledgerMock = {
  ensureAccount: jest.fn().mockResolvedValue({ id: 'ACC' }),
  recordFundingDisbursementInTransaction: jest.fn(),
};

/** Platform staff sit in ORG-PLATFORM; the project is run by ORG-A. */
function actor(
  role: AuthenticatedUser['role'],
  countryNodeId = 'CN-MYS',
  organisationId = 'ORG-PLATFORM',
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
  project: { findUnique: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  projectFeasibilityRevision: { findFirst: jest.fn() },
  projectApproval: { findFirst: jest.fn() },
  projectMilestone: { findFirst: jest.fn(), update: jest.fn() },
  projectLifecycleEvent: { create: jest.fn() },
  wealthPool: { findFirst: jest.fn() },
  investmentContribution: { aggregate: jest.fn() },
  fundingRequest: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
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
  milestoneId: 'MS-1',
  purpose: 'Land clearing',
  organisationId: 'ORG-A',
  countryNodeId: 'CN-MYS',
  requestedAmount: '300000',
  currency: 'MYR',
  status: 'PENDING',
};

const service = () => new FundingService(prismaMock as unknown as PrismaService, auditMock as unknown as AuditService, policy, ledgerMock as unknown as FinancialLedgerService);

describe('FundingService approval', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets Finance approve a release for another organisation of its country', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request });

    const result = await service().approve('FRQ-1', actor('Finance Officer'));

    expect(result.status).toBe('APPROVED');
    expect(prismaMock.fundingRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }));
    expect(auditMock.recordActor).toHaveBeenCalled();
  });

  it('keeps Finance to its own country', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, countryNodeId: 'CN-IDN' });
    await expect(service().approve('FRQ-1', actor('Finance Officer'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.fundingRequest.updateMany).not.toHaveBeenCalled();
  });

  it('does not let anyone in the organisation that runs the project approve its release', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request });
    await expect(service().approve('FRQ-1', actor('Finance Officer', 'CN-MYS', 'ORG-A'))).rejects.toThrow('Your organisation runs this project');
    await expect(service().approve('FRQ-1', actor('Organization Admin', 'CN-MYS', 'ORG-A'))).rejects.toThrow('Your organisation runs this project');
    expect(prismaMock.fundingRequest.updateMany).not.toHaveBeenCalled();
  });

  it('rejects cross-country-node approval by a Country Admin', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, countryNodeId: 'CN-IDN' });
    await expect(service().approve('FRQ-1', actor('Country Admin', 'CN-MYS'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not approve a request when the state is no longer pending', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, status: 'APPROVED' });
    await expect(service().approve('FRQ-1', actor('Super Admin'))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an approver without the approvals.approve permission', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request });
    await expect(service().approve('FRQ-1', actor('Risk Officer'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.fundingRequest.updateMany).not.toHaveBeenCalled();
  });

  it('separates duties: the requester cannot approve, and neither requester nor approver can disburse', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, requestedBy: 'USR-A' });
    await expect(service().approve('FRQ-1', actor('Country Admin'))).rejects.toThrow('another person must approve');

    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, status: 'APPROVED', requestedBy: 'USR-SPONSOR', approvedBy: 'USR-A' });
    await expect(service().disburse('FRQ-1', actor('Country Admin', 'CN-MYS', 'ORG-A'))).rejects.toThrow('You approved this funding request');

    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, status: 'APPROVED', requestedBy: 'USR-A', approvedBy: 'USR-OTHER' });
    await expect(service().disburse('FRQ-1', actor('Country Admin', 'CN-MYS', 'ORG-A'))).rejects.toThrow('You submitted this funding request');
    expect(prismaMock.fundingRequest.updateMany).not.toHaveBeenCalled();
  });

  it('needs a reason to reject a release', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request, requestedBy: 'USR-SPONSOR' });
    await expect(service().reject('FRQ-1', ' ', actor('Finance Officer'))).rejects.toThrow('Say why');
    await expect(service().reject('FRQ-1', 'Invoice for the clearing work is missing', actor('Finance Officer'))).resolves.toEqual({ requestId: 'FRQ-1', status: 'REJECTED' });
    expect(prismaMock.fundingRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'REJECTED', decisionNote: 'Invoice for the clearing work is missing' } }));
  });
});

describe('FundingService disbursement', () => {
  beforeEach(() => jest.clearAllMocks());
  const approved = { ...request, status: 'APPROVED', requestedBy: 'USR-SPONSOR', approvedBy: 'USR-FINANCE' };

  it('only disburses an already-approved request', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...request });
    await expect(service().disburse('FRQ-1', actor('Super Admin'))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('pays out no more than the pool holds in settled investment, less earlier releases', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...approved });
    prismaMock.investmentContribution.aggregate.mockResolvedValue({ _sum: { amount: 500000 } });
    prismaMock.fundingRequest.aggregate.mockResolvedValue({ _sum: { requestedAmount: 300000 } });
    await expect(service().disburse('FRQ-1', actor('Country Admin', 'CN-MYS', 'ORG-A'))).rejects.toThrow('less than this tranche');
    expect(prismaMock.fundingRequest.updateMany).not.toHaveBeenCalled();
  });

  it('marks the tranche released and moves a FUNDED project to EXECUTION', async () => {
    prismaMock.fundingRequest.findUnique.mockResolvedValue({ ...approved });
    prismaMock.investmentContribution.aggregate.mockResolvedValue({ _sum: { amount: 1200000 } });
    prismaMock.fundingRequest.aggregate.mockResolvedValue({ _sum: { requestedAmount: null } });
    prismaMock.project.findUnique.mockResolvedValue({ status: 'FUNDED' });

    await service().disburse('FRQ-1', actor('Country Admin', 'CN-MYS', 'ORG-A'));

    expect(prismaMock.projectMilestone.update).toHaveBeenCalledWith({ where: { id: 'MS-1' }, data: { status: 'RELEASED' } });
    expect(prismaMock.project.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'EXECUTION' }) }));
    expect(prismaMock.projectLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fromStatus: 'FUNDED', toStatus: 'EXECUTION' }) }));
  });
});

describe('FundingService tranche requests', () => {
  beforeEach(() => jest.clearAllMocks());
  const project = { projectId: 'PRJ-1', projectSponsorId: 'USR-A', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', status: 'FUNDED' };
  const sponsor = () => actor('Project Sponsor', 'CN-MYS', 'ORG-A');
  const approvedRevision = () => {
    prismaMock.projectFeasibilityRevision.findFirst.mockResolvedValue({ id: 'REV-1' });
    prismaMock.projectApproval.findFirst.mockResolvedValue({ id: 'APR-1' });
  };

  it('asks for one tranche, for the amount set on it, once the pool has raised the funding', async () => {
    prismaMock.project.findUnique.mockResolvedValue(project);
    approvedRevision();
    prismaMock.projectMilestone.findFirst.mockResolvedValue({ id: 'MS-1', title: 'Land clearing', disbursementAmount: '300000' });
    prismaMock.fundingRequest.findFirst.mockResolvedValue(null);
    prismaMock.wealthPool.findFirst.mockResolvedValue({ poolId: 'POOL-1', status: 'FULL', currency: 'MYR' });
    prismaMock.fundingRequest.create.mockResolvedValue({ fundingRequestId: 'FRQ-NEW', status: 'PENDING' });

    await expect(service().request('PRJ-1', 'MS-1', sponsor())).resolves.toEqual({ requestId: 'FRQ-NEW', status: 'PENDING' });
    expect(prismaMock.fundingRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ milestoneId: 'MS-1', requestedAmount: '300000', purpose: 'Land clearing', requestedBy: 'USR-A' }),
    }));
  });

  it('waits until the project is funded', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ ...project, status: 'POOLING' });
    approvedRevision();
    await expect(service().request('PRJ-1', 'MS-1', sponsor())).rejects.toThrow('once the pool has raised the funding');
    expect(prismaMock.fundingRequest.create).not.toHaveBeenCalled();
  });

  it('refuses a milestone that releases nothing, and a tranche already asked for', async () => {
    prismaMock.project.findUnique.mockResolvedValue(project);
    approvedRevision();
    prismaMock.projectMilestone.findFirst.mockResolvedValueOnce({ id: 'MS-0', title: 'Shariah term sheet review', disbursementAmount: '0' });
    await expect(service().request('PRJ-1', 'MS-0', sponsor())).rejects.toThrow('releases no funds');

    prismaMock.projectMilestone.findFirst.mockResolvedValueOnce({ id: 'MS-1', title: 'Land clearing', disbursementAmount: '300000' });
    prismaMock.fundingRequest.findFirst.mockResolvedValueOnce({ status: 'APPROVED' });
    await expect(service().request('PRJ-1', 'MS-1', sponsor())).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.fundingRequest.create).not.toHaveBeenCalled();
  });

  it('rejects a Project Sponsor asking for another sponsor project', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ ...project, projectSponsorId: 'USR-B' });
    await expect(service().request('PRJ-1', 'MS-1', sponsor())).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.fundingRequest.create).not.toHaveBeenCalled();
  });
});

describe('FundingService sponsor visibility of funding requests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets a Project Sponsor read the funding requests of their own project, and no other', async () => {
    expect(policy.can('Project Sponsor', 'approvals', 'read')).toBe(true);
    prismaMock.project.findUnique.mockResolvedValue({ projectId: 'PRJ-1', projectSponsorId: 'USR-A', organisationId: 'ORG-A', countryNodeId: 'CN-MYS' });
    prismaMock.fundingRequest.findMany.mockResolvedValue([{ fundingRequestId: 'FRQ-1' }]);
    await expect(service().list('PRJ-1', actor('Project Sponsor', 'CN-MYS', 'ORG-A'))).resolves.toHaveLength(1);

    prismaMock.project.findUnique.mockResolvedValue({ projectId: 'PRJ-2', projectSponsorId: 'USR-B', organisationId: 'ORG-A', countryNodeId: 'CN-MYS' });
    await expect(service().list('PRJ-2', actor('Project Sponsor', 'CN-MYS', 'ORG-A'))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
