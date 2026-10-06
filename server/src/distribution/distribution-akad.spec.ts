import { DistributionService } from './distribution.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../financial/financial-ledger.service', () => ({ FinancialLedgerService: class {} }));

const officer: AuthenticatedUser = { userId: 'USR-OPS', idpSubjectId: 'USR-OPS', email: 'ops@example.test', name: 'Ops', role: 'Settlement Officer', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Settlement Officer'] };
const base = { projectId: 'P1', poolId: 'POOL-1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', currency: 'MYR', periodName: '2026-Q3', grossRevenue: 10000, eligibleCosts: 2000 };

function setup(termsPct: number | null) {
  const created: Array<Record<string, unknown>> = [];
  const tx = {
    distribution: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return { id: 'DIST-1', ...data }; }), findUniqueOrThrow: jest.fn(async () => ({ id: 'DIST-1' })) },
    distributionAllocation: { create: jest.fn(async () => ({})) },
  };
  const prisma = {
    project: { findUnique: jest.fn(async () => ({ projectId: 'P1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS' })) },
    wealthPool: { findUnique: jest.fn(async () => ({ poolId: 'POOL-1', status: 'FULL', currency: 'MYR', organisationId: 'ORG-A', countryNodeId: 'CN-MYS' })) },
    distribution: { findFirst: jest.fn(async () => null) },
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
