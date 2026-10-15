import { maskTaxId, TaxProfileService } from './tax-profile.service';
import { incomeTypeOf, StatementsService } from '../statements/statements.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const investor: AuthenticatedUser = { userId: 'USR-1', idpSubjectId: 'USR-1', email: 'u@example.test', name: 'Aminah', role: 'Retail Investor', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Retail Investor'] };

describe('tax profile', () => {
  it('masks the tax number except the last four characters', () => {
    expect(maskTaxId('IG 1234 5678 90')).toBe('********7890');
    expect(maskTaxId('123')).toBe('****');
    expect(maskTaxId(null)).toBeNull();
  });

  it('stores the profile, returns the number masked and keeps it out of the audit log', async () => {
    let stored: Record<string, unknown> = { zakatEnabled: true };
    const tx = {
      $queryRaw: jest.fn(async () => []),
      user: { findUnique: jest.fn(async () => ({ profile: stored })), update: jest.fn(async ({ data }: { data: { profile: Record<string, unknown> } }) => { stored = data.profile; return {}; }) },
    };
    const audit = { recordActor: jest.fn() };
    const service = new TaxProfileService({ $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as never, audit as never);
    const result = await service.set(investor, { residenceCountry: 'MY', malaysianTaxResident: true, entityType: 'INDIVIDUAL', taxIdNumber: 'IG12345678' });
    expect(result.taxIdNumber).toBe('******5678');
    expect(stored).toMatchObject({ zakatEnabled: true, tax: { residenceCountry: 'MY', taxIdNumber: 'IG12345678' } });
    expect(JSON.stringify(audit.recordActor.mock.calls)).not.toContain('IG12345678');

    // Saving again without the number keeps it; an empty string removes it.
    await service.set(investor, { residenceCountry: 'MY', malaysianTaxResident: false, entityType: 'INDIVIDUAL' });
    expect(stored).toMatchObject({ tax: { malaysianTaxResident: false, taxIdNumber: 'IG12345678' } });
    await service.set(investor, { residenceCountry: 'MY', malaysianTaxResident: false, entityType: 'INDIVIDUAL', taxIdNumber: '' });
    expect(stored).toMatchObject({ tax: { taxIdNumber: null } });
  });
});

describe('annual income statement', () => {
  it('labels income by the akad it came from', () => {
    expect(incomeTypeOf('MUDARABAH')).toBe('Profit share (Mudarabah)');
    expect(incomeTypeOf('IJARAH')).toBe('Rental income share (Ijarah)');
    expect(incomeTypeOf(null)).toBe('Unclassified (pool without akad terms)');
  });

  it('groups paid-out income by type and lists capital separately', async () => {
    const allocation = (amount: number, akadType: string | null) => ({ amount, currency: 'MYR', createdAt: new Date('2026-05-01T00:00:00Z'), payoutInstruction: { settledAt: new Date('2026-05-02T00:00:00Z') }, distribution: { periodName: '2026-Q1', poolId: 'POOL-1', projectId: 'P1', akadTerms: akadType ? { akadType } : null } });
    const prisma = {
      distributionAllocation: { findMany: jest.fn(async () => [allocation(300, 'MUDARABAH'), allocation(200, 'MUDARABAH'), allocation(100, 'IJARAH')]) },
      investmentContribution: { findMany: jest.fn(async () => [{ amount: 5000, currency: 'MYR', createdAt: new Date('2026-02-01T00:00:00Z'), poolId: 'POOL-1', projectId: 'P1', order: { pool: { poolName: 'Solar Pool' }, akadTerms: { akadType: 'MUDARABAH' } } }]) },
      wealthPool: { findMany: jest.fn(async () => [{ poolId: 'POOL-1', poolName: 'Solar Pool' }]) },
    };
    const taxProfiles = { get: jest.fn(async () => ({ residenceCountry: 'MY', malaysianTaxResident: true, entityType: 'INDIVIDUAL', taxIdNumber: 'IG12345678', updatedAt: '' })) };
    const service = new StatementsService(prisma as never, { recordActor: jest.fn() } as never, taxProfiles as never);
    const statement = await service.investorTaxStatement(investor, { year: '2026' });
    expect(statement.sections[0].rows).toEqual([['Profit share (Mudarabah)', 'MYR', '500.00', '0.00', '500.00'], ['Rental income share (Ijarah)', 'MYR', '100.00', '0.00', '100.00']]);
    expect(statement.summary).toEqual(expect.arrayContaining([['Investment income paid out in the year', '600.00'], ['Capital invested in the year (not income)', '5000.00']]));
    expect(statement.subject).toEqual(expect.arrayContaining([['Tax identification number', '******5678']]));
    expect(statement.period).toMatchObject({ from: '2026-01-01', to: '2026-12-31' });
  });
});
