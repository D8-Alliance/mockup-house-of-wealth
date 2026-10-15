import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { formatLocalDateTime } from '../tenancy/country-time';
import { assertTenantScope } from '../tenancy/tenant-scope';
import { AKAD_RULES, isPoolAkadType } from '../pools/akad-terms';
import { resolvePeriod, StatementPeriod } from './statement-period';
import { maskTaxId, TaxProfileService } from '../tax/tax-profile.service';

/** How a distribution's income is labelled for tax, from the pool's akad. */
export function incomeTypeOf(akadType: string | null | undefined) {
  if (akadType === 'IJARAH') return 'Rental income share (Ijarah)';
  if (akadType && isPoolAkadType(akadType)) return `Profit share (${AKAD_RULES[akadType].label})`;
  return 'Unclassified (pool without akad terms)';
}

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
  kind: 'INVESTOR' | 'PROJECT' | 'INVESTOR_TAX';
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
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly taxProfiles: TaxProfileService) {}

  /**
   * Annual income statement for the investor's tax return: profit distributions actually paid
   * out in the calendar year, grouped by income type, and capital invested (not income). It
   * reports facts; it does not compute tax, and the platform has withheld none.
   */
  async investorTaxStatement(actor: AuthenticatedUser, input: { year?: string }): Promise<Statement> {
    const year = input.year || resolvePeriod({}, actor.countryNodeId).to.slice(0, 4);
    if (!/^\d{4}$/.test(year) || Number(year) < 2000 || Number(year) > 2100) throw new BadRequestException('year must be a four-digit year.');
    const period = resolvePeriod({ from: `${year}-01-01`, to: `${year}-12-31` }, actor.countryNodeId);
    const [profile, allocations, contributions] = await Promise.all([
      this.taxProfiles.get(actor.userId),
      this.prisma.distributionAllocation.findMany({ where: { beneficiaryUserId: actor.userId, status: 'SETTLED', payoutInstruction: { settledAt: { gte: period.start, lt: period.end } } }, include: { payoutInstruction: { select: { settledAt: true } }, distribution: { select: { periodName: true, poolId: true, projectId: true, akadTerms: { select: { akadType: true } } } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.investmentContribution.findMany({ where: { investorUserId: actor.userId, status: 'POSTED', createdAt: { gte: period.start, lt: period.end } }, include: { order: { include: { pool: { select: { poolName: true } }, akadTerms: { select: { akadType: true } } } } }, orderBy: { createdAt: 'asc' } }),
    ]);
    const poolNames = new Map((await this.prisma.wealthPool.findMany({ where: { poolId: { in: [...new Set(allocations.map((item) => item.distribution.poolId).filter((id): id is string => Boolean(id)))] } }, select: { poolId: true, poolName: true } })).map((pool) => [pool.poolId, pool.poolName]));
    const when = (date: Date) => formatLocalDateTime(date, actor.countryNodeId);
    const byType = new Map<string, { currency: string; gross: number }>();
    for (const item of allocations) {
      const key = `${incomeTypeOf(item.distribution.akadTerms?.akadType)}|${item.currency}`;
      const row = byType.get(key) || { currency: item.currency, gross: 0 };
      row.gross = money(row.gross + Number(item.amount));
      byType.set(key, row);
    }
    const totalIncome = money(allocations.reduce((sum, item) => sum + Number(item.amount), 0));
    const statement: Statement = {
      kind: 'INVESTOR_TAX',
      title: `Annual Investment Income Statement ${year}`,
      reference: `HOW-STMT-TAX-${actor.userId.replace(/[^A-Za-z0-9]/g, '').slice(-10).toUpperCase()}-${year}`,
      generatedAt: when(new Date()),
      period: { from: period.from, to: period.to, timezone: period.timezone },
      subject: [
        ['Investor', actor.name || actor.userId],
        ['Investor ID', actor.userId],
        ['Tax residence (declared)', profile ? `${profile.residenceCountry}${profile.malaysianTaxResident ? ', Malaysian tax resident' : ', not a Malaysian tax resident'}` : 'Not provided'],
        ['Entity type', profile?.entityType ?? 'Not provided'],
        ['Tax identification number', maskTaxId(profile?.taxIdNumber) ?? 'Not provided'],
      ],
      summary: [
        ['Investment income paid out in the year', totalIncome.toFixed(2)],
        ['Tax withheld by the platform', '0.00'],
        ['Capital invested in the year (not income)', money(contributions.reduce((sum, item) => sum + Number(item.amount), 0)).toFixed(2)],
      ],
      sections: [
        { title: 'Income by type', columns: ['Income type', 'Currency', 'Gross amount', 'Tax withheld', 'Net received'], rows: [...byType.entries()].map(([key, row]) => [key.split('|')[0], row.currency, row.gross.toFixed(2), '0.00', row.gross.toFixed(2)]), note: byType.size ? undefined : 'No investment income was paid out in this year.' },
        { title: 'Income received', columns: ['Date paid', 'Pool', 'Distribution period', 'Income type', 'Currency', 'Gross', 'Tax withheld', 'Net'], rows: allocations.map((item) => [item.payoutInstruction?.settledAt ? when(item.payoutInstruction.settledAt) : '-', poolNames.get(item.distribution.poolId || '') || item.distribution.projectId, item.distribution.periodName, incomeTypeOf(item.distribution.akadTerms?.akadType), item.currency, money(item.amount).toFixed(2), '0.00', money(item.amount).toFixed(2)]) },
        { title: 'Capital invested in the year (not income)', columns: ['Date', 'Pool', 'Akad', 'Currency', 'Amount'], rows: contributions.map((item) => [when(item.createdAt), item.order?.pool.poolName || item.poolId || item.projectId, akadLabel(item.order?.akadTerms?.akadType), item.currency, money(item.amount).toFixed(2)]), note: contributions.length ? undefined : 'No capital invested in this year.' },
      ],
      notes: [
        'Income is counted when it was paid out to you (payout settled), in your country\'s time zone.',
        'The platform has not withheld tax. How this income is taxed (for example as profit from a financing arrangement or as dividends) depends on the legal structure of each pool and on your residency; non-residents may be subject to withholding tax. Confirm with a tax adviser.',
        'Tax incentives for equity crowdfunding apply only to investments made through an offering registered with the Securities Commission Malaysia.',
        'Zakat paid to a state zakat authority can be claimed as a tax rebate (individuals) with the authority\'s official receipt; the platform does not collect zakat.',
        DISCLAIMER,
      ],
    };
    await this.audit.recordActor(actor, { action: 'statement.tax.generate', resourceType: 'User', resourceId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { year } });
    return statement;
  }

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
        ['Net result in period (profit less losses)', sum((item) => item.netProfit).toFixed(2)],
        ['Investor profit in period', sum((item) => item.investorProfit).toFixed(2)],
      ],
      sections: [
        { title: 'Pools and akad terms', columns: ['Pool', 'Status', 'Akad (version)', 'Investor profit share', 'Indicative return (not guaranteed)', 'Investors', 'Capital raised'], rows: pools.map((pool) => { const terms = pool.akadTerms[0]; return [pool.poolName, pool.status, terms ? `${akadLabel(terms.akadType)} (v${terms.version})` : `${pool.investmentStructure} (terms not recorded)`, terms ? `${Number(terms.investorProfitSharePct)}%` : '-', `${Number(pool.indicativeExpectedReturn)}% p.a.`, investorsByPool.get(pool.poolId) || 0, (raisedByPool.get(pool.poolId) || 0).toFixed(2)]; }), note: pools.length ? undefined : 'No pools for this project.' },
        { title: 'Period results and distributions', columns: ['Date', 'Period', 'Type', 'Status', 'Gross revenue', 'Eligible costs', 'Net result', 'Loss offset', 'Investor share', 'Investor profit', 'Manager share', 'Payouts done'], rows: distributions.map((item) => { const investor = money(item.investorProfit); const shared = item.distributableNet === null ? money(item.netProfit) : money(item.distributableNet); const done = item.allocations.filter((allocation) => allocation.status === 'SETTLED').length; return [when(item.createdAt), item.periodName, item.kind, item.status, money(item.grossRevenue).toFixed(2), money(item.eligibleCosts).toFixed(2), money(item.netProfit).toFixed(2), item.lossOffset === null ? '-' : money(item.lossOffset).toFixed(2), item.investorProfitSharePct ? `${Number(item.investorProfitSharePct)}%` : '-', investor.toFixed(2), item.kind === 'PROFIT' ? money(shared - investor).toFixed(2) : '-', item.kind === 'PROFIT' ? `${done}/${item.allocations.length}` : 'No payout']; }), note: distributions.length ? undefined : 'No period results in this period.' },
      ],
      notes: [
        'Totals exclude cancelled and rejected results. Earlier losses are recovered from later profit before anything is shared (loss offset); manager share is the shared profit less investor profit.',
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
