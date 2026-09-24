import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { AgreementReviewDto, AgreementType, AgreementWizardDto } from './agreement.dto';
import { getJurisdictionProfile } from './jurisdiction-profiles';

type Section = { number: string; title: string; paragraphs: string[] };

const labels: Record<AgreementType, string> = { IJARAH: 'Ijarah Agreement', MUSHARAKAH: 'Musharakah Joint Venture Agreement', MUDARABAH: 'Mudarabah Agreement', WAKALAH: 'Wakalah Agreement', SUKUK: 'Sukuk Structure Document' };

@Injectable()
export class AgreementGenerationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly retriever: ContractClauseRetriever, private readonly ai: AiService) {}

  async createDraft(actor: AuthenticatedUser, input: AgreementWizardDto) {
    const clauses = await this.retriever.retrieveClauses(actor, { contractType: input.contractType, jurisdiction: input.jurisdiction, industry: this.value(input.wizardData, 'industry') });
    const rules = await this.retriever.retrieveShariahRules(actor, { contractType: input.contractType, jurisdiction: input.jurisdiction });
    const compliance = this.checkCompliance(input.contractType, input.wizardData);
    const aiSections = await this.ai.generateAgreementSections(actor, { contractType: input.contractType, jurisdiction: input.jurisdiction, jurisdictionProfile: getJurisdictionProfile(input.jurisdiction), projectId: input.projectId, wizardData: input.wizardData, clauses: clauses.clauses, shariahRules: rules });
    const sections = this.buildSections(input, clauses.clauses, rules, aiSections.output?.recommendation);
    const content = { sections, variables: this.variables(input.wizardData), approvedClauseIds: clauses.clauses.map((item) => item.id), shariahRuleIds: rules.map((item) => item.id), aiOutput: aiSections.output || null } as unknown as Prisma.InputJsonValue;
    const contract = await this.prisma.contract.create({ data: { ...this.scope(actor), contractNumber: `HOF-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${randomUUID().slice(0, 8).toUpperCase()}`, contractType: input.contractType, title: labels[input.contractType], templateId: input.templateId, status: 'DRAFT', wizardData: input.wizardData as object, complianceReport: compliance as object, createdBy: actor.userId, versions: { create: { version: 1, content, status: 'DRAFT', createdBy: actor.userId } }, events: { create: { eventType: 'DRAFT_CREATED', toStatus: 'DRAFT', actorId: actor.userId, metadata: { contractType: input.contractType } } } }, include: { versions: true } });
    await this.auditRecord(actor, 'agreement.draft_created', contract.id, { contractType: input.contractType, complianceStatus: compliance.status, approvedClauseCount: clauses.clauses.length });
    return { contract, compliance, sections, variables: this.variables(input.wizardData), approvedClauses: clauses.clauses, shariahRules: rules };
  }

  async get(actor: AuthenticatedUser, id: string) { const contract = await this.prisma.contract.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'desc' } }, parties: true, approvals: true, events: { orderBy: { createdAt: 'desc' } } } }); if (!contract) throw new NotFoundException('Agreement not found'); assertTenantScope(actor, contract, 'Agreement'); return contract; }

  async review(actor: AuthenticatedUser, id: string, input: AgreementReviewDto) {
    const contract = await this.get(actor, id);
    this.assertReviewRole(actor, input.reviewStatus);
    const allowed: Record<string, string[]> = { DRAFT: ['LEGAL_REVIEW'], LEGAL_REVIEW: ['SHARIAH_REVIEW', 'CHANGES_REQUESTED'], SHARIAH_REVIEW: ['APPROVED', 'CHANGES_REQUESTED'], APPROVED: ['EXECUTION'], CHANGES_REQUESTED: ['DRAFT'] };
    if (!allowed[contract.status]?.includes(input.reviewStatus)) throw new Error(`Invalid agreement transition from ${contract.status} to ${input.reviewStatus}`);
    const updated = await this.prisma.contract.update({ where: { id }, data: { status: input.reviewStatus, events: { create: { eventType: 'STATUS_CHANGED', fromStatus: contract.status, toStatus: input.reviewStatus, actorId: actor.userId, metadata: { note: input.note || null } } }, approvals: { create: { versionId: contract.versions[0]?.id || '', approverId: actor.userId, status: input.reviewStatus, decisionNote: input.note, decidedAt: new Date() } } } });
    await this.auditRecord(actor, 'agreement.review_status_changed', id, { fromStatus: contract.status, toStatus: input.reviewStatus, note: input.note });
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
      { number: '7', title: 'Schedules', paragraphs: [`Schedule 1 - Commercial Inputs: ${JSON.stringify(data)}`, 'Schedule 2 - Approved Shariah References and Clause Sources.'] },
      { number: '8', title: 'Signatures', paragraphs: ['For and on behalf of the relevant parties:', 'Name: ____________________    Title: ____________________    Date: __________', 'Signature: ______________________________________________________________'] },
    ];
  }

  private checkCompliance(type: AgreementType, data: Record<string, unknown>) { const checks: Array<{ key: string; label: string; pass: boolean; severity: string }> = []; const present = (key: string) => { const value = data[key]; return value !== undefined && value !== null && String(value).trim() !== ''; }; if (type === 'IJARAH') checks.push({ key: 'ownershipMaintained', label: 'Ownership maintained', pass: present('ownershipMaintained'), severity: 'HIGH' }, { key: 'assetDescription', label: 'Asset identified', pass: present('assetDescription'), severity: 'HIGH' }, { key: 'rentalAmount', label: 'Rental defined', pass: present('rentalAmount'), severity: 'HIGH' }); if (type === 'MUSHARAKAH') checks.push({ key: 'profitSharing', label: 'Profit sharing defined', pass: present('profitSharing'), severity: 'HIGH' }, { key: 'lossAllocation', label: 'Loss allocated according to capital', pass: present('lossAllocation'), severity: 'HIGH' }); if (type === 'MUDARABAH') checks.push({ key: 'guaranteedReturn', label: 'No fixed guaranteed return', pass: !present('guaranteedReturn') || String(data.guaranteedReturn).toLowerCase().includes('no'), severity: 'HIGH' }); if (type === 'WAKALAH') checks.push({ key: 'agencyScope', label: 'Agency scope defined', pass: present('agencyScope'), severity: 'HIGH' }, { key: 'agencyFee', label: 'Agency fee defined', pass: present('agencyFee'), severity: 'MEDIUM' }); const failures = checks.filter((check) => !check.pass); return { status: failures.some((check) => check.severity === 'HIGH') ? 'REQUIRES_REVIEW' : failures.length ? 'WARNING' : 'PASS', checks, failures }; }

  private variables(data: Record<string, unknown>) { return Object.fromEntries(Object.entries({ LESSOR_NAME: data.lessorName, LESSEE_NAME: data.lesseeName, ASSET_DESCRIPTION: data.assetDescription, CAPITAL_AMOUNT: data.capitalAmount, PROFIT_RATIO: data.profitSharing, PROJECT_NAME: data.projectName }).map(([key, value]) => [`{{${key}}}`, value == null ? `[${key}]` : String(value)])); }
  private value(data: Record<string, unknown>, key: string) { const value = data[key]; return value == null ? '' : Array.isArray(value) ? value.join(', ') : String(value); }
  private scope(actor: AuthenticatedUser) { return { organisationId: actor.organisationId, countryNodeId: actor.countryNodeId }; }
  private assertReviewRole(actor: AuthenticatedUser, status: AgreementReviewDto['reviewStatus']) { const legal = ['Super Admin', 'Country Admin', 'Organization Admin', 'Legal Officer']; const shariah = ['Super Admin', 'Country Admin', 'Organization Admin', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee']; const allowed = status === 'LEGAL_REVIEW' || status === 'CHANGES_REQUESTED' ? [...legal, ...shariah] : shariah; if (!allowed.includes(actor.role)) throw new ForbiddenException('Your role cannot perform this agreement review action.'); }
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
  private pdf(contract: { contractNumber: string; title: string | null; status: string }, sections: Section[]) { return new Promise<Buffer>((resolve, reject) => { const document = new PDFDocument({ margin: 54, bufferPages: true }); const chunks: Buffer[] = []; document.on('data', (chunk) => chunks.push(chunk)); document.on('end', () => resolve(Buffer.concat(chunks))); document.on('error', reject); document.fontSize(20).text(contract.title || 'Islamic Finance Agreement', { align: 'center' }); document.moveDown().fontSize(10).text(`Document No. ${contract.contractNumber} | Status: ${contract.status}`, { align: 'center' }); sections.forEach((section) => { document.moveDown().fontSize(13).font('Helvetica-Bold').text(`${section.number}. ${section.title}`); document.moveDown(0.3).fontSize(10).font('Helvetica').text(section.paragraphs.join('\n\n'), { lineGap: 3 }); }); document.end(); }); }
}
