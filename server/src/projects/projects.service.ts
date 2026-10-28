import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { AddProjectTeamMemberDto, CreateProjectAnnouncementDto, CreateProjectPromotionDto, CreateProjectDto, CreateProjectMilestoneDto, UpdateProjectDetailsDto, UpdateProjectMilestoneDto, UpdateProjectStatusDto } from './projects.controller';
import { assertProjectAccess, assertTenantScope, PROJECT_REVIEWER_ROLES, tenantScopeFilter } from '../tenancy/tenant-scope';
import { assertProjectUnlocked, hasCurrentFinalApproval, isProjectLocked, REOPENABLE_PROJECT_STATUSES } from './project-lock';
import { formatLocalDateTime } from '../tenancy/country-time';
import { inspectDocument, sha256Hex, withStoredChecks } from './document-integrity';
import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { projectRoadmap } from './project-roadmap';
import { safeguardFacts } from '../capital-takaful/safeguard-facts';

/** Fields an accepted asset partnership relies on: its agreement names the project, its akad and where it is. */
export const PARTNERSHIP_FIXED_FIELDS = ['projectName', 'sector', 'proposedShariahContract', 'location'] as const;
const PARTNERSHIP_LOCKING = ['ACCEPTED', 'APPROVED'];
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import { Receipt } from '../billing/receipt-pdf';
import { RECEIPT_AKAD } from '../billing/receipt-akad';

const SPONSOR_ROLES = ['Project Sponsor', 'Project Manager'];
/** The only status changes a sponsor makes: submit the draft for review, or take it back to correct it. */
const SPONSOR_STATUS_MOVES: Record<string, string[]> = { DRAFT: ['DUE_DILIGENCE'], DUE_DILIGENCE: ['DRAFT'] };

const PROJECT_PROMOTION_PACKAGES = [
  { id: 'pkg_free_listing', title: 'Free Project Listing', badgeType: 'Promoted', durationDays: 0, priceMYR: 0, creditsCost: 0 },
  { id: 'pkg_featured_7d', title: 'Featured Project (7 Days)', badgeType: 'Featured', durationDays: 7, priceMYR: 99, creditsCost: 50 },
  { id: 'pkg_featured_30d', title: 'Featured Project (30 Days)', badgeType: 'Featured', durationDays: 30, priceMYR: 299, creditsCost: 150 },
  { id: 'pkg_sponsored_30d', title: 'Sponsored Project Spotlight (30 Days)', badgeType: 'Sponsored', durationDays: 30, priceMYR: 499, creditsCost: 250 },
] as const;

const EVIDENCE_REQUIREMENTS = [
  { evidenceType: 'FINANCIAL_MODEL', description: 'Historical and projected financial model with assumptions, revenue, costs, and profitability.', requiredFormat: 'PDF, XLSX, CSV', priority: 'CRITICAL' },
  { evidenceType: 'CASHFLOW_FORECAST', description: 'Five-year cashflow projection with monthly or annual assumptions and funding drawdown schedule.', requiredFormat: 'PDF, XLSX, CSV', priority: 'CRITICAL' },
  { evidenceType: 'ASSET_VALUATION', description: 'Independent valuation or appraisal supporting the project assets and their stated value.', requiredFormat: 'PDF', priority: 'HIGH' },
  { evidenceType: 'LEGAL_OWNERSHIP', description: 'Title, ownership, registration, permit, or other legal documents proving control of the relevant assets.', requiredFormat: 'PDF', priority: 'HIGH' },
] as const;

const EVIDENCE_DOCUMENT_SELECT = { id: true, fileName: true, mimeType: true, extractionStatus: true, createdAt: true, sha256: true, integrity: true } as const;

