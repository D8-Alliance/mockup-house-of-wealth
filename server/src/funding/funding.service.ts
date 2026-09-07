import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { assertTenantScope } from '../tenancy/tenant-scope';

@Injectable()
export class FundingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async request(projectId: string, user: AuthenticatedUser): Promise<{ requestId: string; status: string }> {
    const project = await this.prisma.project.findUnique({ where: { projectId } });
    if (!project) throw new NotFoundException('Project not found');
    assertTenantScope(user, project, 'Project');
    if (project.fundingRequired.lte(0)) {
      throw new BadRequestException('Project is fully funded');
    }

    // A funding request targets a project pool; default to the project's first pool.
    const pool = await this.prisma.wealthPool.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    if (!pool) {
      throw new BadRequestException('Project has no wealth pool; create a pool before requesting funding');
    }

    const request = await this.prisma.fundingRequest.create({
      data: {
        projectId: project.projectId,
        poolId: pool.poolId,
        requestedAmount: project.fundingRequired,
        currency: 'USD',
        status: 'PENDING',
        requestedBy: user.userId,
        organisationId: project.organisationId,
        countryNodeId: project.countryNodeId,
      },
    });

    await this.audit.recordActor(user, {
      action: 'funding.request',
      resourceType: 'FundingRequest',
      resourceId: request.fundingRequestId,
      organisationId: project.organisationId,
      countryNodeId: project.countryNodeId,
      metadata: { requestedAmount: Number(request.requestedAmount) },
    });

    return { requestId: request.fundingRequestId, status: request.status };
  }

  async approve(fundingRequestId: string, user: AuthenticatedUser): Promise<{ requestId: string; status: string }> {
    const request = await this.prisma.fundingRequest.findUnique({
      where: { fundingRequestId },
    });
    if (!request) throw new NotFoundException('Funding request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve a request in state "${request.status}"`);
    }
    // Enforce tenant scope: only Super Admin crosses country/organisation boundaries
    assertTenantScope(user, request, 'Request');
    if (!this.policy.can(user.role, 'approvals', 'approve')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'approvals', 'approve').reason);
    }

    const updated = await this.prisma.fundingRequest.update({
      where: { fundingRequestId },
      data: { status: 'APPROVED', approvedBy: user.userId, approvedAt: new Date() },
    });

    await this.audit.recordActor(user, {
      action: 'funding.approve',
      resourceType: 'FundingRequest',
      resourceId: fundingRequestId,
      organisationId: request.organisationId,
      countryNodeId: request.countryNodeId,
    });

    return { requestId: fundingRequestId, status: updated.status };
  }

  async disburse(fundingRequestId: string, user: AuthenticatedUser): Promise<{ requestId: string; status: string }> {
    const request = await this.prisma.fundingRequest.findUnique({
      where: { fundingRequestId },
    });
    if (!request) throw new NotFoundException('Funding request not found');
    if (request.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot disburse a request in state "${request.status}"`);
    }
    // Enforce tenant scope: only Super Admin crosses country/organisation boundaries
    assertTenantScope(user, request, 'Request');
    if (!this.policy.can(user.role, 'approvals', 'disburse')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'approvals', 'disburse').reason);
    }

    const updated = await this.prisma.fundingRequest.update({
      where: { fundingRequestId },
      data: { status: 'DISBURSED', disbursedBy: user.userId, disbursedAt: new Date() },
    });

    await this.audit.recordActor(user, {
      action: 'funding.disburse',
      resourceType: 'FundingRequest',
      resourceId: fundingRequestId,
      organisationId: request.organisationId,
      countryNodeId: request.countryNodeId,
    });

    return { requestId: fundingRequestId, status: updated.status };
  }

  async list(projectId: string, user: AuthenticatedUser): Promise<unknown[]> {
    const project = await this.prisma.project.findUnique({ where: { projectId } });
    if (!project) throw new NotFoundException('Project not found');
    assertTenantScope(user, project, 'Project');
    return this.prisma.fundingRequest.findMany({
      where: { projectId },
      orderBy: { requestedAt: 'desc' },
    });
  }
}
