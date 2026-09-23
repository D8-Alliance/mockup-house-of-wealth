import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';
import { CreateShariahDecisionDto, CreateShariahReviewDto } from './shariah.dto';

@Injectable()
export class ShariahService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async list(user: AuthenticatedUser) {
    if (!this.policy.can(user.role, 'governance', 'read')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'governance', 'read').reason);
    }
    return this.prisma.shariahReview.findMany({
      where: tenantScopeFilter(user),
      include: { decisions: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async get(id: string, user: AuthenticatedUser) {
    const review = await this.prisma.shariahReview.findUnique({
      where: { id },
      include: { decisions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!review) throw new NotFoundException('Shariah review not found');
    assertTenantScope(user, review, 'Shariah review');
    return review;
  }

  async create(input: CreateShariahReviewDto, user: AuthenticatedUser) {
    assertTenantScope(user, input, 'Target tenant');

    const [project, organisation] = await Promise.all([
      this.prisma.project.findUnique({ where: { projectId: input.projectId } }),
      this.prisma.organisation.findFirst({ where: { id: input.organisationId, countryNodeId: input.countryNodeId }, select: { id: true } }),
    ]);
    if (!project) throw new NotFoundException('Project not found');
    if (!organisation || project.organisationId !== input.organisationId || project.countryNodeId !== input.countryNodeId) {
      throw new ForbiddenException('Project is outside the requested tenant scope');
    }

    const review = await this.prisma.shariahReview.create({
      data: {
        projectId: input.projectId,
        organisationId: input.organisationId,
        countryNodeId: input.countryNodeId,
        proposedContract: input.proposedContract,
        createdBy: user.userId,
      },
      include: { decisions: true },
    });
    await this.audit.recordActor(user, {
      action: 'shariah.review.create',
      resourceType: 'ShariahReview',
      resourceId: review.id,
      organisationId: review.organisationId,
      countryNodeId: review.countryNodeId,
      metadata: { projectId: review.projectId, proposedContract: review.proposedContract },
    });
    return review;
  }

  async decide(id: string, input: CreateShariahDecisionDto, user: AuthenticatedUser) {
    const review = await this.get(id, user);
    if (review.status !== 'PROPOSED') {
      throw new BadRequestException(`A Shariah review in state "${review.status}" cannot receive another decision`);
    }
    if ((input.decision === 'MODIFIED' || input.decision === 'OVERRIDDEN') && !input.justification?.trim()) {
      throw new BadRequestException('A justification is required when modifying or overriding an AI recommendation');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const decision = await tx.shariahDecision.create({
        data: {
          reviewId: id,
          decision: input.decision,
          justification: input.justification?.trim() || null,
          actorId: user.userId,
          actorRole: user.role,
        },
      });
      const status = input.decision === 'ACCEPTED' ? 'APPROVED' : input.decision;
      const changed = await tx.shariahReview.update({
        where: { id },
        data: { status, reviewedBy: user.userId, reviewedAt: new Date() },
        include: { decisions: { orderBy: { createdAt: 'desc' } } },
      });
      return { review: changed, decision };
    });

    await this.audit.recordActor(user, {
      action: `shariah.review.${input.decision.toLowerCase()}`,
      resourceType: 'ShariahReview',
      resourceId: id,
      organisationId: review.organisationId,
      countryNodeId: review.countryNodeId,
      metadata: { decisionId: updated.decision.id, justification: updated.decision.justification },
    });
    return updated.review;
  }
}
