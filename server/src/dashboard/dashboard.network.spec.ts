import { networkOverview } from './dashboard.network';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

const actor = (role: string, countryNodeId = 'CN-MYS') => ({ userId: 'U1', role, countryNodeId, organisationId: 'ORG-1' }) as unknown as AuthenticatedUser;

function prismaMock() {
  return {
    countryNode: { findMany: jest.fn().mockResolvedValue([
      { code: 'CN-MYS', name: 'Malaysia', status: 'ACTIVE', currency: 'MYR' },
      { code: 'CN-TUR', name: 'Turkiye', status: 'ACTIVE', currency: 'TRY' },
    ]) },
    organisation: {
      groupBy: jest.fn().mockResolvedValue([{ countryNodeId: 'CN-MYS', _count: { _all: 3 } }]),
      count: jest.fn().mockResolvedValue(1),
    },
    userRoleAssignment: { findMany: jest.fn()
      .mockResolvedValueOnce([{ userId: 'A', countryNodeId: 'CN-MYS' }, { userId: 'B', countryNodeId: 'CN-MYS' }, { userId: 'A', countryNodeId: 'CN-TUR' }])
      .mockResolvedValueOnce([{ userId: 'A' }, { userId: 'B' }]) },
    project: { groupBy: jest.fn().mockResolvedValue([{ countryNodeId: 'CN-MYS', _count: { _all: 2 }, _sum: { totalProjectCost: '1500000.00' } }]) },
    wealthPool: { groupBy: jest.fn().mockResolvedValue([{ countryNodeId: 'CN-MYS', _count: { _all: 1 } }]) },
    investmentOrder: {
      groupBy: jest.fn().mockResolvedValue([{ countryNodeId: 'CN-MYS', _sum: { amount: '25000.00' } }]),
      count: jest.fn().mockResolvedValue(4),
    },
    fundingRequest: { count: jest.fn().mockResolvedValue(2) },
    asset: { count: jest.fn().mockResolvedValue(5) },
  };
}

describe('network overview', () => {
  it('gives each country its own figures and counts a person once', async () => {
    const prisma = prismaMock();
    const result = await networkOverview(prisma as unknown as PrismaService, actor('Super Admin'));
    expect(prisma.countryNode.findMany.mock.calls[0][0].where).toEqual({});
    expect(result.countries[0]).toEqual({ code: 'CN-MYS', name: 'Malaysia', status: 'ACTIVE', currency: 'MYR', organisations: 3, users: 2, projects: 2, projectValue: 1500000, pools: 1, settled: 25000 });
    expect(result.countries[1]).toMatchObject({ code: 'CN-TUR', users: 1, projects: 0, settled: 0 });
    expect(result.totals).toEqual({ activeCountries: 2, countries: 2, users: 2, organisations: 3, projects: 2, pools: 1 });
    expect(result.waiting).toEqual({ settlements: 4, trancheRequests: 2, assetsToVerify: 5, kybToReview: 1 });
  });

  it('keeps a Country Admin to their own country', async () => {
    const prisma = prismaMock();
    await networkOverview(prisma as unknown as PrismaService, actor('Country Admin', 'CN-TUR'));
    expect(prisma.countryNode.findMany.mock.calls[0][0].where).toEqual({ code: 'CN-TUR' });
    expect(prisma.project.groupBy.mock.calls[0][0].where).toEqual({ countryNodeId: 'CN-TUR', status: { not: 'DRAFT' } });
    expect(prisma.investmentOrder.count.mock.calls[0][0].where).toEqual({ countryNodeId: 'CN-TUR', status: 'PENDING' });
  });
});
