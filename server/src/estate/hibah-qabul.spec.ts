import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { EstateService } from './estate.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const donor: AuthenticatedUser = { userId: 'USR-SITI', idpSubjectId: 'x', email: 'siti@x', name: 'Siti Aminah binti Yusof', role: 'Retail Investor', countryNodeId: 'CN-MYS', organisationId: 'ORG-IND-SITI', assignedRoles: ['Retail Investor'] };
const token = 'a'.repeat(32);
const hash = createHash('sha256').update(token).digest('hex');
const beneficiary = (overrides: Record<string, unknown> = {}) => ({
  id: 'B1', ownerUserId: 'USR-SITI', organisationId: 'ORG-IND-SITI', countryNodeId: 'CN-MYS', name: 'Nur Aisyah binti Ahmad', relation: 'Child', distributionType: 'Hibah Amanah',
  allocationPercent: 30, email: 'aisyah@x', identityNumberMasked: '•••• 5521', hibahIjabAt: new Date('2026-10-01'), hibahQabulStatus: 'AWAITING', hibahQabulAt: null,
  hibahQabulTokenHash: hash, hibahQabulExpiresAt: new Date(Date.now() + 86_400_000), hibahQabulAttempts: 0,
  ...overrides,
});

describe('Hibah qabul', () => {
  const prisma = {
    estateBeneficiary: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn().mockResolvedValue({ name: 'Siti Aminah binti Yusof' }) },
  };
  const audit = { recordActor: jest.fn(), record: jest.fn() };
  const notifications = { notifyUsers: jest.fn().mockResolvedValue(undefined) };
  const delivery = { deliverEach: jest.fn().mockResolvedValue([{ channel: 'EMAIL', outcome: 'SENT' }]) };
  const service = new EstateService(prisma as unknown as PrismaService, audit as unknown as AuditService, notifications as never, delivery as never);
  const answer = { decision: 'ACCEPT' as const, fullName: 'Nur Aisyah binti Ahmad', identityLast4: '5521' };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CORS_ORIGINS = 'https://how-staging.example.my';
  });

  it('gives the donor a one-time link, keeps only its fingerprint, and emails it', async () => {
    prisma.estateBeneficiary.findFirst.mockResolvedValueOnce(beneficiary({ hibahQabulTokenHash: null }));
    const result = await service.requestQabul(donor, 'B1');
    const stored = prisma.estateBeneficiary.update.mock.calls[0][0].data.hibahQabulTokenHash;
    expect(stored).toBe(createHash('sha256').update(result.token).digest('hex'));
    expect(stored).not.toBe(result.token);
    expect(result.emailed).toBe(true);
    expect(delivery.deliverEach).toHaveBeenCalledWith(expect.objectContaining({ recipientEmail: 'aisyah@x', message: expect.stringContaining(`https://how-staging.example.my/m/hibah/${result.token}`) }));
  });

  it('asks for qabul only on a hibah still awaiting it', async () => {
    prisma.estateBeneficiary.findFirst.mockResolvedValueOnce(beneficiary({ distributionType: 'Wasiyyah', hibahIjabAt: null }));
    await expect(service.requestQabul(donor, 'B1')).rejects.toBeInstanceOf(BadRequestException);
    prisma.estateBeneficiary.findFirst.mockResolvedValueOnce(beneficiary({ hibahQabulStatus: 'ACCEPTED' }));
    await expect(service.requestQabul(donor, 'B1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('shows the recipient the offer, and refuses an unknown or expired link', async () => {
    prisma.estateBeneficiary.findUnique.mockResolvedValueOnce(beneficiary());
    await expect(service.hibahOffer(token)).resolves.toMatchObject({ donorName: 'Siti Aminah binti Yusof', recipientName: 'Nur Aisyah binti Ahmad', allocationPercent: 30, status: 'AWAITING' });
    prisma.estateBeneficiary.findUnique.mockResolvedValueOnce(beneficiary({ hibahQabulExpiresAt: new Date('2020-01-01') }));
    await expect(service.hibahOffer(token)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records the acceptance with its evidence, closes the link and tells the donor', async () => {
    prisma.estateBeneficiary.findUnique.mockResolvedValueOnce(beneficiary());
    prisma.estateBeneficiary.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.answerHibah(token, answer, { ip: '203.0.113.5', userAgent: 'Phone' });
    expect(prisma.estateBeneficiary.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ hibahQabulStatus: 'ACCEPTED', hibahQabulBy: 'Nur Aisyah binti Ahmad', hibahQabulAsGuardian: false, hibahQabulTokenHash: null, hibahQabulEvidence: expect.objectContaining({ ip: '203.0.113.5' }) }) }));
    expect(notifications.notifyUsers).toHaveBeenCalledWith(['USR-SITI'], expect.objectContaining({ title: 'Hibah accepted' }));
  });

  it('lets a guardian answer for a minor under their own name', async () => {
    prisma.estateBeneficiary.findUnique.mockResolvedValueOnce(beneficiary());
    prisma.estateBeneficiary.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.answerHibah(token, { ...answer, fullName: 'Ahmad bin Ismail', asGuardian: true }, {});
    expect(notifications.notifyUsers).toHaveBeenCalledWith(['USR-SITI'], expect.objectContaining({ message: expect.stringContaining('guardian Ahmad bin Ismail') }));
  });

  it('counts a wrong ID or name, and locks the link after five tries', async () => {
    prisma.estateBeneficiary.findUnique.mockResolvedValueOnce(beneficiary());
    await expect(service.answerHibah(token, { ...answer, identityLast4: '0000' }, {})).rejects.toThrow(/4 tries left/);
    expect(prisma.estateBeneficiary.update).toHaveBeenCalledWith({ where: { id: 'B1' }, data: { hibahQabulAttempts: { increment: 1 } } });
    prisma.estateBeneficiary.findUnique.mockResolvedValueOnce(beneficiary());
    await expect(service.answerHibah(token, { ...answer, fullName: 'Someone Else' }, {})).rejects.toBeInstanceOf(BadRequestException);
    prisma.estateBeneficiary.findUnique.mockResolvedValueOnce(beneficiary({ hibahQabulAttempts: 5 }));
    await expect(service.answerHibah(token, answer, {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not accept an answer twice', async () => {
    prisma.estateBeneficiary.findUnique.mockResolvedValueOnce(beneficiary({ hibahQabulStatus: 'DECLINED' }));
    await expect(service.answerHibah(token, answer, {})).rejects.toBeInstanceOf(ConflictException);
  });
});
