import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/roles.decorator';
import { PrismaService } from '../prisma.service';

/** Pools investors can see or have seen: not drafts waiting for sign-off. */
const LISTED_POOL_STATUSES = ['OPEN', 'PAUSED', 'FULL', 'CLOSED'];

/**
 * The public Member States and About pages: each country node with live counts from the database, so visitors
 * see the real network rather than examples. Counts only; no names or amounts of any organisation or person.
 */
@Controller('public')
export class PublicNetworkController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('network')
  @Public()
  async network() {
    const [nodes, organisations, projects, pools, users] = await Promise.all([
      this.prisma.countryNode.findMany({ where: { status: 'ACTIVE' }, select: { code: true, name: true, currency: true, regulatoryProfile: true, status: true, flagUrl: true }, orderBy: { name: 'asc' } }),
      // Each individual has a personal organisation (ORG-<country>-IND-...); only real organisations are counted.
      this.prisma.organisation.groupBy({ by: ['countryNodeId'], where: { status: 'ACTIVE', NOT: { id: { contains: '-IND-' } } }, _count: { _all: true } }),
      this.prisma.project.groupBy({ by: ['countryNodeId'], where: { archivedAt: null }, _count: { _all: true } }),
      this.prisma.wealthPool.groupBy({ by: ['countryNodeId'], where: { status: { in: LISTED_POOL_STATUSES } }, _count: { _all: true } }),
      this.prisma.userRoleAssignment.findMany({ where: { isActive: true }, distinct: ['userId', 'countryNodeId'], select: { countryNodeId: true } }),
    ]);
    const count = (rows: Array<{ countryNodeId: string; _count: Record<string, number> }>, code: string) => Object.values(rows.find((row) => row.countryNodeId === code)?._count ?? {})[0] ?? 0;
    return nodes.map((node) => ({
      countryNodeId: node.code, countryName: node.name, currency: node.currency, regulatoryProfile: node.regulatoryProfile, status: node.status, flagUrl: node.flagUrl,
      activeOrganisationsCount: count(organisations, node.code), activeProjectsCount: count(projects, node.code), activePoolsCount: count(pools, node.code), activeUsersCount: users.filter((row) => row.countryNodeId === node.code).length,
    }));
  }

  /**
   * The landing page's preview: the newest pools open for investment, with what the public may see (project,
   * sector, akad, indicative return, target and money raised). Investing still needs sign-in and approved KYC.
   */
  @Get('open-pools')
  @Public()
  async openPools() {
    const pools = await this.prisma.wealthPool.findMany({
      where: { status: 'OPEN', countryNode: { status: 'ACTIVE' }, project: { archivedAt: null, suspendedAt: null } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { poolId: true, poolName: true, currency: true, investmentStructure: true, indicativeExpectedReturn: true, closesAt: true, countryNode: { select: { name: true } }, project: { select: { projectName: true, sector: true, fundingRequired: true } } },
    });
    const raised = pools.length ? await this.prisma.investmentContribution.groupBy({ by: ['poolId'], where: { poolId: { in: pools.map((pool) => pool.poolId) }, status: 'POSTED' }, _sum: { amount: true } }) : [];
    return pools.map((pool) => ({
      poolId: pool.poolId, poolName: pool.poolName, projectName: pool.project.projectName, sector: pool.project.sector, akad: pool.investmentStructure,
      indicativeExpectedReturn: Number(pool.indicativeExpectedReturn), currency: pool.currency, country: pool.countryNode.name,
      target: Number(pool.project.fundingRequired), raised: Number(raised.find((row) => row.poolId === pool.poolId)?._sum.amount ?? 0), closesAt: pool.closesAt,
    }));
  }
}
