import { ForbiddenException } from '@nestjs/common';
import { InvestmentsService } from './investments.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { FinancialLedgerService } from '../financial/financial-ledger.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../financial/financial-ledger.service', () => ({ FinancialLedgerService: class {} }));

const actor = (role: AuthenticatedUser['role'], userId: string): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: [role] });
const order = { id: 'ORD-1', status: 'PENDING', poolId: 'POOL-1', investorUserId: 'USR-INVESTOR', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', currency: 'MYR' };

describe('InvestmentsService.settle', () => {
  const prisma = {
    investmentOrder: { findUnique: jest.fn().mockResolvedValue(order) },
    wealthPool: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
  };
  const service = new InvestmentsService(prisma as unknown as PrismaService, {} as FinancialLedgerService, {} as AuditService);

  beforeEach(() => jest.clearAllMocks());

  it('does not let an investor settle (confirm payment of) their own order', async () => {
    await expect(service.settle(actor('Retail Investor', 'USR-INVESTOR'), 'ORD-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not let settlement staff settle their own order', async () => {
    prisma.investmentOrder.findUnique.mockResolvedValueOnce({ ...order, investorUserId: 'USR-OFFICER' });
    await expect(service.settle(actor('Settlement Officer', 'USR-OFFICER'), 'ORD-1', 'BANK-REF-1')).rejects.toThrow(/your own investment order/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lets settlement staff settle another investor\'s order', async () => {
    // Passes the role and ownership guards, then stops at the pool check in this test.
    await expect(service.settle(actor('Settlement Officer', 'USR-OFFICER'), 'ORD-1', 'BANK-REF-1')).rejects.toThrow(/Only OPEN pools/);
  });

  it('needs the bank reference of the transfer', async () => {
    await expect(service.settle(actor('Settlement Officer', 'USR-OFFICER'), 'ORD-1', ' ')).rejects.toThrow(/bank reference/);
  });

  it('lets Finance settle an order of any organisation in its own country, and no other country', async () => {
    const finance = { ...actor('Finance Officer', 'USR-FINANCE'), organisationId: 'ORG-PLATFORM' };
    await expect(service.settle(finance, 'ORD-1', 'BANK-REF-1')).rejects.toThrow(/Only OPEN pools/);
    prisma.investmentOrder.findUnique.mockResolvedValueOnce({ ...order, countryNodeId: 'CN-IDN' });
    await expect(service.settle(finance, 'ORD-1', 'BANK-REF-1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('InvestmentsService.createOrder: who may invest', () => {
  const input = { poolId: 'POOL-1', amount: 1000, currency: 'MYR', idempotencyKey: 'KEY-1', akadTermsId: 'TERMS-1', acceptAkad: true };
  const pool = { poolId: 'POOL-1', projectId: 'P1', status: 'OPEN', currency: 'MYR', organisationId: 'ORG-PDP', countryNodeId: 'CN-MYS', project: { projectId: 'P1', fundingRequired: 100000, projectSponsorId: 'USR-SPONSOR' } };
  const prisma = {
    wealthPool: { findUnique: jest.fn(async (): Promise<Record<string, unknown>> => pool) },
    investmentOrder: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    kycApplication: { findFirst: jest.fn(async (): Promise<{ id: string } | null> => ({ id: 'KYC-1' })) },
    organisation: { findMany: jest.fn(async (): Promise<Array<{ id: string; groupName: string | null }>> => []) },
    $transaction: jest.fn(async () => { throw new Error('reached the order transaction'); }),
  };
  const service = new InvestmentsService(prisma as unknown as PrismaService, {} as FinancialLedgerService, {} as AuditService);

  beforeEach(() => jest.clearAllMocks());

  it('refuses roles that are not investors, such as a delivery partner or an admin', async () => {
    await expect(service.createOrder(actor('Project Sponsor', 'USR-OTHER'), input)).rejects.toThrow('Only investor accounts');
    await expect(service.createOrder(actor('Country Admin', 'USR-ADMIN'), input)).rejects.toThrow('Only investor accounts');
    expect(prisma.wealthPool.findUnique).not.toHaveBeenCalled();
  });

  it('refuses the project sponsor, and anyone holding a delivery-partner role, even with an investor role', async () => {
    await expect(service.createOrder(actor('Retail Investor', 'USR-SPONSOR'), input)).rejects.toThrow('delivery partner for this project');
    const dualRole = { ...actor('Institutional Investor', 'USR-DUAL'), assignedRoles: ['Institutional Investor', 'Project Manager'] } as AuthenticatedUser;
    await expect(service.createOrder(dualRole, input)).rejects.toThrow('delivery partner for this project');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lets an ordinary investor through to the order itself', async () => {
    await expect(service.createOrder(actor('Retail Investor', 'USR-INVESTOR'), input)).rejects.toThrow('reached the order transaction');
  });
});

describe('InvestmentsService.createOrder: separate entities, KYC and own orders', () => {
  const input = { poolId: 'POOL-1', amount: 1000, currency: 'MYR', idempotencyKey: 'KEY-2', akadTermsId: 'TERMS-1', acceptAkad: true };
  const openPool = { poolId: 'POOL-1', projectId: 'P1', status: 'OPEN', currency: 'MYR', organisationId: 'ORG-PDP', countryNodeId: 'CN-MYS', project: { projectId: 'P1', fundingRequired: 100000, projectSponsorId: 'USR-SPONSOR' } };
  const prisma = {
    wealthPool: { findUnique: jest.fn(async (): Promise<Record<string, unknown>> => openPool) },
    investmentOrder: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    kycApplication: { findFirst: jest.fn(async (): Promise<{ id: string } | null> => ({ id: 'KYC-1' })) },
    organisation: { findMany: jest.fn(async (): Promise<Array<{ id: string; groupName: string | null }>> => []) },
    $transaction: jest.fn(async () => { throw new Error('reached the order transaction'); }),
  };
  const service = new InvestmentsService(prisma as unknown as PrismaService, {} as FinancialLedgerService, {} as AuditService);
  const investor = (overrides: Partial<AuthenticatedUser> = {}) => ({ ...actor('Retail Investor', 'USR-INVESTOR'), organisationId: 'ORG-INVESTOR', ...overrides }) as AuthenticatedUser;

  beforeEach(() => jest.clearAllMocks());

  it('lets an investor from another organisation in the same country invest in an OPEN pool', async () => {
    await expect(service.createOrder(investor(), input)).rejects.toThrow('reached the order transaction');
  });

  it('refuses the organisation that runs the project (the delivery-partner entity)', async () => {
    await expect(service.createOrder(investor({ organisationId: 'ORG-PDP' }), input)).rejects.toThrow('Your organisation runs this project');
  });

  it('refuses an investor whose KYC is not approved', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce(null);
    await expect(service.createOrder(investor(), input)).rejects.toThrow('Complete identity verification (KYC)');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps other countries, and pools that are not OPEN, out of reach', async () => {
    await expect(service.createOrder(investor({ countryNodeId: 'CN-IDN' }), input)).rejects.toThrow('outside your organisation and country scope');
    prisma.wealthPool.findUnique.mockResolvedValueOnce({ ...openPool, status: 'DRAFT' });
    await expect(service.createOrder(investor(), input)).rejects.toThrow('outside your organisation and country scope');
  });

  it('lists only their own orders to an investor', async () => {
    await service.listOrders(investor());
    expect(prisma.investmentOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { investorUserId: 'USR-INVESTOR' } }));
  });
});

describe('InvestmentsService.createOrder: investment limits by KYC level', () => {
  const input = { poolId: 'POOL-1', amount: 6000, currency: 'MYR', idempotencyKey: 'KEY-3', akadTermsId: 'TERMS-1', acceptAkad: true };
  const openPool = { poolId: 'POOL-1', projectId: 'P1', poolName: 'Solar Pool', status: 'OPEN', currency: 'MYR', organisationId: 'ORG-PDP', countryNodeId: 'CN-MYS', project: { projectId: 'P1', fundingRequired: 100000, projectSponsorId: 'USR-SPONSOR' } };
  const investor = { ...actor('Retail Investor', 'USR-INVESTOR'), organisationId: 'ORG-INVESTOR' } as AuthenticatedUser;

  function setup(alreadyInvested: number, groups: Array<{ id: string; groupName: string | null }> = []) {
    const tx = {
      $queryRaw: jest.fn(async () => []),
      poolAkadTerms: { findFirst: jest.fn(async () => ({ id: 'TERMS-1', version: 1, termsHash: 'h', akadType: 'MUDARABAH' })) },
      investmentOrder: {
        aggregate: jest.fn(async () => ({ _sum: { amount: alreadyInvested } })),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'ORD-NEW', ...data })),
      },
    };
    const prisma = {
      wealthPool: { findUnique: jest.fn(async () => openPool) },
      investmentOrder: { findUnique: jest.fn(async () => null) },
      kycApplication: { findFirst: jest.fn(async () => ({ id: 'KYC-1', kycLevel: 'LEVEL_1' })) },
      organisation: { findMany: jest.fn(async () => groups) },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    const service = new InvestmentsService(prisma as unknown as PrismaService, {} as FinancialLedgerService, { recordActor: jest.fn() } as unknown as AuditService);
    return { service, tx };
  }

  afterEach(() => { delete process.env.KYC_INVESTMENT_LIMITS; });

  it('places the order when no cap is configured', async () => {
    const { service, tx } = setup(50000);
    await expect(service.createOrder(investor, input)).resolves.toMatchObject({ id: 'ORD-NEW' });
    expect(tx.investmentOrder.aggregate).not.toHaveBeenCalled();
  });

  it('refuses an order that takes the investor over their level\'s cap, and allows one within it', async () => {
    process.env.KYC_INVESTMENT_LIMITS = '{"LEVEL_1":{"MYR":10000}}';
    const over = setup(5000);
    await expect(over.service.createOrder(investor, input)).rejects.toThrow(/KYC level allows up to RM 10,000/);
    expect(over.tx.investmentOrder.create).not.toHaveBeenCalled();
    const within = setup(4000);
    await expect(within.service.createOrder(investor, input)).resolves.toMatchObject({ id: 'ORD-NEW' });
  });
});

describe('InvestmentsService.createOrder: related parties', () => {
  const input = { poolId: 'POOL-1', amount: 1000, currency: 'MYR', idempotencyKey: 'KEY-4', akadTermsId: 'TERMS-1', acceptAkad: true };
  const openPool = { poolId: 'POOL-1', projectId: 'P1', poolName: 'Plantation Pool', status: 'OPEN', currency: 'MYR', organisationId: 'ORG-PLANTATION', countryNodeId: 'CN-MYS', project: { projectId: 'P1', fundingRequired: 100000, projectSponsorId: 'USR-SPONSOR' } };
  const investor = { ...actor('Institutional Investor', 'USR-VENTURES'), organisationId: 'ORG-VENTURES' } as AuthenticatedUser;

  function place(groups: Array<{ id: string; groupName: string | null }>) {
    const tx = {
      $queryRaw: jest.fn(async () => []),
      poolAkadTerms: { findFirst: jest.fn(async () => ({ id: 'TERMS-1', version: 1, termsHash: 'h', akadType: 'MUDARABAH' })) },
      investmentOrder: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'ORD-NEW', ...data })) },
    };
    const prisma = {
      wealthPool: { findUnique: jest.fn(async () => openPool) },
      investmentOrder: { findUnique: jest.fn(async () => null) },
      kycApplication: { findFirst: jest.fn(async () => ({ id: 'KYC-1', kycLevel: 'LEVEL_2' })) },
      organisation: { findMany: jest.fn(async () => groups) },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    const service = new InvestmentsService(prisma as unknown as PrismaService, {} as FinancialLedgerService, { recordActor: jest.fn() } as unknown as AuditService);
    return service.createOrder(investor, input);
  }

  it('flags an order from an entity of the same group as the project organisation', async () => {
    await expect(place([{ id: 'ORG-VENTURES', groupName: 'FELDA Group' }, { id: 'ORG-PLANTATION', groupName: 'Felda' }])).resolves.toMatchObject({ relatedParty: true });
  });

  it('does not flag an order from another group or without a group', async () => {
    await expect(place([{ id: 'ORG-VENTURES', groupName: 'Sime Darby' }, { id: 'ORG-PLANTATION', groupName: 'FELDA' }])).resolves.toMatchObject({ relatedParty: false });
    await expect(place([])).resolves.toMatchObject({ relatedParty: false });
  });
});
