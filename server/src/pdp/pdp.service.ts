import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { KybDecision, SavePdpApplicationDto } from './pdp.dto';

/** Applications a reviewer can still decide on. */
const REVIEWABLE_KYB = ['PENDING_MANUAL_REVIEW', 'SUBMITTED', 'UNDER_REVIEW'];
/** The applicant may still change these; one sent back for more information is corrected and submitted again. */
const EDITABLE_STATUSES = ['DRAFT', 'ADDITIONAL_INFORMATION_REQUIRED'];
const REVIEWER_ROLES = ['Country_Admin', 'KYB_Officer', 'Compliance_Officer'] as PrismaUserRole[];

const DECISION_OUTCOME: Record<KybDecision, { status: string; kybStatus: string; title: string }> = {
  APPROVED: { status: 'APPROVED', kybStatus: 'VERIFIED_MANUAL', title: 'PDP application approved' },
  REJECTED: { status: 'REJECTED', kybStatus: 'REJECTED', title: 'PDP application rejected' },
  REQUEST_INFO: { status: 'ADDITIONAL_INFORMATION_REQUIRED', kybStatus: 'CORRECTION_REQUIRED', title: 'PDP application: more information needed' },
};

interface HistoryEntry { at: string; by: string; byName: string; role: string; action: string; note?: string }

