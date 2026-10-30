import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvestmentsService } from './investments.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { FinancialLedgerService } from '../financial/financial-ledger.service';
import { CollectionAccountService } from '../collection-accounts/collection-account.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../financial/financial-ledger.service', () => ({ FinancialLedgerService: class {} }));

const actor = (role: AuthenticatedUser['role'], userId: string): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: [role] });
const order = { id: 'ORD-1', orderNumber: 'HOW-INV-1-ABC', status: 'PENDING', amount: 5000, currency: 'MYR', countryNodeId: 'CN-MYS', investorUserId: 'USR-INVESTOR' };
const account = { countryNodeId: 'CN-MYS', bankName: 'Bank Islam', accountName: 'D-8 HOW Trust Account', accountNumber: '1401-2345-6789', swiftCode: 'BIMBMYKL', instructions: null };

describe('InvestmentsService.paymentInstructions', () => {
  const prisma = {
    investmentOrder: { findUnique: jest.fn() },
    collectionAccount: { findUnique: jest.fn() },
  };
  const service = new InvestmentsService(prisma as unknown as PrismaService, {} as FinancialLedgerService, {} as AuditService);

  beforeEach(() => jest.clearAllMocks());

  it('gives the investor the country trust account and the order number as the reference', async () => {
    prisma.investmentOrder.findUnique.mockResolvedValue(order);
    prisma.collectionAccount.findUnique.mockResolvedValue(account);
    const result = await service.paymentInstructions(actor('Retail Investor', 'USR-INVESTOR'), 'ORD-1');
    expect(prisma.collectionAccount.findUnique).toHaveBeenCalledWith({ where: { countryNodeId: 'CN-MYS' } });
    expect(result).toMatchObject({ reference: 'HOW-INV-1-ABC', amount: 5000, account: { accountNumber: '1401-2345-6789', bankName: 'Bank Islam' } });
  });

  it('says there is no account yet instead of failing when Super Admin has not set one', async () => {
    prisma.investmentOrder.findUnique.mockResolvedValue(order);
    prisma.collectionAccount.findUnique.mockResolvedValue(null);
    await expect(service.paymentInstructions(actor('Retail Investor', 'USR-INVESTOR'), 'ORD-1')).resolves.toMatchObject({ account: null });
  });

  it("does not show another investor's order", async () => {
    prisma.investmentOrder.findUnique.mockResolvedValue(order);
    await expect(service.paymentInstructions(actor('Retail Investor', 'USR-OTHER'), 'ORD-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.collectionAccount.findUnique).not.toHaveBeenCalled();
  });
});

describe('InvestmentsService.myDistributions', () => {
  const prisma = {
    distributionAllocation: { findMany: jest.fn() },
    wealthPool: { findMany: jest.fn() },
  };
  const service = new InvestmentsService(prisma as unknown as PrismaService, {} as FinancialLedgerService, {} as AuditService);

  it('lists the profit per period with the pool name and whether it was paid', async () => {
    prisma.distributionAllocation.findMany.mockResolvedValue([
      { id: 'A1', amount: 120.5, currency: 'MYR', createdAt: new Date('2026-09-30T00:00:00Z'), distribution: { periodName: 'Q3 2026', poolId: 'POOL-1', projectId: 'PRJ-1' }, payoutInstruction: { status: 'SETTLED', settledAt: new Date('2026-10-02T00:00:00Z') } },
      { id: 'A2', amount: 80, currency: 'MYR', createdAt: new Date('2026-06-30T00:00:00Z'), distribution: { periodName: 'Q2 2026', poolId: 'POOL-1', projectId: 'PRJ-1' }, payoutInstruction: null },
    ]);
    prisma.wealthPool.findMany.mockResolvedValue([{ poolId: 'POOL-1', poolName: 'Solar Farm Pool' }]);
    const rows = await service.myDistributions(actor('Retail Investor', 'USR-INVESTOR'));
    expect(prisma.distributionAllocation.findMany.mock.calls[0][0].where.beneficiaryUserId).toBe('USR-INVESTOR');
    expect(rows).toEqual([
      expect.objectContaining({ id: 'A1', poolName: 'Solar Farm Pool', periodName: 'Q3 2026', amount: 120.5, paid: true, paidAt: '2026-10-02T00:00:00.000Z' }),
      expect.objectContaining({ id: 'A2', paid: false, paidAt: null }),
    ]);
  });

  it('is for investor accounts only', async () => {
    await expect(service.myDistributions(actor('Finance Officer', 'USR-FIN'))).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('CollectionAccountService.save', () => {
  const prisma = {
    countryNode: { findUnique: jest.fn(), findMany: jest.fn() },
    collectionAccount: { upsert: jest.fn() },
  };
  const audit = { recordActor: jest.fn() };
  const service = new CollectionAccountService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  const input = { bankName: 'Bank Islam', accountName: 'D-8 HOW Trust Account', accountNumber: '1401-2345-6789' };

  it('lets only Super Admin change where investors send money', async () => {
    await expect(service.save(actor('Country Admin', 'USR-CA'), 'CN-MYS', input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.collectionAccount.upsert).not.toHaveBeenCalled();
  });

  it("saves in the country's currency and audits only the last four digits", async () => {
    prisma.countryNode.findUnique.mockResolvedValue({ code: 'CN-MYS', currency: 'MYR', collectionAccount: null });
    prisma.countryNode.findMany.mockResolvedValue([{ code: 'CN-MYS', name: 'Malaysia', currency: 'MYR', collectionAccount: { ...account, updatedAt: new Date() } }]);
    const view = await service.save(actor('Super Admin', 'USR-SA'), 'CN-MYS', input);
    expect(prisma.collectionAccount.upsert.mock.calls[0][0].create).toMatchObject({ countryNodeId: 'CN-MYS', currency: 'MYR', accountNumber: '1401-2345-6789', updatedBy: 'USR-SA' });
    expect(audit.recordActor.mock.calls[0][1]).toMatchObject({ action: 'collection_account.create', metadata: { accountNumberLast4: '6789' } });
    expect(view.account?.bankName).toBe('Bank Islam');
  });
});
