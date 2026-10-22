import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AiService } from '../ai/ai.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';
import { ContractClauseRetriever } from '../ai/contract-clause-retriever.service';
import { AGREEMENT_TYPES, AgreementPartyActionDto, AgreementReviewDto, AgreementType, AgreementWizardDto } from './agreement.dto';
import { agreementTypeBlocker, availableActions, canSeeAgreement, DRAFTER_ROLES, isAgreementReviewer, partyActions, reviewBlocker } from './agreement-review-rules';
import { NotificationService } from '../notifications/notification.service';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { getJurisdictionProfile } from './jurisdiction-profiles';
import { agreementTextChecks } from './agreement-text-checks';
import { entryHash } from '../asset-partnerships/engagement-record';
import { NOTE_READS_AS_REFUSAL } from '../asset-partnerships/partnership-review-checks';
import { AgreementSigningService } from './signing/agreement-signing.service';

type Section = { number: string; title: string; paragraphs: string[] };

/** "profitSharing" → "Profit sharing", for the schedule of commercial inputs. */
const humanise = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase().replace(/^./, (first) => first.toUpperCase());

const labels: Record<AgreementType, string> = { IJARAH: 'Ijarah Agreement', MUSHARAKAH: 'Musharakah Joint Venture Agreement', MUDARABAH: 'Mudarabah Agreement', WAKALAH: 'Wakalah Agreement', SUKUK: 'Sukuk Structure Document' };

