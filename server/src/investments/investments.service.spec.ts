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
    await expect(service.settle(actor('Settlement Officer', 'USR-OFFICER'), 'ORD-1')).rejects.toThrow(/your own investment order/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lets settlement staff settle another investor\'s order', async () => {
    // Passes the role and ownership guards, then stops at the pool check in this test.
    await expect(service.settle(actor('Settlement Officer', 'USR-OFFICER'), 'ORD-1')).rejects.toThrow(/Only OPEN pools/);
  });
});

describe('InvestmentsService.createOrder: who may invest', () => {
  const input = { poolId: 'POOL-1', amount: 1000, currency: 'MYR', idempotencyKey: 'KEY-1', akadTermsId: 'TERMS-1', acceptAkad: true };
  const pool = { poolId: 'POOL-1', projectId: 'P1', status: 'OPEN', currency: 'MYR', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', project: { projectId: 'P1', fundingRequired: 100000, projectSponsorId: 'USR-SPONSOR' } };
  const prisma = {
    wealthPool: { findUnique: jest.fn(async () => pool) },
    investmentOrder: { findUnique: jest.fn(async () => null) },
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
