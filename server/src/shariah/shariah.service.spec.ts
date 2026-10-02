import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ShariahService } from './shariah.service';
import { PolicyService } from '../policy/policy.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const actor: AuthenticatedUser = {
  userId: 'USR-A', idpSubjectId: 'SUB-A', email: 'a@example.test', name: 'A',
  role: 'Organization Admin', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Organization Admin'],
};

const reviewer: AuthenticatedUser = {
  ...actor,
  userId: 'USR-REVIEWER',
  role: 'Shariah Reviewer',
  assignedRoles: ['Shariah Reviewer'],
};

const prisma = {
  project: { findUnique: jest.fn() },
  organisation: { findFirst: jest.fn() },
  shariahReview: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  shariahDecision: { create: jest.fn() },
  userRoleAssignment: { findMany: jest.fn().mockResolvedValue([]) },
  notification: { create: jest.fn(), createMany: jest.fn() },
  $transaction: jest.fn(),
};
const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };

describe('ShariahService tenant and human decision controls', () => {
  const service = new ShariahService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    new PolicyService(),
    notifications as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates a tenant-scoped proposed review and records an audit event', async () => {
    prisma.project.findUnique.mockResolvedValue({ projectId: 'PROJ-A', organisationId: 'ORG-A', countryNodeId: 'CN-MYS' });
    prisma.organisation.findFirst.mockResolvedValue({ id: 'ORG-A' });
    prisma.shariahReview.findFirst.mockResolvedValue(null);
    prisma.shariahReview.create.mockResolvedValue({ id: 'REV-A', status: 'PROPOSED', decisions: [] });

    const result = await service.create({
      projectId: 'PROJ-A', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', proposedContract: 'MUDARABAH',
    }, actor);

    expect(result.id).toBe('REV-A');
    expect(audit.recordActor).toHaveBeenCalledWith(actor, expect.objectContaining({ action: 'shariah.review.create' }));
  });

  it('rejects a review created outside the actor tenant', async () => {
    await expect(service.create({
      projectId: 'PROJ-A', organisationId: 'ORG-B', countryNodeId: 'CN-MYS', proposedContract: 'MUDARABAH',
    }, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.shariahReview.create).not.toHaveBeenCalled();
  });

  it('rejects a parent review from another tenant', async () => {
    prisma.project.findUnique.mockResolvedValue({ projectId: 'PROJ-A', organisationId: 'ORG-A', countryNodeId: 'CN-MYS' });
    prisma.organisation.findFirst.mockResolvedValue({ id: 'ORG-A' });
    prisma.shariahReview.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await expect(service.create({
      projectId: 'PROJ-A', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', proposedContract: 'MUDARABAH', parentReviewId: 'REV-OTHER-TENANT',
    }, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.shariahReview.create).not.toHaveBeenCalled();
  });

  it('restricts the Malaysia central review view to Malaysia or Super Admin actors', async () => {
    await expect(service.centralMalaysia({ ...reviewer, countryNodeId: 'CN-IDN' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.shariahReview.findMany).not.toHaveBeenCalled();
  });

  it('requires justification for modified or overridden decisions', async () => {
    prisma.shariahReview.findUnique.mockResolvedValue({ id: 'REV-A', status: 'PROPOSED', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', decisions: [] });

    await expect(service.decide('REV-A', { decision: 'OVERRIDDEN' }, reviewer)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('persists an accepted human decision as APPROVED and audits it', async () => {
    prisma.shariahReview.findUnique.mockResolvedValue({ id: 'REV-A', status: 'PROPOSED', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', decisions: [] });
    const tx = {
      shariahDecision: { create: jest.fn().mockResolvedValue({ id: 'DEC-A', justification: null }) },
      shariahReview: { update: jest.fn().mockResolvedValue({ id: 'REV-A', status: 'APPROVED', decisions: [] }) },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

    const result = await service.decide('REV-A', { decision: 'ACCEPTED' }, reviewer);

    expect(result.status).toBe('APPROVED');
    expect(tx.shariahDecision.create).toHaveBeenCalled();
    expect(tx.shariahReview.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }));
    expect(audit.recordActor).toHaveBeenCalledWith(reviewer, expect.objectContaining({ action: 'shariah.review.accepted' }));
  });
});
