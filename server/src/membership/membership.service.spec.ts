import { MembershipService } from './membership.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { ToyyibPayService } from './toyyibpay.service';
import { FinancialLedgerService } from '../financial/financial-ledger.service';

const actor: AuthenticatedUser = {
  userId: 'USR-ADMIN',
  idpSubjectId: 'SUB-ADMIN',
  email: 'admin@example.test',
  name: 'Admin',
  role: 'Organization Admin',
  countryNodeId: 'CN-MYS',
  organisationId: 'ORG-A',
  assignedRoles: ['Organization Admin'],
};

describe('MembershipService tenant analytics', () => {
  it('limits organization analytics to users assigned to that organization and country', async () => {
    const prisma = {
      userRoleAssignment: { findMany: jest.fn().mockResolvedValue([{ userId: 'USR-A' }]) },
      aiCreditTransaction: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new MembershipService(prisma as unknown as PrismaService, {} as AuditService, {} as ToyyibPayService, {} as FinancialLedgerService);

    await service.getAdminCreditAnalytics(actor);

    expect(prisma.userRoleAssignment.findMany).toHaveBeenCalledWith({
      where: { countryNodeId: 'CN-MYS', organisationId: 'ORG-A', isActive: true },
      select: { userId: true },
      distinct: ['userId'],
    });
    expect(prisma.aiCreditTransaction.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ['USR-A'] } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  });
});
