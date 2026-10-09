import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { AGREEMENT_TYPES, AgreementReviewDto, AgreementType, AgreementWizardDto } from './agreement.dto';
import { availableActions, canSeeAgreement, DRAFTER_ROLES, isAgreementReviewer, reviewBlocker } from './agreement-review-rules';
import { getJurisdictionProfile } from './jurisdiction-profiles';

type Section = { number: string; title: string; paragraphs: string[] };

/** "profitSharing" → "Profit sharing", for the schedule of commercial inputs. */
const humanise = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase().replace(/^./, (first) => first.toUpperCase());

const labels: Record<AgreementType, string> = { IJARAH: 'Ijarah Agreement', MUSHARAKAH: 'Musharakah Joint Venture Agreement', MUDARABAH: 'Mudarabah Agreement', WAKALAH: 'Wakalah Agreement', SUKUK: 'Sukuk Structure Document' };

@Injectable()
export class AgreementGenerationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly retriever: ContractClauseRetriever, private readonly ai: AiService) {}

  async createDraft(actor: AuthenticatedUser, input: AgreementWizardDto) {
    if (!(DRAFTER_ROLES as readonly string[]).includes(actor.role)) throw new ForbiddenException('Only project sponsors, project managers and administrators can draft agreements.');
    if (input.projectId) {
      const project = await this.prisma.project.findUnique({ where: { projectId: input.projectId }, select: { organisationId: true, countryNodeId: true } });
      if (!project) throw new NotFoundException('Project not found.');
      assertTenantScope(actor, project, 'Project');
    }
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
    const contract = await this.prisma.contract.create({ data: { ...this.scope(actor), contractNumber: `HOF-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${randomUUID().slice(0, 8).toUpperCase()}`, contractType: input.contractType, title: labels[input.contractType], templateId: input.templateId, status: 'DRAFT', wizardData: input.wizardData as object, complianceReport: compliance as object, createdBy: actor.userId, versions: { create: { version: 1, content, status: 'DRAFT', createdBy: actor.userId } }, events: { create: { eventType: 'DRAFT_CREATED', toStatus: 'DRAFT', actorId: actor.userId, metadata: { contractType: input.contractType } } } }, include: { versions: true } });
    await this.auditRecord(actor, 'agreement.draft_created', contract.id, { contractType: input.contractType, complianceStatus: compliance.status, approvedClauseCount: clauses.clauses.length, aiSkippedReason });
    return { contract, compliance, sections, variables: this.variables(input.wizardData), approvedClauses: clauses.clauses, shariahRules: rules };
  }

  async get(actor: AuthenticatedUser, id: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'desc' } }, parties: true, approvals: { orderBy: { decidedAt: 'asc' } }, events: { orderBy: { createdAt: 'desc' } } } });
    if (!contract) throw new NotFoundException('Agreement not found');
    if (!canSeeAgreement(actor, contract)) throw new ForbiddenException('Agreement is outside your scope');
    return { ...contract, availableActions: availableActions(actor, contract) };
  }

  /** Agreements the actor can see, newest first, each with the actions the actor can take now. */
  async list(actor: AuthenticatedUser) {
    // Reviewers see the country's submitted agreements plus their own organisation's drafts.
    const where = isAgreementReviewer(actor.role)
      ? { OR: [{ countryNodeId: actor.countryNodeId, status: { not: 'DRAFT' } }, tenantScopeFilter(actor)] }
      : tenantScopeFilter(actor);
    const contracts = await this.prisma.contract.findMany({ where: { ...where, contractType: { in: [...AGREEMENT_TYPES] } }, orderBy: { updatedAt: 'desc' }, take: 100, select: { id: true, contractNumber: true, title: true, contractType: true, status: true, createdBy: true, organisationId: true, countryNodeId: true, createdAt: true, updatedAt: true, complianceReport: true, approvals: { select: { approverId: true, status: true, decidedAt: true } } } });
    return contracts.map(({ approvals, complianceReport, ...contract }) => ({ ...contract, complianceStatus: (complianceReport as { status?: string } | null)?.status ?? null, availableActions: availableActions(actor, { ...contract, approvals }) }));
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
    const updated = await this.prisma.$transaction(async (tx) => {
      // Conditional on the status we checked, so two reviewers acting at once cannot both move it.
      const claimed = await tx.contract.updateMany({ where: { id, status: contract.status }, data: { status: input.reviewStatus } });
      if (!claimed.count) throw new ConflictException('This agreement was changed by someone else. Reload and try again.');
      await tx.contractEvent.create({ data: { contractId: id, eventType: 'STATUS_CHANGED', fromStatus: contract.status, toStatus: input.reviewStatus, actorId: actor.userId, metadata: { note: input.note || null, role: actor.role } } });
      await tx.contractApproval.create({ data: { contractId: id, versionId: contract.versions[0]?.id || '', approverId: actor.userId, status: input.reviewStatus, decisionNote: input.note, decidedAt: new Date() } });
      return tx.contract.findUniqueOrThrow({ where: { id } });
    });
    await this.auditRecord(actor, 'agreement.review_status_changed', id, { fromStatus: contract.status, toStatus: input.reviewStatus, note: input.note, role: actor.role });
    return updated;
  }

  async render(actor: AuthenticatedUser, id: string, format: 'docx' | 'pdf') { const contract = await this.get(actor, id); const version = contract.versions[0]; const body = version?.content as { sections?: Section[]; variables?: Record<string, string> } | undefined; const sections = body?.sections || []; const filename = `${contract.contractNumber}-${contract.contractType.toLowerCase()}.${format}`; const buffer = format === 'docx' ? await this.docx(contract, sections) : await this.pdf(contract, sections); await this.auditRecord(actor, 'agreement.document_generated', id, { format, version: version?.version || 1 }); return { filename, contentType: format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf', buffer }; }

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
