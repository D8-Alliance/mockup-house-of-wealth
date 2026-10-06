import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { formatLocalDateTime } from '../tenancy/country-time';
import { assertTenantScope } from '../tenancy/tenant-scope';
import { AKAD_RULES, isPoolAkadType } from '../pools/akad-terms';
import { resolvePeriod, StatementPeriod } from './statement-period';

/** Staff who may read any project statement inside their tenant. */
const PROJECT_STATEMENT_STAFF = new Set(['Super Admin', 'Country Admin', 'Organization Admin', 'Finance Officer', 'Auditor', 'Compliance Officer', 'Pool Manager', 'Settlement Officer', 'Portfolio Manager']);

const DISCLAIMER = 'This statement is generated from the platform ledger and records. It is not a tax or zakat assessment. Returns are not guaranteed. Zakat and tax remain the responsibility of each investor; consult the state zakat authority and a tax adviser.';

const money = (value: unknown) => Math.round(Number(value || 0) * 100) / 100;
const akadLabel = (type: string | null | undefined) => (type && isPoolAkadType(type) ? AKAD_RULES[type].label : type || 'Not recorded');

export interface StatementSection {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  /** Shown under the table, e.g. "No records in this period." */
  note?: string;
}

export interface Statement {
  kind: 'INVESTOR' | 'PROJECT';
  title: string;
  reference: string;
  generatedAt: string;
  period: { from: string; to: string; timezone: string };
  subject: Array<[string, string]>;
  summary: Array<[string, string]>;
  sections: StatementSection[];
  notes: string[];
}

