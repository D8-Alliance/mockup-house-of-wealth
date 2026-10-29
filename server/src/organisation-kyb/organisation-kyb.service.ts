import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { detectDocumentType } from '../kyc/kyc.service';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma.service';
import { inspectDocument } from '../projects/document-integrity';
import { KYB_DECISIONS, KYB_DOCUMENT_TYPES, OrganisationDetailsDto } from './organisation-kyb.dto';

const MAX_FILE_BYTES = 15 * 1024 * 1024;
/** Members who keep their organisation's details and documents. */
export const KYB_SUBMITTER_ROLES = ['Asset Owner', 'Asset Manager', 'Organization Admin', 'Project Sponsor', 'Project Manager'];
/** Who decides: business verification staff of the country, never for their own organisation. */
export const KYB_REVIEWER_ROLES = ['Super Admin', 'Country Admin', 'KYB Officer', 'Compliance Officer'];
const EDITABLE = ['NOT_SUBMITTED', 'CHANGES_REQUESTED', 'REJECTED'];
/** Documents needed before submitting; the others are encouraged. */
export const REQUIRED_KYB_DOCUMENTS = ['SSM_PROFILE'];

interface HistoryEntry { at: string; by: string; byName: string; role: string; action: string; note?: string }

const DOCUMENT_SELECT = { id: true, documentType: true, fileName: true, mimeType: true, fileSize: true, sha256: true, integrity: true, uploadedBy: true, createdAt: true } as const;
const ORGANISATION_SELECT = { id: true, name: true, countryNodeId: true, registrationNumber: true, registeredAddress: true, kybStatus: true, kybSubmittedAt: true, kybReviewedBy: true, kybReviewedAt: true, kybNote: true, kybHistory: true, kybDocuments: { select: DOCUMENT_SELECT, orderBy: { createdAt: 'asc' as const } } } as const;

/**
 * Business verification (KYB) of an organisation: its registration number, registered address and SSM
 * documents, decided by the country's KYB staff. Agreements take the number and address for their
 * cover page, and signing can require the organisation to be verified.
 */
