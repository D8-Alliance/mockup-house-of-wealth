import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { formatAmount, NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma.service';

/** Pools still taking part in the project; an archived project's pools are closed. */
const LIVE_POOL_STATUSES = ['DRAFT', 'APPROVED', 'OPEN', 'PAUSED', 'FULL'];

/**
 * A problem project, handled by the Super Admin or the country's Country Admin, each step with a reason that
 * the sponsor and investors see and the audit log keeps:
 *
 * - Archive: a project with no settled investor money (a duplicate, a mistake, test data) leaves every list;
 *   unpaid orders are cancelled and its pools closed. Its records stay, and it can be restored.
 * - Suspend: a live project with investors is halted while the problem is looked into; its open pools are
 *   paused, so no new orders are taken. Unpaid orders are kept, since the money may already be on its way, and
 *   are settled once the project resumes, which reopens the pools the suspension paused.
 */
@Injectable()
export class ProjectAdminService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, @Optional() private readonly notifications?: NotificationService) {}

  /** Projects in the administrator's scope, archived ones included, with what is at stake in each. */
  async list(actor: AuthenticatedUser) {
    const projects = await this.prisma.project.findMany({
      where: actor.role === 'Super Admin' ? {} : { countryNodeId: actor.countryNodeId },
      orderBy: { createdAt: 'desc' }, take: 200,
      select: { projectId: true, projectCode: true, projectName: true, status: true, countryNodeId: true, createdAt: true, archivedAt: true, archivedReason: true, suspendedAt: true, suspendedReason: true, organisation: { select: { name: true } }, pools: { select: { poolId: true, poolName: true, status: true, currency: true } } },
    });
    const ids = projects.map((project) => project.projectId);
    const [settled, pending] = ids.length ? await Promise.all([
      this.prisma.investmentContribution.groupBy({ by: ['projectId', 'currency'], where: { projectId: { in: ids }, status: 'POSTED' }, _sum: { amount: true } }),
      this.prisma.investmentOrder.groupBy({ by: ['projectId'], where: { projectId: { in: ids }, status: 'PENDING' }, _count: { _all: true } }),
    ]) : [[], []];
    return projects.map(({ organisation, ...project }) => {
      const money = settled.filter((row) => row.projectId === project.projectId);
      return {
        ...project,
        organisationName: organisation.name,
        settled: money.map((row) => ({ currency: row.currency, amount: Number(row._sum.amount ?? 0) })),
        hasSettledMoney: money.some((row) => Number(row._sum.amount ?? 0) > 0),
        pendingOrders: pending.find((row) => row.projectId === project.projectId)?._count._all ?? 0,
      };
    });
  }

  async archive(actor: AuthenticatedUser, id: string, reason: string) {
    const project = await this.find(actor, id);
    if (project.archivedAt) throw new ConflictException('This project is already archived.');
    const settled = await this.prisma.investmentContribution.count({ where: { projectId: id, status: 'POSTED' } });
    if (settled) throw new ConflictException('Investors have settled money in this project, so it cannot be archived. Suspend it instead.');
    const pending = await this.prisma.investmentOrder.findMany({ where: { projectId: id, status: 'PENDING' }, select: { id: true, orderNumber: true, investorUserId: true, amount: true, currency: true } });
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.investmentOrder.updateMany({ where: { projectId: id, status: 'PENDING' }, data: { status: 'CANCELLED', cancelledAt: now } });
      await tx.wealthPool.updateMany({ where: { projectId: id, status: { in: LIVE_POOL_STATUSES } }, data: { status: 'CLOSED' } });
      await tx.project.update({ where: { projectId: id }, data: { archivedAt: now, archivedBy: actor.userId, archivedReason: reason, suspendedAt: null, suspendedBy: null, suspendedReason: null, suspendedPoolIds: Prisma.DbNull } });
      await this.lifecycle(tx, actor, project, `Archived by an administrator: ${reason}`);
      await this.audit.recordActor(actor, { action: 'project.archived', resourceType: 'Project', resourceId: id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { reason, cancelledOrders: pending.map((order) => order.orderNumber) } }, tx);
    });
    for (const order of pending) {
      await this.notify([order.investorUserId], `project-archived:${id}:${order.id}`, 'Investment order cancelled', `Your order ${order.orderNumber} for ${formatAmount(order.amount, order.currency)} was cancelled: ${project.projectName} was withdrawn (${reason}). Do not transfer money for it; if you already did, contact support for a refund.`, id);
    }
    await this.notify([project.projectSponsorId], `project-archived:${id}:sponsor`, 'Project withdrawn', `${project.projectName} was withdrawn by an administrator: ${reason}`, id);
    return { projectId: id, archivedAt: now.toISOString(), cancelledOrders: pending.length };
  }

  async restore(actor: AuthenticatedUser, id: string, reason: string) {
    const project = await this.find(actor, id);
    if (!project.archivedAt) throw new ConflictException('This project is not archived.');
    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { projectId: id }, data: { archivedAt: null, archivedBy: null, archivedReason: null } });
      await this.lifecycle(tx, actor, project, `Restored by an administrator: ${reason}. Its pools stay closed until reopened.`);
      await this.audit.recordActor(actor, { action: 'project.restored', resourceType: 'Project', resourceId: id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { reason } }, tx);
    });
    await this.notify([project.projectSponsorId], `project-restored:${id}:${Date.now()}`, 'Project restored', `${project.projectName} is back in the lists: ${reason}. Its pools stay closed until they are reopened.`, id);
    return { projectId: id, restored: true };
  }

  async suspend(actor: AuthenticatedUser, id: string, reason: string) {
    const project = await this.find(actor, id);
    if (project.archivedAt) throw new BadRequestException('An archived project cannot be suspended.');
    if (project.suspendedAt) throw new ConflictException('This project is already suspended.');
    const open = await this.prisma.wealthPool.findMany({ where: { projectId: id, status: 'OPEN' }, select: { poolId: true } });
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.wealthPool.updateMany({ where: { poolId: { in: open.map((pool) => pool.poolId) }, status: 'OPEN' }, data: { status: 'PAUSED' } });
      await tx.project.update({ where: { projectId: id }, data: { suspendedAt: now, suspendedBy: actor.userId, suspendedReason: reason, suspendedPoolIds: open.map((pool) => pool.poolId) } });
      await this.lifecycle(tx, actor, project, `Suspended by an administrator: ${reason}`);
      await this.audit.recordActor(actor, { action: 'project.suspended', resourceType: 'Project', resourceId: id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { reason, pausedPools: open.map((pool) => pool.poolId) } }, tx);
    });
    const [investors, pending] = await this.investors(id);
    const stamp = now.toISOString();
    await this.notify(investors, `project-suspended:${id}:${stamp}`, 'Project suspended', `${project.projectName} is suspended while an issue is looked into: ${reason}. No new investments are taken meanwhile; your investment is unchanged and you will be told when it resumes.`, id);
    await this.notify(pending, `project-suspended-pending:${id}:${stamp}`, 'Do not transfer for now', `${project.projectName} is suspended: ${reason}. Do not transfer money for your unpaid order until it resumes; an order you already paid is confirmed once it resumes.`, id);
    await this.notify([project.projectSponsorId], `project-suspended-sponsor:${id}:${stamp}`, 'Project suspended', `${project.projectName} was suspended by an administrator: ${reason}. Its open pools are paused.`, id);
    return { projectId: id, suspendedAt: stamp, pausedPools: open.length };
  }

  async resume(actor: AuthenticatedUser, id: string, reason: string) {
    const project = await this.find(actor, id);
    if (!project.suspendedAt) throw new ConflictException('This project is not suspended.');
    const paused = Array.isArray(project.suspendedPoolIds) ? (project.suspendedPoolIds as string[]) : [];
    const now = new Date();
    const reopened = await this.prisma.$transaction(async (tx) => {
      // Only the pools this suspension paused, and only if nobody changed them since.
      const result = await tx.wealthPool.updateMany({ where: { poolId: { in: paused }, status: 'PAUSED' }, data: { status: 'OPEN' } });
      await tx.project.update({ where: { projectId: id }, data: { suspendedAt: null, suspendedBy: null, suspendedReason: null, suspendedPoolIds: Prisma.DbNull } });
      await this.lifecycle(tx, actor, project, `Resumed by an administrator: ${reason}`);
      await this.audit.recordActor(actor, { action: 'project.resumed', resourceType: 'Project', resourceId: id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { reason, reopenedPools: result.count } }, tx);
      return result.count;
    });
    const [investors, pending] = await this.investors(id);
    await this.notify([...investors, ...pending, project.projectSponsorId], `project-resumed:${id}:${now.toISOString()}`, 'Project resumed', `${project.projectName} has resumed: ${reason}.`, id);
    return { projectId: id, resumed: true, reopenedPools: reopened };
  }

  private async find(actor: AuthenticatedUser, id: string) {
    const project = await this.prisma.project.findUnique({ where: { projectId: id }, select: { projectId: true, projectName: true, status: true, organisationId: true, countryNodeId: true, projectSponsorId: true, archivedAt: true, suspendedAt: true, suspendedPoolIds: true } });
    if (!project) throw new NotFoundException('Project not found.');
    if (actor.role !== 'Super Admin' && project.countryNodeId !== actor.countryNodeId) throw new ForbiddenException('This project is in another country.');
    return project;
  }

  /** Investors with settled money, and those with an unpaid order, each once. */
  private async investors(projectId: string): Promise<[string[], string[]]> {
    const [settled, pending] = await Promise.all([
      this.prisma.investmentContribution.findMany({ where: { projectId, status: 'POSTED' }, select: { investorUserId: true }, distinct: ['investorUserId'] }),
      this.prisma.investmentOrder.findMany({ where: { projectId, status: 'PENDING' }, select: { investorUserId: true }, distinct: ['investorUserId'] }),
    ]);
    return [settled.map((row) => row.investorUserId), pending.map((row) => row.investorUserId)];
  }

  private lifecycle(tx: Prisma.TransactionClient, actor: AuthenticatedUser, project: { projectId: string; organisationId: string; countryNodeId: string; status: string }, note: string) {
    return tx.projectLifecycleEvent.create({ data: { projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, fromStatus: project.status, toStatus: project.status, note, actorId: actor.userId } });
  }

  private async notify(userIds: string[], key: string, title: string, message: string, projectId: string) {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!this.notifications || !unique.length) return;
    await this.notifications.notifyUsers(unique, { type: 'PROJECT', title, message, resourceType: 'Project', resourceId: projectId, dedupeKey: key }).catch(() => undefined);
  }
}
