import { toCsv } from '../ai/citation-audit';
import { PrismaService } from '../prisma.service';

/** Exports Compliance and regulators ask for, built from the platform's own records. */
export const GOVERNANCE_REPORTS = [
  { key: 'investor-register', label: 'Investor register', description: 'Confirmed investment per investor and pool.' },
  { key: 'kyc-register', label: 'KYC register', description: 'Every identity verification, its status and level.' },
  { key: 'related-party', label: 'Related-party investments', description: 'Orders from entities in the same group as the project organisation.' },
  { key: 'distributions', label: 'Profit distributions', description: 'Each distribution, its amount and status.' },
  { key: 'payouts', label: 'Payouts', description: 'Each payout to an investor bank account and its status.' },
] as const;
export type GovernanceReportKey = (typeof GOVERNANCE_REPORTS)[number]['key'];

const day = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 10) : '');

/** The CSV for one report, limited to a country unless `country` is null (Super Admin). */
export async function buildReport(prisma: PrismaService, key: GovernanceReportKey, country: string | null): Promise<string> {
  const scope = country ? { countryNodeId: country } : {};
  const names = async (ids: string[]) => new Map((await prisma.user.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true, email: true } })).map((user) => [user.id, user]));

  if (key === 'investor-register' || key === 'related-party') {
    const orders = await prisma.investmentOrder.findMany({
      where: { ...scope, ...(key === 'related-party' ? { relatedParty: true, status: { in: ['PENDING', 'SETTLED'] } } : { status: 'SETTLED' }) },
      orderBy: { createdAt: 'asc' }, take: 20000,
      include: { pool: { select: { poolName: true } } },
    });
    const people = await names(orders.map((order) => order.investorUserId));
    if (key === 'related-party') {
      return toCsv(['Order', 'Placed', 'Status', 'Pool', 'Investor', 'Email', 'Amount', 'Currency', 'Country'], orders.map((order) => [order.orderNumber, day(order.createdAt), order.status, order.pool.poolName, people.get(order.investorUserId)?.name, people.get(order.investorUserId)?.email, Number(order.amount).toFixed(2), order.currency, order.countryNodeId]));
    }
    const rows = new Map<string, { investor: string; pool: string; currency: string; country: string; amount: number; orders: number; first: Date; last: Date; related: boolean }>();
    for (const order of orders) {
      const id = `${order.investorUserId}|${order.poolId}|${order.currency}`;
      const at = order.settledAt ?? order.createdAt;
      const row = rows.get(id) ?? { investor: order.investorUserId, pool: order.pool.poolName, currency: order.currency, country: order.countryNodeId, amount: 0, orders: 0, first: at, last: at, related: false };
      row.amount += Number(order.amount);
      row.orders += 1;
      if (at < row.first) row.first = at;
      if (at > row.last) row.last = at;
      row.related = row.related || order.relatedParty;
      rows.set(id, row);
    }
    return toCsv(['Investor', 'Email', 'Pool', 'Amount confirmed', 'Currency', 'Orders', 'First confirmed', 'Last confirmed', 'Related party', 'Country'], [...rows.values()].map((row) => [people.get(row.investor)?.name, people.get(row.investor)?.email, row.pool, row.amount.toFixed(2), row.currency, row.orders, day(row.first), day(row.last), row.related ? 'Yes' : 'No', row.country]));
  }

  if (key === 'kyc-register') {
    const applications = await prisma.kycApplication.findMany({ where: scope, orderBy: { createdAt: 'asc' }, take: 20000, select: { id: true, userId: true, fullName: true, status: true, kycLevel: true, submittedAt: true, reviewedAt: true, countryNodeId: true } });
    const people = await names(applications.map((application) => application.userId));
    return toCsv(['Application', 'Applicant', 'Email', 'Status', 'KYC level', 'Submitted', 'Decided', 'Country'], applications.map((application) => [application.id, application.fullName || people.get(application.userId)?.name, people.get(application.userId)?.email, application.status, application.kycLevel, day(application.submittedAt), day(application.reviewedAt), application.countryNodeId]));
  }

  if (key === 'distributions') {
    const distributions = await prisma.distribution.findMany({ where: scope, orderBy: { createdAt: 'asc' }, take: 20000, select: { id: true, poolId: true, totalAmount: true, netProfit: true, currency: true, status: true, createdAt: true, countryNodeId: true } });
    const pools = new Map((await prisma.wealthPool.findMany({ where: { poolId: { in: distributions.map((row) => row.poolId).filter((id): id is string => !!id) } }, select: { poolId: true, poolName: true } })).map((pool) => [pool.poolId, pool.poolName]));
    return toCsv(['Distribution', 'Created', 'Pool', 'Amount distributed', 'Net profit', 'Currency', 'Status', 'Country'], distributions.map((row) => [row.id, day(row.createdAt), row.poolId ? pools.get(row.poolId) ?? row.poolId : '', Number(row.totalAmount).toFixed(2), row.netProfit === null ? '' : Number(row.netProfit).toFixed(2), row.currency, row.status, row.countryNodeId]));
  }

  const payouts = await prisma.payoutInstruction.findMany({ where: country ? { allocation: { distribution: { countryNodeId: country } } } : {}, orderBy: { submittedAt: 'asc' }, take: 20000, select: { id: true, beneficiaryUserId: true, provider: true, providerReference: true, amount: true, currency: true, status: true, submittedAt: true, failureReason: true } });
  const people = await names(payouts.map((payout) => payout.beneficiaryUserId));
  return toCsv(['Payout', 'Beneficiary', 'Amount', 'Currency', 'Status', 'Rail', 'Provider reference', 'Submitted', 'Failure'], payouts.map((payout) => [payout.id, people.get(payout.beneficiaryUserId)?.name, Number(payout.amount).toFixed(2), payout.currency, payout.status, payout.provider, payout.providerReference, day(payout.submittedAt), payout.failureReason]));
}
