import { ConflictException } from '@nestjs/common';
import { buildAkadTermsText, hashTerms, validateProfitShare } from './akad-terms';
import { PoolsService } from './pools.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../policy/policy.service', () => ({ PolicyService: class {} }));
jest.mock('../projects/project-lock', () => ({ FUNDABLE_PROJECT_STATUSES: [], hasCurrentFinalApproval: jest.fn() }));

const manager: AuthenticatedUser = { userId: 'USR-PM', idpSubjectId: 'USR-PM', email: 'pm@example.test', name: 'PM', role: 'Pool Manager', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Pool Manager'] };
const base = { version: 1, poolName: 'Solar Pool', projectName: 'Solar Farm', currency: 'MYR', indicativeExpectedReturn: 8 };

describe('akad rules', () => {
  it('requires both sides of a Mudarabah or Musharakah to share in profit', () => {
    expect(validateProfitShare('MUDARABAH', 70)).toBeNull();
    expect(validateProfitShare('MUDARABAH', 100)).toMatch(/between 1% and 99%/);
    expect(validateProfitShare('MUSHARAKAH', 0)).toMatch(/between 1% and 99%/);
    expect(validateProfitShare('WAKALAH', 100)).toBeNull();
    expect(validateProfitShare('IJARAH', 85.555)).toMatch(/two decimal places/);
  });

  it('states the ratio, the loss rule and that returns are not guaranteed', () => {
    const text = buildAkadTermsText({ ...base, akadType: 'MUDARABAH', investorProfitSharePct: 70 });
    expect(text).toContain('70% to investors and 30% to the manager (mudarib)');
    expect(text).toContain('Capital losses are borne by investors');
    expect(text).toContain('Returns are not guaranteed');
    expect(text).toContain('version 1');
  });

  it('gives a different hash when any term changes', () => {
    const one = hashTerms(buildAkadTermsText({ ...base, akadType: 'MUSHARAKAH', investorProfitSharePct: 60 }));
    expect(one).toBe(hashTerms(buildAkadTermsText({ ...base, akadType: 'MUSHARAKAH', investorProfitSharePct: 60 })));
    expect(one).not.toBe(hashTerms(buildAkadTermsText({ ...base, akadType: 'MUSHARAKAH', investorProfitSharePct: 61 })));
  });
});

describe('PoolsService.setAkadTerms', () => {
  function setup(acceptedOrders: number) {
    const created: unknown[] = [];
    const tx = {
      $queryRaw: jest.fn(async () => []),
      poolAkadTerms: {
        findFirst: jest.fn(async () => ({ id: 'TERMS-1', version: 1 })),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return { id: 'TERMS-2', ...data }; }),
      },
      investmentOrder: { count: jest.fn(async () => acceptedOrders) },
      wealthPool: { update: jest.fn(async () => ({})) },
    };
    const prisma = {
      wealthPool: { findUnique: jest.fn(async () => ({ poolId: 'POOL-1', poolName: 'Solar Pool', status: 'OPEN', currency: 'MYR', indicativeExpectedReturn: 8, organisationId: 'ORG-A', countryNodeId: 'CN-MYS', project: { projectName: 'Solar Farm' } })) },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    const service = new PoolsService(prisma as never, { recordActor: jest.fn() } as never, {} as never);
    return { service, created };
  }

  it('publishes the next version while no investor has accepted the current one', async () => {
    const { service, created } = setup(0);
    await service.setAkadTerms('POOL-1', { akadType: 'MUDARABAH', investorProfitSharePct: 75 }, manager);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ poolId: 'POOL-1', version: 2, akadType: 'MUDARABAH' });
  });

  it('refuses to change terms an investor has already accepted', async () => {
    const { service, created } = setup(1);
    await expect(service.setAkadTerms('POOL-1', { akadType: 'MUDARABAH', investorProfitSharePct: 60 }, manager)).rejects.toBeInstanceOf(ConflictException);
    expect(created).toHaveLength(0);
  });
});

describe('PoolsService.create', () => {
  const lock = jest.requireMock('../projects/project-lock') as { FUNDABLE_PROJECT_STATUSES: string[]; hasCurrentFinalApproval: jest.Mock };
  const dto = { projectId: 'P1', poolName: 'Solar Pool', currency: 'MYR', indicativeExpectedReturn: 8, organisationId: 'ORG-A', countryNodeId: 'CN-MYS', akadType: 'MUSHARAKAH' as const, investorProfitSharePct: 60 };

  function setup() {
    lock.FUNDABLE_PROJECT_STATUSES.splice(0, lock.FUNDABLE_PROJECT_STATUSES.length, 'APPROVED');
    lock.hasCurrentFinalApproval.mockResolvedValue(true);
    const terms: Array<Record<string, unknown>> = [];
    const tx = {
      wealthPool: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ poolId: 'POOL-NEW', ...data })) },
      poolAkadTerms: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { terms.push(data); return { id: 'TERMS-1', ...data }; }) },
    };
    const prisma = {
      organisation: { findFirst: jest.fn(async () => ({ id: 'ORG-A' })) },
      project: { findUnique: jest.fn(async () => ({ projectId: 'P1', projectName: 'Solar Farm', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', status: 'APPROVED' })) },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    return { service: new PoolsService(prisma as never, { recordActor: jest.fn() } as never, {} as never), terms, tx };
  }

  it('creates the pool with version 1 of its akad terms', async () => {
    const { service, terms, tx } = setup();
    const pool = await service.create(dto, { ...manager, role: 'Super Admin' });
    expect(pool).toMatchObject({ poolId: 'POOL-NEW', akadTerms: { version: 1, akadType: 'MUSHARAKAH' } });
    expect(String(terms[0].termsText)).toContain('60% to investors and 40% to the managing partner');
    expect(tx.wealthPool.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ investmentStructure: 'Musharakah' }) }));
  });

  it('rejects a ratio the akad does not allow before touching the database', async () => {
    const { service, tx } = setup();
    await expect(service.create({ ...dto, investorProfitSharePct: 100 }, { ...manager, role: 'Super Admin' })).rejects.toThrow(/between 1% and 99%/);
    expect(tx.wealthPool.create).not.toHaveBeenCalled();
  });
});
