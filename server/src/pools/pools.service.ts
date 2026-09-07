import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { CreatePoolDto } from './pools.controller';

@Injectable()
export class PoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async list(user: AuthenticatedUser) {
    const where = user.role === 'Super Admin' ? {} : { countryNodeId: user.countryNodeId };
    if (user.role !== 'Super Admin' && !this.policy.can(user.role, 'pooling', 'read')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'pooling', 'read').reason);
    }
    return this.prisma.wealthPool.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async get(id: string, user: AuthenticatedUser) {
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: id } });
    if (!pool) throw new NotFoundException('Pool not found');
    if (user.role !== 'Super Admin' && pool.countryNodeId !== user.countryNodeId) {
      throw new ForbiddenException('Pool is outside your country node scope');
    }
    return pool;
  }

  async create(dto: CreatePoolDto, user: AuthenticatedUser) {
    if (user.role !== 'Super Admin' && dto.countryNodeId !== user.countryNodeId) {
      throw new ForbiddenException('Cannot create a pool outside your country node scope');
    }
    if (user.role === 'Organization Admin' && dto.organisationId !== user.organisationId) {
      throw new ForbiddenException('Cannot create a pool outside your organisation scope');
    }

    const [organisation, project] = await Promise.all([
      this.prisma.organisation.findFirst({
        where: { id: dto.organisationId, countryNodeId: dto.countryNodeId },
        select: { id: true },
      }),
      this.prisma.project.findUnique({
        where: { projectId: dto.projectId },
        select: { organisationId: true, countryNodeId: true },
      }),
    ]);
    if (!organisation) {
      throw new ForbiddenException('Organisation is outside the requested country node scope');
    }
    if (!project) throw new NotFoundException('Project not found');
    if (project.organisationId !== dto.organisationId || project.countryNodeId !== dto.countryNodeId) {
      throw new ForbiddenException('Project is outside the requested tenant scope');
    }

    const pool = await this.prisma.wealthPool.create({
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

    await this.audit.recordActor(user, {
      action: 'pool.create',
      resourceType: 'WealthPool',
      resourceId: pool.poolId,
      organisationId: dto.organisationId,
      countryNodeId: dto.countryNodeId,
      metadata: { poolName: pool.poolName },
    });

    return pool;
  }
}
