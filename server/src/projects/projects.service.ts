import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { CreateProjectDto } from './projects.controller';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async list(user: AuthenticatedUser) {
    // Enforce tenant scope: a caller can only list projects in their country node.
    const where =
      user.role === 'Super Admin'
        ? {}
        : { countryNodeId: user.countryNodeId };

    if (user.role !== 'Super Admin' && !this.policy.can(user.role, 'marketplace', 'read')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'marketplace', 'read').reason);
    }

    return this.prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async get(id: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({ where: { projectId: id } });
    if (!project) throw new NotFoundException('Project not found');
    if (user.role !== 'Super Admin' && project.countryNodeId !== user.countryNodeId) {
      throw new ForbiddenException('Project is outside your country node scope');
    }
    return project;
  }

  async create(dto: CreateProjectDto, user: AuthenticatedUser) {
    if (user.role !== 'Super Admin' && dto.countryNodeId !== user.countryNodeId) {
      throw new ForbiddenException('Cannot create a project outside your country node scope');
    }
    if (user.role === 'Organization Admin' && dto.organisationId !== user.organisationId) {
      throw new ForbiddenException('Cannot create a project outside your organisation scope');
    }

    const organisation = await this.prisma.organisation.findFirst({
      where: { id: dto.organisationId, countryNodeId: dto.countryNodeId },
      select: { id: true },
    });
    if (!organisation) {
      throw new ForbiddenException('Organisation is outside the requested country node scope');
    }

    const project = await this.prisma.project.create({
      data: {
        projectCode: dto.projectCode,
        projectName: dto.projectName,
        description: dto.description,
        organisationId: dto.organisationId,
        countryNodeId: dto.countryNodeId,
        sector: dto.sector,
        totalProjectCost: dto.totalProjectCost,
        sponsorContribution: dto.sponsorContribution,
        fundingRequired: dto.fundingRequired,
        proposedShariahContract: dto.proposedShariahContract,
        status: 'DRAFT',
        projectSponsorId: dto.projectSponsorId,
      },
    });

    await this.audit.recordActor(user, {
      action: 'project.create',
      resourceType: 'Project',
      resourceId: project.projectId,
      organisationId: dto.organisationId,
      countryNodeId: dto.countryNodeId,
      metadata: { projectCode: project.projectCode },
    });

    return project;
  }
}