@Injectable()
export class StatementsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** The signed-in investor's own statement: orders, holdings and distributions. */
  async investorStatement(actor: AuthenticatedUser, input: { from?: string; to?: string }): Promise<Statement> {
    const period = resolvePeriod(input, actor.countryNodeId);
    const [orders, contributions, allocations] = await Promise.all([
      this.prisma.investmentOrder.findMany({ where: { investorUserId: actor.userId, createdAt: { gte: period.start, lt: period.end } }, include: { pool: { select: { poolName: true } }, akadTerms: true }, orderBy: { createdAt: 'asc' } }),
      // Holdings are everything settled up to the end of the period, not only within it.
      this.prisma.investmentContribution.findMany({ where: { investorUserId: actor.userId, status: 'POSTED', createdAt: { lt: period.end } }, include: { order: { include: { pool: { select: { poolName: true } }, akadTerms: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.distributionAllocation.findMany({ where: { beneficiaryUserId: actor.userId, createdAt: { gte: period.start, lt: period.end } }, include: { distribution: { select: { periodName: true, poolId: true, projectId: true, investorProfitSharePct: true, akadTerms: { select: { akadType: true } } } } }, orderBy: { createdAt: 'asc' } }),
    ]);
    const poolNames = new Map((await this.prisma.wealthPool.findMany({ where: { poolId: { in: [...new Set(allocations.map((item) => item.distribution.poolId).filter((id): id is string => Boolean(id)))] } }, select: { poolId: true, poolName: true } })).map((pool) => [pool.poolId, pool.poolName]));
    const when = (date: Date) => formatLocalDateTime(date, actor.countryNodeId);

    const holdings = new Map<string, { pool: string; akad: string; ratio: string; currency: string; amount: number }>();
    for (const item of contributions) {
      const key = `${item.poolId || item.projectId}:${item.currency}`;
      const terms = item.order?.akadTerms;
      const row = holdings.get(key) || { pool: item.order?.pool.poolName || item.poolId || item.projectId, akad: akadLabel(terms?.akadType), ratio: terms ? `${Number(terms.investorProfitSharePct)}%` : '-', currency: item.currency, amount: 0 };
      row.amount = money(row.amount + Number(item.amount));
      holdings.set(key, row);
    }
    const contributedInPeriod = contributions.filter((item) => item.createdAt >= period.start).reduce((sum, item) => sum + Number(item.amount), 0);
    const distributed = allocations.reduce((sum, item) => sum + Number(item.amount), 0);
    const paid = allocations.filter((item) => item.status === 'SETTLED').reduce((sum, item) => sum + Number(item.amount), 0);
    const ordersWithoutAkad = orders.filter((order) => !order.akadTermsId).length;
    const currencies = [...new Set([...contributions.map((item) => item.currency), ...allocations.map((item) => item.currency)])];

    const statement: Statement = {
      kind: 'INVESTOR',
      title: 'Investor Statement',
      reference: `HOW-STMT-INV-${actor.userId.replace(/[^A-Za-z0-9]/g, '').slice(-10).toUpperCase()}-${period.from.replace(/-/g, '')}-${period.to.replace(/-/g, '')}`,
      generatedAt: when(new Date()),
      period: { from: period.from, to: period.to, timezone: period.timezone },
      subject: [['Investor', actor.name || actor.userId], ['Email', actor.email || '-'], ['Investor ID', actor.userId]],
      summary: [
        ['Currency', currencies.join(', ') || '-'],
        ['Capital contributed in period', money(contributedInPeriod).toFixed(2)],
        ['Capital held at period end', money([...holdings.values()].reduce((sum, row) => sum + row.amount, 0)).toFixed(2)],
        ['Profit distributions in period', money(distributed).toFixed(2)],
        ['of which paid out', money(paid).toFixed(2)],
      ],
      sections: [
        { title: 'Holdings at period end', columns: ['Pool', 'Akad', 'Investor profit share', 'Currency', 'Capital'], rows: [...holdings.values()].map((row) => [row.pool, row.akad, row.ratio, row.currency, row.amount.toFixed(2)]), note: holdings.size ? undefined : 'No settled investments.' },
        { title: 'Investment orders in period', columns: ['Date', 'Order', 'Pool', 'Akad (version)', 'Akad accepted', 'Status', 'Currency', 'Amount'], rows: orders.map((order) => [when(order.createdAt), order.orderNumber, order.pool.poolName, order.akadTerms ? `${akadLabel(order.akadTerms.akadType)} (v${order.akadTerms.version})` : 'Not recorded', order.akadAcceptedAt ? when(order.akadAcceptedAt) : '-', order.status, order.currency, money(order.amount).toFixed(2)]), note: orders.length ? undefined : 'No orders in this period.' },
        { title: 'Profit distributions in period', columns: ['Date', 'Pool', 'Distribution period', 'Akad', 'Profit share', 'Status', 'Currency', 'Amount'], rows: allocations.map((item) => [when(item.createdAt), poolNames.get(item.distribution.poolId || '') || item.distribution.projectId, item.distribution.periodName, akadLabel(item.distribution.akadTerms?.akadType), item.distribution.investorProfitSharePct ? `${Number(item.distribution.investorProfitSharePct)}%` : '-', item.status, item.currency, money(item.amount).toFixed(2)]), note: allocations.length ? undefined : 'No distributions in this period.' },
      ],
      notes: [
        ...(ordersWithoutAkad ? [`${ordersWithoutAkad} order(s) were placed before akad acceptance was recorded; their terms are marked "Not recorded".`] : []),
        'Profit distributions are income from Shariah contracts (profit share), not interest. Their tax treatment depends on the pool\'s legal structure and your residency.',
        DISCLAIMER,
      ],
    };
    await this.audit.recordActor(actor, { action: 'statement.investor.generate', resourceType: 'User', resourceId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { from: period.from, to: period.to } });
    return statement;
  }

  /** A project's pools, akad terms and profit distributions. Investor identities are not shown. */
  async projectStatement(actor: AuthenticatedUser, projectId: string, input: { from?: string; to?: string }): Promise<Statement> {
    const project = await this.prisma.project.findUnique({ where: { projectId } });
    if (!project) throw new NotFoundException('Project not found.');
    await this.assertCanReadProject(actor, project);
    const period: StatementPeriod = resolvePeriod(input, project.countryNodeId);
    const [pools, distributions] = await Promise.all([
      this.prisma.wealthPool.findMany({ where: { projectId }, include: { akadTerms: { orderBy: { version: 'desc' }, take: 1 } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.distribution.findMany({ where: { projectId, createdAt: { gte: period.start, lt: period.end } }, include: { akadTerms: { select: { akadType: true, version: true } }, allocations: { select: { status: true } } }, orderBy: { createdAt: 'asc' } }),
    ]);
    const raised = await this.prisma.investmentContribution.groupBy({ by: ['poolId'], where: { projectId, status: 'POSTED', createdAt: { lt: period.end } }, _sum: { amount: true }, _count: { investorUserId: true } });
    const investors = await this.prisma.investmentContribution.groupBy({ by: ['poolId', 'investorUserId'], where: { projectId, status: 'POSTED', createdAt: { lt: period.end } } });
    const raisedByPool = new Map(raised.map((row) => [row.poolId, money(row._sum.amount)]));
    const investorsByPool = new Map<string | null, number>();
    investors.forEach((row) => investorsByPool.set(row.poolId, (investorsByPool.get(row.poolId) || 0) + 1));
    const when = (date: Date) => formatLocalDateTime(date, project.countryNodeId);
    const live = distributions.filter((item) => item.status !== 'CANCELLED' && item.status !== 'REJECTED');
    const sum = (pick: (item: (typeof distributions)[number]) => unknown) => money(live.reduce((total, item) => total + Number(pick(item) || 0), 0));

    const statement: Statement = {
      kind: 'PROJECT',
      title: 'Project Financial Statement',
      reference: `HOW-STMT-PRJ-${project.projectCode || project.projectId}-${period.from.replace(/-/g, '')}-${period.to.replace(/-/g, '')}`,
      generatedAt: when(new Date()),
      period: { from: period.from, to: period.to, timezone: period.timezone },
      subject: [['Project', project.projectName], ['Project code', project.projectCode || project.projectId], ['Sector', project.sector], ['Status', project.status]],
      summary: [
        ['Funding required', money(project.fundingRequired).toFixed(2)],
        ['Capital raised at period end', money([...raisedByPool.values()].reduce((total, value) => total + value, 0)).toFixed(2)],
        ['Gross revenue reported in period', sum((item) => item.grossRevenue).toFixed(2)],
        ['Eligible costs in period', sum((item) => item.eligibleCosts).toFixed(2)],
        ['Net profit in period', sum((item) => item.netProfit).toFixed(2)],
        ['Investor profit in period', sum((item) => item.investorProfit).toFixed(2)],
      ],
      sections: [
        { title: 'Pools and akad terms', columns: ['Pool', 'Status', 'Akad (version)', 'Investor profit share', 'Indicative return (not guaranteed)', 'Investors', 'Capital raised'], rows: pools.map((pool) => { const terms = pool.akadTerms[0]; return [pool.poolName, pool.status, terms ? `${akadLabel(terms.akadType)} (v${terms.version})` : `${pool.investmentStructure} (terms not recorded)`, terms ? `${Number(terms.investorProfitSharePct)}%` : '-', `${Number(pool.indicativeExpectedReturn)}% p.a.`, investorsByPool.get(pool.poolId) || 0, (raisedByPool.get(pool.poolId) || 0).toFixed(2)]; }), note: pools.length ? undefined : 'No pools for this project.' },
        { title: 'Profit distributions in period', columns: ['Date', 'Period', 'Status', 'Gross revenue', 'Eligible costs', 'Net profit', 'Investor share', 'Investor profit', 'Manager share', 'Payouts done'], rows: distributions.map((item) => { const net = money(item.netProfit); const investor = money(item.investorProfit); const done = item.allocations.filter((allocation) => allocation.status === 'SETTLED').length; return [when(item.createdAt), item.periodName, item.status, money(item.grossRevenue).toFixed(2), money(item.eligibleCosts).toFixed(2), net.toFixed(2), item.investorProfitSharePct ? `${Number(item.investorProfitSharePct)}%` : '-', investor.toFixed(2), money(net - investor).toFixed(2), `${done}/${item.allocations.length}`]; }), note: distributions.length ? undefined : 'No distributions in this period.' },
      ],
      notes: [
        'Totals exclude cancelled and rejected distributions. Manager share is net profit less investor profit.',
        'Losses, if any, are borne according to each pool\'s akad terms.',
        DISCLAIMER,
      ],
    };
    await this.audit.recordActor(actor, { action: 'statement.project.generate', resourceType: 'Project', resourceId: projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { from: period.from, to: period.to } });
    return statement;
  }

  private async assertCanReadProject(actor: AuthenticatedUser, project: { projectId: string; projectSponsorId: string; organisationId: string; countryNodeId: string }) {
    if (PROJECT_STATEMENT_STAFF.has(actor.role)) {
      assertTenantScope(actor, project, 'Project');
      return;
    }
    if (project.projectSponsorId === actor.userId) return;
    // Investors may read the statement of a project they hold capital in.
    if (await this.prisma.investmentContribution.findFirst({ where: { projectId: project.projectId, investorUserId: actor.userId, status: 'POSTED' }, select: { id: true } })) return;
    throw new ForbiddenException('You do not have access to this project statement.');
  }
}
