import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { PdpService } from './pdp.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

function actor(role: AuthenticatedUser['role'], countryNodeId = 'CN-MYS', userId = 'USR-REVIEWER'): AuthenticatedUser {
  return { userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId, organisationId: 'ORG-A', assignedRoles: [role] };
}

const now = new Date('2026-10-01T00:00:00Z');
const application = { id: 'PDP-1', applicationNumber: 'PDP-APP-2026-001', userId: 'USR-SPONSOR', countryCode: 'MYS', kybStatus: 'PENDING_MANUAL_REVIEW', payload: {}, submittedAt: now, createdAt: now, updatedAt: now };

describe('PdpService.reviewKyb', () => {
  const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
  const prisma = { pdpApplication: { findUnique: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() }, featureModule: { findUnique: jest.fn().mockResolvedValue(null) } };
  const service = new PdpService(prisma as unknown as PrismaService, audit as unknown as AuditService);

  beforeEach(() => jest.clearAllMocks());

  it('refuses KYB reviews while the KYB module is disabled', async () => {
    prisma.featureModule.findUnique.mockResolvedValueOnce({ moduleKey: 'KYB_VERIFICATION', enabled: false, mode: 'DISABLED' });
    await expect(service.reviewKyb(actor('KYB Officer'), 'PDP-1', 'APPROVED', 'Registry documents match')).rejects.toThrow('KYB verification is currently disabled');
    expect(prisma.pdpApplication.updateMany).not.toHaveBeenCalled();
  });

  it('approves an application from the reviewer\'s own country', async () => {
    prisma.pdpApplication.findUnique.mockResolvedValueOnce(application);
    prisma.pdpApplication.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.pdpApplication.findUniqueOrThrow.mockResolvedValueOnce({ ...application, kybStatus: 'VERIFIED_MANUAL' });
    const result = await service.reviewKyb(actor('KYB Officer'), 'PDP-1', 'APPROVED', 'Registry documents match');
    expect(result.kybStatus).toBe('VERIFIED_MANUAL');
    expect(prisma.pdpApplication.updateMany).toHaveBeenCalledWith({ where: { id: 'PDP-1', kybStatus: { in: ['PENDING_MANUAL_REVIEW', 'SUBMITTED', 'UNDER_REVIEW'] } }, data: expect.objectContaining({ status: 'APPROVED', kybStatus: 'VERIFIED_MANUAL', reviewNote: 'Registry documents match', reviewedBy: 'USR-REVIEWER' }) });
  });

  it.each(['KYB Officer', 'Country Admin', 'Organization Admin', 'Compliance Officer'] as const)('forbids a %s from another country', async (role) => {
    prisma.pdpApplication.findUnique.mockResolvedValueOnce(application);
    await expect(service.reviewKyb(actor(role, 'CN-IDN'), 'PDP-1', 'APPROVED', 'Looks fine')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.pdpApplication.updateMany).not.toHaveBeenCalled();
  });

  it('lets a Super Admin review any country', async () => {
    prisma.pdpApplication.findUnique.mockResolvedValueOnce(application);
    prisma.pdpApplication.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.pdpApplication.findUniqueOrThrow.mockResolvedValueOnce({ ...application, kybStatus: 'REJECTED' });
    await service.reviewKyb(actor('Super Admin', 'CN-IDN'), 'PDP-1', 'REJECTED', 'Registry mismatch');
    expect(prisma.pdpApplication.updateMany).toHaveBeenCalled();
  });

  it('forbids reviewing your own application', async () => {
    prisma.pdpApplication.findUnique.mockResolvedValueOnce(application);
    await expect(service.reviewKyb(actor('KYB Officer', 'CN-MYS', 'USR-SPONSOR'), 'PDP-1', 'APPROVED', 'Looks fine')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects applications that are not awaiting review', async () => {
    prisma.pdpApplication.findUnique.mockResolvedValueOnce({ ...application, kybStatus: 'VERIFIED_MANUAL' });
    await expect(service.reviewKyb(actor('KYB Officer'), 'PDP-1', 'REJECTED', 'Late change')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports a conflict when another reviewer decided first', async () => {
    prisma.pdpApplication.findUnique.mockResolvedValueOnce(application);
    prisma.pdpApplication.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.reviewKyb(actor('KYB Officer'), 'PDP-1', 'REJECTED', 'Mismatch')).rejects.toBeInstanceOf(ConflictException);
    expect(audit.recordActor).not.toHaveBeenCalled();
  });
});

describe('PdpService review queue and corrections', () => {
  const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
  const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    pdpApplication: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    featureModule: { findUnique: jest.fn().mockResolvedValue(null) },
    organisation: { findUnique: jest.fn().mockResolvedValue({ name: 'Felcra Bhd' }) },
    userRoleAssignment: { findMany: jest.fn().mockResolvedValue([{ userId: 'USR-KYB', organisationId: 'ORG-REG' }]) },
  };
  const service = new PdpService(prisma as unknown as PrismaService, audit as unknown as AuditService, notifications as never);
  const submitted = { ...application, status: 'SUBMITTED', organisationId: 'ORG-SPONSOR', organisationName: 'Felcra Bhd', history: [] };

  beforeEach(() => jest.clearAllMocks());

  it('lists only submitted applications from the reviewer\'s country', async () => {
    await service.listForReview(actor('KYB Officer'));
    expect(prisma.pdpApplication.findMany.mock.calls[0][0].where).toEqual({ countryCode: 'MYS', status: { not: 'DRAFT' } });
    await service.listForReview(actor('Super Admin'), 'SUBMITTED');
    expect(prisma.pdpApplication.findMany.mock.calls[1][0].where).toEqual({ status: 'SUBMITTED' });
  });

  it('sends an application back for more information and tells the applicant what to correct', async () => {
    prisma.pdpApplication.findUnique.mockResolvedValueOnce(submitted);
    prisma.pdpApplication.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.pdpApplication.findUniqueOrThrow.mockResolvedValueOnce({ ...submitted, status: 'ADDITIONAL_INFORMATION_REQUIRED', kybStatus: 'CORRECTION_REQUIRED' });
    await service.reviewKyb(actor('KYB Officer'), 'PDP-1', 'REQUEST_INFO', 'Upload the latest SSM Form 24.');
    const data = prisma.pdpApplication.updateMany.mock.calls[0][0].data;
    expect(data).toMatchObject({ status: 'ADDITIONAL_INFORMATION_REQUIRED', kybStatus: 'CORRECTION_REQUIRED' });
    expect(data.history[0]).toMatchObject({ action: 'REQUEST_INFO', note: 'Upload the latest SSM Form 24.' });
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-SPONSOR', organisationId: 'ORG-SPONSOR', countryNodeId: 'CN-MYS', message: expect.stringContaining('Upload the latest SSM Form 24.') }));
  });

  it('forbids a reviewer from the applicant\'s own organisation', async () => {
    prisma.pdpApplication.findUnique.mockResolvedValueOnce({ ...submitted, organisationId: 'ORG-A' });
    await expect(service.reviewKyb(actor('Country Admin'), 'PDP-1', 'APPROVED', 'Fine')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets the applicant resubmit a corrected application, and tells reviewers', async () => {
    const sentBack = { ...submitted, status: 'ADDITIONAL_INFORMATION_REQUIRED', kybStatus: 'CORRECTION_REQUIRED', payload: { compliance: Object.fromEntries(['amlCftDeclaration', 'sourceOfFundsDeclaration', 'beneficialOwnershipAccurate', 'sanctionsNonMatchDeclared', 'regulatoryComplianceAgreed', 'shariahComplianceAttested', 'termsAndConditionsAccepted', 'privacyConsentGranted'].map((key) => [key, true])) } };
    prisma.pdpApplication.findUnique.mockResolvedValueOnce(sentBack);
    prisma.pdpApplication.update.mockResolvedValueOnce({ ...sentBack, status: 'SUBMITTED', kybStatus: 'SUBMITTED' });
    await service.submit(actor('Project Sponsor', 'CN-MYS', 'USR-SPONSOR'), 'PDP-1');
    expect(prisma.pdpApplication.update.mock.calls[0][0].data.history[0]).toMatchObject({ action: 'RESUBMITTED' });
    expect(prisma.userRoleAssignment.findMany.mock.calls[0][0].where).toMatchObject({ countryNodeId: 'CN-MYS', organisationId: { not: 'ORG-SPONSOR' } });
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-KYB', title: 'PDP application corrected' }));
  });

  it('shows members the application a colleague submitted for their organisation, their own first', async () => {
    const colleague = { ...submitted, id: 'PDP-OLD', userId: 'USR-COLLEAGUE', organisationId: null, status: 'APPROVED' };
    const own = { ...application, id: 'PDP-OWN', userId: 'USR-SPONSOR', status: 'DRAFT', history: [] };
    prisma.pdpApplication.findMany.mockResolvedValueOnce([colleague, own]);
    const mine = await service.getMine({ ...actor('Project Sponsor', 'CN-MYS', 'USR-SPONSOR'), organisationId: 'ORG-SPONSOR' });
    expect(mine.map((item) => item.id)).toEqual(['PDP-OWN', 'PDP-OLD']);
    expect(prisma.pdpApplication.findMany.mock.calls[0][0].where.OR).toEqual([
      { userId: 'USR-SPONSOR' },
      { organisationId: 'ORG-SPONSOR', status: { not: 'DRAFT' } },
      { organisationId: null, organisationName: { equals: 'Felcra Bhd', mode: 'insensitive' }, countryCode: 'MYS', status: { not: 'DRAFT' } },
    ]);
  });
});
