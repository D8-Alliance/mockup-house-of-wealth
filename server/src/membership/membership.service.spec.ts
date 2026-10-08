import { MembershipService } from './membership.service';
import { AI_CREDIT_EXEMPT_ROLES } from './ai-credit-exemption';
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

describe('AI credit exemption', () => {
  const pricing = { operationKey: 'DUE_DILIGENCE', featureType: 'DUE_DILIGENCE', operationName: 'Due Diligence', creditsRequired: 30, enabled: true };
  const setup = () => {
    const usage = { create: jest.fn().mockResolvedValue({ id: 'USE-1' }) };
    const prisma = {
      aiCapabilityPricing: { findUnique: jest.fn().mockResolvedValue(pricing) },
      aiUsageTransaction: usage,
      aiCreditWallet: { findUnique: jest.fn(), update: jest.fn() },
      membershipSubscription: { findUnique: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({ aiUsageTransaction: usage })),
    };
    const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
    const service = new MembershipService(prisma as unknown as PrismaService, audit as unknown as AuditService, {} as ToyyibPayService, {} as FinancialLedgerService);
    return { prisma, audit, service };
  };

  it.each(['Super Admin', 'Country Admin', 'Organization Admin', 'AI Administrator', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee', 'AI Model Reviewer', 'Compliance Officer', 'KYC Officer', 'KYB Officer', 'AML Officer', 'Risk Officer', 'Fraud Analyst', 'Legal Officer', 'Auditor', 'Customer Support'] as const)('does not charge or plan-limit a %s, but records and audits the use', async (role) => {
    const { prisma, audit, service } = setup();

    const result = await service.consumeCredits({ ...actor, role, assignedRoles: [role] }, 'DUE_DILIGENCE', 'PROJ-1');

    expect(result).toEqual(expect.objectContaining({ cost: 0, exempt: true, listPrice: 30 }));
    expect(prisma.aiCreditWallet.update).not.toHaveBeenCalled();
    expect(prisma.membershipSubscription.findUnique).not.toHaveBeenCalled();
    expect(prisma.aiUsageTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ creditsConsumed: 0, status: 'EXEMPT', projectId: 'PROJ-1' }) });
    expect(audit.recordActor).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'ai.credits.exempt', metadata: expect.objectContaining({ exemptRole: role, listPrice: 30 }) }));
  });

  it('still checks the plan and balance for an investor', async () => {
    const { prisma, service } = setup();
    // An investor has no wallet stub here, so reaching the wallet lookup proves the exemption was not applied.
    await expect(service.consumeCredits({ ...actor, role: 'Retail Investor', assignedRoles: ['Retail Investor'] }, 'DUE_DILIGENCE')).rejects.toThrow();
    expect(prisma.membershipSubscription.findUnique).toHaveBeenCalled();
    expect(prisma.aiUsageTransaction.create).not.toHaveBeenCalled();
  });
});

describe('AI credit exempt role list', () => {
  it('covers every administrator, the whole Governance & Risk category and Customer Support, and no investor or other operations role', () => {
    expect(AI_CREDIT_EXEMPT_ROLES.size).toBe(20);
    for (const role of ['Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office', 'Project Sponsor', 'Pool Manager', 'Finance Officer', 'Settlement Officer', 'Guest'] as const) expect(AI_CREDIT_EXEMPT_ROLES.has(role)).toBe(false);
  });
});
