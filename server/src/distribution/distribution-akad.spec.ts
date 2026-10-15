import { DistributionService } from './distribution.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../financial/financial-ledger.service', () => ({ FinancialLedgerService: class {} }));

const officer: AuthenticatedUser = { userId: 'USR-OPS', idpSubjectId: 'USR-OPS', email: 'ops@example.test', name: 'Ops', role: 'Settlement Officer', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Settlement Officer'] };
const base = { projectId: 'P1', poolId: 'POOL-1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', currency: 'MYR', periodName: '2026-Q3', grossRevenue: 10000, eligibleCosts: 2000 };

function setup(termsPct: number | null, prior: Array<{ kind: string; netProfit: number; distributableNet: number | null }> = []) {
  const created: Array<Record<string, unknown>> = [];
  const tx = {
    $queryRaw: jest.fn(async () => []),
    distribution: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return { id: 'DIST-1', ...data }; }), findUniqueOrThrow: jest.fn(async () => ({ id: 'DIST-1' })), findMany: jest.fn(async () => prior) },
    distributionAllocation: { create: jest.fn(async () => ({})) },
  };
  const prisma = {
    project: { findUnique: jest.fn(async () => ({ projectId: 'P1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS' })) },
    wealthPool: { findUnique: jest.fn(async () => ({ poolId: 'POOL-1', projectId: 'P1', status: 'FULL', currency: 'MYR', organisationId: 'ORG-A', countryNodeId: 'CN-MYS' })) },
    distribution: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => prior) },
    poolAkadTerms: { findFirst: jest.fn(async () => (termsPct === null ? null : { id: 'TERMS-1', investorProfitSharePct: termsPct })) },
    investmentContribution: { findMany: jest.fn(async () => [{ investorUserId: 'USR-A', amount: 600 }, { investorUserId: 'USR-B', amount: 400 }]) },
    userRoleAssignment: { findMany: jest.fn(async () => [{ userId: 'USR-A' }, { userId: 'USR-B' }]) },
    payoutDestination: { findMany: jest.fn(async () => [{ id: 'D-A', ownerUserId: 'USR-A' }, { id: 'D-B', ownerUserId: 'USR-B' }]) },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const service = new DistributionService(prisma as never, {} as never, { recordActor: jest.fn() } as never);
  return { service, created };
}
const allocations = [{ beneficiaryUserId: 'USR-A', destinationId: 'D-A' }, { beneficiaryUserId: 'USR-B', destinationId: 'D-B' }];

describe('DistributionService.create with akad terms', () => {
  it('applies the ratio fixed in the pool\'s akad and records it', async () => {
    const { service, created } = setup(70);
    // Net profit 8,000 x 70% = 5,600 for investors.
    await service.create(officer, { ...base, totalAmount: 5600, allocations });
    expect(created[0]).toMatchObject({ akadTermsId: 'TERMS-1' });
    expect(Number(created[0].investorProfitSharePct)).toBe(70);
    expect(Number(created[0].investorProfit)).toBe(5600);
  });

  it('rejects a different ratio than the one investors agreed to', async () => {
    const { service } = setup(70);
    await expect(service.create(officer, { ...base, totalAmount: 7200, investorProfitSharePercent: 90, allocations })).rejects.toThrow(/fixes the investor profit share at 70%/);
  });

  it('requires reported revenue and costs so the ratio can be applied', async () => {
    const { service } = setup(70);
    await expect(service.create(officer, { ...base, grossRevenue: undefined, eligibleCosts: undefined, totalAmount: 5600, allocations })).rejects.toThrow(/must report gross revenue/);
  });

  it('keeps the request ratio for older pools without akad terms', async () => {
    const { service, created } = setup(null);
    await service.create(officer, { ...base, totalAmount: 6400, investorProfitSharePercent: 80, allocations });
    expect(created[0]).toMatchObject({ akadTermsId: undefined });
    expect(Number(created[0].investorProfitSharePct)).toBe(80);
  });
});

describe('DistributionService loss periods', () => {
  it('shares only the profit left after recovering an earlier loss', async () => {
    // Earlier loss of 3,000; this period nets 8,000, so 5,000 is shared: 70% = 3,500.
    const { service, created } = setup(70, [{ kind: 'LOSS', netProfit: -3000, distributableNet: 0 }]);
    await service.create(officer, { ...base, totalAmount: 3500, allocations });
    expect(created[0]).toMatchObject({ kind: 'PROFIT' });
    expect(Number(created[0].lossOffset)).toBe(3000);
    expect(Number(created[0].distributableNet)).toBe(5000);
    expect(Number(created[0].investorProfit)).toBe(3500);
  });

  it('refuses a payout when the whole profit is absorbed by earlier losses', async () => {
    const { service } = setup(70, [{ kind: 'LOSS', netProfit: -9000, distributableNet: 0 }]);
    await expect(service.create(officer, { ...base, totalAmount: 1, allocations })).rejects.toThrow(/Nothing to distribute/);
  });

  it('records a loss period without any payout', async () => {
    const { service, created } = setup(70);
    await service.recordPeriodResult(officer, { projectId: 'P1', poolId: 'POOL-1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', currency: 'MYR', periodName: '2026-Q4', grossRevenue: 2000, eligibleCosts: 5000 });
    expect(created[0]).toMatchObject({ kind: 'LOSS', status: 'CALCULATED' });
    expect(Number(created[0].netProfit)).toBe(-3000);
    expect(Number(created[0].totalAmount)).toBe(0);
  });

  it('does not let a profitable period be recorded as a result without a distribution', async () => {
    const { service } = setup(70);
    await expect(service.recordPeriodResult(officer, { projectId: 'P1', poolId: 'POOL-1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', currency: 'MYR', periodName: '2026-Q4', grossRevenue: 9000, eligibleCosts: 1000 })).rejects.toThrow(/Create a distribution instead/);
  });
});
