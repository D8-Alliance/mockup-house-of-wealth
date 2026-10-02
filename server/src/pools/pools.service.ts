import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { CreatePoolDto } from './pools.controller';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';
import { FUNDABLE_PROJECT_STATUSES, hasCurrentFinalApproval } from '../projects/project-lock';

@Injectable()
export class PoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async list(user: AuthenticatedUser) {
    const where = tenantScopeFilter(user);
    if (user.role !== 'Super Admin' && !this.policy.can(user.role, 'pooling', 'read')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'pooling', 'read').reason);
    }
    return this.prisma.wealthPool.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async get(id: string, user: AuthenticatedUser) {
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: id }, include: { project: { select: { fundingRequired: true } } } });
    if (!pool) throw new NotFoundException('Pool not found');
    assertTenantScope(user, pool, 'Pool');
    const raised = await this.prisma.investmentContribution.aggregate({ _sum: { amount: true }, where: { poolId: id, status: 'POSTED' } });
    return { ...pool, raisedAmount: Number(raised._sum.amount || 0), targetAmount: Number(pool.project.fundingRequired) };
  }

  async transitionStatus(id: string, status: 'OPEN' | 'PAUSED' | 'FULL' | 'CLOSED', user: AuthenticatedUser, note?: string) {
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: id } });
    if (!pool) throw new NotFoundException('Pool not found');
    assertTenantScope(user, pool, 'Pool');
    const allowed: Record<string, string[]> = { OPEN: ['PAUSED', 'FULL', 'CLOSED'], PAUSED: ['OPEN', 'CLOSED'], FULL: ['CLOSED'], CLOSED: [] };
    if (!allowed[pool.status]?.includes(status)) throw new BadRequestException(`Pool cannot transition from ${pool.status} to ${status}`);
    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.wealthPool.updateMany({ where: { poolId: id, status: pool.status }, data: { status } });
      if (!claimed.count) throw new BadRequestException('Pool status changed concurrently.');
      const result = await tx.wealthPool.findUniqueOrThrow({ where: { poolId: id } });
      await this.audit.recordActor(user, { action: 'pool.status_change', resourceType: 'WealthPool', resourceId: id, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, metadata: { fromStatus: pool.status, toStatus: status, note: note || null } }, tx);
      return result;
    });
    return updated;
  }

  async create(dto: CreatePoolDto, user: AuthenticatedUser) {
    assertTenantScope(user, { countryNodeId: dto.countryNodeId, organisationId: dto.organisationId }, 'Target tenant');

    const [organisation, project] = await Promise.all([
      this.prisma.organisation.findFirst({
        where: { id: dto.organisationId, countryNodeId: dto.countryNodeId },
        select: { id: true },
      }),
      this.prisma.project.findUnique({
        where: { projectId: dto.projectId },
        select: { projectId: true, organisationId: true, countryNodeId: true, status: true },
      }),
    ]);
    if (!organisation) {
      throw new ForbiddenException('Organisation is outside the requested country node scope');
    }
    if (!project) throw new NotFoundException('Project not found');
    if (project.organisationId !== dto.organisationId || project.countryNodeId !== dto.countryNodeId) {
      throw new ForbiddenException('Project is outside the requested tenant scope');
    }
    if (!FUNDABLE_PROJECT_STATUSES.includes(project.status) || !(await hasCurrentFinalApproval(this.prisma, project))) throw new BadRequestException('Pooling requires an approved current feasibility revision and project status.');

    const pool = await this.prisma.$transaction(async (tx) => {
      const created = await tx.wealthPool.create({
        data: {
          poolName: dto.poolName,
          currency: dto.currency,
          investmentStructure: dto.investmentStructure,
          indicativeExpectedReturn: dto.indicativeExpectedReturn,
          status: 'OPEN',
          projectId: dto.projectId,
          organisationId: dto.organisationId,
          countryNodeId: dto.countryNodeId,
        },
      });
      await this.audit.recordActor(user, { action: 'pool.create', resourceType: 'WealthPool', resourceId: created.poolId, organisationId: dto.organisationId, countryNodeId: dto.countryNodeId, metadata: { poolName: created.poolName } }, tx);
      return created;
    });

    return pool;
  }
}
