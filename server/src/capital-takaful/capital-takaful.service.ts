import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { detectDocumentType } from '../kyc/kyc.service';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma.service';
import { inspectDocument } from '../projects/document-integrity';
import { isProjectLocked } from '../projects/project-lock';
import { CapitalPledgeDto, ProjectRiskFlagsDto, SAFEGUARD_DECISIONS, TakafulPolicyDto } from './capital-takaful.dto';
import { safeguardFacts } from './safeguard-facts';
import { EXPIRY_REMINDER_DAYS } from './safeguard-rules';

const MAX_FILE_BYTES = 15 * 1024 * 1024;
/** The sponsor's side: who pledges capital, gives evidence and uploads policies. */
export const SAFEGUARD_MANAGER_ROLES = ['Project Sponsor', 'Project Manager', 'Organization Admin', 'Super Admin'];
/** Finance checks the evidence of funds and records deposits. */
export const CAPITAL_REVIEWER_ROLES = ['Finance Officer', 'Country Admin', 'Super Admin'];
/** Risk checks takaful policies; Compliance stands in where a country has no Risk Officer. */
export const TAKAFUL_REVIEWER_ROLES = ['Risk Officer', 'Compliance Officer', 'Country Admin', 'Super Admin'];
/** An asset owner may upload the cover it bears for its own asset (the lessor's cover under Ijarah). */
const ASSET_OWNER_ROLES = ['Asset Owner', 'Asset Manager', 'Organization Admin'];
const CLOSED = ['COMPLETED', 'REJECTED'];

interface HistoryEntry { at: string; by: string; byName: string; role: string; action: string; note?: string }
type Decision = (typeof SAFEGUARD_DECISIONS)[number];

const COMMITMENT_SELECT = { id: true, source: true, partyName: true, amount: true, currency: true, status: true, evidenceFileName: true, evidenceSha256: true, evidencedAt: true, depositReference: true, depositedAt: true, reviewNote: true, history: true, createdAt: true } as const;
const POLICY_SELECT = { id: true, coverType: true, assetId: true, provider: true, policyNumber: true, sumCovered: true, contribution: true, currency: true, startDate: true, endDate: true, lossPayee: true, conventional: true, shariahApprovalNote: true, fileName: true, sha256: true, integrity: true, status: true, verifiedAt: true, reviewNote: true, uploadedBy: true, createdAt: true } as const;

/**
 * The sponsor's capital (pledged, proved, deposited) and the project's takaful cover: the conditions for
 * inviting investors and releasing their money. Finance and Risk staff of the country decide, never for
 * their own organisation.
 */
