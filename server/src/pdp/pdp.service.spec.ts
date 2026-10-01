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
  const prisma = { pdpApplication: { findUnique: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() } };
  const service = new PdpService(prisma as unknown as PrismaService, audit as unknown as AuditService);

  beforeEach(() => jest.clearAllMocks());

  it('approves an application from the reviewer\'s own country', async () => {
    prisma.pdpApplication.findUnique.mockResolvedValueOnce(application);
    prisma.pdpApplication.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.pdpApplication.findUniqueOrThrow.mockResolvedValueOnce({ ...application, kybStatus: 'VERIFIED_MANUAL' });
    const result = await service.reviewKyb(actor('KYB Officer'), 'PDP-1', 'APPROVED', 'Registry documents match');
    expect(result.kybStatus).toBe('VERIFIED_MANUAL');
    expect(prisma.pdpApplication.updateMany).toHaveBeenCalledWith({ where: { id: 'PDP-1', kybStatus: { in: ['PENDING_MANUAL_REVIEW', 'SUBMITTED', 'UNDER_REVIEW'] } }, data: { kybStatus: 'VERIFIED_MANUAL' } });
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
