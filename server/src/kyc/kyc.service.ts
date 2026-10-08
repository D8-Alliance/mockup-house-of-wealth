import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { CHECK_RESULT_SELECT, KycChecksService } from './checks/kyc-checks.service';
import { KycReviewDto, SaveKycDraftDto } from './kyc.dto';
import { idDocumentHasExpiry, KYC_DOCUMENT_TYPES, KYC_EDITABLE_STATUSES, KYC_MAX_REJECTED_APPLICATIONS, KYC_OPEN_STATUSES, KycStatus, kycSubmissionGaps, kycReviewScope, maskIdNumber, normalizeIdNumber, requiredKycDocuments } from './kyc-workflow';

// File bytes are never returned in JSON; they are served only by the download endpoints.
const DOCUMENT_SELECT = { id: true, documentType: true, fileName: true, mimeType: true, fileSize: true, sha256: true, createdAt: true } satisfies Prisma.KycDocumentSelect;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/**
 * The real file type from its first bytes. The browser-supplied type and the
 * file extension are both caller-controlled, so a text or HTML file renamed to
 * .png/.pdf would otherwise be stored as an identity document.
 */
export function detectDocumentType(content: Buffer): 'image/jpeg' | 'image/png' | 'application/pdf' | null {
  if (content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) return 'image/jpeg';
  if (content.length >= 5 && content.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  return null;
}

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly checks: KycChecksService,
  ) {}

  private readonly logger = new Logger('KycService');

  // ---- Applicant -----------------------------------------------------------

  /** The caller's latest application (null when they never started one) and what is still missing. */
  async getMine(actor: AuthenticatedUser) {
    const application = await this.prisma.kycApplication.findFirst({
      where: { userId: actor.userId },
      orderBy: { createdAt: 'desc' },
      include: { documents: { select: DOCUMENT_SELECT } },
    });
    if (!application) return null;
    // Automated-check signals are for officers only; showing them would tell a fraudster what tripped.
    const { checkRecommendation: _recommendation, checkReasons: _reasons, checksUpdatedAt: _checkedAt, ...visible } = application;
    return { ...visible, requiredDocuments: requiredKycDocuments(application.idDocumentType), missing: kycSubmissionGaps(application, application.documents.map((document) => document.documentType)) };
  }

  async saveDraft(actor: AuthenticatedUser, input: SaveKycDraftDto) {
    const data = {
      ...(input.fullName !== undefined && { fullName: input.fullName.trim() }),
      ...(input.dateOfBirth !== undefined && { dateOfBirth: new Date(input.dateOfBirth) }),
      ...(input.nationality !== undefined && { nationality: input.nationality.trim() }),
      ...(input.idDocumentType !== undefined && { idDocumentType: input.idDocumentType }),
      ...(input.idDocumentNumber !== undefined && { idDocumentNumber: input.idDocumentNumber.trim() }),
      ...(input.idDocumentExpiry !== undefined && { idDocumentExpiry: new Date(input.idDocumentExpiry) }),
      ...(input.residentialAddress !== undefined && { residentialAddress: input.residentialAddress.trim() }),
    };
    const open = await this.findOpen(actor);
    // A document without an expiry (e.g. Malaysian MyKad) must not keep one left over from a passport.
    const idDocumentType = input.idDocumentType ?? open?.idDocumentType ?? '';
    const dateOfBirth = input.dateOfBirth !== undefined ? new Date(input.dateOfBirth) : open?.dateOfBirth ?? null;
    const record = idDocumentHasExpiry(open?.countryNodeId ?? actor.countryNodeId, idDocumentType, dateOfBirth) ? data : { ...data, idDocumentExpiry: null };
    if (open) {
      this.assertEditable(open.status);
      await this.prisma.kycApplication.update({ where: { id: open.id }, data: record });
    } else {
      const latest = await this.prisma.kycApplication.findFirst({ where: { userId: actor.userId }, orderBy: { createdAt: 'desc' }, select: { status: true } });
      if (latest?.status === 'APPROVED') throw new ConflictException('Your identity is already verified.');
      // Caps retries after rejection, so checks cannot be probed with endless new applications.
      const rejected = await this.prisma.kycApplication.count({ where: { userId: actor.userId, status: 'REJECTED' } });
      if (rejected >= KYC_MAX_REJECTED_APPLICATIONS) throw new ForbiddenException('The maximum number of KYC applications has been reached. Please contact support.');
      try {
        const created = await this.prisma.kycApplication.create({ data: { ...record, applicationNumber: this.newApplicationNumber(), userId: actor.userId, userEmail: actor.email, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId } });
        await this.audit.recordActor(actor, { action: 'kyc.application.create', resourceType: 'KycApplication', resourceId: created.id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { applicationNumber: created.applicationNumber } });
      } catch (error) {
        // KycApplication_userId_open_key: a concurrent request already opened one.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('A KYC application is already in progress.');
        throw error;
      }
    }
    return this.getMine(actor);
  }

  async uploadDocument(actor: AuthenticatedUser, documentType: string, file: Express.Multer.File | undefined) {
    if (!(KYC_DOCUMENT_TYPES as readonly string[]).includes(documentType)) throw new BadRequestException(`Unsupported document type. Allowed: ${KYC_DOCUMENT_TYPES.join(', ')}.`);
    if (!file) throw new BadRequestException('A JPG, PNG or PDF file is required.');
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) throw new BadRequestException('Only JPG, PNG or PDF files are accepted.');
    const actualType = detectDocumentType(file.buffer);
    if (!actualType) throw new BadRequestException('The file is not a valid JPG, PNG or PDF. Upload the original photo or scan.');
    const open = await this.findOpen(actor);
    if (!open) throw new BadRequestException('Save your KYC details before uploading documents.');
    this.assertEditable(open.status);
    // Stored with the detected type, so downloads and document reading use what the file really is.
    const content = { fileName: file.originalname, mimeType: actualType, fileSize: file.size, fileContent: file.buffer, sha256: createHash('sha256').update(file.buffer).digest('hex'), uploadedBy: actor.userId };
    const document = await this.prisma.kycDocument.upsert({
      where: { applicationId_documentType: { applicationId: open.id, documentType } },
      update: { ...content, createdAt: new Date() },
      create: { ...content, applicationId: open.id, documentType },
      select: DOCUMENT_SELECT,
    });
    await this.audit.recordActor(actor, { action: 'kyc.document.upload', resourceType: 'KycDocument', resourceId: document.id, organisationId: open.organisationId, countryNodeId: open.countryNodeId, metadata: { applicationId: open.id, documentType, sha256: document.sha256, fileSize: document.fileSize } });
    return document;
  }

  async submit(actor: AuthenticatedUser) {
    const open = await this.findOpen(actor);
    if (!open) throw new BadRequestException('There is no KYC application to submit.');
    this.assertEditable(open.status);
    const documents = await this.prisma.kycDocument.findMany({ where: { applicationId: open.id }, select: { documentType: true } });
    const gaps = kycSubmissionGaps(open, documents.map((document) => document.documentType));
    // Optional until the camera step is rolled out to everyone; without it the officer sees a "not performed" warning.
    if (process.env.KYC_REQUIRE_LIVENESS === 'true') {
      const liveness = await this.prisma.kycLivenessSession.findFirst({ where: { applicationId: open.id }, orderBy: { createdAt: 'desc' }, select: { status: true } });
      if (liveness?.status !== 'PASSED') gaps.push('Face verification (camera)');
    }
    if (gaps.length) throw new BadRequestException(`KYC application is incomplete: ${gaps.join('; ')}.`);
    await this.prisma.kycApplication.update({ where: { id: open.id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
    await this.audit.recordActor(actor, { action: 'kyc.application.submit', resourceType: 'KycApplication', resourceId: open.id, organisationId: open.organisationId, countryNodeId: open.countryNodeId, metadata: { applicationNumber: open.applicationNumber, resubmission: open.status === 'RESUBMISSION_REQUIRED' } });
    // Automated checks are advisory and may wait on external providers, so they run in the background.
    void this.checks.run(open.id, { reason: 'SUBMITTED' }).catch((error: Error) => this.logger.error(`KYC checks failed for ${open.id}: ${error.message}`));
    return this.getMine(actor);
  }

  async downloadMyDocument(actor: AuthenticatedUser, documentId: string) {
    const document = await this.prisma.kycDocument.findFirst({ where: { id: documentId, application: { userId: actor.userId } } });
    if (!document) throw new NotFoundException('KYC document not found');
    return document;
  }

  // ---- Reviewer --------------------------------------------------------------

  /** Review queue for the reviewer's country node (Super Admin: all). Drafts are never listed; ID numbers are masked. */
  async listForReview(actor: AuthenticatedUser, status: Exclude<KycStatus, 'DRAFT'> = 'SUBMITTED') {
    const applications = await this.prisma.kycApplication.findMany({
      where: { status, ...this.reviewScope(actor) },
      orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
      take: 200,
      select: { id: true, applicationNumber: true, userId: true, userEmail: true, fullName: true, nationality: true, idDocumentType: true, idDocumentNumber: true, countryNodeId: true, status: true, kycLevel: true, submittedAt: true, reviewedAt: true, checkRecommendation: true, checkReasons: true, _count: { select: { documents: true } } },
    });
    return applications.map(({ idDocumentNumber, _count, ...application }) => ({ ...application, idDocumentNumberMasked: maskIdNumber(idDocumentNumber), documentCount: _count.documents }));
  }

  /** Viewing personal identity data is audited. */
  async getForReview(actor: AuthenticatedUser, id: string) {
    const application = await this.loadForReview(actor, id);
    await this.audit.recordActor(actor, { action: 'kyc.application.view', resourceType: 'KycApplication', resourceId: id, organisationId: application.organisationId, countryNodeId: application.countryNodeId, metadata: { applicationNumber: application.applicationNumber } });
    return application;
  }

  private async loadForReview(actor: AuthenticatedUser, id: string) {
    const application = await this.prisma.kycApplication.findFirst({
      where: { id, status: { not: 'DRAFT' }, ...this.reviewScope(actor) },
      include: { documents: { select: DOCUMENT_SELECT }, reviews: { orderBy: { createdAt: 'desc' } }, checks: { select: CHECK_RESULT_SELECT, orderBy: [{ round: 'desc' }, { createdAt: 'asc' }] } },
    });
    if (!application) throw new NotFoundException('KYC application not found');
    return { ...application, requiredDocuments: requiredKycDocuments(application.idDocumentType) };
  }

  /**
   * Officer-triggered re-run, e.g. after a new provider or registry is
   * connected. Adds a new round of evidence; the application status (even
   * APPROVED) is left unchanged.
   */
  async rerunChecks(actor: AuthenticatedUser, id: string) {
    const application = await this.loadForReview(actor, id);
    this.checks.assertCanRerun(application.status);
    await this.checks.run(id, { reason: 'OFFICER_RERUN', actor });
    return this.loadForReview(actor, id);
  }

  async downloadForReview(actor: AuthenticatedUser, applicationId: string, documentId: string) {
    const document = await this.prisma.kycDocument.findFirst({ where: { id: documentId, applicationId, application: { status: { not: 'DRAFT' }, ...this.reviewScope(actor) } }, include: { application: { select: { organisationId: true, countryNodeId: true } } } });
    if (!document) throw new NotFoundException('KYC document not found');
    await this.audit.recordActor(actor, { action: 'kyc.document.download', resourceType: 'KycDocument', resourceId: document.id, organisationId: document.application.organisationId, countryNodeId: document.application.countryNodeId, metadata: { applicationId, documentType: document.documentType } });
    return document;
  }

  async review(actor: AuthenticatedUser, id: string, input: KycReviewDto) {
    const application = await this.prisma.kycApplication.findFirst({ where: { id, ...this.reviewScope(actor) } });
    if (!application) throw new NotFoundException('KYC application not found');
    if (application.userId === actor.userId) throw new ForbiddenException('You cannot review your own KYC application.');
    if (application.status !== 'SUBMITTED') throw new BadRequestException('This KYC application is not awaiting review.');
    let comment = input.comment.trim();
    if (comment.length < 5) throw new BadRequestException('A review comment of at least 5 characters is required.');
    const kycLevel = input.decision === 'APPROVED' ? input.kycLevel ?? null : null;
    const reviewedAt = new Date();
    const gate = input.decision === 'APPROVED' ? await this.assertApprovable(application, input) : null;
    if (gate?.overrideReason) comment = `${comment}\n\nOverride of failed automated checks (${gate.failedChecks.join(', ')}): ${gate.overrideReason}`;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Conditional on status so two reviewers deciding at once cannot both win.
        const updated = await tx.kycApplication.updateMany({ where: { id, status: 'SUBMITTED' }, data: { status: input.decision, kycLevel, reviewedAt, reviewedBy: actor.userId, reviewComment: comment } });
        if (!updated.count) throw new ConflictException('This KYC application was already reviewed.');
        await tx.kycReview.create({ data: { applicationId: id, reviewerId: actor.userId, reviewerRole: actor.role, decision: input.decision, kycLevel, comment } });
      });
    } catch (error) {
      // KycApplication_approved_identity_key: another user was approved with this ID at the same moment.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('This identity document is already verified for another account.');
      throw error;
    }
    await this.audit.recordActor(actor, { action: `kyc.application.${input.decision.toLowerCase()}`, resourceType: 'KycApplication', resourceId: id, organisationId: application.organisationId, countryNodeId: application.countryNodeId, metadata: { applicationNumber: application.applicationNumber, decision: input.decision, kycLevel, reviewerRole: actor.role, manualReview: true, checkRecommendation: application.checkRecommendation, ...(gate && { failedChecks: gate.failedChecks, warningsAcknowledged: gate.warningsAcknowledged, overrideReason: gate.overrideReason }) } });
    // The decision is already audited; skip the separate "view" entry.
    return this.loadForReview(actor, id);
  }

  /**
   * Approval guard. The officer still decides, but cannot approve past automated
   * findings by accident:
   * - an identity already verified for another account is never approvable;
   * - a FAILED check (or ADVERSE recommendation) needs a recorded override reason;
   * - any other warning (ATTENTION, PENDING, checks not run) needs an explicit acknowledgement.
   */
  private async assertApprovable(application: { id: string; userId: string; idDocumentType: string; idDocumentNumber: string; checkRecommendation: string | null }, input: KycReviewDto) {
    const normalizedId = normalizeIdNumber(application.idDocumentNumber);
    const verifiedElsewhere = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "KycApplication"
      WHERE status = 'APPROVED' AND "userId" <> ${application.userId} AND "idDocumentType" = ${application.idDocumentType}
        AND upper(regexp_replace("idDocumentNumber", '[^A-Za-z0-9]', '', 'g')) = ${normalizedId}
      LIMIT 1`;
    if (verifiedElsewhere.length) throw new ConflictException('This identity document is already verified for another account. It cannot be approved again.');

    const latestRound = await this.prisma.kycCheckResult.aggregate({ where: { applicationId: application.id, shadow: false }, _max: { round: true } });
    const latest = latestRound._max.round === null ? [] : await this.prisma.kycCheckResult.findMany({ where: { applicationId: application.id, shadow: false, round: latestRound._max.round }, select: { checkType: true, status: true } });
    const failedChecks = latest.filter((result) => result.status === 'FAIL').map((result) => result.checkType);
    if (failedChecks.length || application.checkRecommendation === 'ADVERSE') {
      const overrideReason = input.overrideReason?.trim() ?? '';
      if (overrideReason.length < 15) {
        throw new ConflictException(`Automated checks failed (${failedChecks.join(', ') || 'adverse recommendation'}). To approve anyway, give an override reason of at least 15 characters.`);
      }
      return { failedChecks, warningsAcknowledged: true, overrideReason };
    }
    const hasWarnings = application.checkRecommendation !== 'CLEAR' || latest.some((result) => result.status !== 'PASS');
    if (hasWarnings && input.acknowledgeWarnings !== true) {
      throw new ConflictException('Automated checks raised warnings. Review them and confirm you have checked them before approving.');
    }
    return { failedChecks, warningsAcknowledged: hasWarnings, overrideReason: undefined };
  }

  // ---- Helpers ---------------------------------------------------------------

  private findOpen(actor: AuthenticatedUser) {
    return this.prisma.kycApplication.findFirst({ where: { userId: actor.userId, status: { in: KYC_OPEN_STATUSES } } });
  }

  private assertEditable(status: string) {
    if (!(KYC_EDITABLE_STATUSES as string[]).includes(status)) throw new BadRequestException('This KYC application is under review and can no longer be changed.');
  }

  private reviewScope(actor: AuthenticatedUser): { countryNodeId?: string } {
    return kycReviewScope(actor);
  }


  private newApplicationNumber() {
    return `KYC-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}

