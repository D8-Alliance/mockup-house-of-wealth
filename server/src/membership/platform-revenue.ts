import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/identity.service';

/** Zakat is collected on behalf of payers and passed on; it is not platform income. */
const NOT_REVENUE = ['ZAKAT_PAYMENT'];

/**
 * Platform income as recorded: paid payment transactions by product and by month, the latest transactions,
 * active memberships by tier, and project promotion campaigns. Super Admin sees every country;
 * a Country Admin sees their country's payments and campaigns (memberships carry no country, so none).
 */
export async function platformRevenue(prisma: PrismaService, actor: AuthenticatedUser) {
  const global = actor.role === 'Super Admin';
  const country = global ? {} : { countryNodeId: actor.countryNodeId };
  const since = new Date();
  since.setMonth(since.getMonth() - 11, 1);
  since.setHours(0, 0, 0, 0);

  const [byProduct, paidRecent, latest, tiers, campaigns] = await Promise.all([
    prisma.paymentTransaction.groupBy({ by: ['productType'], where: { ...country, status: 'PAID', productType: { notIn: NOT_REVENUE } }, _sum: { amountMYR: true }, _count: { _all: true } }),
    prisma.paymentTransaction.findMany({ where: { ...country, status: 'PAID', productType: { notIn: NOT_REVENUE }, paidAt: { gte: since } }, select: { amountMYR: true, paidAt: true } }),
    prisma.paymentTransaction.findMany({ where: { ...country, productType: { notIn: NOT_REVENUE } }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, productType: true, productId: true, amountMYR: true, currency: true, provider: true, status: true, createdAt: true, paidAt: true, organisationId: true, countryNodeId: true } }),
    global ? prisma.membershipSubscription.groupBy({ by: ['tier'], where: { status: 'Active' }, _count: { _all: true } }) : Promise.resolve([]),
    prisma.projectPromotionCampaign.findMany({ where: country, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, packageName: true, status: true, paymentStatus: true, paymentMethod: true, priceMYR: true, creditsCost: true, startDate: true, endDate: true, views: true, clicks: true, investorLeads: true, project: { select: { projectName: true } } } }),
  ]);

  const months = new Map<string, number>();
  for (let index = 0; index < 12; index += 1) {
    const month = new Date(since.getFullYear(), since.getMonth() + index, 1);
    months.set(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`, 0);
  }
  for (const payment of paidRecent) {
    if (!payment.paidAt) continue;
    const key = `${payment.paidAt.getFullYear()}-${String(payment.paidAt.getMonth() + 1).padStart(2, '0')}`;
    if (months.has(key)) months.set(key, (months.get(key) ?? 0) + Number(payment.amountMYR));
  }

  return {
    source: 'database',
    currency: 'MYR',
    byProduct: byProduct.map((row) => ({ productType: row.productType, amountMYR: Number(row._sum.amountMYR ?? 0), count: row._count._all })),
    totalMYR: byProduct.reduce((total, row) => total + Number(row._sum.amountMYR ?? 0), 0),
    byMonth: [...months.entries()].map(([month, amountMYR]) => ({ month, amountMYR })),
    latest: latest.map((row) => ({ ...row, amountMYR: Number(row.amountMYR) })),
    activeMemberships: tiers.map((row) => ({ tier: row.tier, count: row._count._all })),
    campaigns: campaigns.map(({ project, ...row }) => ({ ...row, projectName: project.projectName, priceMYR: Number(row.priceMYR) })),
  };
}
