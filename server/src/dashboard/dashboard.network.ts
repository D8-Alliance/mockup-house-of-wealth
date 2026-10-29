import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/identity.service';

/** Per-country figures for the network overview; money stays in each country's own currency. */
export interface CountryNetworkRow {
  code: string;
  name: string;
  status: string;
  currency: string;
  organisations: number;
  users: number;
  projects: number;
  projectValue: number;
  pools: number;
  settled: number;
}

export interface NetworkOverview {
  source: 'database';
  countries: CountryNetworkRow[];
  totals: { activeCountries: number; countries: number; users: number; organisations: number; projects: number; pools: number };
  waiting: { settlements: number; trancheRequests: number; assetsToVerify: number; kybToReview: number };
}

const sum = (value: unknown) => Number(value ?? 0);

/** Super Admin sees every country; a Country Admin sees only theirs. */
export async function networkOverview(prisma: PrismaService, actor: AuthenticatedUser): Promise<NetworkOverview> {
  const only = actor.role === 'Super Admin' ? {} : { countryNodeId: actor.countryNodeId };
  const nodes = await prisma.countryNode.findMany({
    where: actor.role === 'Super Admin' ? {} : { code: actor.countryNodeId },
    select: { code: true, name: true, status: true, currency: true },
    orderBy: { name: 'asc' },
  });
  const [organisations, roles, projects, pools, settled, userCount, settlements, trancheRequests, assetsToVerify, kybToReview] = await Promise.all([
    prisma.organisation.groupBy({ by: ['countryNodeId'], where: only, _count: { _all: true } }),
    // A person with several roles in one country counts once there.
    prisma.userRoleAssignment.findMany({ where: { ...only, isActive: true }, select: { userId: true, countryNodeId: true }, distinct: ['userId', 'countryNodeId'] }),
    prisma.project.groupBy({ by: ['countryNodeId'], where: { ...only, status: { not: 'DRAFT' } }, _count: { _all: true }, _sum: { totalProjectCost: true } }),
    prisma.wealthPool.groupBy({ by: ['countryNodeId'], where: only, _count: { _all: true } }),
    prisma.investmentOrder.groupBy({ by: ['countryNodeId'], where: { ...only, status: 'SETTLED' }, _sum: { amount: true } }),
    prisma.userRoleAssignment.findMany({ where: { ...only, isActive: true }, select: { userId: true }, distinct: ['userId'] }).then((rows) => rows.length),
    prisma.investmentOrder.count({ where: { ...only, status: 'PENDING' } }),
    prisma.fundingRequest.count({ where: { ...only, status: { in: ['PENDING', 'APPROVED'] } } }),
    prisma.asset.count({ where: { ...only, status: 'SUBMITTED' } }),
    prisma.organisation.count({ where: { ...only, kybStatus: 'SUBMITTED' } }),
  ]);

  const byCountry = <T extends { countryNodeId: string }>(rows: T[], code: string) => rows.find((row) => row.countryNodeId === code);
  const countries = nodes.map((node): CountryNetworkRow => ({
    code: node.code,
    name: node.name,
    status: node.status,
    currency: node.currency,
    organisations: byCountry(organisations, node.code)?._count._all ?? 0,
    users: roles.filter((role) => role.countryNodeId === node.code).length,
    projects: byCountry(projects, node.code)?._count._all ?? 0,
    projectValue: sum(byCountry(projects, node.code)?._sum.totalProjectCost),
    pools: byCountry(pools, node.code)?._count._all ?? 0,
    settled: sum(byCountry(settled, node.code)?._sum.amount),
  }));

  return {
    source: 'database',
    countries,
    totals: {
      activeCountries: nodes.filter((node) => node.status === 'ACTIVE').length,
      countries: nodes.length,
      users: userCount,
      organisations: countries.reduce((total, row) => total + row.organisations, 0),
      projects: countries.reduce((total, row) => total + row.projects, 0),
      pools: countries.reduce((total, row) => total + row.pools, 0),
    },
    waiting: { settlements, trancheRequests, assetsToVerify, kybToReview },
  };
}