@Injectable()
export class PdpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly notifications?: NotificationService,
  ) {}

  async saveDraft(actor: AuthenticatedUser, input: SavePdpApplicationDto) {
    const [countryNode, organisation] = await Promise.all([
      this.prisma.countryNode.findUnique({ where: { code: actor.countryNodeId } }),
      this.prisma.organisation.findUnique({ where: { id: actor.organisationId } }),
    ]);
    if (!countryNode || !organisation || organisation.countryNodeId !== countryNode.code) {
      throw new ForbiddenException('Authenticated tenant is not valid');
    }

    const existing = input.id
      ? await this.prisma.pdpApplication.findUnique({ where: { id: input.id } })
      : await this.prisma.pdpApplication.findFirst({
          where: { userId: actor.userId, status: 'DRAFT' },
          orderBy: { createdAt: 'desc' },
        });

    if (existing && existing.userId !== actor.userId) {
      throw new ForbiddenException('You cannot edit another user\'s PDP application');
    }
    if (existing && !EDITABLE_STATUSES.includes(existing.status)) {
      throw new BadRequestException('Only a draft, or an application sent back for more information, can be edited');
    }

    const application = existing
      ? await this.prisma.pdpApplication.update({
          where: { id: existing.id },
          data: {
            userEmail: actor.email,
            countryCode: countryNode.code.replace(/^CN-/, ''),
            countryName: countryNode.name,
            organisationName: organisation.name,
            pdpType: input.pdpType,
            payload: input.payload as Prisma.InputJsonValue,
            organisationId: actor.organisationId,
            kybStatus: 'IN_PROGRESS',
          },
        })
      : await this.prisma.pdpApplication.create({
          data: {
            applicationNumber: await this.nextApplicationNumber(),
            userId: actor.userId,
            userEmail: actor.email,
            countryCode: countryNode.code.replace(/^CN-/, ''),
            countryName: countryNode.name,
            organisationName: organisation.name,
            pdpType: input.pdpType,
            payload: input.payload as Prisma.InputJsonValue,
            organisationId: actor.organisationId,
          },
        });

    return this.toResponse(application);
  }

  async submit(actor: AuthenticatedUser, id: string) {
    const application = await this.prisma.pdpApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('PDP application not found');
    if (application.userId !== actor.userId) throw new ForbiddenException('You cannot submit another user\'s PDP application');
    if (!EDITABLE_STATUSES.includes(application.status)) throw new BadRequestException('Only a draft, or an application sent back for more information, can be submitted');
    const resubmitted = application.status === 'ADDITIONAL_INFORMATION_REQUIRED';

    const payload = application.payload as Record<string, unknown>;
    const compliance = payload.compliance as Record<string, unknown> | undefined;
    const requiredDeclarations = [
      'amlCftDeclaration',
      'sourceOfFundsDeclaration',
      'beneficialOwnershipAccurate',
      'sanctionsNonMatchDeclared',
      'regulatoryComplianceAgreed',
      'shariahComplianceAttested',
      'termsAndConditionsAccepted',
      'privacyConsentGranted',
    ];
    if (!compliance || requiredDeclarations.some((key) => compliance[key] !== true)) {
      throw new BadRequestException('All compliance declarations must be accepted before submission');
    }

    const kybModule = await this.assertKybAvailable();
    const kybStatus = kybModule?.mode === 'MANUAL_REVIEW' ? 'PENDING_MANUAL_REVIEW' : 'SUBMITTED';
    const submitted = await this.prisma.pdpApplication.update({
      where: { id },
      data: { status: 'SUBMITTED', kybStatus, submittedAt: new Date(), history: [...this.historyOf(application), this.entry(actor, resubmitted ? 'RESUBMITTED' : 'SUBMITTED')] as unknown as Prisma.InputJsonValue },
    });
    await this.notifyReviewers(submitted, resubmitted);

    await this.audit.recordActor(actor, {
      action: 'pdp.application.submit',
      resourceType: 'PdpApplication',
      resourceId: submitted.id,
      countryNodeId: actor.countryNodeId,
      organisationId: actor.organisationId,
      metadata: { applicationNumber: submitted.applicationNumber, pdpType: submitted.pdpType, kybMode: kybModule?.mode ?? 'ACTIVE' },
    });

    return this.toResponse(submitted);
  }

  async reviewKyb(actor: AuthenticatedUser, id: string, decision: KybDecision, justification: string) {
    if (!justification.trim()) throw new BadRequestException('A manual review justification is required');
    await this.assertKybAvailable();
    const application = await this.prisma.pdpApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('PDP application not found');
    // countryCode is stored without the CN- prefix (see saveDraft). Super Admin is global and may review any country.
    if (actor.role !== 'Super Admin' && application.countryCode !== actor.countryNodeId.replace(/^CN-/, '')) {
      throw new ForbiddenException('You can only review KYB applications from your own country');
    }
    if (application.userId === actor.userId) throw new ForbiddenException('You cannot review your own KYB application');
    if (application.organisationId && application.organisationId === actor.organisationId) throw new ForbiddenException('You cannot review an application from your own organisation');
    const reviewable = REVIEWABLE_KYB;
    if (!reviewable.includes(application.kybStatus)) {
      throw new BadRequestException('This KYB application is not awaiting review');
    }

    // Conditional on status so two reviewers deciding at once cannot both win.
    const updated = await this.prisma.pdpApplication.updateMany({
      where: { id, kybStatus: { in: reviewable } },
      data: {
        status: DECISION_OUTCOME[decision].status,
        kybStatus: DECISION_OUTCOME[decision].kybStatus,
        reviewNote: justification.trim(),
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
        history: [...this.historyOf(application), this.entry(actor, decision, justification.trim())] as unknown as Prisma.InputJsonValue,
      },
    });
    if (!updated.count) throw new ConflictException('This KYB application was already reviewed');
    const reviewed = await this.prisma.pdpApplication.findUniqueOrThrow({ where: { id } });
    await this.audit.recordActor(actor, {
      action: `pdp.kyb.${decision.toLowerCase()}`,
      resourceType: 'PdpApplication',
      resourceId: id,
      countryNodeId: actor.countryNodeId,
      organisationId: actor.organisationId,
      metadata: { justification, manualReview: true, applicationCountryCode: application.countryCode },
    });
    await this.notifyApplicant(reviewed, decision, justification.trim());
    return this.toResponse(reviewed);
  }

  async listForReview(actor: AuthenticatedUser, status?: string) {
    const applications = await this.prisma.pdpApplication.findMany({
      where: { ...this.reviewScope(actor), status: status && status !== 'ALL' ? status : { not: 'DRAFT' } },
      orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
    });
    return applications.map((application) => this.toResponse(application));
  }

  async getForReview(actor: AuthenticatedUser, id: string) {
    const application = await this.prisma.pdpApplication.findFirst({ where: { id, ...this.reviewScope(actor) } });
    if (!application || application.status === 'DRAFT') throw new NotFoundException('PDP application not found');
    return this.toResponse(application);
  }

  /** countryCode is stored without the CN- prefix; the Super Admin sees every country. */
  private reviewScope(actor: AuthenticatedUser): Prisma.PdpApplicationWhereInput {
    return actor.role === 'Super Admin' ? {} : { countryCode: actor.countryNodeId.replace(/^CN-/, '') };
  }

  private historyOf(application: { history?: unknown }): HistoryEntry[] {
    return Array.isArray(application.history) ? application.history as HistoryEntry[] : [];
  }

  private entry(actor: AuthenticatedUser, action: string, note?: string): HistoryEntry {
    return { at: new Date().toISOString(), by: actor.userId, byName: actor.name, role: actor.role, action, ...(note ? { note } : {}) };
  }

  /** Reviewers in the applicant's country, outside the applicant's organisation. */
  private async notifyReviewers(application: { id: string; applicationNumber: string; organisationName: string; countryCode: string; organisationId?: string | null; updatedAt: Date }, resubmitted: boolean) {
    if (!this.notifications) return;
    const countryNodeId = `CN-${application.countryCode}`;
    const reviewers = await this.prisma.userRoleAssignment.findMany({ where: { role: { in: REVIEWER_ROLES }, isActive: true, countryNodeId, ...(application.organisationId ? { organisationId: { not: application.organisationId } } : {}) }, select: { userId: true, organisationId: true } });
    const unique = [...new Map(reviewers.map((reviewer) => [`${reviewer.userId}:${reviewer.organisationId}`, reviewer])).values()];
    await Promise.all(unique.map((reviewer) => this.notifications!.enqueue({
      recipientUserId: reviewer.userId, organisationId: reviewer.organisationId, countryNodeId, type: 'PDP_APPLICATION',
      title: resubmitted ? 'PDP application corrected' : 'PDP application to review',
      message: `${application.organisationName} (${application.applicationNumber}) ${resubmitted ? 'sent the information you asked for' : 'applied to become a project delivery partner'}.`,
      resourceType: 'PdpApplicationReview', resourceId: application.id, dedupeKey: `pdp-review:${application.id}:${reviewer.userId}:${reviewer.organisationId}:${application.updatedAt.toISOString()}`,
    }).catch(() => undefined)));
  }

  private async notifyApplicant(application: { id: string; userId: string; applicationNumber: string; countryCode: string; organisationId?: string | null; updatedAt: Date }, decision: KybDecision, note: string) {
    if (!this.notifications || !application.organisationId) return;
    await this.notifications.enqueue({
      recipientUserId: application.userId, organisationId: application.organisationId, countryNodeId: `CN-${application.countryCode}`, type: 'PDP_APPLICATION',
      title: DECISION_OUTCOME[decision].title,
      message: `${application.applicationNumber}: ${note}${decision === 'REQUEST_INFO' ? ' Open the Sponsor Portal to correct the application and submit it again.' : ''}`,
      resourceType: 'PdpApplication', resourceId: application.id, dedupeKey: `pdp-decision:${application.id}:${application.updatedAt.toISOString()}`,
    }).catch(() => undefined);
  }

  /**
   * The actor's own applications, then those a colleague submitted for the same organisation (matched by
   * name for applications saved before organisations were recorded), so every member sees the PDP status.
   */
  async getMine(actor: AuthenticatedUser) {
    const organisation = actor.organisationId ? await this.prisma.organisation.findUnique({ where: { id: actor.organisationId }, select: { name: true } }) : null;
    const countryCode = actor.countryNodeId.replace(/^CN-/, '');
    const applications = await this.prisma.pdpApplication.findMany({
      where: { OR: [
        { userId: actor.userId },
        ...(actor.organisationId ? [{ organisationId: actor.organisationId, status: { not: 'DRAFT' } }] : []),
        ...(organisation ? [{ organisationId: null, organisationName: { equals: organisation.name, mode: 'insensitive' as const }, countryCode, status: { not: 'DRAFT' } }] : []),
      ] },
      orderBy: { updatedAt: 'desc' },
    });
    const own = applications.filter((application) => application.userId === actor.userId);
    return [...own, ...applications.filter((application) => application.userId !== actor.userId)].map((application) => this.toResponse(application));
  }

  /** PDP applications go through KYB, so a disabled KYB module stops submissions and reviews. */
  private async assertKybAvailable() {
    const kybModule = await this.prisma.featureModule.findUnique({ where: { moduleKey: 'KYB_VERIFICATION' } });
    if (kybModule && (!kybModule.enabled || kybModule.mode === 'DISABLED')) {
      throw new ServiceUnavailableException('KYB verification is currently disabled, so PDP applications cannot be submitted or reviewed.');
    }
    return kybModule;
  }

  private async nextApplicationNumber(): Promise<string> {
    const year = new Date().getUTCFullYear();
    const count = await this.prisma.pdpApplication.count({ where: { applicationNumber: { startsWith: `PDP-APP-${year}-` } } });
    return `PDP-APP-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  private toResponse(application: any) {
    return {
      ...application,
      payload: application.payload,
      submittedAt: application.submittedAt?.toISOString() ?? undefined,
      reviewedAt: application.reviewedAt?.toISOString() ?? undefined,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    };
  }
}
