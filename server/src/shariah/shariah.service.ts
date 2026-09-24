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

  async notifications(user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { recipientUserId: user.userId, organisationId: user.organisationId, countryNodeId: user.countryNodeId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async centralMalaysia(user: AuthenticatedUser) {
    return this.prisma.shariahReview.findMany({ where: { countryNodeId: 'CN-MYS' }, include: { decisions: { orderBy: { createdAt: 'desc' } }, project: { include: { countryNode: { select: { currency: true } }, projectSponsor: { select: { name: true } }, milestones: { orderBy: { createdAt: 'asc' } }, documents: { select: { id: true, projectId: true, fileName: true, mimeType: true, fileSize: true, extractionStatus: true, extractionError: true, extractedText: true, uploadedBy: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'desc' } } } } }, orderBy: { createdAt: 'desc' }, take: 100 });
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

    const activeReview = await this.prisma.shariahReview.findFirst({
      where: { projectId: input.projectId, status: { in: ['PROPOSED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'] } },
    });
    if (activeReview) throw new BadRequestException(`Project already has an active Shariah submission (${activeReview.id})`);
    const parentReview = input.parentReviewId ? await this.prisma.shariahReview.findUnique({ where: { id: input.parentReviewId }, select: { revision: true } }) : null;

    const review = await this.prisma.shariahReview.create({
      data: {
        projectId: input.projectId,
        organisationId: input.organisationId,
        countryNodeId: input.countryNodeId,
        proposedContract: input.proposedContract,
        aiResult: input.draftText ? { draftText: input.draftText, source: 'AI_CONTRACT_DRAFT_ASSISTANT' } : undefined,
        createdBy: user.userId,
        revision: parentReview ? parentReview.revision + 1 : 1,
        parentReviewId: input.parentReviewId,
      },
      include: { decisions: true },
    });
    await this.notifyReviewers(review, 'New Shariah review required', `Project ${project.projectName} was submitted for ${review.proposedContract} review.`);
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
    if ((input.decision === 'MODIFIED' || input.decision === 'OVERRIDDEN' || input.decision === 'REJECTED' || input.decision === 'REQUEST_CHANGES') && !input.justification?.trim()) {
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
      const status = input.decision === 'ACCEPTED' ? 'APPROVED' : input.decision === 'REQUEST_CHANGES' ? 'CHANGES_REQUESTED' : input.decision;
      const changed = await tx.shariahReview.update({
        where: { id },
        data: { status, reviewedBy: user.userId, reviewedAt: new Date() },
        include: { decisions: { orderBy: { createdAt: 'desc' } } },
      });
      return { review: changed, decision };
    });
    await this.notifyUser(review.createdBy, review.organisationId, review.countryNodeId, 'Shariah review decision', `Review ${id} is now ${updated.review.status}. ${input.justification || ''}`);

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

  async revert(id: string, user: AuthenticatedUser) {
    const review = await this.get(id, user);
    if (review.createdBy !== user.userId) throw new ForbiddenException('Only the submission owner can revert this review');
    if (!['PROPOSED', 'CHANGES_REQUESTED'].includes(review.status)) throw new BadRequestException('Only pending reviews can be reverted');
    const updated = await this.prisma.shariahReview.update({ where: { id }, data: { status: 'REVERTED' } });
    await this.audit.recordActor(user, { action: 'shariah.review.revert', resourceType: 'ShariahReview', resourceId: id, organisationId: review.organisationId, countryNodeId: review.countryNodeId });
    return updated;
  }

  async resubmit(id: string, input: CreateShariahReviewDto, user: AuthenticatedUser) {
    const previous = await this.get(id, user);
    if (previous.createdBy !== user.userId) throw new ForbiddenException('Only the submission owner can resubmit this review');
    if (previous.status !== 'CHANGES_REQUESTED') throw new BadRequestException('Only reviews with requested changes can be resubmitted');
    await this.prisma.shariahReview.update({ where: { id }, data: { status: 'REVERTED' } });
    return this.create({ ...input, projectId: previous.projectId, organisationId: previous.organisationId, countryNodeId: previous.countryNodeId, parentReviewId: id }, user);
  }

  private async notifyReviewers(review: { organisationId: string; countryNodeId: string; id: string }, title: string, message: string) {
    const recipients = await this.prisma.userRoleAssignment.findMany({ where: { organisationId: review.organisationId, countryNodeId: review.countryNodeId, isActive: true, role: { in: ['Shariah_Advisor', 'Shariah_Reviewer', 'Shariah_Committee'] } }, select: { userId: true } });
    await this.prisma.notification.createMany({ data: [...new Set(recipients.map((item) => item.userId))].map((userId) => ({ recipientUserId: userId, organisationId: review.organisationId, countryNodeId: review.countryNodeId, type: 'SHARIAH_REVIEW', title, message, resourceType: 'ShariahReview', resourceId: review.id })) });
  }

  private async notifyUser(userId: string, organisationId: string, countryNodeId: string, title: string, message: string) {
    await this.prisma.notification.create({ data: { recipientUserId: userId, organisationId, countryNodeId, type: 'SHARIAH_REVIEW', title, message, resourceType: 'ShariahReview' } });
  }
}