@Injectable()
export class AgreementGenerationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly retriever: ContractClauseRetriever, private readonly ai: AiService, @Optional() private readonly notifications?: NotificationService, @Optional() private readonly signing?: AgreementSigningService) {}

  async createDraft(actor: AuthenticatedUser, input: AgreementWizardDto) {
    if (!(DRAFTER_ROLES as readonly string[]).includes(actor.role)) throw new ForbiddenException('Only project sponsors, project managers, asset owners and administrators can draft agreements.');
    const typeBlocked = agreementTypeBlocker(actor.role, input.contractType);
    if (typeBlocked) throw new ForbiddenException(typeBlocked);
    if (input.engagementId) return this.draftForPartnership(actor, input, input.engagementId);
    if (input.projectId) {
      const project = await this.prisma.project.findUnique({ where: { projectId: input.projectId }, select: { organisationId: true, countryNodeId: true } });
      if (!project) throw new NotFoundException('Project not found.');
      assertTenantScope(actor, project, 'Project');
    }
    const { content, compliance, sections, clauses, rules, aiSkippedReason } = await this.compose(actor, input);
    const contract = await this.prisma.contract.create({ data: { ...this.scope(actor), contractNumber: this.newContractNumber(), contractType: input.contractType, title: labels[input.contractType], templateId: input.templateId, status: 'DRAFT', wizardData: input.wizardData as object, complianceReport: compliance as object, createdBy: actor.userId, versions: { create: { version: 1, content, status: 'DRAFT', createdBy: actor.userId } }, events: { create: { eventType: 'DRAFT_CREATED', toStatus: 'DRAFT', actorId: actor.userId, metadata: { contractType: input.contractType } } } }, include: { versions: true } });
    await this.auditRecord(actor, 'agreement.draft_created', contract.id, { contractType: input.contractType, complianceStatus: compliance.status, approvedClauseCount: clauses.length, aiSkippedReason });
    return { contract, compliance, sections, variables: this.variables(input.wizardData), approvedClauses: clauses, shariahRules: rules };
  }

  /**
   * An approved asset partnership has one agreement. Either side drafts it; a later draft from either
   * side becomes a new version of the same agreement while it is a draft or sent back for changes.
   * The side that writes a version agrees to it; the other side must agree too before legal review.
   */
  private async draftForPartnership(actor: AuthenticatedUser, input: AgreementWizardDto, engagementId: string) {
    const engagement = await this.prisma.assetEngagement.findUnique({ where: { id: engagementId }, select: { id: true, status: true, akad: true, countryNodeId: true, ownerOrganisationId: true, pdpOrganisationId: true, asset: { select: { name: true } }, project: { select: { projectName: true } } } });
    if (!engagement) throw new NotFoundException('Asset partnership not found.');
    const side = actor.organisationId === engagement.ownerOrganisationId ? 'OWNER' : actor.organisationId === engagement.pdpOrganisationId ? 'PDP' : null;
    if (!side || actor.countryNodeId !== engagement.countryNodeId) throw new ForbiddenException('Only the asset owner or the delivery partner of this partnership can draft its agreement.');
    if (engagement.status !== 'APPROVED') throw new BadRequestException('The partnership must be approved by Legal and Shariah before its agreement is drafted.');
    if (input.contractType !== engagement.akad) throw new BadRequestException(`This partnership was agreed as ${labels[engagement.akad as AgreementType] ?? engagement.akad}; draft that agreement.`);
    const existing = await this.prisma.contract.findUnique({ where: { engagementId }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
    if (existing && !['DRAFT', 'CHANGES_REQUESTED'].includes(existing.status)) throw new ConflictException(`The agreement for this partnership (${existing.contractNumber}) is already past drafting and can no longer be revised.`);
    const { content, compliance, sections, clauses, rules, aiSkippedReason } = await this.compose(actor, input);
    const now = new Date();
    const consent = (version: number) => ({ consentedVersion: version, consentedAt: now, consentedBy: actor.userId });
    let contract: { id: string; contractNumber: string };
    let version = 1;
    if (!existing) {
      const organisations = await this.prisma.organisation.findMany({ where: { id: { in: [engagement.ownerOrganisationId, engagement.pdpOrganisationId] } }, select: { id: true, name: true } });
      const nameOf = (id: string) => organisations.find((organisation) => organisation.id === id)?.name ?? id;
      const ijarah = engagement.akad === 'IJARAH';
      contract = await this.prisma.contract.create({ data: {
        organisationId: actor.organisationId, countryNodeId: engagement.countryNodeId, engagementId, contractNumber: this.newContractNumber(), contractType: input.contractType, title: labels[input.contractType], templateId: input.templateId, status: 'DRAFT', wizardData: input.wizardData as object, complianceReport: compliance as object, createdBy: actor.userId,
        versions: { create: { version: 1, content, status: 'DRAFT', createdBy: actor.userId } },
        parties: { create: [
          { partyType: ijarah ? 'LESSOR' : 'PARTNER', role: 'OWNER', displayName: nameOf(engagement.ownerOrganisationId), organisationId: engagement.ownerOrganisationId, ...(side === 'OWNER' ? consent(1) : {}) },
          { partyType: ijarah ? 'LESSEE' : 'PARTNER', role: 'PDP', displayName: nameOf(engagement.pdpOrganisationId), organisationId: engagement.pdpOrganisationId, ...(side === 'PDP' ? consent(1) : {}) },
        ] },
        events: { create: { eventType: 'DRAFT_CREATED', toStatus: 'DRAFT', actorId: actor.userId, metadata: { contractType: input.contractType, engagementId, role: actor.role, note: `Drafted by the ${side === 'OWNER' ? 'asset owner' : 'delivery partner'}` } } },
      } });
    } else {
      version = (existing.versions[0]?.version ?? 0) + 1;
      contract = await this.prisma.$transaction(async (tx) => {
        await tx.contractVersion.create({ data: { contractId: existing.id, version, content, status: 'DRAFT', createdBy: actor.userId } });
        await tx.contractParty.updateMany({ where: { contractId: existing.id, role: side }, data: consent(version) });
        await tx.contractEvent.create({ data: { contractId: existing.id, eventType: 'REVISED', fromStatus: existing.status, toStatus: existing.status, actorId: actor.userId, metadata: { version, role: actor.role, note: `Version ${version} by the ${side === 'OWNER' ? 'asset owner' : 'delivery partner'}` } } });
        return tx.contract.update({ where: { id: existing.id }, data: { wizardData: input.wizardData as object, complianceReport: compliance as object, lastGeneratedAt: now } });
      });
    }
    await this.auditRecord(actor, existing ? 'agreement.revised' : 'agreement.draft_created', contract.id, { contractType: input.contractType, engagementId, version, complianceStatus: compliance.status, approvedClauseCount: clauses.length, aiSkippedReason });
    const otherOrganisation = side === 'OWNER' ? engagement.pdpOrganisationId : engagement.ownerOrganisationId;
    await this.notifyOrganisation(otherOrganisation, engagement.countryNodeId, contract.id, `agreement-v${version}`, `Agreement for ${engagement.asset.name}: please review`, `The ${side === 'OWNER' ? 'asset owner' : 'delivery partner'} ${existing ? `revised the agreement to version ${version}` : 'drafted the agreement'} for ${engagement.asset.name} in ${engagement.project.projectName} (${contract.contractNumber}). Read it and agree, or draft a revision.`);
    const full = await this.prisma.contract.findUniqueOrThrow({ where: { id: contract.id }, include: { versions: { orderBy: { version: 'desc' } } } });
    return { contract: full, compliance, sections, variables: this.variables(input.wizardData), approvedClauses: clauses, shariahRules: rules };
  }

  /** The agreement text from the wizard facts, approved clauses and Shariah rules, with an optional AI drafting note. */
  private async compose(actor: AuthenticatedUser, input: AgreementWizardDto) {
    const clauses = await this.retriever.retrieveClauses(actor, { contractType: input.contractType, jurisdiction: input.jurisdiction, industry: this.value(input.wizardData, 'industry') });
    const rules = await this.retriever.retrieveShariahRules(actor, { contractType: input.contractType, jurisdiction: input.jurisdiction });
    const compliance = this.checkCompliance(input.contractType, input.wizardData);
    // The agreement text comes from the wizard facts and approved clauses; AI only adds a drafting
    // note. So an unavailable model or an empty credit balance must not block the draft.
    let aiSections: { output?: { recommendation?: unknown } | null } = { output: null };
    let aiSkippedReason: string | null = null;
    try {
      aiSections = await this.ai.generateAgreementSections(actor, { contractType: input.contractType, jurisdiction: input.jurisdiction, jurisdictionProfile: getJurisdictionProfile(input.jurisdiction), projectId: input.projectId, wizardData: input.wizardData, clauses: clauses.clauses, shariahRules: rules });
    } catch (error) {
      aiSkippedReason = error instanceof Error ? error.message : 'AI drafting failed';
    }
    const sections = this.buildSections(input, clauses.clauses, rules, aiSections.output?.recommendation);
    const content = { sections, variables: this.variables(input.wizardData), approvedClauseIds: clauses.clauses.map((item) => item.id), shariahRuleIds: rules.map((item) => item.id), aiOutput: aiSections.output || null, aiSkippedReason } as unknown as Prisma.InputJsonValue;
    return { content, compliance, sections, clauses: clauses.clauses, rules, aiSkippedReason };
  }

  /** A party agrees to the latest draft, or signs the approved agreement; both signatures execute it. */
  async partyAction(actor: AuthenticatedUser, id: string, input: AgreementPartyActionDto) {
    const contract = await this.get(actor, id);
    const party = contract.parties.find((item) => item.role && item.organisationId === actor.organisationId);
    if (!party || !contract.partyActions.some((item) => item.action === input.action)) {
      throw new BadRequestException(input.action === 'CONSENT' ? 'There is no new version for your side to agree to.' : 'This agreement is not waiting for your signature.');
    }
    const latest = contract.versions[0]?.version ?? 1;
    // Each side agrees to, and signs, a version identified by its fingerprint.
    const versionHash = contract.versions[0] ? entryHash(contract.versions[0].content) : null;
    const other = contract.parties.find((item) => item.role && item.id !== party.id);
    const sideName = party.role === 'OWNER' ? 'asset owner' : 'delivery partner';
    if (input.action === 'CONSENT') {
      await this.prisma.$transaction([
        this.prisma.contractParty.update({ where: { id: party.id }, data: { consentedVersion: latest, consentedAt: new Date(), consentedBy: actor.userId } }),
        this.prisma.contractEvent.create({ data: { contractId: id, eventType: 'PARTY_CONSENTED', actorId: actor.userId, metadata: { version: latest, versionHash, role: actor.role, byName: actor.name, note: `The ${sideName} agreed to version ${latest}` } } }),
      ]);
      await this.auditRecord(actor, 'agreement.party_consented', id, { version: latest, versionHash, side: party.role, byName: actor.name });
      if (other?.organisationId) {
        const both = other.consentedVersion === latest;
        await this.notifyOrganisation(other.organisationId, contract.countryNodeId, id, `consent-v${latest}-${party.role}`, both ? 'Agreement ready for legal review' : 'Agreement: the other side agreed', both ? `Both sides agreed to version ${latest} of ${contract.contractNumber}. It can now be submitted for legal review.` : `The ${sideName} agreed to version ${latest} of ${contract.contractNumber}. Read it and agree, or draft a revision.`);
      }
    } else {
      const typed = input.signatureName?.trim() ?? '';
      if (!typed || typed.toLowerCase() !== actor.name.trim().toLowerCase()) throw new BadRequestException(`Type your full name exactly as registered (${actor.name}) to sign.`);
      // The one-time code sent to the signer proves the account holder signs, not someone at their screen.
      const otp = this.signing ? await this.signing.verifyCode(actor, id, latest, input.otpChallengeId, input.otpCode) : null;
      const executed = await this.prisma.$transaction(async (tx) => {
        const signed = await tx.contractParty.updateMany({ where: { id: party.id, signedAt: null }, data: { signedAt: new Date(), signedBy: actor.userId, signatureName: typed, signatureMethod: otp ? 'TYPED_NAME_OTP' : 'TYPED_NAME', otpChannel: otp?.channel ?? null } });
        if (!signed.count) throw new ConflictException('Your side has already signed.');
        await tx.contractEvent.create({ data: { contractId: id, eventType: 'PARTY_SIGNED', actorId: actor.userId, metadata: { version: latest, versionHash, role: actor.role, byName: actor.name, note: `Signed for the ${sideName} by ${typed}`, ...(otp ? { otp } : {}) } } });
        const unsigned = await tx.contractParty.count({ where: { contractId: id, role: { not: null }, signedAt: null } });
        if (unsigned) return false;
        const claimed = await tx.contract.updateMany({ where: { id, status: 'APPROVED' }, data: { status: 'EXECUTION' } });
        if (!claimed.count) throw new ConflictException('This agreement was changed by someone else. Reload and try again.');
        await tx.contractEvent.create({ data: { contractId: id, eventType: 'STATUS_CHANGED', fromStatus: 'APPROVED', toStatus: 'EXECUTION', actorId: actor.userId, metadata: { note: 'Signed by both parties', role: actor.role } } });
        await tx.contractApproval.create({ data: { contractId: id, versionId: contract.versions[0]?.id || '', approverId: actor.userId, status: 'EXECUTION', decisionNote: 'Signed by both parties', decidedAt: new Date() } });
        return true;
      });
      await this.auditRecord(actor, 'agreement.party_signed', id, { version: latest, versionHash, side: party.role, signatureName: typed, executed, ...(otp ? { otp } : {}) });
      // Both signed: build, seal and time-stamp the final PDF; the integrity sweeper retries if this fails.
      if (executed && this.signing) void this.signing.finalize(id).catch(() => undefined);
      for (const recipient of contract.parties.filter((item) => item.role && item.organisationId && (executed || item.id !== party.id))) {
        await this.notifyOrganisation(recipient.organisationId!, contract.countryNodeId, id, executed ? 'executed' : `signed-${party.role}`, executed ? 'Agreement signed by both sides' : 'Agreement: the other side signed', executed ? `${contract.contractNumber} is signed by both sides and now in force.` : `The ${sideName} signed ${contract.contractNumber}. Sign it to put it in force.`);
      }
    }
    return this.get(actor, id);
  }

  async get(actor: AuthenticatedUser, id: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'desc' } }, parties: true, approvals: { orderBy: { decidedAt: 'asc' } }, events: { orderBy: { createdAt: 'desc' } } } });
    if (!contract) throw new NotFoundException('Agreement not found');
    if (!canSeeAgreement(actor, contract)) throw new ForbiddenException('Agreement is outside your scope');
    const shape = { ...contract, latestVersion: contract.versions[0]?.version ?? 1, latestVersionAt: contract.versions[0]?.createdAt };
    return { ...contract, latestVersion: shape.latestVersion, availableActions: availableActions(actor, shape), partyActions: partyActions(actor, shape) };
  }

  /** Agreements the actor can see, newest first, each with the actions the actor can take now. */
  async list(actor: AuthenticatedUser) {
    // Reviewers see the country's submitted agreements plus their own organisation's drafts.
    // Both sides of an asset partnership see its agreement, whichever side drafted it.
    const asParty = { countryNodeId: actor.countryNodeId, parties: { some: { organisationId: actor.organisationId, role: { not: null } } } };
    const where = isAgreementReviewer(actor.role)
      ? { OR: [{ countryNodeId: actor.countryNodeId, status: { not: 'DRAFT' } }, tenantScopeFilter(actor), asParty] }
      : { OR: [tenantScopeFilter(actor), asParty] };
    const contracts = await this.prisma.contract.findMany({ where: { ...where, contractType: { in: [...AGREEMENT_TYPES] } }, orderBy: { updatedAt: 'desc' }, take: 100, select: { id: true, contractNumber: true, title: true, contractType: true, status: true, createdBy: true, organisationId: true, countryNodeId: true, createdAt: true, updatedAt: true, complianceReport: true, engagementId: true, approvals: { select: { approverId: true, status: true, decidedAt: true } }, parties: { select: { role: true, organisationId: true, displayName: true, consentedVersion: true, signedAt: true } }, versions: { select: { version: true, createdAt: true }, orderBy: { version: 'desc' }, take: 1 } } });
    return contracts.map(({ approvals, complianceReport, versions, ...contract }) => {
      const shape = { ...contract, approvals, latestVersion: versions[0]?.version ?? 1, latestVersionAt: versions[0]?.createdAt };
      return { ...contract, latestVersion: shape.latestVersion, complianceStatus: (complianceReport as { status?: string } | null)?.status ?? null, availableActions: availableActions(actor, shape), partyActions: partyActions(actor, shape) };
    });
  }

  async review(actor: AuthenticatedUser, id: string, input: AgreementReviewDto) {
    const contract = await this.get(actor, id);
    const blocker = reviewBlocker(actor, contract, input.reviewStatus);
    if (blocker) throw blocker.startsWith('An agreement in') ? new BadRequestException(blocker) : new ForbiddenException(blocker);
    if (input.reviewStatus === 'CHANGES_REQUESTED' && !input.note?.trim()) throw new BadRequestException('Explain what must change: a note is required when requesting changes.');
    // A reviewer cannot approve what the approved clause and Shariah rule libraries do not cover.
    const content = contract.versions[0]?.content as { approvedClauseIds?: string[]; shariahRuleIds?: string[] } | undefined;
    const compliance = contract.complianceReport as { status?: string } | null;
    if (input.reviewStatus === 'SHARIAH_REVIEW' && !content?.approvedClauseIds?.length) throw new BadRequestException('Legal approval needs at least one approved clause. Add approved clauses for this contract type, then generate a new draft.');
    if (input.reviewStatus === 'SHARIAH_REVIEW' && compliance?.status === 'REQUIRES_REVIEW') throw new BadRequestException('Legal approval is blocked: required commercial terms are missing (see the compliance check).');
    if (input.reviewStatus === 'APPROVED' && !content?.shariahRuleIds?.length) throw new BadRequestException('Shariah approval needs at least one approved Shariah rule for this contract type. Add the rules, then generate a new draft.');
    // Evidence kept with the decision: the version's fingerprint and what the text checks found.
    const version = contract.versions[0];
    const versionHash = version ? entryHash(version.content) : null;
    const { checks } = await this.textChecks(actor, id);
    const flagged = { fail: checks.filter((check) => check.status === 'FAIL').map((check) => check.label), warn: checks.filter((check) => check.status === 'WARN').map((check) => check.label) };
    let aiAssisted: { runId: string } | undefined;
    let highGaps = 0;
    if (input.aiRunId) {
      const run = await this.prisma.aiRun.findFirst({ where: { id: input.aiRunId, userId: actor.userId, featureKey: 'agreement_gap_scan' }, select: { id: true, input: true, output: true } });
      if (!run || (run.input as { subjectId?: string } | null)?.subjectId !== id) throw new BadRequestException('That AI scan is not for this agreement.');
      aiAssisted = { runId: run.id };
      const gaps = (run.output as { recommendation?: { gaps?: Array<{ severity?: string }> } } | null)?.recommendation?.gaps ?? [];
      highGaps = gaps.filter((gap) => String(gap.severity).toUpperCase() === 'HIGH').length;
    }
    // A reviewer approving against the checks, the AI scan or their own note says why; it is kept with the decision.
    const approving = input.reviewStatus === 'SHARIAH_REVIEW' || input.reviewStatus === 'APPROVED';
    const grounds = approving ? [
      ...(flagged.fail.length ? [`${flagged.fail.length} text check${flagged.fail.length > 1 ? 's' : ''} failed: ${flagged.fail.join(', ')}`] : []),
      ...(highGaps ? [`the AI scan found ${highGaps} serious gap${highGaps > 1 ? 's' : ''}`] : []),
      ...(NOTE_READS_AS_REFUSAL.test(input.note ?? '') ? ['the note reads as a refusal'] : []),
    ] : [];
    if (grounds.length && (input.overrideReason?.trim().length ?? 0) < 10) throw new BadRequestException(`Give your reason for approving: ${grounds.join('; ')}.`);
    const evidence = { note: input.note || null, role: actor.role, byName: actor.name, version: version?.version ?? 1, versionHash, checks: flagged, ...(aiAssisted ? { aiAssisted } : {}), ...(grounds.length ? { override: { grounds, reason: input.overrideReason!.trim() } } : {}) };
    const updated = await this.prisma.$transaction(async (tx) => {
      // Conditional on the status we checked, so two reviewers acting at once cannot both move it.
      const claimed = await tx.contract.updateMany({ where: { id, status: contract.status }, data: { status: input.reviewStatus } });
      if (!claimed.count) throw new ConflictException('This agreement was changed by someone else. Reload and try again.');
      await tx.contractEvent.create({ data: { contractId: id, eventType: 'STATUS_CHANGED', fromStatus: contract.status, toStatus: input.reviewStatus, actorId: actor.userId, metadata: evidence as Prisma.InputJsonValue } });
      await tx.contractApproval.create({ data: { contractId: id, versionId: contract.versions[0]?.id || '', approverId: actor.userId, status: input.reviewStatus, decisionNote: input.note, decidedAt: new Date() } });
      return tx.contract.findUniqueOrThrow({ where: { id } });
    });
    await this.auditRecord(actor, 'agreement.review_status_changed', id, { fromStatus: contract.status, toStatus: input.reviewStatus, ...evidence });
    if (input.reviewStatus === 'APPROVED' || input.reviewStatus === 'CHANGES_REQUESTED') {
      for (const party of contract.parties.filter((item) => item.role && item.organisationId)) {
        await this.notifyOrganisation(party.organisationId!, contract.countryNodeId, id, `review-${input.reviewStatus}-${updated.updatedAt.toISOString()}`, input.reviewStatus === 'APPROVED' ? 'Agreement approved: ready to sign' : 'Agreement: changes requested', input.reviewStatus === 'APPROVED' ? `${contract.contractNumber} passed legal and Shariah review. Each side now signs it.` : `${contract.contractNumber}: ${input.note ?? 'changes were requested'}. Either side drafts a revision, then both agree again.`);
      }
    }
    return updated;
  }

  /** The platform's checks on the latest version's text, for reviewers and the parties. */
  async textChecks(actor: AuthenticatedUser, id: string) {
    const contract = await this.get(actor, id);
    const sections = ((contract.versions[0]?.content as { sections?: Section[] } | undefined)?.sections) ?? [];
    const engagement = contract.engagementId ? await this.prisma.assetEngagement.findUnique({ where: { id: contract.engagementId }, select: { akad: true, terms: true, startDate: true, endDate: true } }) : null;
    const partnership = engagement ? { akad: engagement.akad, terms: engagement.terms as Record<string, number>, startDate: engagement.startDate.toISOString().slice(0, 10), endDate: engagement.endDate.toISOString().slice(0, 10) } : null;
    return { agreementId: id, version: contract.versions[0]?.version ?? 1, checks: agreementTextChecks(contract.contractType, sections, partnership), sections };
  }

  /** AI scan of the latest version for gaps; the platform's checks go with the text as facts. */
  async gapScan(actor: AuthenticatedUser, id: string) {
    const { checks, sections, version } = await this.textChecks(actor, id);
    const contract = await this.get(actor, id);
    // Kept short enough for a small model: section headings and text, cut at about 6,000 characters.
    const text = sections.map((section) => `${section.number}. ${section.title}\n${section.paragraphs.join('\n')}`).join('\n\n').slice(0, 6000);
    const run = await this.ai.agreementGapScan(actor, { subjectId: id, contractType: contract.contractType, checks: checks.filter((check) => check.status !== 'PASS'), text });
    await this.auditRecord(actor, 'agreement.gap_scan', id, { version, aiRunId: run.id });
    return run;
  }

  /** Sends the signer a one-time code for the version they are about to sign. */
  async issueSignCode(actor: AuthenticatedUser, id: string) {
    if (!this.signing) throw new BadRequestException('Signing codes are not available.');
    const contract = await this.get(actor, id);
    if (!contract.partyActions.some((item) => item.action === 'SIGN')) throw new BadRequestException('This agreement is not waiting for your signature.');
    return this.signing.issueCode(actor, { id, contractNumber: contract.contractNumber, version: contract.latestVersion });
  }

  /** The sealed, time-stamped PDF of an executed agreement, for whoever can see the agreement. */
  async signedPdf(actor: AuthenticatedUser, id: string) {
    if (!this.signing) throw new BadRequestException('Signed documents are not available.');
    const contract = await this.get(actor, id);
    const buffer = await this.signing.signedPdf(id);
    await this.auditRecord(actor, 'agreement.signed_pdf_downloaded', id, {});
    return { filename: `${contract.contractNumber}-signed.pdf`, buffer };
  }

  async signedTimestamp(actor: AuthenticatedUser, id: string) {
    if (!this.signing) throw new BadRequestException('Signed documents are not available.');
    const contract = await this.get(actor, id);
    return { filename: `${contract.contractNumber}-timestamp.tsr`, buffer: await this.signing.timestampToken(id) };
  }

  async integrity(actor: AuthenticatedUser, id: string) {
    if (!this.signing) return { status: 'NOT_SEALED' as const };
    await this.get(actor, id);
    return this.signing.checkIntegrity(id);
  }

  async render(actor: AuthenticatedUser, id: string, format: 'docx' | 'pdf') { const contract = await this.get(actor, id); const version = contract.versions[0]; const body = version?.content as { sections?: Section[]; variables?: Record<string, string> } | undefined; const parties = contract.parties.filter((party) => party.role); const sections = (body?.sections || []).map((section) => (parties.length && section.title === 'Signatures' ? { ...section, paragraphs: parties.map((party) => `For the ${party.role === 'OWNER' ? 'asset owner' : 'delivery partner'}, ${party.displayName}: ${party.signedAt ? `signed electronically by ${party.signatureName} on ${party.signedAt.toISOString().slice(0, 10)}` : 'not signed yet'}.`) } : section)); const filename = `${contract.contractNumber}-${contract.contractType.toLowerCase()}.${format}`; const buffer = format === 'docx' ? await this.docx(contract, sections) : await this.pdf(contract, sections); await this.auditRecord(actor, 'agreement.document_generated', id, { format, version: version?.version || 1 }); return { filename, contentType: format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf', buffer }; }

  private buildSections(input: AgreementWizardDto, clauses: Array<{ clauseTitle: string; clauseText: string; shariahReference: string | null }>, rules: Array<{ ruleName: string; description: string }>, ai: unknown): Section[] {
    const data = input.wizardData;
    const value = (key: string) => this.value(data, key) || `[${key}]`;
    const main: Record<AgreementType, string[]> = {
      IJARAH: ['The Lessor confirms that ownership or the relevant usufruct in the identified asset remains with the Lessor throughout the lease term.', `Asset: ${value('assetDescription')}`, `Rental: ${value('rentalAmount')} ${value('rentalFrequency')}`, `Term: ${value('leaseTerm')}`],
      MUSHARAKAH: [`Project: ${value('projectType')}`, `Partners: ${value('partners')}`, `Contributions: ${value('contributions')}`, `Profit sharing: ${value('profitSharing')}`, `Loss allocation: ${value('lossAllocation')}`, `Management rights: ${value('managementRights')}`, `Exit mechanism: ${value('exitMechanism')}`],
      MUDARABAH: [`Rabb-ul-mal: ${value('capitalProvider')}`, `Mudarib: ${value('manager')}`, `Capital: ${value('capitalAmount')}`, `Profit ratio: ${value('profitSharing')}`, `Use of proceeds: ${value('useOfProceeds')}`, `Return restriction: ${value('guaranteedReturn') || 'No fixed or guaranteed return is permitted unless separately validated.'}`],
      WAKALAH: [`Principal: ${value('principal')}`, `Agent: ${value('agent')}`, `Agency scope: ${value('agencyScope')}`, `Agency fee: ${value('agencyFee')}`, `Reporting: ${value('reporting')}`],
      SUKUK: [`Issuer: ${value('issuer')}`, `Sukukholders: ${value('sukukholders')}`, `Underlying assets: ${value('assetDescription')}`, `Issue size: ${value('capitalAmount')}`, `Distribution mechanics: ${value('distributionMechanics')}`, `Redemption: ${value('redemption')}`],
    };
    return [
      { number: '1', title: 'Recitals', paragraphs: [`The parties intend to document a ${labels[input.contractType]} for ${input.projectName} in ${input.jurisdiction}.`, 'These recitals form part of the agreement and are subject to legal and Shariah review.'] },
      { number: '2', title: 'Definitions', paragraphs: [`Project means ${input.projectName}.`, `Contract type means ${labels[input.contractType]}.`, `The remaining defined terms shall be completed from the approved template and wizard data.`] },
      { number: '3', title: 'Transaction Structure and Commercial Terms', paragraphs: main[input.contractType] },
      { number: '4', title: 'Approved Clauses', paragraphs: clauses.length ? clauses.map((clause) => `${clause.clauseTitle}: ${clause.clauseText}${clause.shariahReference ? ` Reference: ${clause.shariahReference}.` : ''}`) : ['No approved clauses were found. Legal administrator review is required before approval.'] },
      { number: '5', title: 'Shariah Conditions and Compliance', paragraphs: rules.length ? rules.map((rule) => `${rule.ruleName}: ${rule.description}`) : ['No approved Shariah rules were found. Shariah review is required before approval.'] },
      { number: '6', title: 'AI-Assisted Drafting Note', paragraphs: [typeof ai === 'object' && ai ? 'AI-assisted drafting was used only to organize the supplied facts and approved knowledge. It did not replace legal drafting, Shariah review, or approval.' : 'This agreement was assembled from the wizard facts and approved clauses.'] },
      { number: '7', title: 'Schedules', paragraphs: ['Schedule 1 - Commercial Inputs:', ...Object.keys(data).map((key) => `${humanise(key)}: ${this.value(data, key) || '-'}`), 'Schedule 2 - Approved Shariah References and Clause Sources.'] },
      { number: '8', title: 'Signatures', paragraphs: ['For and on behalf of the relevant parties:', 'Name: ____________________    Title: ____________________    Date: __________', 'Signature: ______________________________________________________________'] },
    ];
  }

  private checkCompliance(type: AgreementType, data: Record<string, unknown>) { const checks: Array<{ key: string; label: string; pass: boolean; severity: string }> = []; const present = (key: string) => { const value = data[key]; return value !== undefined && value !== null && String(value).trim() !== ''; }; if (type === 'IJARAH') checks.push({ key: 'ownershipMaintained', label: 'Ownership maintained', pass: present('ownershipMaintained'), severity: 'HIGH' }, { key: 'assetDescription', label: 'Asset identified', pass: present('assetDescription'), severity: 'HIGH' }, { key: 'rentalAmount', label: 'Rental defined', pass: present('rentalAmount'), severity: 'HIGH' }); if (type === 'MUSHARAKAH') checks.push({ key: 'profitSharing', label: 'Profit sharing defined', pass: present('profitSharing'), severity: 'HIGH' }, { key: 'lossAllocation', label: 'Loss allocated according to capital', pass: present('lossAllocation'), severity: 'HIGH' }); if (type === 'MUDARABAH') checks.push({ key: 'guaranteedReturn', label: 'No fixed guaranteed return', pass: !present('guaranteedReturn') || String(data.guaranteedReturn).toLowerCase().includes('no'), severity: 'HIGH' }); if (type === 'WAKALAH') checks.push({ key: 'agencyScope', label: 'Agency scope defined', pass: present('agencyScope'), severity: 'HIGH' }, { key: 'agencyFee', label: 'Agency fee defined', pass: present('agencyFee'), severity: 'MEDIUM' }); const failures = checks.filter((check) => !check.pass); return { status: failures.some((check) => check.severity === 'HIGH') ? 'REQUIRES_REVIEW' : failures.length ? 'WARNING' : 'PASS', checks, failures }; }

  private variables(data: Record<string, unknown>) { return Object.fromEntries(Object.entries({ LESSOR_NAME: data.lessorName, LESSEE_NAME: data.lesseeName, ASSET_DESCRIPTION: data.assetDescription, CAPITAL_AMOUNT: data.capitalAmount, PROFIT_RATIO: data.profitSharing, PROJECT_NAME: data.projectName }).map(([key, value]) => [`{{${key}}}`, value == null ? `[${key}]` : String(value)])); }
  private value(data: Record<string, unknown>, key: string) { const value = data[key]; return value == null ? '' : Array.isArray(value) ? value.join(', ') : String(value); }
  private newContractNumber() { return `HOF-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${randomUUID().slice(0, 8).toUpperCase()}`; }

  /** Tells the people of one party who can act on an agreement (drafters, owners, managers). */
  private async notifyOrganisation(organisationId: string, countryNodeId: string, contractId: string, key: string, title: string, message: string) {
    if (!this.notifications) return;
    const roles = ['Asset_Owner', 'Asset_Manager', 'Project_Sponsor', 'Project_Manager', 'Organization_Admin'] as PrismaUserRole[];
    const people = await this.prisma.userRoleAssignment.findMany({ where: { organisationId, countryNodeId, isActive: true, role: { in: roles } }, select: { userId: true } });
    await Promise.all([...new Set(people.map((person) => person.userId))].map((userId) => this.notifications!.enqueue({ recipientUserId: userId, organisationId, countryNodeId, type: 'AGREEMENT', title, message, resourceType: 'Contract', resourceId: contractId, dedupeKey: `agreement:${contractId}:${key}:${userId}` }).catch(() => undefined)));
  }
  private scope(actor: AuthenticatedUser) { return { organisationId: actor.organisationId, countryNodeId: actor.countryNodeId }; }
  private async auditRecord(actor: AuthenticatedUser, action: string, resourceId: string, metadata: Record<string, unknown>) { await this.audit.recordActor(actor, { action, resourceType: 'Contract', resourceId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata }); }
  private async docx(contract: { contractNumber: string; title: string | null; status: string }, sections: Section[]) {
    const children = [
      new Paragraph({ text: contract.title || 'Islamic Finance Agreement', heading: HeadingLevel.TITLE }),
      new Paragraph({ children: [new TextRun({ text: `Document No. ${contract.contractNumber} | Status: ${contract.status}`, bold: true })] }),
      ...sections.flatMap((section) => [
        new Paragraph({ text: `${section.number}. ${section.title}`, heading: HeadingLevel.HEADING_1 }),
        ...section.paragraphs.map((paragraph) => new Paragraph({ text: paragraph, spacing: { after: 160 } })),
      ]),
    ];
    return Packer.toBuffer(new Document({ sections: [{ children }] }));
  }
  private pdf(contract: { contractNumber: string; title: string | null; status: string }, sections: Section[]) { return new Promise<Buffer>((resolve, reject) => { const document = new PDFDocument({ margin: 54, bufferPages: true }); const chunks: Buffer[] = []; document.on('data', (chunk) => chunks.push(chunk)); document.on('end', () => resolve(Buffer.concat(chunks))); document.on('error', reject); document.fontSize(20).text(contract.title || 'Islamic Finance Agreement', { align: 'center' }); document.moveDown().fontSize(10).text(`Document No. ${contract.contractNumber} | Status: ${contract.status}`, { align: 'center' }); sections.forEach((section) => { document.moveDown().fontSize(13).font('Helvetica-Bold').text(`${section.number}. ${section.title}`); document.moveDown(0.3).fontSize(10).font('Helvetica').text(section.paragraphs.join('\n\n'), { lineGap: 3 }); });
    // Footer on every page: document number and "Page X of Y". The bottom margin is lifted while
    // writing so pdfkit does not start a new blank page.
    const range = document.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      document.switchToPage(range.start + index);
      const bottom = document.page.margins.bottom;
      document.page.margins.bottom = 0;
      document.font('Helvetica').fontSize(8).fillColor('#666666').text(`${contract.contractNumber}  |  Page ${index + 1} of ${range.count}`, 54, document.page.height - 36, { width: document.page.width - 108, align: 'right', lineBreak: false });
      document.page.margins.bottom = bottom;
    }
    document.end(); }); }
}