@Injectable()
export class CapitalTakafulService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, @Optional() private readonly notifications?: NotificationService) {}

  async view(actor: AuthenticatedUser, projectId: string) {
    const { project, access } = await this.load(actor, projectId);
    const [facts, commitments, policies, assets] = await Promise.all([
      safeguardFacts(this.prisma, projectId),
      this.prisma.projectCapitalCommitment.findMany({ where: { projectId }, select: COMMITMENT_SELECT, orderBy: { createdAt: 'asc' } }),
      this.prisma.takafulPolicy.findMany({ where: { projectId }, select: POLICY_SELECT, orderBy: { createdAt: 'desc' } }),
      this.prisma.assetEngagement.findMany({ where: { projectId, status: { in: ['ACCEPTED', 'APPROVED'] } }, select: { asset: { select: { id: true, name: true, organisationId: true } } } }),
    ]);
    return {
      project: { projectId: project.projectId, projectName: project.projectName, status: project.status },
      facts, commitments, policies,
      assets: assets.map((item) => ({ assetId: item.asset.id, name: item.asset.name, mine: item.asset.organisationId === actor.organisationId })),
      access,
    };
  }

  async setRiskFlags(actor: AuthenticatedUser, projectId: string, input: ProjectRiskFlagsDto) {
    const { project } = await this.load(actor, projectId, 'manage');
    if (isProjectLocked(project.status)) throw new ConflictException('The project is approved: its site and worker details are fixed. A Country Admin can reopen it.');
    await this.prisma.project.update({ where: { projectId }, data: { hasSiteWork: input.hasSiteWork, hasWorkers: input.hasWorkers } });
    await this.record(actor, 'project.risk_flags', projectId, project, { hasSiteWork: input.hasSiteWork, hasWorkers: input.hasWorkers });
    return this.view(actor, projectId);
  }

  // ---- Capital ----

  async pledge(actor: AuthenticatedUser, projectId: string, input: CapitalPledgeDto) {
    const { project, currency } = await this.load(actor, projectId, 'manage');
    if (CLOSED.includes(project.status)) throw new ConflictException('The project is closed.');
    const id = `CAP-${project.countryNodeId.replace(/^CN-/, '')}-${randomBytes(4).toString('hex').toUpperCase()}`;
    await this.prisma.projectCapitalCommitment.create({ data: { id, projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, source: input.source, partyName: input.partyName, amount: input.amount, currency, history: [this.entry(actor, 'PLEDGED', `${currency} ${input.amount}`)] as unknown as Prisma.InputJsonValue, createdBy: actor.userId } });
    await this.record(actor, 'capital.pledged', projectId, project, { commitmentId: id, source: input.source, amount: input.amount, currency });
    return this.view(actor, projectId);
  }

  async removePledge(actor: AuthenticatedUser, projectId: string, commitmentId: string) {
    const { project } = await this.load(actor, projectId, 'manage');
    const commitment = await this.commitment(projectId, commitmentId);
    if (!['PLEDGED', 'REJECTED'].includes(commitment.status)) throw new ConflictException('Only a pledge without evidence under review, proved or deposited can be removed.');
    if (isProjectLocked(project.status)) throw new ConflictException('The project is approved: its capital can no longer be removed.');
    await this.prisma.projectCapitalCommitment.delete({ where: { id: commitmentId } });
    await this.record(actor, 'capital.removed', projectId, project, { commitmentId });
    return this.view(actor, projectId);
  }

  async uploadEvidence(actor: AuthenticatedUser, projectId: string, commitmentId: string, file: Express.Multer.File | undefined) {
    const { project } = await this.load(actor, projectId, 'manage');
    const commitment = await this.commitment(projectId, commitmentId);
    if (!['PLEDGED', 'REJECTED'].includes(commitment.status)) throw new ConflictException('Evidence is already with Finance or accepted.');
    const { mimeType, integrity } = this.checkFile(file);
    const claimed = await this.prisma.projectCapitalCommitment.updateMany({
      where: { id: commitmentId, status: commitment.status },
      data: { status: 'EVIDENCE_SUBMITTED', evidenceFileName: file!.originalname.slice(0, 200), evidenceMimeType: mimeType, evidenceContent: file!.buffer, evidenceSha256: integrity.sha256, reviewNote: null, history: [...this.history(commitment), this.entry(actor, 'EVIDENCE_SUBMITTED', file!.originalname.slice(0, 200))] as unknown as Prisma.InputJsonValue },
    });
    if (!claimed.count) throw new ConflictException('The pledge was changed by someone else. Reload and try again.');
    await this.record(actor, 'capital.evidence_submitted', projectId, project, { commitmentId, sha256: integrity.sha256 });
    await this.notifyReviewers(project, ['Finance_Officer', 'Country_Admin'], 'Evidence of funds to check', `${project.projectName}: ${commitment.partyName} gave evidence of ${commitment.currency} ${Number(commitment.amount).toLocaleString('en-MY')}.`, `capital:${commitmentId}:${Date.now()}`);
    return this.view(actor, projectId);
  }

  async reviewCapital(actor: AuthenticatedUser, projectId: string, commitmentId: string, decision: Decision, note: string) {
    const { project } = await this.load(actor, projectId, 'review-capital');
    const commitment = await this.commitment(projectId, commitmentId);
    if (commitment.status !== 'EVIDENCE_SUBMITTED') throw new ConflictException('There is no evidence waiting for a decision.');
    const status = decision === 'VERIFY' ? 'EVIDENCED' : 'REJECTED';
    const claimed = await this.prisma.projectCapitalCommitment.updateMany({
      where: { id: commitmentId, status: 'EVIDENCE_SUBMITTED' },
      data: { status, reviewNote: note, ...(status === 'EVIDENCED' ? { evidencedBy: actor.userId, evidencedAt: new Date() } : {}), history: [...this.history(commitment), this.entry(actor, status, note)] as unknown as Prisma.InputJsonValue },
    });
    if (!claimed.count) throw new ConflictException('Someone else decided first. Reload.');
    await this.record(actor, `capital.${decision === 'VERIFY' ? 'evidenced' : 'rejected'}`, projectId, project, { commitmentId, note, sha256: commitment.evidenceSha256 });
    await this.notifyProject(project, decision === 'VERIFY' ? 'Capital proved' : 'Evidence of funds not accepted', `${commitment.partyName}: ${note}`, `capital-decision:${commitmentId}:${status}`);
    return this.view(actor, projectId);
  }

  /** Finance records that the money reached the project account, with the bank's reference. */
  async recordDeposit(actor: AuthenticatedUser, projectId: string, commitmentId: string, reference: string) {
    const { project } = await this.load(actor, projectId, 'review-capital');
    const commitment = await this.commitment(projectId, commitmentId);
    if (commitment.status !== 'EVIDENCED') throw new ConflictException('Only proved capital can be recorded as deposited.');
    const claimed = await this.prisma.projectCapitalCommitment.updateMany({
      where: { id: commitmentId, status: 'EVIDENCED' },
      data: { status: 'DEPOSITED', depositReference: reference, depositedBy: actor.userId, depositedAt: new Date(), history: [...this.history(commitment), this.entry(actor, 'DEPOSITED', reference)] as unknown as Prisma.InputJsonValue },
    });
    if (!claimed.count) throw new ConflictException('Someone else recorded it first. Reload.');
    await this.record(actor, 'capital.deposited', projectId, project, { commitmentId, reference, amount: Number(commitment.amount) });
    await this.notifyProject(project, 'Capital deposited', `${commitment.partyName}: ${commitment.currency} ${Number(commitment.amount).toLocaleString('en-MY')} recorded as deposited (${reference}).`, `capital-deposit:${commitmentId}`);
    return this.view(actor, projectId);
  }

  async evidence(actor: AuthenticatedUser, projectId: string, commitmentId: string) {
    await this.load(actor, projectId);
    const commitment = await this.prisma.projectCapitalCommitment.findFirst({ where: { id: commitmentId, projectId }, select: { evidenceFileName: true, evidenceMimeType: true, evidenceContent: true } });
    if (!commitment?.evidenceContent) throw new NotFoundException('No evidence uploaded.');
    return { fileName: commitment.evidenceFileName ?? 'evidence', mimeType: commitment.evidenceMimeType ?? 'application/octet-stream', fileContent: commitment.evidenceContent };
  }

  // ---- Takaful ----

  async addPolicy(actor: AuthenticatedUser, projectId: string, input: TakafulPolicyDto, file: Express.Multer.File | undefined) {
    const { project, access, currency } = await this.load(actor, projectId);
    const ownAsset = input.assetId ? await this.prisma.assetEngagement.findFirst({ where: { projectId, assetId: input.assetId, status: { in: ['ACCEPTED', 'APPROVED'] } }, select: { asset: { select: { organisationId: true } } } }) : null;
    if (input.assetId && !ownAsset) throw new BadRequestException('That asset is not in an agreed partnership of this project.');
    if (!access.manage && !(ownAsset && ownAsset.asset.organisationId === actor.organisationId && ASSET_OWNER_ROLES.includes(actor.role))) throw new ForbiddenException('Only the project\'s sponsor, or the owner for its own asset, can add a policy.');
    const start = new Date(input.startDate), end = new Date(input.endDate);
    if (!(end > start)) throw new BadRequestException('The policy must end after it starts.');
    if (input.conventional && !input.shariahApprovalNote?.trim()) throw new BadRequestException('Conventional insurance is accepted only where no takaful is available, with the Shariah adviser\'s written approval: say who approved it and when.');
    const { mimeType, integrity } = this.checkFile(file);
    const id = `TKF-${project.countryNodeId.replace(/^CN-/, '')}-${randomBytes(4).toString('hex').toUpperCase()}`;
    await this.prisma.takafulPolicy.create({ data: {
      id, projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, coverType: input.coverType, assetId: input.assetId || null,
      provider: input.provider, policyNumber: input.policyNumber, sumCovered: input.sumCovered, contribution: input.contribution ?? null, currency,
      startDate: start, endDate: end, lossPayee: input.lossPayee, conventional: input.conventional, shariahApprovalNote: input.shariahApprovalNote?.trim() || null,
      fileName: file!.originalname.slice(0, 200), mimeType, fileContent: file!.buffer, sha256: integrity.sha256, integrity: integrity as unknown as Prisma.InputJsonValue, uploadedBy: actor.userId,
    } });
    await this.record(actor, 'takaful.policy_added', projectId, project, { policyId: id, coverType: input.coverType, assetId: input.assetId, sumCovered: input.sumCovered, endDate: input.endDate, conventional: input.conventional, sha256: integrity.sha256 });
    // Risk Officers decide; where a country has none, Compliance and the Country Admin stand in.
    const risk = await this.prisma.userRoleAssignment.count({ where: { role: 'Risk_Officer', isActive: true, countryNodeId: project.countryNodeId } });
    await this.notifyReviewers(project, risk ? ['Risk_Officer'] : ['Compliance_Officer', 'Country_Admin'], 'Takaful policy to verify', `${project.projectName}: ${input.provider} policy ${input.policyNumber}${input.conventional ? ' (conventional, with Shariah approval)' : ''}.`, `takaful:${id}`);
    return this.view(actor, projectId);
  }

  async reviewPolicy(actor: AuthenticatedUser, projectId: string, policyId: string, decision: Decision, note: string) {
    const { project } = await this.load(actor, projectId, 'review-takaful');
    const policy = await this.prisma.takafulPolicy.findFirst({ where: { id: policyId, projectId }, select: { status: true, provider: true, policyNumber: true, sha256: true } });
    if (!policy) throw new NotFoundException('Policy not found.');
    if (policy.status !== 'SUBMITTED') throw new ConflictException('This policy was already decided.');
    const status = decision === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
    const claimed = await this.prisma.takafulPolicy.updateMany({ where: { id: policyId, status: 'SUBMITTED' }, data: { status, reviewNote: note, verifiedBy: actor.userId, verifiedAt: new Date() } });
    if (!claimed.count) throw new ConflictException('Someone else decided first. Reload.');
    await this.record(actor, `takaful.${status.toLowerCase()}`, projectId, project, { policyId, note, sha256: policy.sha256 });
    await this.notifyProject(project, decision === 'VERIFY' ? 'Takaful policy verified' : 'Takaful policy not accepted', `${policy.provider} ${policy.policyNumber}: ${note}`, `takaful-decision:${policyId}`);
    return this.view(actor, projectId);
  }

  async policyDocument(actor: AuthenticatedUser, projectId: string, policyId: string) {
    await this.load(actor, projectId);
    const policy = await this.prisma.takafulPolicy.findFirst({ where: { id: policyId, projectId }, select: { fileName: true, mimeType: true, fileContent: true } });
    if (!policy) throw new NotFoundException('Policy not found.');
    return policy;
  }

  /** What Finance and Risk staff of the actor's country have to decide. */
  async queue(actor: AuthenticatedUser) {
    const country = actor.role === 'Super Admin' ? {} : { countryNodeId: actor.countryNodeId };
    const notOwn = actor.role === 'Super Admin' ? {} : { organisationId: { not: actor.organisationId } };
    const [capital, policies] = await Promise.all([
      CAPITAL_REVIEWER_ROLES.includes(actor.role) ? this.prisma.projectCapitalCommitment.findMany({ where: { ...country, ...notOwn, status: { in: ['EVIDENCE_SUBMITTED', 'EVIDENCED'] } }, select: { id: true, projectId: true, partyName: true, amount: true, currency: true, status: true, updatedAt: true, project: { select: { projectName: true } } }, orderBy: { updatedAt: 'asc' } }) : [],
      TAKAFUL_REVIEWER_ROLES.includes(actor.role) ? this.prisma.takafulPolicy.findMany({ where: { ...country, ...notOwn, status: 'SUBMITTED' }, select: { id: true, projectId: true, coverType: true, provider: true, policyNumber: true, sumCovered: true, currency: true, conventional: true, createdAt: true, project: { select: { projectName: true } } }, orderBy: { createdAt: 'asc' } }) : [],
    ]);
    return { capital, policies };
  }

  /** Daily: reminds the project of cover ending in 30, 14 and 7 days, once each, and of cover that lapsed. */
  async remindExpiring(now = new Date()) {
    const day = 86_400_000;
    const policies = await this.prisma.takafulPolicy.findMany({ where: { status: 'VERIFIED', endDate: { lte: new Date(now.getTime() + EXPIRY_REMINDER_DAYS[0] * day), gte: new Date(now.getTime() - day) } }, select: { id: true, projectId: true, provider: true, policyNumber: true, endDate: true, remindersSent: true, project: { select: { projectName: true, organisationId: true, countryNodeId: true } } } });
    let sent = 0;
    for (const policy of policies) {
      const daysLeft = Math.ceil((policy.endDate.getTime() - now.getTime()) / day);
      const due = daysLeft <= 0 ? 0 : [...EXPIRY_REMINDER_DAYS].reverse().find((threshold) => daysLeft <= threshold);
      const done = Array.isArray(policy.remindersSent) ? (policy.remindersSent as number[]) : [];
      if (due === undefined || done.includes(due)) continue;
      await this.prisma.takafulPolicy.update({ where: { id: policy.id }, data: { remindersSent: [...done, due] } });
      await this.notifyProject({ ...policy.project, projectId: policy.projectId }, due === 0 ? 'Takaful cover lapsed' : `Takaful cover ends in ${daysLeft} days`, `${policy.project.projectName}: ${policy.provider} ${policy.policyNumber} ${due === 0 ? 'has ended. Funds are not released until renewed cover is verified.' : `ends on ${policy.endDate.toISOString().slice(0, 10)}. Upload the renewal before then.`}`, `takaful-expiry:${policy.id}:${due}`);
      sent += 1;
    }
    return sent;
  }

  // ---- helpers ----

  private async load(actor: AuthenticatedUser, projectId: string, need?: 'manage' | 'review-capital' | 'review-takaful') {
    const project = await this.prisma.project.findUnique({ where: { projectId }, select: { projectId: true, projectName: true, status: true, organisationId: true, countryNodeId: true, countryNode: { select: { currency: true } } } });
    if (!project) throw new NotFoundException('Project not found.');
    const superAdmin = actor.role === 'Super Admin';
    const sameCountry = superAdmin || actor.countryNodeId === project.countryNodeId;
    const ownOrg = actor.organisationId === project.organisationId;
    const partner = await this.prisma.assetEngagement.count({ where: { projectId, status: { in: ['ACCEPTED', 'APPROVED'] }, ownerOrganisationId: actor.organisationId } });
    const access = {
      manage: superAdmin || (ownOrg && SAFEGUARD_MANAGER_ROLES.includes(actor.role)),
      reviewCapital: sameCountry && CAPITAL_REVIEWER_ROLES.includes(actor.role) && (superAdmin || !ownOrg),
      reviewTakaful: sameCountry && TAKAFUL_REVIEWER_ROLES.includes(actor.role) && (superAdmin || !ownOrg),
      assetOwner: partner > 0,
    };
    if (!(access.manage || access.reviewCapital || access.reviewTakaful || access.assetOwner || (ownOrg && sameCountry))) throw new ForbiddenException('This project is outside your scope.');
    if (need === 'manage' && !access.manage) throw new ForbiddenException('Only the project\'s sponsor can do this.');
    if (need === 'review-capital' && !access.reviewCapital) throw new ForbiddenException(ownOrg ? 'You cannot decide on your own organisation\'s capital.' : 'Only Finance staff of the project\'s country can decide.');
    if (need === 'review-takaful' && !access.reviewTakaful) throw new ForbiddenException(ownOrg ? 'You cannot verify your own organisation\'s cover.' : 'Only Risk or Compliance staff of the project\'s country can verify cover.');
    return { project, access, currency: project.countryNode?.currency ?? 'MYR' };
  }

  private async commitment(projectId: string, id: string) {
    const commitment = await this.prisma.projectCapitalCommitment.findFirst({ where: { id, projectId } });
    if (!commitment) throw new NotFoundException('Capital commitment not found.');
    return commitment;
  }

  private checkFile(file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) throw new BadRequestException('Attach the document (PDF, JPG or PNG).');
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('The file is larger than 15 MB.');
    const mimeType = detectDocumentType(file.buffer);
    if (!mimeType) throw new BadRequestException('Only PDF, JPG or PNG files are accepted.');
    return { mimeType, integrity: inspectDocument(file.buffer) };
  }

  private history(item: { history: unknown }): HistoryEntry[] {
    return Array.isArray(item.history) ? (item.history as HistoryEntry[]) : [];
  }

  private entry(actor: AuthenticatedUser, action: string, note?: string): HistoryEntry {
    return { at: new Date().toISOString(), by: actor.userId, byName: actor.name, role: actor.role, action, ...(note ? { note } : {}) };
  }

  private record(actor: AuthenticatedUser, action: string, projectId: string, project: { organisationId: string; countryNodeId: string }, metadata: Record<string, unknown>) {
    return this.audit.recordActor(actor, { action, resourceType: 'Project', resourceId: projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata });
  }

  private async notifyReviewers(project: { projectId: string; organisationId: string; countryNodeId: string }, roles: string[], title: string, message: string, key: string) {
    if (!this.notifications) return;
    const reviewers = await this.prisma.userRoleAssignment.findMany({ where: { role: { in: roles as PrismaUserRole[] }, isActive: true, countryNodeId: project.countryNodeId, organisationId: { not: project.organisationId } }, select: { userId: true, organisationId: true } });
    await Promise.all([...new Map(reviewers.map((item) => [`${item.userId}|${item.organisationId}`, item])).values()].map((reviewer) => this.notifications!.enqueue({
      recipientUserId: reviewer.userId, organisationId: reviewer.organisationId, countryNodeId: project.countryNodeId, type: 'PROJECT_SAFEGUARD', title, message,
      resourceType: 'ProjectSafeguardReview', resourceId: project.projectId, dedupeKey: `${key}:${reviewer.userId}:${reviewer.organisationId}`,
    })));
  }

  private async notifyProject(project: { projectId: string; organisationId: string; countryNodeId: string }, title: string, message: string, key: string) {
    if (!this.notifications) return;
    const members = await this.prisma.userRoleAssignment.findMany({ where: { organisationId: project.organisationId, isActive: true, role: { in: ['Project_Sponsor', 'Project_Manager', 'Organization_Admin'] as PrismaUserRole[] } }, select: { userId: true } });
    await Promise.all([...new Set(members.map((item) => item.userId))].map((userId) => this.notifications!.enqueue({
      recipientUserId: userId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, type: 'PROJECT_SAFEGUARD', title, message,
      resourceType: 'ProjectSafeguard', resourceId: project.projectId, dedupeKey: `${key}:${userId}`,
    })));
  }
}
