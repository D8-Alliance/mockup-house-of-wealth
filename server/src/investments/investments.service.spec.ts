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
