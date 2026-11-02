import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DistributionService } from './distribution.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { FinancialLedgerService, investorCashAccount } from '../financial/financial-ledger.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const user = (role: AuthenticatedUser['role'], organisationId: string, userId: string): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId: 'CN-MYS', organisationId, assignedRoles: [role] });
// The platform's Settlement Officer sits in its own organisation; the pool belongs to the sponsor's.
const officer = user('Settlement Officer', 'ORG-WPM', 'USR-OPS');
const approver = user('Settlement Officer', 'ORG-WPM', 'USR-OPS2');
const pool = { poolId: 'POOL-DURIAN', poolName: 'SIT5 Ladang Durian Jengka', projectId: 'PRJ-1', organisationId: 'ORG-FELCRA', countryNodeId: 'CN-MYS', currency: 'MYR', status: 'FULL' };
const terms = { id: 'AT-1', akadType: 'MUSHARAKAH', investorProfitSharePct: new Prisma.Decimal(70) };
// Investors sit in their own personal organisations.
const contributions = [{ investorUserId: 'USR-U11', amount: new Prisma.Decimal(25000) }, { investorUserId: 'USR-B1', amount: new Prisma.Decimal(75000) }];
const verified = (ownerUserId: string) => ({ id: `DEST-${ownerUserId}`, ownerUserId, provider: 'Bank Islam', maskedReference: '••••5521', status: 'VERIFIED', cooldownUntil: new Date('2026-01-01'), isDefault: true, organisationId: `ORG-IND-${ownerUserId}`, countryNodeId: 'CN-MYS' });

function setup(prior: Array<{ kind: string; netProfit: number; distributableNet: number | null }> = [], incomeCredits = 0, paidOut = 0) {
  const prisma = {
    wealthPool: { findUnique: jest.fn(async () => pool), findMany: jest.fn(async () => [{ ...pool, investmentStructure: 'Musharakah', project: { projectName: 'Ladang Durian Jengka' } }]) },
    project: { findUnique: jest.fn(async () => ({ projectId: 'PRJ-1', organisationId: 'ORG-FELCRA', countryNodeId: 'CN-MYS' })) },
    poolAkadTerms: { findFirst: jest.fn(async () => terms) },
    investmentContribution: { findMany: jest.fn(async () => contributions) },
    distribution: {
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => prior.map((row) => ({ kind: row.kind, netProfit: new Prisma.Decimal(row.netProfit), distributableNet: row.distributableNet === null ? null : new Prisma.Decimal(row.distributableNet) }))),
      aggregate: jest.fn(async () => ({ _sum: { totalAmount: new Prisma.Decimal(paidOut) } })),
      findUnique: jest.fn(),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'DIST-1', ...data })),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'DIST-1', allocations: [] })),
    },
    distributionAllocation: { create: jest.fn() },
    user: { findMany: jest.fn(async () => [{ id: 'USR-U11', name: 'Siti Aminah' }, { id: 'USR-B1', name: 'Ahmad Faris' }]) },
    payoutDestination: { findMany: jest.fn(async () => [verified('USR-U11'), verified('USR-B1')]) },
    userRoleAssignment: { findMany: jest.fn(async () => []) },
    ledgerEntry: { aggregate: jest.fn(async ({ where }: { where: { direction: string } }) => ({ _sum: { amount: new Prisma.Decimal(where.direction === 'CREDIT' ? incomeCredits : 0) } })) },
    ledgerTransaction: { findUnique: jest.fn(async () => null) },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (client: typeof prisma) => unknown) => fn(prisma));
  const ledger = { ensureAccount: jest.fn(async (_actor: AuthenticatedUser, input: { accountCode: string }) => ({ id: input.accountCode })), post: jest.fn(async () => ({ id: 'LTX-INCOME' })), getBalance: jest.fn(async () => ({ balance: 200000 })), postInTransaction: jest.fn(async () => ({ id: 'LTX-D' })) };
  const audit = { recordActor: jest.fn() };
  const service = new DistributionService(prisma as unknown as PrismaService, ledger as unknown as FinancialLedgerService, audit as unknown as AuditService);
  return { service, prisma, ledger };
}

