import { platformRevenue } from './platform-revenue';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

const actor = (role: string) => ({ userId: 'U1', role, countryNodeId: 'CN-MYS', organisationId: 'ORG-1' }) as unknown as AuthenticatedUser;

function prismaMock() {
  return {
    paymentTransaction: {
      groupBy: jest.fn(async () => [{ productType: 'MEMBERSHIP', _sum: { amountMYR: '899.00' }, _count: { _all: 1 } }, { productType: 'AI_CREDIT_TOP_UP', _sum: { amountMYR: '100.00' }, _count: { _all: 2 } }]),
      findMany: jest.fn().mockResolvedValueOnce([{ amountMYR: '899.00', paidAt: new Date() }]).mockResolvedValueOnce([]),
    },
    membershipSubscription: { groupBy: jest.fn(async () => [{ tier: 'PRO', _count: { _all: 3 } }]) },
    projectPromotionCampaign: { findMany: jest.fn(async () => []) },
  };
}

describe('platform revenue', () => {
  it('totals paid income by product and month, leaving zakat out', async () => {
    const prisma = prismaMock();
    const result = await platformRevenue(prisma as never, actor('Super Admin'));
    expect(result.totalMYR).toBe(999);
    expect(result.byMonth).toHaveLength(12);
    expect(result.byMonth[11].amountMYR).toBe(899);
    expect(result.activeMemberships).toEqual([{ tier: 'PRO', count: 3 }]);
    expect(prisma.paymentTransaction.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PAID', productType: { notIn: ['ZAKAT_PAYMENT'] } } }));
  });

  it('keeps a Country Admin to their country and gives no membership tiers', async () => {
    const prisma = prismaMock();
    const result = await platformRevenue(prisma as never, actor('Country Admin'));
    expect(prisma.paymentTransaction.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ countryNodeId: 'CN-MYS' }) }));
    expect(prisma.membershipSubscription.groupBy).not.toHaveBeenCalled();
    expect(result.activeMemberships).toEqual([]);
  });
});
