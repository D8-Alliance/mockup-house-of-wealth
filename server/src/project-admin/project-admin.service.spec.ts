import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { ProjectAdminService } from './project-admin.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const admin = (role: AuthenticatedUser['role'], countryNodeId = 'CN-MYS'): AuthenticatedUser => ({ userId: 'USR-ADM', idpSubjectId: 'x', email: 'a@x', name: 'Admin', role, countryNodeId, organisationId: 'ORG-WPM', assignedRoles: [role] });
const project = (overrides: Record<string, unknown> = {}) => ({ projectId: 'PRJ-1', projectName: 'Temerloh Biochar', status: 'APPROVED', organisationId: 'ORG-SP', countryNodeId: 'CN-MYS', projectSponsorId: 'USR-SP', archivedAt: null, suspendedAt: null, suspendedPoolIds: null, ...overrides });

describe('ProjectAdminService', () => {
  const tx = {
    investmentOrder: { updateMany: jest.fn() },
    wealthPool: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    project: { update: jest.fn() },
    projectLifecycleEvent: { create: jest.fn() },
  };
  const prisma = {
    project: { findUnique: jest.fn() },
    investmentContribution: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([{ investorUserId: 'USR-INV' }]) },
    investmentOrder: { findMany: jest.fn().mockResolvedValue([]) },
    wealthPool: { findMany: jest.fn().mockResolvedValue([{ poolId: 'POOL-1' }]) },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const audit = { recordActor: jest.fn() };
  const notifications = { notifyUsers: jest.fn().mockResolvedValue(undefined) };
  const service = new ProjectAdminService(prisma as unknown as PrismaService, audit as unknown as AuditService, notifications as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.investmentContribution.count.mockResolvedValue(0);
    prisma.investmentOrder.findMany.mockResolvedValue([]);
  });

  it("keeps a Country Admin to their own country's projects", async () => {
    prisma.project.findUnique.mockResolvedValueOnce(project({ countryNodeId: 'CN-IDN' }));
    await expect(service.archive(admin('Country Admin'), 'PRJ-1', 'Duplicate of PRJ-2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('archives a project without settled money: unpaid orders cancelled, pools closed, investors told not to transfer', async () => {
    prisma.project.findUnique.mockResolvedValueOnce(project());
    prisma.investmentOrder.findMany.mockResolvedValueOnce([{ id: 'O1', orderNumber: 'HOW-INV-1', investorUserId: 'USR-INV', amount: new Prisma.Decimal(5000), currency: 'MYR' }]);
    const result = await service.archive(admin('Super Admin'), 'PRJ-1', 'Test data');
    expect(result.cancelledOrders).toBe(1);
    expect(tx.investmentOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: 'PRJ-1', status: 'PENDING' }, data: expect.objectContaining({ status: 'CANCELLED' }) }));
    expect(tx.wealthPool.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'CLOSED' } }));
    expect(tx.project.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ archivedReason: 'Test data', archivedBy: 'USR-ADM' }) }));
    expect(notifications.notifyUsers).toHaveBeenCalledWith(['USR-INV'], expect.objectContaining({ message: expect.stringContaining('Do not transfer money') }));
  });

  it('refuses to archive a project that holds settled investor money', async () => {
    prisma.project.findUnique.mockResolvedValueOnce(project());
    prisma.investmentContribution.count.mockResolvedValueOnce(2);
    await expect(service.archive(admin('Super Admin'), 'PRJ-1', 'Problem')).rejects.toThrow(/Suspend it instead/);
  });

  it('suspends: open pools paused and remembered, unpaid orders kept, investors and sponsor told', async () => {
    prisma.project.findUnique.mockResolvedValueOnce(project());
    prisma.investmentOrder.findMany.mockResolvedValueOnce([{ investorUserId: 'USR-PENDING' }]);
    await service.suspend(admin('Country Admin'), 'PRJ-1', 'Sponsor under investigation');
    expect(tx.wealthPool.updateMany).toHaveBeenCalledWith({ where: { poolId: { in: ['POOL-1'] }, status: 'OPEN' }, data: { status: 'PAUSED' } });
    expect(tx.project.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ suspendedPoolIds: ['POOL-1'] }) }));
    expect(tx.investmentOrder.updateMany).not.toHaveBeenCalled();
    const titles = notifications.notifyUsers.mock.calls.map(([users, message]) => [users, message.title]);
    expect(titles).toEqual([[['USR-INV'], 'Project suspended'], [['USR-PENDING'], 'Do not transfer for now'], [['USR-SP'], 'Project suspended']]);
  });

  it('resumes only the pools the suspension paused', async () => {
    prisma.project.findUnique.mockResolvedValueOnce(project({ suspendedAt: new Date(), suspendedPoolIds: ['POOL-1'] }));
    const result = await service.resume(admin('Super Admin'), 'PRJ-1', 'Investigation closed');
    expect(tx.wealthPool.updateMany).toHaveBeenCalledWith({ where: { poolId: { in: ['POOL-1'] }, status: 'PAUSED' }, data: { status: 'OPEN' } });
    expect(result.reopenedPools).toBe(1);
  });

  it('refuses suspending twice, an archived project, or resuming one not suspended', async () => {
    prisma.project.findUnique.mockResolvedValueOnce(project({ suspendedAt: new Date() }));
    await expect(service.suspend(admin('Super Admin'), 'PRJ-1', 'Again please')).rejects.toBeInstanceOf(ConflictException);
    prisma.project.findUnique.mockResolvedValueOnce(project({ archivedAt: new Date() }));
    await expect(service.suspend(admin('Super Admin'), 'PRJ-1', 'Archived one')).rejects.toBeInstanceOf(BadRequestException);
    prisma.project.findUnique.mockResolvedValueOnce(project());
    await expect(service.resume(admin('Super Admin'), 'PRJ-1', 'Not suspended')).rejects.toBeInstanceOf(ConflictException);
  });
});