/** Yield, tenure and location of a new project, dropping values outside sensible ranges (the create body has no DTO class to validate it). */
export function projectTerms(dto: { expectedYieldPct?: number; tenureMonths?: number; location?: string }) {
  const yieldPct = Number(dto.expectedYieldPct);
  const tenure = Number(dto.tenureMonths);
  return {
    expectedYieldPct: dto.expectedYieldPct !== undefined && dto.expectedYieldPct !== null && Number.isFinite(yieldPct) && yieldPct >= 0 && yieldPct <= 100 ? yieldPct : null,
    tenureMonths: Number.isInteger(tenure) && tenure >= 1 && tenure <= 600 ? tenure : null,
    location: typeof dto.location === 'string' && dto.location.trim() ? dto.location.trim().slice(0, 200) : null,
  };
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async list(user: AuthenticatedUser) {
    // Enforce tenant scope: a caller can only list projects inside their tenant.
    // Reviewers see every submitted project of their country; everyone else their own tenant's.
    const reviewer = PROJECT_REVIEWER_ROLES.includes(user.role);
    const where = reviewer
      ? { countryNodeId: user.countryNodeId, OR: [{ organisationId: user.organisationId }, { status: { not: 'DRAFT' } }] }
      : {
        ...tenantScopeFilter(user),
        ...(user.role === 'Project Sponsor' ? { projectSponsorId: user.userId } : {}),
      };

    if (user.role !== 'Super Admin' && !reviewer && !this.policy.can(user.role, 'marketplace', 'read')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'marketplace', 'read').reason);
    }

    const projects = await this.prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        countryNode: { select: { currency: true } },
        projectSponsor: { select: { name: true } },
        organisation: { select: { name: true } },
        assetEngagements: { where: { status: { in: PARTNERSHIP_LOCKING } }, select: { id: true } },
      },
    });
    return Promise.all(projects.map((project) => this.ensureMilestones(project)));
  }

  /** What is done, what comes next and who acts, from registration to completion. */
  async roadmap(projectId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const scope = { projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId };
    const [organisation, allocated, evidence, revision, termSheet, needs, engagements, pools, currency] = await Promise.all([
      this.prisma.organisation.findUnique({ where: { id: project.organisationId }, select: { name: true, kybStatus: true } }),
      this.prisma.projectMilestone.aggregate({ where: { projectId }, _sum: { disbursementAmount: true } }),
      this.prisma.projectEvidenceRequirement.findMany({ where: scope, select: { evidenceType: true, status: true } }),
      this.prisma.projectFeasibilityRevision.findFirst({ where: scope, orderBy: { revisionNumber: 'desc' }, select: { aiRun: { select: { reviewStage: true } } } }),
      this.prisma.shariahReview.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' }, select: { status: true } }),
      this.prisma.projectAssetNeed.findMany({ where: { projectId }, select: { status: true } }),
      this.prisma.assetEngagement.findMany({ where: { projectId, status: { notIn: ['DECLINED', 'WITHDRAWN', 'REJECTED'] } }, select: { id: true, status: true } }),
      this.prisma.wealthPool.count({ where: { projectId } }),
      this.prisma.countryNode.findUnique({ where: { code: project.countryNodeId }, select: { currency: true } }),
    ]);
    const pdp = await this.prisma.pdpApplication.findFirst({
      where: { status: { not: 'DRAFT' }, OR: [{ organisationId: project.organisationId }, ...(organisation ? [{ organisationId: null, organisationName: { equals: organisation.name, mode: 'insensitive' as const } }] : [])] },
      orderBy: { updatedAt: 'desc' }, select: { status: true },
    });
    const agreements = engagements.length ? await this.prisma.contract.findMany({ where: { engagementId: { in: engagements.map((item) => item.id) } }, select: { status: true } }) : [];
    const uploaded = new Set(evidence.filter((item) => item.status !== 'MISSING').map((item) => item.evidenceType));
    const safeguards = await safeguardFacts(this.prisma, projectId);
    return projectRoadmap({
      capital: safeguards ? { pct: safeguards.capital.pct, required: safeguards.capital.required, pledged: safeguards.capital.pledged, submitted: safeguards.capital.submitted, evidenced: safeguards.capital.evidenced, deposited: safeguards.capital.deposited } : { pct: 10, required: 0, pledged: 0, evidenced: 0, deposited: 0 },
      cover: safeguards ? safeguards.cover.map((item) => ({ label: item.label, state: item.state })) : [],
      status: project.status, currency: currency?.currency ?? 'MYR', fundingRequired: Number(project.fundingRequired), allocated: Number(allocated._sum.disbursementAmount ?? 0),
      kybStatus: organisation?.kybStatus ?? 'NOT_SUBMITTED', pdpStatus: pdp?.status ?? null,
      evidence: { required: EVIDENCE_REQUIREMENTS.length, uploaded: EVIDENCE_REQUIREMENTS.filter((item) => uploaded.has(item.evidenceType)).length },
      feasibility: revision ? { reviewStage: revision.aiRun.reviewStage } : null, termSheetReview: termSheet?.status ?? null,
      needs: { open: needs.filter((item) => item.status === 'OPEN').length, total: needs.length },
      engagements, agreements, pools,
    });
  }

  async lifecycle(projectId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const milestones = await this.ensureMilestones(project);
    const events = await this.prisma.projectLifecycleEvent.findMany({ where: { projectId: project.projectId }, orderBy: { createdAt: 'asc' } });
    return { project, milestones, events };
  }

  async updateStatus(projectId: string, dto: UpdateProjectStatusDto, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const allowed = ['DRAFT', 'DUE_DILIGENCE', 'APPROVED', 'FUNDING_OPEN', 'POOLING', 'FUNDED', 'EXECUTION', 'PROFIT_DISTRIBUTION', 'COMPLETED', 'REJECTED'];
    if (!allowed.includes(dto.status)) throw new BadRequestException('Unsupported project lifecycle status.');
    // A sponsor submits its draft for review, or takes it back to correct it; reviewers move it further.
    if (SPONSOR_ROLES.includes(user.role) && !(SPONSOR_STATUS_MOVES[project.status] ?? []).includes(dto.status)) {
      throw new ForbiddenException('A project sponsor can submit a draft for review or return it to draft. Reviewers move it further.');
    }
    // Approval and reopening have their own governed paths; a plain status change must not bypass them.
    if (isProjectLocked(project.status) && ['DRAFT', 'DUE_DILIGENCE'].includes(dto.status)) throw new ConflictException('An approved or rejected project can only return to due diligence through Reopen project.');
    if (dto.status === 'APPROVED' && project.status !== 'APPROVED' && !(await hasCurrentFinalApproval(this.prisma, project))) throw new ConflictException('A project becomes APPROVED only through the final committee decision on its current feasibility revision.');
    if (project.status === 'DRAFT' && dto.status === 'DUE_DILIGENCE') {
      const safeguards = await safeguardFacts(this.prisma, projectId);
      if (safeguards && safeguards.capital.pledged < safeguards.capital.required) throw new ConflictException(`Pledge the sponsor's own capital before submitting: at least ${safeguards.capital.pct}% of the project cost (${safeguards.currency} ${safeguards.capital.required.toLocaleString('en-MY', { minimumFractionDigits: 2 })}); ${safeguards.currency} ${safeguards.capital.pledged.toLocaleString('en-MY', { minimumFractionDigits: 2 })} is pledged.`);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.project.update({ where: { projectId }, data: { status: dto.status, lifecycleVersion: { increment: 1 } } });
      await tx.projectLifecycleEvent.create({ data: { projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, fromStatus: project.status, toStatus: dto.status, note: dto.note, actorId: user.userId } });
      await this.audit.recordActor(user, { action: 'project.lifecycle.status_change', resourceType: 'Project', resourceId: projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { fromStatus: project.status, toStatus: dto.status, note: dto.note } }, tx);
      return result;
    });
    return updated;
  }

  /**
   * Adds a disbursement tranche: what the funds are released for, when and how much. Tranches are set
   * before approval, and together they cannot exceed the funding the project asks investors for.
   */
  async createMilestone(projectId: string, dto: CreateProjectMilestoneDto, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    assertProjectUnlocked(project, 'Adding a tranche');
    const title = dto.title?.trim() ?? '';
    if (title.length < 3) throw new BadRequestException('Say what the funds are released for (at least 3 characters).');
    const targetDate = dto.targetDate ? new Date(dto.targetDate) : null;
    if (!targetDate || Number.isNaN(targetDate.getTime())) throw new BadRequestException('Choose the target date of the tranche.');
    const amount = Number(dto.disbursementAmount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Enter the amount released at this tranche.');
    // The same tranche twice (a double click, or a form sent again) would release its funds twice.
    const sameTitle = await this.prisma.projectMilestone.findFirst({ where: { projectId, title: { equals: title, mode: 'insensitive' } }, select: { id: true } });
    if (sameTitle) throw new ConflictException(`A tranche called "${title}" is already on this project. Give this one its own name, or remove the other first.`);
    const allocated = await this.prisma.projectMilestone.aggregate({ where: { projectId }, _sum: { disbursementAmount: true } });
    const funding = Number(project.fundingRequired);
    const remaining = funding - Number(allocated._sum.disbursementAmount ?? 0);
    if (amount > remaining + 0.005) throw new BadRequestException(`The tranches would exceed the funding required: ${Math.max(0, remaining).toFixed(2)} of ${funding.toFixed(2)} is left to allocate.`);
    const milestone = await this.prisma.projectMilestone.create({ data: { projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, title, targetDate, completionPct: 0, disbursementAmount: amount, status: 'UPCOMING' } });
    await this.audit.recordActor(user, { action: 'project.milestone.create', resourceType: 'Project', resourceId: projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { milestoneId: milestone.id, title, targetDate: dto.targetDate, amount } });
    return milestone;
  }

  /**
   * Removes a tranche entered by mistake, while the project can still change. The four governance steps
   * (no funds released) stay, and a tranche someone has asked to release is kept with its record.
   */
  async deleteMilestone(projectId: string, milestoneId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    assertProjectUnlocked(project, 'Removing a tranche');
    const milestone = await this.prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
    if (!milestone) throw new NotFoundException('Tranche not found on this project.');
    if (Number(milestone.disbursementAmount) <= 0) throw new BadRequestException('The governance steps of a project cannot be removed; only tranches that release funds.');
    const requested = await this.prisma.fundingRequest.count({ where: { milestoneId } });
    if (requested) throw new ConflictException('A release of this tranche has been requested, so it is kept with that record.');
    await this.prisma.$transaction(async (tx) => {
      await tx.projectMilestone.delete({ where: { id: milestoneId } });
      await this.audit.recordActor(user, { action: 'project.milestone.delete', resourceType: 'Project', resourceId: projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { milestoneId, title: milestone.title, amount: Number(milestone.disbursementAmount) } }, tx);
    });
    return { id: milestoneId };
  }

  async updateMilestone(projectId: string, milestoneId: string, dto: UpdateProjectMilestoneDto, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const milestone = await this.prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId } });
    if (!milestone) throw new NotFoundException('Project milestone not found');
    return this.prisma.projectMilestone.update({ where: { id: milestoneId }, data: { completionPct: dto.completionPct === undefined ? undefined : Math.max(0, Math.min(100, dto.completionPct)), status: dto.status, shariahSignoff: dto.shariahSignoff, auditorSignoff: dto.auditorSignoff } });
  }

  private async ensureMilestones(project: { projectId: string; organisationId: string; countryNodeId: string; fundingRequired: Prisma.Decimal; status: string }) {
    const existing = await this.prisma.projectMilestone.findMany({ where: { projectId: project.projectId }, orderBy: { createdAt: 'asc' } });
    if (existing.length) return { ...project, milestones: existing };
    const titles = ['Project information and sponsor evidence', 'Shariah term sheet review', 'Due diligence and risk clearance', 'Funding, execution and completion'];
    await this.prisma.projectMilestone.createMany({ data: titles.map((title, index) => ({ projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, title, completionPct: index === 0 && project.status !== 'DRAFT' ? 100 : 0, status: index === 0 && project.status !== 'DRAFT' ? 'COMPLETED' : 'UPCOMING', disbursementAmount: 0 })) });
    return { ...project, milestones: await this.prisma.projectMilestone.findMany({ where: { projectId: project.projectId }, orderBy: { createdAt: 'asc' } }) };
  }

  async get(id: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({ where: { projectId: id } });
    if (!project) throw new NotFoundException('Project not found');
    assertTenantScope(user, project, 'Project');
    this.assertProjectSponsorScope(user, project.projectSponsorId);
    return project;
  }

  /** A project to read for review: its own tenant, or a reviewer of its country once submitted. Never for changes. */
  private async getForReview(id: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({ where: { projectId: id } });
    if (!project) throw new NotFoundException('Project not found');
    assertProjectAccess(user, project);
    this.assertProjectSponsorScope(user, project.projectSponsorId);
    return project;
  }

  private assertProjectSponsorScope(user: AuthenticatedUser, projectSponsorId: string) {
    if (user.role === 'Project Sponsor' && projectSponsorId !== user.userId) {
      throw new ForbiddenException('Project is not assigned to this sponsor');
    }
  }

  async listDocuments(projectId: string, user: AuthenticatedUser) {
    const project = await this.getForReview(projectId, user);
    return this.prisma.projectDocument.findMany({
      where: { projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId },
      select: { id: true, projectId: true, fileName: true, mimeType: true, fileSize: true, extractionStatus: true, extractionError: true, extractedText: true, uploadedBy: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Read-only: requirement rows are only written when evidence is uploaded.
  // Types without a stored row are returned as MISSING placeholders.
  async listEvidenceRequirements(projectId: string, user: AuthenticatedUser) {
    const project = await this.getForReview(projectId, user);
    const stored = await this.prisma.projectEvidenceRequirement.findMany({ where: { projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId }, include: { uploadedDocument: { select: EVIDENCE_DOCUMENT_SELECT } } });
    return EVIDENCE_REQUIREMENTS.map((requirement) => stored.find((item) => item.evidenceType === requirement.evidenceType) ?? {
      id: `${project.projectId}:${requirement.evidenceType}`,
      projectId: project.projectId,
      organisationId: project.organisationId,
      countryNodeId: project.countryNodeId,
      ...requirement,
      status: 'MISSING',
      uploadedDocumentId: null,
      verificationStatus: 'NOT_STARTED',
      verificationResult: null,
      confidenceScore: 0,
      uploadedDocument: null,
    });
  }

  async uploadEvidence(projectId: string, evidenceType: string, file: Express.Multer.File | undefined, user: AuthenticatedUser) {
    const requirement = EVIDENCE_REQUIREMENTS.find((item) => item.evidenceType === evidenceType);
    if (!requirement) throw new BadRequestException('Unsupported evidence type.');
    if (!file) throw new BadRequestException('An evidence file is required.');
    const allowedExtensions = requirement.requiredFormat.split(',').map((format) => format.trim().toLowerCase());
    const extension = file.originalname.toLowerCase().split('.').pop() || '';
    if (!allowedExtensions.includes(extension)) throw new BadRequestException(`${evidenceType.replaceAll('_', ' ')} must be uploaded as ${requirement.requiredFormat}.`);
    const project = await this.get(projectId, user);
    assertProjectUnlocked(project, 'Evidence upload');
    const previous = await this.prisma.projectEvidenceRequirement.findUnique({ where: { projectId_evidenceType: { projectId: project.projectId, evidenceType } }, select: { uploadedDocumentId: true } });
    // The previous document is kept (not deleted) as part of the evidence audit trail.
    const document = await this.storeDocument(project, file, user);
    const reset = { uploadedDocumentId: document.id, status: 'UPLOADED', verificationStatus: 'NOT_STARTED', confidenceScore: 0, verificationResult: Prisma.JsonNull };
    const updated = await this.prisma.projectEvidenceRequirement.upsert({
      where: { projectId_evidenceType: { projectId: project.projectId, evidenceType } },
      update: reset,
      create: { projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, ...requirement, ...reset },
      include: { uploadedDocument: { select: EVIDENCE_DOCUMENT_SELECT } },
    });
    await this.audit.recordActor(user, { action: 'project.evidence.upload', resourceType: 'ProjectEvidenceRequirement', resourceId: updated.id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { projectId: project.projectId, evidenceType, documentId: document.id, previousDocumentId: previous?.uploadedDocumentId ?? null, status: updated.status } });
    return updated;
  }

  /**
   * Formal route back from a final decision: the project returns to DUE_DILIGENCE, every
   * outstanding feasibility approval is superseded (so funding and pooling stop), and
   * evidence and AI analysis unlock again. Only allowed before investor money is committed.
   */
  async reopenProject(projectId: string, reason: string | undefined, user: AuthenticatedUser) {
    if (!reason?.trim()) throw new BadRequestException('A reason is required to reopen a project.');
    const project = await this.get(projectId, user);
    if (!REOPENABLE_PROJECT_STATUSES.includes(project.status)) {
      throw new ConflictException(`A ${project.status.replaceAll('_', ' ')} project cannot be reopened. Reopening is allowed only from ${REOPENABLE_PROJECT_STATUSES.join(', ')}, before funds are committed.`);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      // Conditional on the status we checked, so a concurrent change is not overwritten.
      const claimed = await tx.project.updateMany({ where: { projectId, status: project.status }, data: { status: 'DUE_DILIGENCE', lifecycleVersion: { increment: 1 } } });
      if (!claimed.count) throw new ConflictException('The project status changed; reload and try again.');
      await tx.projectApproval.updateMany({ where: { projectId, status: { in: ['PENDING', 'APPROVED', 'REJECTED', 'REQUEST_CHANGES'] } }, data: { status: 'SUPERSEDED', supersededAt: new Date() } });
      await tx.projectLifecycleEvent.create({ data: { projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, fromStatus: project.status, toStatus: 'DUE_DILIGENCE', note: `Reopened: ${reason.trim()}`, actorId: user.userId } });
      return tx.project.findUniqueOrThrow({ where: { projectId } });
    });
    await this.audit.recordActor(user, { action: 'project.reopened', resourceType: 'Project', resourceId: projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { fromStatus: project.status, toStatus: 'DUE_DILIGENCE', reason: reason.trim() } });
    return updated;
  }

  async verifyEvidence(projectId: string, evidenceType: string, user: AuthenticatedUser) {
    // Not the sponsor's own Organization Admin: evidence is verified by someone outside the organisation that submitted it.
    const reviewerRoles = ['Finance Officer', 'Risk Officer', 'Compliance Officer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee', 'Country Admin', 'Super Admin'];
    if (!reviewerRoles.includes(user.role)) throw new ForbiddenException('Only an authorised human reviewer can verify evidence.');
    const project = await this.getForReview(projectId, user);
    assertProjectUnlocked(project, 'Evidence verification');
    const requirement = await this.prisma.projectEvidenceRequirement.findFirst({ where: { projectId: project.projectId, evidenceType, organisationId: project.organisationId, countryNodeId: project.countryNodeId } });
    if (!requirement?.uploadedDocumentId) throw new BadRequestException('Evidence must be uploaded before human verification.');
    if (!['AI_PRECHECKED', 'REQUIRES_REVIEW', 'UPLOADED'].includes(requirement.status)) throw new BadRequestException(`Evidence cannot be verified from state "${requirement.status}".`);
    const previousResult = requirement.verificationResult && typeof requirement.verificationResult === 'object' && !Array.isArray(requirement.verificationResult) ? requirement.verificationResult as Record<string, unknown> : {};
    const updated = await this.prisma.projectEvidenceRequirement.update({ where: { id: requirement.id }, data: { status: 'VERIFIED', verificationStatus: 'VERIFIED', verificationResult: { ...previousResult, humanVerifiedBy: user.userId, humanVerifiedAt: new Date().toISOString(), validationResult: 'Verified by an authorised human reviewer.' } }, include: { uploadedDocument: { select: { id: true, fileName: true, mimeType: true, extractionStatus: true, createdAt: true } } } });
    await this.audit.recordActor(user, { action: 'project.evidence.human_verified', resourceType: 'ProjectEvidenceRequirement', resourceId: requirement.id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { projectId: project.projectId, evidenceType, documentId: requirement.uploadedDocumentId, reviewerId: user.userId, reviewerRole: user.role } });
    return updated;
  }

  async uploadDocument(projectId: string, file: Express.Multer.File | undefined, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    if (!file) throw new BadRequestException('A PDF, DOCX, XLSX, or CSV file is required.');
    return this.storeDocument(project, file, user);
  }

  private async storeDocument(project: { projectId: string; organisationId: string; countryNodeId: string }, file: Express.Multer.File, user: AuthenticatedUser) {

    let extractedText = '';
    let extractionStatus = 'NOT_APPLICABLE';
    let extractionError: string | null = null;
    const extension = file.originalname.toLowerCase().split('.').pop();
    if (file.mimetype === 'application/pdf' || extension === 'pdf') {
      extractionStatus = 'EXTRACTED';
      try {
        const parsed = await pdfParse(file.buffer);
        extractedText = parsed.text.trim();
        if (extractedText.length < 20) {
          extractionStatus = 'FAILED';
          extractionError = 'The PDF contains no extractable text. Scanned PDFs require OCR.';
        }
      } catch (error) {
        extractionStatus = 'FAILED';
        extractionError = error instanceof Error ? error.message.slice(0, 500) : 'PDF text extraction failed';
      }
    } else if (extension === 'csv') {
      extractedText = file.buffer.toString('utf8').trim();
      extractionStatus = extractedText.length >= 20 ? 'EXTRACTED' : 'FAILED';
      extractionError = extractionStatus === 'FAILED' ? 'The CSV contains insufficient extractable content.' : null;
    } else if (extension === 'xlsx' || extension === 'xls') {
      try {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        extractedText = workbook.SheetNames.map((sheetName) => `Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])}`).join('\n').trim();
        extractionStatus = extractedText.length >= 20 ? 'EXTRACTED' : 'FAILED';
        extractionError = extractionStatus === 'FAILED' ? 'The spreadsheet contains insufficient extractable content.' : null;
      } catch (error) {
        extractionStatus = 'FAILED';
        extractionError = error instanceof Error ? error.message.slice(0, 500) : 'Spreadsheet extraction failed';
      }
    }

    const sha256 = sha256Hex(file.buffer);
    const otherProjectCount = (await this.prisma.projectDocument.findMany({ where: { sha256, projectId: { not: project.projectId } }, select: { projectId: true }, distinct: ['projectId'] })).length;
    const integrity = withStoredChecks(inspectDocument(file.buffer), { otherProjectCount });
    const document = await this.prisma.projectDocument.create({
      data: {
        projectId: project.projectId,
        organisationId: project.organisationId,
        countryNodeId: project.countryNodeId,
        uploadedBy: user.userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileContent: file.buffer,
        extractedText,
        extractionStatus,
        extractionError,
        sha256,
        integrity: integrity as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, projectId: true, fileName: true, mimeType: true, fileSize: true, extractionStatus: true, extractionError: true, extractedText: true, uploadedBy: true, createdAt: true, updatedAt: true, sha256: true, integrity: true },
    });
    await this.audit.recordActor(user, {
      action: 'project.document.upload',
      resourceType: 'ProjectDocument',
      resourceId: document.id,
      organisationId: project.organisationId,
      countryNodeId: project.countryNodeId,
      metadata: { projectId: project.projectId, fileName: document.fileName, extractionStatus, sha256, integrityFlags: integrity.flags.map((flag) => flag.code) },
    });
    return document;
  }

  async listTeam(projectId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const members = await this.prisma.projectTeamMember.findMany({
      where: { projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId },
      include: { user: { select: { id: true, name: true, email: true, profile: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((member) => this.toTeamMember(member));
  }

  async listTeamCandidates(projectId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const candidates = await this.prisma.user.findMany({
      where: {
        isActive: true,
        roleAssignments: { some: { organisationId: project.organisationId, countryNodeId: project.countryNodeId, isActive: true } },
      },
      include: { roleAssignments: { where: { organisationId: project.organisationId, countryNodeId: project.countryNodeId, isActive: true } } },
      orderBy: { name: 'asc' },
    });
    return candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      roles: candidate.roleAssignments.map((assignment) => assignment.role),
    }));
  }

  async addTeamMember(projectId: string, dto: AddProjectTeamMemberDto, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const projectRole = dto.projectRole?.trim();
    if (!dto.userId || !projectRole) throw new BadRequestException('A user and project role are required');

    const candidate = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        isActive: true,
        roleAssignments: { some: { organisationId: project.organisationId, countryNodeId: project.countryNodeId, isActive: true } },
      },
    });
    if (!candidate) throw new ForbiddenException('The selected user is outside this project tenant or inactive');

    const member = await this.prisma.projectTeamMember.create({
      data: {
        projectId: project.projectId,
        userId: candidate.id,
        organisationId: project.organisationId,
        countryNodeId: project.countryNodeId,
        projectRole,
      },
      include: { user: { select: { id: true, name: true, email: true, profile: true } } },
    });
    await this.audit.recordActor(user, {
      action: 'project.team_member.add',
      resourceType: 'ProjectTeamMember',
      resourceId: member.id,
      organisationId: project.organisationId,
      countryNodeId: project.countryNodeId,
      metadata: { projectId: project.projectId, userId: candidate.id, projectRole },
    });
    return this.toTeamMember(member);
  }

  async removeTeamMember(projectId: string, memberId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const member = await this.prisma.projectTeamMember.findFirst({ where: { id: memberId, projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId } });
    if (!member) throw new NotFoundException('Project team member not found');
    await this.prisma.projectTeamMember.delete({ where: { id: member.id } });
    await this.audit.recordActor(user, {
      action: 'project.team_member.remove',
      resourceType: 'ProjectTeamMember',
      resourceId: member.id,
      organisationId: project.organisationId,
      countryNodeId: project.countryNodeId,
      metadata: { projectId: project.projectId, userId: member.userId },
    });
    return { success: true };
  }

  async listAnnouncements(projectId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    return this.prisma.projectAnnouncement.findMany({
      where: { projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId },
      include: { author: { select: { name: true } } },
      orderBy: { publishedAt: 'desc' },
    }).then((announcements) => announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      date: announcement.publishedAt.toISOString(),
      author: announcement.author.name,
      type: announcement.announcementType,
      readCount: announcement.readCount,
    })));
  }

  async createAnnouncement(projectId: string, dto: CreateProjectAnnouncementDto, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const title = dto.title?.trim();
    const body = dto.body?.trim();
    if (!title || !body || !dto.announcementType) throw new BadRequestException('Title, body, and announcement type are required.');

    const allowedTypes: Record<string, string[]> = {
      'Project Sponsor': ['Quarterly Update', 'Milestone Notice', 'Dividends Announcement'],
      'Project Manager': ['Milestone Notice'],
      'Finance Officer': ['Financial Statement', 'Dividends Announcement'],
      'Compliance Officer': ['Compliance Notice'],
      'Shariah Advisor': ['Compliance Notice'],
      'Shariah Reviewer': ['Compliance Notice'],
      'Shariah Committee': ['Compliance Notice'],
    };
    if (!allowedTypes[user.role]?.includes(dto.announcementType)) {
      throw new ForbiddenException(`Role ${user.role} cannot publish ${dto.announcementType} announcements.`);
    }

    const announcement = await this.prisma.projectAnnouncement.create({
      data: {
        projectId: project.projectId,
        organisationId: project.organisationId,
        countryNodeId: project.countryNodeId,
        authorId: user.userId,
        title,
        body,
        announcementType: dto.announcementType,
      },
      include: { author: { select: { name: true } } },
    });
    await this.audit.recordActor(user, {
      action: 'project.announcement.publish',
      resourceType: 'ProjectAnnouncement',
      resourceId: announcement.id,
      organisationId: project.organisationId,
      countryNodeId: project.countryNodeId,
      metadata: { projectId: project.projectId, announcementType: announcement.announcementType },
    });
    return {
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      date: announcement.publishedAt.toISOString(),
      author: announcement.author.name,
      type: announcement.announcementType,
      readCount: announcement.readCount,
    };
  }

  listPromotionPackages() {
    return PROJECT_PROMOTION_PACKAGES;
  }

  async listPromotions(projectId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    return this.prisma.projectPromotionCampaign.findMany({ where: { projectId: project.projectId }, include: { payment: true }, orderBy: { createdAt: 'desc' } });
  }

  async confirmPromotionPayment(projectId: string, campaignId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const campaign = await this.prisma.projectPromotionCampaign.findFirst({ where: { id: campaignId, projectId: project.projectId }, include: { payment: true } });
    if (!campaign?.payment) throw new NotFoundException('Promotion payment not found');
    if (campaign.payment.userId !== user.userId) throw new ForbiddenException('Promotion payment is not owned by this user');
    if (campaign.payment.status === 'PAID') return campaign;
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.promotionPayment.update({ where: { id: campaign.payment!.id }, data: { status: 'PAID', providerRef: `SIM-${Date.now()}` } });
      return tx.projectPromotionCampaign.update({ where: { id: campaign.id }, data: { status: 'ACTIVE', paymentStatus: 'PAID' }, include: { payment: true } });
    });
    await this.audit.recordActor(user, { action: 'project.promotion.payment_confirmed', resourceType: 'ProjectPromotionCampaign', resourceId: campaign.id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { paymentId: campaign.payment.id } });
    return updated;
  }

  async getPromotionReceipt(projectId: string, campaignId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const campaign = await this.prisma.projectPromotionCampaign.findFirst({ where: { id: campaignId, projectId: project.projectId }, include: { payment: true } });
    if (!campaign?.payment || campaign.payment.userId !== user.userId) throw new NotFoundException('Promotion receipt not found');
    if (campaign.payment.status !== 'PAID') throw new BadRequestException('Receipt is available after payment confirmation.');
    const receiptNumber = `HOW-PROMO-${campaign.payment.id.slice(-10).toUpperCase()}`;
    const organisation = await this.prisma.organisation.findUnique({ where: { id: user.organisationId }, select: { name: true } });
    const receipt: Receipt = {
      title: 'Promotion receipt',
      receiptNumber,
      issuedAt: formatLocalDateTime(campaign.payment.updatedAt, project.countryNodeId),
      billedTo: [['Name', user.name], ['Email', user.email], ['Member ID', user.userId], ...(organisation ? [['Organisation', organisation.name] as [string, string]] : [])],
      items: [{ description: `${campaign.packageName} promotion for ${project.projectName}`, amount: Number(campaign.payment.amountMYR) }],
      currency: 'MYR',
      status: campaign.payment.status,
      akad: RECEIPT_AKAD.PROJECT_PROMOTION,
      payment: [['Method', campaign.payment.method], ...(campaign.payment.providerRef ? [['Provider reference', campaign.payment.providerRef] as [string, string]] : [])],
      notes: ['This receipt confirms payment for promotional placement. It is not an investment recommendation.'],
    };
    return receipt;
  }

  async createPromotion(projectId: string, dto: CreateProjectPromotionDto, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    if (!['APPROVED', 'FUNDING_OPEN', 'POOLING', 'FUNDED'].includes(project.status)) {
      throw new BadRequestException('Project promotion is available only after Shariah, compliance and risk approval.');
    }
    const promotionPackage = PROJECT_PROMOTION_PACKAGES.find((item) => item.id === dto.packageId);
    if (!promotionPackage) throw new BadRequestException('Promotion package is not available.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.startDate)) throw new BadRequestException('Start date must use YYYY-MM-DD format.');
    if (!['RM', 'CREDITS'].includes(dto.paymentMethod)) throw new BadRequestException('Unsupported payment method.');

    const startDate = new Date(`${dto.startDate}T00:00:00.000Z`);
    if (Number.isNaN(startDate.getTime())) throw new BadRequestException('Start date is invalid.');
    const endDate = promotionPackage.durationDays ? new Date(startDate.getTime() + promotionPackage.durationDays * 86400000) : null;

    return this.prisma.$transaction(async (tx) => {
      let paymentStatus = 'PAID';
      let campaignStatus = 'ACTIVE';
      if (dto.paymentMethod === 'CREDITS' && promotionPackage.creditsCost > 0) {
        const subscription = await tx.membershipSubscription.findUnique({ where: { userId: user.userId } });
        if (!subscription || subscription.aiCreditsRemaining < promotionPackage.creditsCost) {
          throw new BadRequestException('Insufficient Wealth Pooling Credits for this promotion.');
        }
        await tx.membershipSubscription.update({ where: { userId: user.userId }, data: { aiCreditsRemaining: { decrement: promotionPackage.creditsCost } } });
        await tx.aiCreditTransaction.create({ data: { userId: user.userId, subscriptionId: subscription.id, type: 'CONSUMPTION', operationKey: 'PROJECT_PROMOTION', targetEntity: project.projectId, credits: -promotionPackage.creditsCost, balanceBefore: subscription.aiCreditsRemaining, balanceAfter: subscription.aiCreditsRemaining - promotionPackage.creditsCost } });
      } else if (dto.paymentMethod === 'RM' && promotionPackage.priceMYR > 0) {
        paymentStatus = 'PENDING';
        campaignStatus = 'PENDING_PAYMENT';
      }

      await tx.projectPromotionCampaign.updateMany({ where: { projectId: project.projectId, status: { in: ['ACTIVE', 'PENDING_PAYMENT'] } }, data: { status: 'EXPIRED' } });
      const campaign = await tx.projectPromotionCampaign.create({
        data: {
          projectId: project.projectId,
          organisationId: project.organisationId,
          countryNodeId: project.countryNodeId,
          ownerId: user.userId,
          packageId: promotionPackage.id,
          packageName: promotionPackage.title,
          badgeType: promotionPackage.badgeType,
          status: campaignStatus,
          startDate,
          endDate,
          priceMYR: promotionPackage.priceMYR,
          creditsCost: promotionPackage.creditsCost,
          paymentMethod: dto.paymentMethod,
          paymentStatus,
        },
      });
      await tx.promotionPayment.create({ data: { campaignId: campaign.id, userId: user.userId, amountMYR: promotionPackage.priceMYR, creditsCost: promotionPackage.creditsCost, method: dto.paymentMethod, status: paymentStatus } });
      await this.audit.recordActor(user, { action: 'project.promotion.create', resourceType: 'ProjectPromotionCampaign', resourceId: campaign.id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { packageId: promotionPackage.id, paymentStatus } });
      return campaign;
    });
  }

  private toTeamMember(member: { id: string; projectRole: string; user: { id: string; name: string; email: string; profile: unknown } }) {
    const profile = member.user.profile && typeof member.user.profile === 'object' ? member.user.profile as Record<string, unknown> : {};
    return {
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.projectRole,
      qualification: typeof profile.qualification === 'string' ? profile.qualification : 'Tenant user',
      avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : '',
    };
  }

  async downloadDocument(projectId: string, documentId: string, user: AuthenticatedUser) {
    const document = await this.prisma.projectDocument.findFirst({ where: { id: documentId, projectId }, include: { project: true } });
    if (!document) throw new NotFoundException('Project document not found');
    assertProjectAccess(user, document.project, 'Project document');
    this.assertProjectSponsorScope(user, document.project.projectSponsorId);
    return document;
  }

  /** Corrects a draft's details. Submitted projects are under review, so they must be returned to draft first. */
  async updateDetails(projectId: string, dto: UpdateProjectDetailsDto, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    if (project.status !== 'DRAFT') throw new ConflictException('Only a draft project can be edited. Return it to draft first.');
    const text = (value: string | undefined) => (value === undefined ? undefined : value.trim());
    const changes = Object.fromEntries(Object.entries({
      projectName: text(dto.projectName), description: text(dto.description), sector: text(dto.sector), sponsorEntityType: text(dto.sponsorEntityType),
      proposedShariahContract: text(dto.proposedShariahContract), totalProjectCost: dto.totalProjectCost, fundingRequired: dto.fundingRequired, sponsorContribution: dto.sponsorContribution,
      expectedYieldPct: dto.expectedYieldPct, tenureMonths: dto.tenureMonths, location: text(dto.location),
    }).filter(([, value]) => value !== undefined && value !== ''));
    if (!Object.keys(changes).length) throw new BadRequestException('Nothing to change.');
    // Once an asset owner and the project agreed terms, the partnership and its agreement refer to this project as it was.
    const fixed = PARTNERSHIP_FIXED_FIELDS.filter((field) => field in changes && String(changes[field] ?? '') !== String((project as Record<string, unknown>)[field] ?? ''));
    if (fixed.length) {
      const partnerships = await this.prisma.assetEngagement.findMany({ where: { projectId, status: { in: PARTNERSHIP_LOCKING } }, select: { id: true } });
      if (partnerships.length) throw new ConflictException(`The project's name, sector, Shariah contract and location are fixed: asset partnership ${partnerships.map((item) => item.id).join(', ')} was agreed on them. Register a new project for a different venture.`);
    }
    const updated = await this.prisma.project.update({ where: { projectId }, data: changes });
    const before = Object.fromEntries(Object.keys(changes).map((key) => [key, String((project as Record<string, unknown>)[key] ?? '')]));
    await this.audit.recordActor(user, { action: 'project.update', resourceType: 'Project', resourceId: projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { fields: Object.keys(changes), before } });
    return updated;
  }

  async create(dto: CreateProjectDto, user: AuthenticatedUser) {
    assertTenantScope(user, { countryNodeId: dto.countryNodeId, organisationId: dto.organisationId }, 'Target tenant');

    const organisation = await this.prisma.organisation.findFirst({
      where: { id: dto.organisationId, countryNodeId: dto.countryNodeId },
      select: { id: true },
    });
    if (!organisation) {
      throw new ForbiddenException('Organisation is outside the requested country node scope');
    }

    const project = await this.prisma.project.create({
      data: {
        projectCode: `PRJ-${dto.countryNodeId.replace(/^CN-/, '')}-${randomBytes(4).toString('hex').toUpperCase()}`,
        projectName: dto.projectName,
        description: dto.description,
        organisationId: dto.organisationId,
        countryNodeId: dto.countryNodeId,
        sector: dto.sector,
        totalProjectCost: dto.totalProjectCost,
        sponsorContribution: dto.sponsorContribution,
        fundingRequired: dto.fundingRequired,
        proposedShariahContract: dto.proposedShariahContract,
        sponsorEntityType: dto.sponsorEntityType?.trim() || null,
        ...projectTerms(dto),
        status: 'DRAFT',
        // Sponsors may only create drafts assigned to themselves.
        projectSponsorId: user.role === 'Project Sponsor' ? user.userId : dto.projectSponsorId,
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
