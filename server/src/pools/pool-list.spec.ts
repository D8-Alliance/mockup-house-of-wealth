import { PoolsService } from './pools.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const admin = { userId: 'U1', role: 'Super Admin', countryNodeId: 'CN-MYS', organisationId: 'ORG-1' } as unknown as AuthenticatedUser;

describe('PoolsService.list', () => {
  it('gives each pool its project, target and the settled money raised so far', async () => {
    const prisma = {
      wealthPool: { findMany: jest.fn(async () => [
        { poolId: 'P1', poolName: 'Gambang Pool', status: 'OPEN', project: { projectName: 'Kilang Baja', fundingRequired: '2400000.00' } },
        { poolId: 'P2', poolName: 'Durian Pool', status: 'FULL', project: { projectName: 'Ladang Durian', fundingRequired: '500000.00' } },
      ]) },
      investmentContribution: { groupBy: jest.fn(async () => [{ poolId: 'P1', _sum: { amount: '150000.00' } }]) },
    };
    const service = new PoolsService(prisma as never, {} as never, { can: () => true } as never);
    const pools = await service.list(admin);
    expect(pools).toEqual([
      { poolId: 'P1', poolName: 'Gambang Pool', status: 'OPEN', projectName: 'Kilang Baja', targetAmount: 2400000, raisedAmount: 150000 },
      { poolId: 'P2', poolName: 'Durian Pool', status: 'FULL', projectName: 'Ladang Durian', targetAmount: 500000, raisedAmount: 0 },
    ]);
    expect(prisma.investmentContribution.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { poolId: { in: ['P1', 'P2'] }, status: 'POSTED' } }));
  });
});