@Injectable()
export class OrganisationKybService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, @Optional() private readonly notifications?: NotificationService) {}

  async mine(actor: AuthenticatedUser) {
    return this.view(await this.load(actor.organisationId));
  }

  async saveDetails(actor: AuthenticatedUser, input: OrganisationDetailsDto) {
    this.assertSubmitter(actor);
    const organisation = await this.load(actor.organisationId);
    this.assertEditable(organisation.kybStatus);
    await this.prisma.organisation.update({ where: { id: organisation.id }, data: { registrationNumber: input.registrationNumber.trim(), registeredAddress: input.registeredAddress.trim() } });
    await this.record(actor, 'organisation.kyb.details_saved', organisation.id, { registrationNumber: input.registrationNumber.trim() });
    return this.mine(actor);
  }

  async upload(actor: AuthenticatedUser, documentType: string, file: Express.Multer.File | undefined) {
    this.assertSubmitter(actor);
    if (!(KYB_DOCUMENT_TYPES as readonly string[]).includes(documentType)) throw new BadRequestException(`Choose a document type: ${KYB_DOCUMENT_TYPES.join(', ')}.`);
    if (!file) throw new BadRequestException('A PDF, JPG or PNG file is required.');
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('The file is larger than 15 MB.');
    const mimeType = detectDocumentType(file.buffer);
    if (!mimeType) throw new BadRequestException('The file is not a valid PDF, JPG or PNG. Upload the original document.');
    const organisation = await this.load(actor.organisationId);
    this.assertEditable(organisation.kybStatus);
    const integrity = inspectDocument(file.buffer);
    const document = await this.prisma.organisationKybDocument.create({ data: { organisationId: organisation.id, documentType, fileName: file.originalname.slice(0, 200), mimeType, fileSize: file.size, fileContent: file.buffer, sha256: integrity.sha256, integrity: integrity as unknown as Prisma.InputJsonValue, uploadedBy: actor.userId }, select: { id: true } });
    await this.record(actor, 'organisation.kyb.document_uploaded', organisation.id, { documentId: document.id, documentType, sha256: integrity.sha256 });
    return this.mine(actor);
  }

  async removeDocument(actor: AuthenticatedUser, documentId: string) {
    this.assertSubmitter(actor);
    const organisation = await this.load(actor.organisationId);
    this.assertEditable(organisation.kybStatus);
    const removed = await this.prisma.organisationKybDocument.deleteMany({ where: { id: documentId, organisationId: organisation.id } });
    if (!removed.count) throw new NotFoundException('Document not found.');
    await this.record(actor, 'organisation.kyb.document_removed', organisation.id, { documentId });
    return this.mine(actor);
  }

  async submit(actor: AuthenticatedUser) {
    this.assertSubmitter(actor);
    const organisation = await this.load(actor.organisationId);
    this.assertEditable(organisation.kybStatus);
    const missing = [
      ...(organisation.registrationNumber ? [] : ['the registration number']),
      ...(organisation.registeredAddress ? [] : ['the registered address']),
      ...REQUIRED_KYB_DOCUMENTS.filter((type) => !organisation.kybDocuments.some((document) => document.documentType === type)).map(() => 'the SSM company profile'),
    ];
    if (missing.length) throw new BadRequestException(`Add ${missing.join(', ')} before submitting.`);
    const resubmitted = organisation.kybStatus !== 'NOT_SUBMITTED';
    const claimed = await this.prisma.organisation.updateMany({ where: { id: organisation.id, kybStatus: organisation.kybStatus }, data: { kybStatus: 'SUBMITTED', kybSubmittedAt: new Date(), kybHistory: [...this.history(organisation), this.entry(actor, resubmitted ? 'RESUBMITTED' : 'SUBMITTED')] as unknown as Prisma.InputJsonValue } });
    if (!claimed.count) throw new ConflictException('This verification changed meanwhile. Reload and try again.');
    await this.record(actor, 'organisation.kyb.submitted', organisation.id, { resubmitted });
    await this.notifyReviewers(organisation, resubmitted);
    return this.mine(actor);
  }

  /**
   * The organisation directory for platform administration: Super Admin sees every organisation,
   * a Country Admin those of their country. People count once per organisation, however many roles they hold.
   */
  async directory(actor: AuthenticatedUser) {
    if (actor.role !== 'Super Admin' && actor.role !== 'Country Admin') throw new ForbiddenException('Only Super Admin and Country Admin see the organisation directory.');
    const scope = actor.role === 'Super Admin' ? {} : { countryNodeId: actor.countryNodeId };
    const [organisations, members] = await Promise.all([
      this.prisma.organisation.findMany({
        where: scope, orderBy: { name: 'asc' }, take: 500,
        select: { id: true, name: true, countryNodeId: true, status: true, kybStatus: true, registrationNumber: true, createdAt: true, _count: { select: { projects: true, pools: true } } },
      }),
      this.prisma.userRoleAssignment.findMany({ where: { ...scope, isActive: true }, select: { organisationId: true, userId: true }, distinct: ['organisationId', 'userId'] }),
    ]);
    const people = new Map<string, number>();
    for (const member of members) people.set(member.organisationId, (people.get(member.organisationId) ?? 0) + 1);
    return organisations.map(({ _count, ...organisation }) => ({ ...organisation, users: people.get(organisation.id) ?? 0, projects: _count.projects, pools: _count.pools }));
  }

  async queue(actor: AuthenticatedUser, status?: string) {
    this.assertReviewer(actor);
    const organisations = await this.prisma.organisation.findMany({
      where: { ...(actor.role === 'Super Admin' ? {} : { countryNodeId: actor.countryNodeId }), kybStatus: status && status !== 'ALL' ? status : { not: 'NOT_SUBMITTED' } },
      orderBy: { kybSubmittedAt: 'desc' }, take: 200, select: ORGANISATION_SELECT,
    });
    return organisations.map((organisation) => this.view(organisation));
  }

  async forReview(actor: AuthenticatedUser, organisationId: string) {
    this.assertReviewer(actor);
    const organisation = await this.load(organisationId);
    this.assertInCountry(actor, organisation);
    return this.view(organisation);
  }

  async review(actor: AuthenticatedUser, organisationId: string, decision: (typeof KYB_DECISIONS)[number], note: string) {
    this.assertReviewer(actor);
    const organisation = await this.load(organisationId);
    this.assertInCountry(actor, organisation);
    if (organisation.id === actor.organisationId) throw new ForbiddenException('You cannot verify your own organisation.');
    if (organisation.kybStatus !== 'SUBMITTED') throw new BadRequestException('This organisation is not waiting for verification.');
    const status = decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'CHANGES_REQUESTED';
    const claimed = await this.prisma.organisation.updateMany({ where: { id: organisationId, kybStatus: 'SUBMITTED' }, data: { kybStatus: status, kybReviewedBy: actor.userId, kybReviewedAt: new Date(), kybNote: note.trim(), kybHistory: [...this.history(organisation), this.entry(actor, decision, note.trim())] as unknown as Prisma.InputJsonValue } });
    if (!claimed.count) throw new ConflictException('Someone already decided this. Reload to see the decision.');
    await this.record(actor, `organisation.kyb.${decision.toLowerCase()}`, organisationId, { note: note.trim(), documents: organisation.kybDocuments.map((document) => ({ type: document.documentType, sha256: document.sha256 })) }, organisation.countryNodeId);
    await this.notifyMembers(organisation, status, note.trim());
    return this.view(await this.load(organisationId));
  }

  async download(actor: AuthenticatedUser, organisationId: string, documentId: string) {
    const organisation = await this.load(organisationId);
    if (organisation.id !== actor.organisationId) {
      this.assertReviewer(actor);
      this.assertInCountry(actor, organisation);
    }
    const document = await this.prisma.organisationKybDocument.findFirst({ where: { id: documentId, organisationId }, select: { fileName: true, mimeType: true, fileContent: true } });
    if (!document) throw new NotFoundException('Document not found.');
    await this.record(actor, 'organisation.kyb.document_downloaded', organisationId, { documentId }, organisation.countryNodeId);
    return document;
  }

  private async load(organisationId: string) {
    const organisation = await this.prisma.organisation.findUnique({ where: { id: organisationId }, select: ORGANISATION_SELECT });
    if (!organisation) throw new NotFoundException('Organisation not found.');
    return organisation;
  }

  private view(organisation: Awaited<ReturnType<OrganisationKybService['load']>>) {
    const missing = [
      ...(organisation.registrationNumber ? [] : ['registrationNumber']),
      ...(organisation.registeredAddress ? [] : ['registeredAddress']),
      ...REQUIRED_KYB_DOCUMENTS.filter((type) => !organisation.kybDocuments.some((document) => document.documentType === type)),
    ];
    return {
      ...organisation,
      kybSubmittedAt: organisation.kybSubmittedAt?.toISOString() ?? null,
      kybReviewedAt: organisation.kybReviewedAt?.toISOString() ?? null,
      kybDocuments: organisation.kybDocuments.map((document) => ({ ...document, createdAt: document.createdAt.toISOString() })),
      missing,
      canEdit: EDITABLE.includes(organisation.kybStatus),
    };
  }

  private assertSubmitter(actor: AuthenticatedUser) {
    if (!KYB_SUBMITTER_ROLES.includes(actor.role)) throw new ForbiddenException('Only members who manage the organisation can change its verification.');
  }

  private assertReviewer(actor: AuthenticatedUser) {
    if (!KYB_REVIEWER_ROLES.includes(actor.role)) throw new ForbiddenException('Only KYB reviewers can do this.');
  }

  private assertInCountry(actor: AuthenticatedUser, organisation: { countryNodeId: string }) {
    if (actor.role !== 'Super Admin' && organisation.countryNodeId !== actor.countryNodeId) throw new ForbiddenException('This organisation is in another country.');
  }

  private assertEditable(status: string) {
    if (!EDITABLE.includes(status)) throw new ConflictException(status === 'APPROVED' ? 'The organisation is verified. Ask a KYB reviewer to reopen it to change its details.' : 'The verification is with a reviewer. Wait for the decision before changing it.');
  }

  private history(organisation: { kybHistory: unknown }): HistoryEntry[] {
    return Array.isArray(organisation.kybHistory) ? organisation.kybHistory as HistoryEntry[] : [];
  }

  private entry(actor: AuthenticatedUser, action: string, note?: string): HistoryEntry {
    return { at: new Date().toISOString(), by: actor.userId, byName: actor.name, role: actor.role, action, ...(note ? { note } : {}) };
  }

  private record(actor: AuthenticatedUser, action: string, organisationId: string, metadata: Record<string, unknown>, countryNodeId = actor.countryNodeId) {
    return this.audit.recordActor(actor, { action, resourceType: 'Organisation', resourceId: organisationId, organisationId: actor.organisationId, countryNodeId, metadata });
  }

  private async notifyReviewers(organisation: { id: string; name: string; countryNodeId: string }, resubmitted: boolean) {
    if (!this.notifications) return;
    const reviewers = await this.prisma.userRoleAssignment.findMany({ where: { role: { in: ['Country_Admin', 'KYB_Officer', 'Compliance_Officer'] as PrismaUserRole[] }, isActive: true, countryNodeId: organisation.countryNodeId, organisationId: { not: organisation.id } }, select: { userId: true, organisationId: true } });
    const stamp = Date.now();
    await Promise.all([...new Map(reviewers.map((reviewer) => [`${reviewer.userId}|${reviewer.organisationId}`, reviewer])).values()].map((reviewer) => this.notifications!.enqueue({
      recipientUserId: reviewer.userId, organisationId: reviewer.organisationId, countryNodeId: organisation.countryNodeId, type: 'ORGANISATION_KYB',
      title: resubmitted ? 'Organisation verification corrected' : 'Organisation to verify (KYB)',
      message: `${organisation.name} ${resubmitted ? 'sent the corrections you asked for' : 'submitted its registration details and documents'}.`,
      resourceType: 'OrganisationKyb', resourceId: organisation.id, dedupeKey: `org-kyb:${organisation.id}:${reviewer.userId}:${reviewer.organisationId}:${stamp}`,
    }).catch(() => undefined)));
  }

  private async notifyMembers(organisation: { id: string; name: string; countryNodeId: string }, status: string, note: string) {
    if (!this.notifications) return;
    const members = await this.prisma.userRoleAssignment.findMany({ where: { organisationId: organisation.id, isActive: true, role: { in: ['Asset_Owner', 'Asset_Manager', 'Organization_Admin', 'Project_Sponsor', 'Project_Manager'] as PrismaUserRole[] } }, select: { userId: true } });
    const title = status === 'APPROVED' ? 'Organisation verified (KYB)' : status === 'REJECTED' ? 'Organisation verification rejected' : 'Organisation verification: changes requested';
    const stamp = Date.now();
    await Promise.all([...new Set(members.map((member) => member.userId))].map((userId) => this.notifications!.enqueue({
      recipientUserId: userId, organisationId: organisation.id, countryNodeId: organisation.countryNodeId, type: 'ORGANISATION_KYB',
      title, message: `${organisation.name}: ${note}`, resourceType: 'OrganisationKyb', resourceId: organisation.id, dedupeKey: `org-kyb-decision:${organisation.id}:${userId}:${stamp}`,
    }).catch(() => undefined)));
  }
}
