import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EstateService } from './estate.service';
import { estateRuleError } from './estate-rules';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const owner: AuthenticatedUser = { userId: 'USR-1', idpSubjectId: 'USR-1', email: 'a@example.test', name: 'A', role: 'Retail Investor', countryNodeId: 'CN-MYS', organisationId: 'ORG-IND-1', assignedRoles: ['Retail Investor'] };

describe('estate rules', () => {
  const wasiyyah = (pct: number) => ({ relation: 'Other', distributionType: 'Wasiyyah', allocationPercent: pct });

  it('limits wasiyyah to one-third and keeps it from faraid heirs', () => {
    expect(estateRuleError(wasiyyah(20), [wasiyyah(13)])).toBeNull();
    expect(estateRuleError(wasiyyah(20), [wasiyyah(14)])).toMatch(/one-third/);
    expect(estateRuleError({ relation: 'Child', distributionType: 'Wasiyyah', allocationPercent: 5 }, [])).toMatch(/faraid heir/);
  });

  it('lets faraid fix an heir\'s share, and keeps institutions out of faraid', () => {
    expect(estateRuleError({ relation: 'Child', distributionType: 'Faraid Heir', allocationPercent: null }, [])).toBeNull();
    expect(estateRuleError({ relation: 'Child', distributionType: 'Faraid Heir', allocationPercent: 50 }, [])).toMatch(/fixed by faraid/);
    expect(estateRuleError({ relation: 'Waqf Foundation', distributionType: 'Faraid Heir', allocationPercent: null }, [])).toMatch(/institution/);
  });

  it('keeps a civil will within 100%', () => {
    const will = (pct: number) => ({ relation: 'Sibling', distributionType: 'Will Beneficiary', allocationPercent: pct });
    expect(estateRuleError(will(40), [will(60)])).toBeNull();
    expect(estateRuleError(will(41), [will(60)])).toMatch(/100%/);
  });
});

describe('EstateService', () => {
  const estateBeneficiary = { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), create: jest.fn(async ({ data }) => ({ id: 'BEN-1', ...data })), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn() };
  const prisma = { estateBeneficiary, $transaction: jest.fn(async (run: (tx: unknown) => unknown): Promise<unknown> => run({ estateBeneficiary })) };
  const audit = { recordActor: jest.fn() };
  const service = new EstateService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  const hibah = { name: 'Noraini', relation: 'Spouse', distributionType: 'Hibah Amanah', allocationPercent: 40, email: 'n@example.test', identityNumber: '820101-10-5521', payoutMethod: 'Bank transfer', ijabConfirmed: true };

  beforeEach(() => { jest.clearAllMocks(); process.env.ESTATE_DATA_ENCRYPTION_KEY = 'test-key'; });

  it('stores the identity number encrypted and returns only its masked form', async () => {
    const saved = await service.create(owner, hibah);
    const stored = prisma.estateBeneficiary.create.mock.calls[0][0].data;
    expect(stored.identityNumberEncrypted).toBeDefined();
    expect(stored.identityNumberEncrypted).not.toContain('5521');
    expect(saved).not.toHaveProperty('identityNumberEncrypted');
    expect(saved.identityNumberMasked).toBe('•••• 5521');
    expect(stored.hibahQabulStatus).toBe('AWAITING');
    expect(JSON.stringify(audit.recordActor.mock.calls[0][1])).not.toContain('820101');
  });

  it('needs the ijab confirmed, a reachable recipient and their ID for a hibah', async () => {
    await expect(service.create(owner, { ...hibah, ijabConfirmed: false })).rejects.toThrow(/ijab/);
    await expect(service.create(owner, { ...hibah, email: undefined })).rejects.toThrow(/email/);
    await expect(service.create(owner, { ...hibah, identityNumber: undefined })).rejects.toThrow(/national ID/);
    expect(prisma.estateBeneficiary.create).not.toHaveBeenCalled();
  });

  it('applies the estate rules against the owner\'s other beneficiaries', async () => {
    prisma.estateBeneficiary.findMany.mockResolvedValueOnce([{ relation: 'Other', distributionType: 'Wasiyyah', allocationPercent: 30 }]);
    await expect(service.create(owner, { name: 'Masjid', relation: 'Other', distributionType: 'Wasiyyah', allocationPercent: 10, payoutMethod: 'Bank transfer' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to save without the encryption key rather than store the ID in clear', async () => {
    delete process.env.ESTATE_DATA_ENCRYPTION_KEY;
    await expect(service.create(owner, hibah)).rejects.toThrow(/ESTATE_DATA_ENCRYPTION_KEY/);
  });

  it('treats another person\'s beneficiary as not found', async () => {
    prisma.estateBeneficiary.findFirst.mockResolvedValueOnce(null);
    await expect(service.remove(owner, 'BEN-OTHER')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.estateBeneficiary.findFirst).toHaveBeenCalledWith({ where: { id: 'BEN-OTHER', ownerUserId: 'USR-1' } });
    expect(prisma.estateBeneficiary.delete).not.toHaveBeenCalled();
  });
});
