import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { computeZakat } from './zakat-rules';
import { ZakatService } from './zakat.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../membership/toyyibpay.service', () => ({ ToyyibPayService: class {} }));
jest.mock('../financial/financial-ledger.service', () => ({ FinancialLedgerService: class {}, toyyibPayCashAccount: jest.fn() }));

describe('computeZakat', () => {
  it('applies 2.5% on a Hijri year and 2.577% on a Gregorian year once nisab is met', () => {
    const lines = [{ category: 'SAVINGS' as const, label: 'Savings', amount: 50_000, haulMet: true, source: 'USER' as const }];
    expect(computeZakat({ lines, debts: 0, nisab: 38_748, yearBasis: 'HIJRI' })).toMatchObject({ netZakatable: 50_000, meetsNisab: true, zakatDue: 1_250 });
    expect(computeZakat({ lines, debts: 0, nisab: 38_748, yearBasis: 'GREGORIAN' }).zakatDue).toBe(1_288.5);
  });

  it('excludes holdings without a full haul but assesses income when received', () => {
    const result = computeZakat({ lines: [
      { category: 'SAVINGS', label: 'New savings', amount: 30_000, haulMet: false, source: 'USER' },
      { category: 'INVESTMENT_INCOME', label: 'Profit received', amount: 45_000, source: 'PLATFORM' },
    ], debts: 0, nisab: 38_748, yearBasis: 'HIJRI' });
    expect(result.lines.map((line) => line.included)).toEqual([false, true]);
    expect(result).toMatchObject({ grossZakatable: 45_000, zakatDue: 1_125 });
  });

  it('owes nothing below nisab, after deducting debts', () => {
    const result = computeZakat({ lines: [{ category: 'BUSINESS', label: 'Stock', amount: 40_000, haulMet: true, source: 'USER' }], debts: 5_000, nisab: 38_748, yearBasis: 'HIJRI' });
    expect(result).toMatchObject({ netZakatable: 35_000, meetsNisab: false, zakatDue: 0 });
  });
});

const investor: AuthenticatedUser = { userId: 'USR-1', idpSubjectId: 'USR-1', email: 'u@example.test', name: 'U', role: 'Retail Investor', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Retail Investor'] };
const selangor = { code: 'MY-SGR', name: 'Lembaga Zakat Selangor (LZS)', website: 'https://www.zakatselangor.com.my', countryNodeId: 'CN-MYS', isActive: true };

function setup(options: { nisab?: number | null; profit?: number; heldCapital?: number; recentCapital?: number } = {}) {
  const saved: Array<Record<string, unknown>> = [];
  const prisma = {
    zakatAuthority: { findUnique: jest.fn(async () => selangor) },
    zakatNisabRate: { findFirst: jest.fn(async () => (options.nisab === null ? null : { id: 'nisab-1', amount: options.nisab ?? 38_748, source: 'LZS Jul-Dec 2026' })) },
    distributionAllocation: { aggregate: jest.fn(async () => ({ _sum: { amount: options.profit ?? 0 } })) },
    investmentContribution: { aggregate: jest.fn(async ({ where }: { where: { createdAt: { lt?: Date; gte?: Date } } }) => ({ _sum: { amount: where.createdAt.gte ? options.recentCapital ?? 0 : options.heldCapital ?? 0 } })) },
    zakatCalculation: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { saved.push(data); return { id: 'CALC-1', createdAt: new Date(), ...data }; }),
      findFirst: jest.fn(async () => ({ id: 'CALC-1', zakatDue: 100, currency: 'MYR', authorityCode: 'MY-SGR' })),
    },
  };
  const service = new ZakatService(prisma as never, { recordActor: jest.fn() } as never, {} as never, {} as never);
  return { service, saved, prisma };
}

describe('ZakatService.calculate', () => {
  it('uses the nisab recorded for the authority and date, and names its source', async () => {
    const { service } = setup();
    const result = await service.calculate(investor, { authorityCode: 'MY-SGR', asOfDate: '2026-10-06', yearBasis: 'HIJRI', items: [{ category: 'SAVINGS', label: 'Bank', amount: 40_000, haulMet: true }] });
    expect(result).toMatchObject({ nisabThreshold: 38_748, nisabSource: 'LZS Jul-Dec 2026', zakatDue: 1_000, payment: { mode: 'AUTHORITY_PORTAL', url: 'https://www.zakatselangor.com.my' } });
  });

  it('refuses to guess a nisab when none is recorded, unless the user enters one', async () => {
    const { service } = setup({ nisab: null });
    const input = { authorityCode: 'MY-SGR', asOfDate: '2026-10-06', yearBasis: 'HIJRI' as const, items: [] };
    await expect(service.calculate(investor, input)).rejects.toBeInstanceOf(BadRequestException);
    const result = await service.calculate(investor, { ...input, nisabOverride: 40_000 });
    expect(result.nisabSource).toMatch(/Entered by the user/);
  });

  it('counts platform investments by the chosen method', async () => {
    const mustaghallat = await setup({ profit: 45_000, heldCapital: 500_000 }).service.calculate(investor, { authorityCode: 'MY-SGR', asOfDate: '2026-10-06', yearBasis: 'GREGORIAN', items: [], platformInvestments: 'MUSTAGHALLAT' });
    expect(mustaghallat.netWealth).toBe(45_000);
    const capital = await setup({ profit: 45_000, heldCapital: 500_000, recentCapital: 20_000 }).service.calculate(investor, { authorityCode: 'MY-SGR', asOfDate: '2026-10-06', yearBasis: 'GREGORIAN', items: [], platformInvestments: 'CAPITAL' });
    // Capital invested within the last year has no haul yet and is left out.
    expect(capital.netWealth).toBe(545_000);
  });
});

describe('ZakatService.createPaymentBill', () => {
  const original = process.env.ZAKAT_COLLECTION_APPOINTMENT_REF;
  afterEach(() => { if (original === undefined) delete process.env.ZAKAT_COLLECTION_APPOINTMENT_REF; else process.env.ZAKAT_COLLECTION_APPOINTMENT_REF = original; });

  it('does not collect zakat unless the platform is an appointed collector', async () => {
    delete process.env.ZAKAT_COLLECTION_APPOINTMENT_REF;
    const { service } = setup();
    await expect(service.createPaymentBill(investor, 'CALC-1')).rejects.toThrow(ForbiddenException);
    await expect(service.createPaymentBill(investor, 'CALC-1')).rejects.toThrow(/zakatselangor\.com\.my/);
  });
});
