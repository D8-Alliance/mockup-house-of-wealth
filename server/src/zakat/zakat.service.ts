import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { ToyyibPayService } from '../membership/toyyibpay.service';
import { FinancialLedgerService, toyyibPayCashAccount } from '../financial/financial-ledger.service';
import { assertTenantScope } from '../tenancy/tenant-scope';
import { timezoneFor } from '../tenancy/country-time';
import { localMidnight, localToday } from '../statements/statement-period';
import { AddNisabRateDto, CalculateZakatDto } from './zakat.dto';
import { CATEGORY_LABELS, computeZakat, HAUL_DAYS, ZakatLineInput } from './zakat-rules';

/** Roles that may record an authority's published nisab. */
export const NISAB_EDITOR_ROLES = ['Super Admin', 'Country Admin', 'Shariah Advisor', 'Shariah Committee'];

const DISCLAIMER = 'This is an estimate to help you prepare. Your state zakat authority decides the zakat due; pay through its official channel to receive the official receipt, which is needed for the income tax rebate in Malaysia.';

const DAY_MS = 86_400_000;
const nextDate = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);

@Injectable()
export class ZakatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly toyyibPay: ToyyibPayService,
    private readonly ledger: FinancialLedgerService,
  ) {}

  authorities(actor: AuthenticatedUser) {
    return this.prisma.zakatAuthority.findMany({
      where: { isActive: true },
      orderBy: [{ countryNodeId: 'asc' }, { region: 'asc' }],
      include: { nisabRates: { orderBy: { effectiveFrom: 'desc' }, take: 4 } },
    }).then((rows) => rows.map((row) => ({ ...row, isHomeCountry: row.countryNodeId === actor.countryNodeId })));
  }

  async addNisabRate(actor: AuthenticatedUser, code: string, input: AddNisabRateDto) {
    if (!NISAB_EDITOR_ROLES.includes(actor.role)) throw new ForbiddenException('Only administrators or Shariah officers can record nisab values.');
    const authority = await this.prisma.zakatAuthority.findUnique({ where: { code } });
    if (!authority) throw new NotFoundException('Zakat authority not found.');
    if (actor.role !== 'Super Admin') assertTenantScope(actor, { countryNodeId: authority.countryNodeId, organisationId: actor.organisationId }, 'Zakat authority');
    if (input.effectiveFrom > input.effectiveTo) throw new BadRequestException('effectiveFrom must not be after effectiveTo.');
    const from = new Date(`${input.effectiveFrom}T00:00:00Z`);
    const to = new Date(`${input.effectiveTo}T00:00:00Z`);
    const overlap = await this.prisma.zakatNisabRate.findFirst({ where: { authorityCode: code, currency: input.currency.toUpperCase(), effectiveFrom: { lte: to }, effectiveTo: { gte: from } } });
    if (overlap) throw new BadRequestException(`A nisab is already recorded for ${overlap.effectiveFrom.toISOString().slice(0, 10)} to ${overlap.effectiveTo.toISOString().slice(0, 10)}.`);
    const rate = await this.prisma.zakatNisabRate.create({ data: { authorityCode: code, amount: new Prisma.Decimal(input.amount), currency: input.currency.toUpperCase(), effectiveFrom: from, effectiveTo: to, source: input.source.trim(), createdBy: actor.userId } });
    await this.audit.recordActor(actor, { action: 'zakat.nisab.record', resourceType: 'ZakatAuthority', resourceId: code, organisationId: actor.organisationId, countryNodeId: authority.countryNodeId, metadata: { rateId: rate.id, amount: input.amount, currency: rate.currency, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo, source: rate.source } });
    return rate;
  }

  async calculate(actor: AuthenticatedUser, input: CalculateZakatDto) {
    const authority = await this.prisma.zakatAuthority.findUnique({ where: { code: input.authorityCode } });
    if (!authority || !authority.isActive) throw new BadRequestException('Choose a zakat authority from the list.');
    const currency = (input.currency || 'MYR').toUpperCase();
    const asOfDate = input.asOfDate || localToday(timezoneFor(actor.countryNodeId), new Date());
    if (Number.isNaN(Date.parse(`${asOfDate}T00:00:00Z`)) || new Date(`${asOfDate}T00:00:00Z`).toISOString().slice(0, 10) !== asOfDate) throw new BadRequestException(`Invalid date "${asOfDate}".`);

    const asOf = new Date(`${asOfDate}T00:00:00Z`);
    const recorded = await this.prisma.zakatNisabRate.findFirst({ where: { authorityCode: authority.code, currency, effectiveFrom: { lte: asOf }, effectiveTo: { gte: asOf } }, orderBy: { effectiveFrom: 'desc' } });
    if (!recorded && input.nisabOverride === undefined) throw new BadRequestException(`No nisab is recorded for ${authority.name} on ${asOfDate}. Check the authority's website and enter the nisab, or ask an administrator to record it.`);
    const nisab = recorded ? Number(recorded.amount) : input.nisabOverride!;
    const nisabSource = recorded ? recorded.source : `Entered by the user for ${asOfDate} (no published value recorded)`;

    const lines: ZakatLineInput[] = input.items.map((item) => ({ category: item.category, label: item.label.trim() || CATEGORY_LABELS[item.category], amount: item.amount, haulMet: item.haulMet, source: 'USER' }));
    lines.push(...await this.platformLines(actor, input.platformInvestments || 'NONE', asOfDate, currency, input.yearBasis));
    const result = computeZakat({ lines, debts: input.debts || 0, nisab, yearBasis: input.yearBasis });

    const sumOf = (categories: string[]) => result.lines.filter((line) => line.included && categories.includes(line.category)).reduce((sum, line) => sum + line.amount, 0);
    const calculation = await this.prisma.zakatCalculation.create({
      data: {
        userId: actor.userId,
        currency,
        investedCapital: new Prisma.Decimal(sumOf(['INVESTMENT_CAPITAL'])),
        liquidCash: new Prisma.Decimal(sumOf(['SAVINGS'])),
        debtsOwed: new Prisma.Decimal(result.debts),
        nisabThreshold: new Prisma.Decimal(nisab),
        zakatRate: new Prisma.Decimal(result.rate),
        netWealth: new Prisma.Decimal(result.netZakatable),
        zakatDue: new Prisma.Decimal(result.zakatDue),
        authorityCode: authority.code,
        nisabRateId: recorded?.id ?? null,
        nisabSource,
        yearBasis: input.yearBasis,
        asOfDate: asOf,
        lines: result.lines as unknown as Prisma.InputJsonValue,
      },
    });
    await this.audit.recordActor(actor, { action: 'zakat.calculate', resourceType: 'ZakatCalculation', resourceId: calculation.id, countryNodeId: actor.countryNodeId, organisationId: actor.organisationId, metadata: { authorityCode: authority.code, yearBasis: input.yearBasis, currency, netZakatable: result.netZakatable, zakatDue: result.zakatDue, nisabRateId: recorded?.id ?? null, platformInvestments: input.platformInvestments || 'NONE' } });
    return this.toResponse(calculation, authority);
  }

  /**
   * The user's own platform investments as zakat lines. MUSTAGHALLAT: profit paid out in the
   * last haul. CAPITAL: capital held for a full haul (newer capital listed but excluded) plus
   * that profit.
   */
  private async platformLines(actor: AuthenticatedUser, method: 'NONE' | 'MUSTAGHALLAT' | 'CAPITAL', asOfDate: string, currency: string, yearBasis: 'HIJRI' | 'GREGORIAN'): Promise<ZakatLineInput[]> {
    if (method === 'NONE') return [];
    const end = localMidnight(nextDate(asOfDate), timezoneFor(actor.countryNodeId));
    const haulStart = new Date(end.getTime() - HAUL_DAYS[yearBasis] * DAY_MS);
    const profit = await this.prisma.distributionAllocation.aggregate({ _sum: { amount: true }, where: { beneficiaryUserId: actor.userId, currency, status: 'SETTLED', createdAt: { gte: haulStart, lt: end } } });
    const lines: ZakatLineInput[] = [{ category: 'INVESTMENT_INCOME', label: 'Platform profit distributions received in the last year', amount: Number(profit._sum.amount || 0), source: 'PLATFORM' }];
    if (method === 'CAPITAL') {
      const [held, recent] = await Promise.all([
        this.prisma.investmentContribution.aggregate({ _sum: { amount: true }, where: { investorUserId: actor.userId, currency, status: 'POSTED', createdAt: { lt: haulStart } } }),
        this.prisma.investmentContribution.aggregate({ _sum: { amount: true }, where: { investorUserId: actor.userId, currency, status: 'POSTED', createdAt: { gte: haulStart, lt: end } } }),
      ]);
      lines.push({ category: 'INVESTMENT_CAPITAL', label: 'Platform investment capital held for a full haul', amount: Number(held._sum.amount || 0), haulMet: true, source: 'PLATFORM' });
      lines.push({ category: 'INVESTMENT_CAPITAL', label: 'Platform investment capital invested within the last year', amount: Number(recent._sum.amount || 0), haulMet: false, source: 'PLATFORM' });
    }
    return lines;
  }

  async latest(actor: AuthenticatedUser) {
    const calculation = await this.prisma.zakatCalculation.findFirst({ where: { userId: actor.userId }, orderBy: { createdAt: 'desc' } });
    if (!calculation) return null;
    const authority = calculation.authorityCode ? await this.prisma.zakatAuthority.findUnique({ where: { code: calculation.authorityCode } }) : null;
    return this.toResponse(calculation, authority);
  }

  /**
   * Collecting zakat without being appointed by the State Islamic Religious Council is an
   * offence in Malaysia, and only the authority's receipt qualifies for the tax rebate. So
   * the platform does not collect zakat unless an appointment reference is configured.
   */
  async createPaymentBill(actor: AuthenticatedUser, calculationId: string) {
    const calculation = await this.prisma.zakatCalculation.findFirst({ where: { id: calculationId, userId: actor.userId } });
    if (!calculation) throw new NotFoundException('Zakat calculation not found.');
    const appointment = process.env.ZAKAT_COLLECTION_APPOINTMENT_REF?.trim();
    if (!appointment) {
      const authority = calculation.authorityCode ? await this.prisma.zakatAuthority.findUnique({ where: { code: calculation.authorityCode } }) : null;
      throw new ForbiddenException(`The platform is not an appointed zakat collector. Pay through ${authority ? `${authority.name} (${authority.website})` : 'your state zakat authority'}.`);
    }
    const amount = Number(calculation.zakatDue);
    if (amount <= 0) throw new BadRequestException('There is no zakat amount due for this calculation.');
    if (calculation.currency !== 'MYR') throw new BadRequestException('ToyyibPay zakat payment requires a MYR calculation.');
    const gateway = await this.ledger.ensureAccount(actor, toyyibPayCashAccount(actor.organisationId, actor.countryNodeId, 'MYR'));
    const zakatAccount = await this.ledger.ensureAccount(actor, { accountCode: `ORG-${actor.organisationId}-ZAKAT-PAYABLE-MYR`, accountType: 'LIABILITY', ownerType: 'ORGANISATION', ownerId: actor.organisationId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, currency: 'MYR' });
    return this.toyyibPay.createBill(actor, { productType: 'ZAKAT_PAYMENT', productId: calculation.id, description: `Zakat payment ${calculation.id}`, amountMYR: amount, metadata: { calculationId: calculation.id, amount, currency: 'MYR', gatewayAccountId: gateway.id, zakatAccountId: zakatAccount.id, collectionAppointmentRef: appointment } });
  }

  /** Zakat tools are opt-in: the platform does not record or infer anyone's religion. */
  async getPreference(actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.userId }, select: { profile: true } });
    return { enabled: Boolean((user?.profile as Record<string, unknown> | null)?.zakatEnabled) };
  }

  async setPreference(actor: AuthenticatedUser, enabled: boolean) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actor.userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: actor.userId }, select: { profile: true } });
      if (!user) throw new NotFoundException('User not found.');
      const profile = { ...((user.profile as Record<string, unknown> | null) || {}), zakatEnabled: enabled };
      await tx.user.update({ where: { id: actor.userId }, data: { profile: profile as Prisma.InputJsonValue } });
    });
    return { enabled };
  }

  private toResponse(calculation: Prisma.ZakatCalculationGetPayload<object>, authority: { code: string; name: string; website: string; countryNodeId: string } | null) {
    return {
      id: calculation.id,
      currency: calculation.currency,
      asOfDate: calculation.asOfDate ? calculation.asOfDate.toISOString().slice(0, 10) : null,
      yearBasis: calculation.yearBasis,
      authority: authority ? { code: authority.code, name: authority.name, website: authority.website } : null,
      nisabThreshold: Number(calculation.nisabThreshold),
      nisabSource: calculation.nisabSource,
      zakatRate: Number(calculation.zakatRate),
      lines: calculation.lines ?? [],
      debtsOwed: Number(calculation.debtsOwed),
      netWealth: Number(calculation.netWealth),
      zakatDue: Number(calculation.zakatDue),
      meetsNisab: Number(calculation.netWealth) >= Number(calculation.nisabThreshold),
      payment: { mode: process.env.ZAKAT_COLLECTION_APPOINTMENT_REF?.trim() ? 'APPOINTED_COLLECTOR' : 'AUTHORITY_PORTAL', url: authority?.website ?? null },
      taxNote: authority?.countryNodeId === 'CN-MYS' ? 'In Malaysia, zakat paid to the state authority gives an income tax rebate (individuals) with the official receipt.' : null,
      disclaimer: DISCLAIMER,
      createdAt: calculation.createdAt,
    };
  }
}