describe('Settlement across a country', () => {
  it('previews Q4 2026: 70% of RM 15,000 shared by capital, each with their verified account', async () => {
    const { service } = setup();
    const preview = await service.preview(officer, { poolId: pool.poolId, periodName: 'Q4 2026', grossRevenue: 40000, eligibleCosts: 25000 });
    expect(preview).toMatchObject({ netResult: 15000, lossOffset: 0, distributableNet: 15000, investorProfit: 10500, totalAmount: 10500, kind: 'PROFIT', problems: [] });
    expect(preview.investors).toEqual([
      expect.objectContaining({ userId: 'USR-B1', amount: 7875, sharePct: 75, destination: expect.objectContaining({ id: 'DEST-USR-B1' }), issue: null }),
      expect.objectContaining({ userId: 'USR-U11', amount: 2625, sharePct: 25, destination: expect.objectContaining({ id: 'DEST-USR-U11' }), issue: null }),
    ]);
  });

  it('recovers the Q1 2027 loss before sharing Q2 2027', async () => {
    const { service } = setup([{ kind: 'PROFIT', netProfit: 15000, distributableNet: 15000 }, { kind: 'LOSS', netProfit: -4000, distributableNet: 0 }]);
    const preview = await service.preview(officer, { poolId: pool.poolId, periodName: 'Q2 2027', grossRevenue: 30000, eligibleCosts: 20000 });
    expect(preview).toMatchObject({ unrecoveredLossBefore: 4000, lossOffset: 4000, distributableNet: 6000, investorProfit: 4200 });
    expect(preview.investors.map((investor) => investor.amount)).toEqual([3150, 1050]);
  });

  it('flags an investor whose payout account is not verified', async () => {
    const { service, prisma } = setup();
    prisma.payoutDestination.findMany.mockResolvedValueOnce([verified('USR-B1'), { ...verified('USR-U11'), status: 'PENDING_VERIFICATION' }]);
    const preview = await service.preview(officer, { poolId: pool.poolId, periodName: 'Q4 2026', grossRevenue: 40000, eligibleCosts: 25000 });
    expect(preview.investors.find((investor) => investor.userId === 'USR-U11')).toMatchObject({ destination: null, issue: 'NOT_VERIFIED' });
    expect(preview.problems).toContain('Some investors have no verified payout account yet.');
  });

  it("lets the platform's Settlement Officer create it for a sponsor's pool, paying investors in their own organisations", async () => {
    const { service, prisma } = setup();
    await service.create(officer, { projectId: 'PRJ-1', poolId: pool.poolId, organisationId: 'ORG-FELCRA', countryNodeId: 'CN-MYS', currency: 'MYR', periodName: 'Q4 2026', grossRevenue: 40000, eligibleCosts: 25000, totalAmount: 10500, allocations: [{ beneficiaryUserId: 'USR-U11', destinationId: 'DEST-USR-U11' }, { beneficiaryUserId: 'USR-B1', destinationId: 'DEST-USR-B1' }] });
    expect(prisma.userRoleAssignment.findMany).not.toHaveBeenCalled();
    expect(prisma.payoutDestination.findMany).toHaveBeenCalledWith({ where: expect.not.objectContaining({ organisationId: expect.anything() }) });
    expect(prisma.distributionAllocation.create).toHaveBeenCalledTimes(2);
  });

  it('refuses a distribution that leaves out an investor', async () => {
    const { service } = setup();
    await expect(service.create(officer, { projectId: 'PRJ-1', poolId: pool.poolId, organisationId: 'ORG-FELCRA', countryNodeId: 'CN-MYS', currency: 'MYR', periodName: 'Q4 2026', grossRevenue: 40000, eligibleCosts: 25000, totalAmount: 7875, allocations: [{ beneficiaryUserId: 'USR-B1', destinationId: 'DEST-USR-B1', amount: 7875 }] })).rejects.toThrow(/Every investor/);
  });

  it("keeps a Settlement Officer out of another country's pools", async () => {
    const { service } = setup();
    await expect(service.preview({ ...officer, countryNodeId: 'CN-IDN' }, { poolId: pool.poolId, periodName: 'Q4 2026', grossRevenue: 1, eligibleCosts: 0 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("records project income in the pool's books, once per bank reference", async () => {
    const { service, ledger, prisma } = setup();
    await service.recordPoolIncome(officer, { poolId: pool.poolId, amount: 15000, reference: 'IBG-FELCRA-0001' });
    expect(ledger.ensureAccount).toHaveBeenCalledWith(expect.objectContaining({ userId: 'USR-OPS', organisationId: 'ORG-FELCRA' }), expect.objectContaining({ accountCode: 'POOL-POOL-DURIAN-INCOME-MYR' }));
    expect(ledger.post).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ transactionType: 'POOL_INCOME', idempotencyKey: 'pool-income:POOL-DURIAN:IBG-FELCRA-0001' }));
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce({ id: 'LTX-INCOME' } as never);
    await expect(service.recordPoolIncome(officer, { poolId: pool.poolId, amount: 15000, reference: 'ibg-felcra-0001' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('pays profit only out of project income recorded, never out of investors\' capital', async () => {
    const { service, prisma } = setup([], 10000, 0);
    prisma.distribution.findUnique.mockResolvedValueOnce({ id: 'DIST-1', kind: 'PROFIT', status: 'APPROVED', poolId: pool.poolId, projectId: 'PRJ-1', organisationId: 'ORG-FELCRA', countryNodeId: 'CN-MYS', currency: 'MYR', totalAmount: new Prisma.Decimal(10500), version: 2, createdBy: 'USR-OPS', allocations: [], approvals: [] } as never);
    await expect(service.process(approver, 'DIST-1')).rejects.toThrow(/Record the project income received/);
  });

  it('refuses income dated in the future', async () => {
    const { service } = setup();
    await expect(service.recordPoolIncome(officer, { poolId: pool.poolId, amount: 1, reference: 'IBG-1', receivedAt: '2099-01-01' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('investorCashAccount', () => {
  const client = (existing: { organisationId: string; countryNodeId: string } | null) => ({ financialAccount: { findUnique: jest.fn(async () => existing) } }) as unknown as PrismaService;
  it('keeps the short code for the first organisation, and a separate code in another organisation\'s books', async () => {
    expect((await investorCashAccount(client(null), 'USR-U11', 'ORG-FELCRA', 'CN-MYS', 'MYR')).accountCode).toBe('USER-USR-U11-CASH-MYR');
    expect((await investorCashAccount(client({ organisationId: 'ORG-FELCRA', countryNodeId: 'CN-MYS' }), 'USR-U11', 'ORG-FELCRA', 'CN-MYS', 'MYR')).accountCode).toBe('USER-USR-U11-CASH-MYR');
    expect((await investorCashAccount(client({ organisationId: 'ORG-FELCRA', countryNodeId: 'CN-MYS' }), 'USR-U11', 'ORG-AHG', 'CN-MYS', 'MYR')).accountCode).toBe('USER-USR-U11-ORG-AHG-CASH-MYR');
  });
});
