import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';
import pdfParse from 'pdf-parse';
import { AiProvider } from './ai.provider';
import { AiDecisionDto, ChatDto, ContractAdvisorDto, ContractDraftDto, ContractRetrievalDto, DueDiligenceDto, RagDocumentDto, RagSearchDto, ShariahAnalyzeDto, ShariahValidationDto } from './ai.dto';
import { scopeOf } from './ai.types';
import { MembershipService } from '../membership/membership.service';
import { ContractClauseRetriever } from './contract-clause-retriever.service';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly membership: MembershipService,
    private readonly contractRetriever: ContractClauseRetriever,
    @Inject('AI_PROVIDER') private readonly provider: AiProvider,
  ) {}

  async chat(actor: AuthenticatedUser, input: ChatDto) {
    const scope = scopeOf(actor);
    const conversation = input.conversationId
      ? await this.prisma.aiConversation.findFirst({ where: { id: input.conversationId, ...scope } })
      : await this.prisma.aiConversation.create({ data: { ...scope, title: input.message.slice(0, 80) } });
    if (!conversation) throw new NotFoundException('AI conversation not found in the current tenant');

    await this.prisma.aiMessage.create({ data: { conversationId: conversation.id, role: 'user', content: input.message } });
    const result = await this.run(actor, 'chat', 'CHAT', input.message, { message: input.message }, conversation.id);
    await this.prisma.aiMessage.create({ data: { conversationId: conversation.id, role: 'assistant', content: JSON.stringify(result.output?.recommendation ?? {}) } });
    return { conversationId: conversation.id, run: result };
  }

  async contractAdvisor(actor: AuthenticatedUser, input: ContractAdvisorDto) {
    const project = await this.prisma.project.findUnique({ where: { projectId: input.projectId }, include: { countryNode: { select: { currency: true } } } });
    if (!project) throw new NotFoundException('Project not found in the current tenant');
    assertTenantScope(actor, project, 'Project');
    this.assertProjectSponsorScope(actor, project.projectSponsorId);

    const ragResults = await this.searchDocuments(actor, { projectId: project.projectId, query: project.proposedShariahContract, limit: 5 });
    const contractKnowledge = await this.contractRetriever.retrieveClauses(actor, { contractType: project.proposedShariahContract, industry: project.sector, purpose: input.context || project.description });
    const shariahRules = await this.contractRetriever.retrieveShariahRules(actor, { contractType: project.proposedShariahContract });
    const evidenceDocuments = await this.prisma.ragDocument.findMany({
      where: { projectId: project.projectId, status: 'ACTIVE' },
      select: { metadata: true },
    });
    const evidenceTypes = new Set(evidenceDocuments.map((document) => {
      const metadata = document.metadata && typeof document.metadata === 'object' ? document.metadata as Record<string, unknown> : {};
      return metadata.verificationStatus === 'DEMO_VERIFIED' || metadata.verificationStatus === 'VERIFIED'
        ? metadata.evidenceType
        : undefined;
    }));
    return this.run(actor, 'contract_advisor', 'RECOMMEND_CONTRACT', input.context || project.description, {
      projectId: project.projectId,
      projectCode: project.projectCode,
      projectName: project.projectName,
      sector: project.sector,
      fundingRequired: project.fundingRequired.toString(),
      currency: project.countryNode.currency,
      proposedShariahContract: project.proposedShariahContract,
      status: project.status,
      evidence: {
        projectDocumentCount: evidenceDocuments.length,
        hasVerifiedCashflowEvidence: evidenceTypes.has('cashflow'),
        hasVerifiedAssetBackingEvidence: evidenceTypes.has('asset_backing'),
        legitimacyStatus: evidenceTypes.has('corporate_kyb') && evidenceTypes.has('due_diligence') ? 'DEMO_VERIFIED' : 'UNVERIFIED',
      },
      ragSources: ragResults.map((result) => 'document' in result
        ? { title: result.document.title, sourceType: result.document.sourceType, content: result.content }
        : { title: result.title, sourceType: result.sourceType, content: result.content }),
      contractClauses: contractKnowledge.clauses,
      contractKnowledgeSources: contractKnowledge.sources,
      shariahRules,
    });
  }

  async contractDraft(actor: AuthenticatedUser, input: ContractDraftDto) {
    const project = await this.prisma.project.findUnique({
      where: { projectId: input.projectId },
      include: {
        countryNode: { select: { currency: true } },
        projectSponsor: { select: { name: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found in the current tenant');
    assertTenantScope(actor, project, 'Project');
    this.assertProjectSponsorScope(actor, project.projectSponsorId);

    const contractType = input.contractType || project.proposedShariahContract;
    return this.run(actor, 'contract_draft', 'GENERATE_DRAFT_TERMS', project.description, {
      projectId: project.projectId,
      projectName: project.projectName,
      contractType,
      capital: project.fundingRequired.toString(),
      currency: project.countryNode.currency,
      sponsorName: project.projectSponsor.name,
      sector: project.sector,
      status: project.status,
    });
  }

  async shariah(actor: AuthenticatedUser, input: ShariahAnalyzeDto) {
    let projectContext: Record<string, unknown> = {};
    const project = await this.prisma.project.findUnique({ where: { projectId: input.projectId } });
    if (!project) throw new NotFoundException('Project not found in the current tenant');
    assertTenantScope(actor, project, 'Project');
    this.assertProjectSponsorScope(actor, project.projectSponsorId);
    projectContext = {
      projectId: project.projectId,
      projectName: project.projectName,
      sector: project.sector,
      fundingRequired: project.fundingRequired.toString(),
      projectStatus: project.status,
    };
    const ragResults = await this.searchDocuments(actor, { projectId: project.projectId, query: input.proposedContract, limit: 5 });
    const contractKnowledge = await this.contractRetriever.retrieveClauses(actor, { contractType: input.proposedContract, purpose: input.terms });
    const shariahRules = await this.contractRetriever.retrieveShariahRules(actor, { contractType: input.proposedContract });
    return this.run(actor, 'shariah_assistant', 'ANALYZE_SHARIAH', input.terms, {
      ...input,
      ...projectContext,
      ragSources: ragResults.map((result) => 'document' in result
        ? { title: result.document.title, sourceType: result.document.sourceType, content: result.content }
        : { title: result.title, sourceType: result.sourceType, content: result.content }),
      contractClauses: contractKnowledge.clauses,
      contractKnowledgeSources: contractKnowledge.sources,
      shariahRules,
    });
  }

  dueDiligence(actor: AuthenticatedUser, input: DueDiligenceDto) {
    return this.run(actor, 'due_diligence_assistant', 'ANALYZE_DUE_DILIGENCE', input.content || '', input as unknown as Record<string, unknown>);
  }

  retrieveContractClauses(actor: AuthenticatedUser, input: ContractRetrievalDto) { return this.contractRetriever.retrieveClauses(actor, input); }
  validateContractRules(actor: AuthenticatedUser, input: ShariahValidationDto) { return this.contractRetriever.validateShariahRules(actor, input, input.context || {}); }

  generateAgreementSections(actor: AuthenticatedUser, input: { contractType: string; jurisdiction: string; jurisdictionProfile: unknown; projectId?: string; wizardData: Record<string, unknown>; clauses: unknown[]; shariahRules: unknown[] }) {
    return this.run(actor, 'agreement_generation', 'GENERATE_AGREEMENT_SECTIONS', `Draft structured ${input.contractType} agreement sections from the approved clauses and wizard facts. Do not invent parties, amounts, dates, ownership, guarantees, or Shariah approvals.`, input as unknown as Record<string, unknown>);
  }

  async scanProjectDueDiligence(actor: AuthenticatedUser, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { projectId }, include: { documents: true } });
    if (!project) throw new NotFoundException('Project not found in the current tenant');
    assertTenantScope(actor, project, 'Project');
    this.assertProjectSponsorScope(actor, project.projectSponsorId);
    await this.membership.consumeCredits(actor, 'DUE_DILIGENCE', projectId);

    const text = project.documents.map((document) => `${document.fileName}\n${document.extractedText}`).join('\n').toLowerCase();
    const documents = project.documents;
    const required = [
      { label: 'Independent Land Appraisal Report', terms: ['land appraisal', 'independent appraisal', 'valuation report'] },
      { label: 'Environmental & Sustainability Certificate', terms: ['environmental', 'rspo', 'sustainability certificate'] },
      { label: 'Audited Financial Statements', terms: ['audited financial', 'auditor report', 'financial statements'] },
    ];
    const missingDocuments = required.filter((item) => !item.terms.some((term) => text.includes(term))).map((item) => ({ title: item.label, status: 'MISSING' }));
    const findings: { title: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; mitigation: string }[] = [];
    const revenueMatch = text.match(/(?:revenue|turnover)[^\n%]{0,80}(\d{2,3})\s*%/i);
    if (revenueMatch && Number(revenueMatch[1]) >= 30) findings.push({ title: 'Revenue growth requires verification', description: `A revenue growth figure of ${revenueMatch[1]}% was detected in submitted evidence.`, severity: 'HIGH', mitigation: 'Verify assumptions against audited accounts, capex schedule, and customer contracts.' });
    const concentrationMatch = text.match(/(?:single supplier|vendor concentration|one supplier)[^\n%]{0,80}(\d{2,3})\s*%/i);
    if (concentrationMatch && Number(concentrationMatch[1]) >= 50) findings.push({ title: 'Supplier concentration requires verification', description: `A supplier concentration figure of ${concentrationMatch[1]}% was detected in submitted evidence.`, severity: 'MEDIUM', mitigation: 'Verify supplier ownership, registration, related-party exposure, and alternative suppliers.' });
    if (!documents.length) findings.push({ title: 'No project evidence uploaded', description: 'The project has no uploaded documents available for due diligence.', severity: 'HIGH', mitigation: 'Upload corporate, financial, asset, legal, and environmental evidence before approval.' });
    const confidenceScore = Math.max(0, Math.min(100, documents.length * 20 - missingDocuments.length * 15 - findings.length * 10));
    const scan = await this.prisma.projectDueDiligenceScan.create({ data: { projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, requestedBy: actor.userId, confidenceScore, missingDocuments, findings, completedAt: new Date() } });
    await this.audit.recordActor(actor, { action: 'project.due_diligence.scan', resourceType: 'Project', resourceId: projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { scanId: scan.id, missingCount: missingDocuments.length, findingCount: findings.length } });
    return scan;
  }

  async latestProjectDueDiligence(actor: AuthenticatedUser, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { projectId } });
    if (!project) throw new NotFoundException('Project not found in the current tenant');
    assertTenantScope(actor, project, 'Project');
    return this.prisma.projectDueDiligenceScan.findFirst({ where: { projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId }, orderBy: { createdAt: 'desc' } });
  }

  async analyzeProjectDocument(actor: AuthenticatedUser, projectId: string, documentId: string) {
    const document = await this.prisma.projectDocument.findFirst({ where: { id: documentId, projectId }, include: { project: true } });
    if (!document) throw new NotFoundException('Project document not found');
    assertTenantScope(actor, document.project, 'Project document');
    this.assertProjectSponsorScope(actor, document.project.projectSponsorId);
    await this.membership.consumeCredits(actor, 'PROJECT_SUMMARY', documentId);
    if (!document.extractedText.trim()) throw new BadRequestException('The document has no extractable text. OCR is required before analysis.');
    const content = document.extractedText;
    const result = {
      documentName: document.fileName,
      parties: Array.from(new Set((content.match(/\b[A-Z][A-Za-z&,. ]{2,60}(?:Berhad|Ltd|Limited|Sdn Bhd|LLC)\b/g) || []).slice(0, 10))),
      importantDates: (content.match(/\b(?:\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g) || []).slice(0, 10),
      extractedFigures: (content.match(/(?:MYR|RM|USD|EUR|GBP)\s?[\d,]+(?:\.\d+)?(?:\s?million|\s?billion)?/gi) || []).slice(0, 20),
      keyTerms: (content.match(/(?:Mudarabah|Musharakah|Ijarah|Wakalah|Sukuk|profit sharing|management fee|distribution cycle|maturity date)/gi) || []).slice(0, 20),
      source: 'PROJECT_DOCUMENT_TEXT',
      requiresHumanReview: true,
    };
    const confidenceScore = result.parties.length || result.importantDates.length || result.extractedFigures.length || result.keyTerms.length ? 70 : 20;
    const analysis = await this.prisma.projectDocumentAnalysis.create({ data: { documentId, projectId, organisationId: document.organisationId, countryNodeId: document.countryNodeId, analysedBy: actor.userId, confidenceScore, result } });
    await this.audit.recordActor(actor, { action: 'project.document.analyze', resourceType: 'ProjectDocument', resourceId: documentId, organisationId: document.organisationId, countryNodeId: document.countryNodeId, metadata: { analysisId: analysis.id, confidenceScore } });
    return { ...analysis, ...result, confidence: { level: confidenceScore >= 70 ? 'MEDIUM' : 'LOW', scorePercent: confidenceScore, disclaimer: 'Text extraction is advisory and requires legal, financial, compliance, and Shariah verification.' } };
  }

  analyzeProjectFeasibility(actor: AuthenticatedUser, input: { projectId: string; project: Record<string, unknown>; documents: Array<Record<string, unknown>>; financialAnalysis: Record<string, unknown>; riskAnalysis: Record<string, unknown> }) {
    return this.run(actor, 'project_feasibility', 'ANALYZE_PROJECT_FEASIBILITY', 'Assess the supplied project facts and extracted evidence. Do not invent financial figures, documents, assumptions, approvals, or returns. Return a cautious recommendation that identifies missing evidence and requires human review.', input as unknown as Record<string, unknown>);
  }

  async runProjectFeasibility(actor: AuthenticatedUser, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { projectId }, include: { documents: { select: { id: true, fileName: true, extractedText: true, extractionStatus: true, createdAt: true } }, milestones: { select: { title: true, completionPct: true, status: true } } } });
    if (!project) throw new NotFoundException('Project not found in the current tenant');
    assertTenantScope(actor, project, 'Project');
    this.assertProjectSponsorScope(actor, project.projectSponsorId);
    const financialAnalysis = this.buildFinancialAnalysis(project, project.documents.map((document) => document.extractedText).join('\n'));
    const evidenceIntelligence = this.buildEvidenceIntelligence(project, project.documents, financialAnalysis);
    const projectRiskAssessment = this.buildProjectRiskAssessment(financialAnalysis, evidenceIntelligence, project.milestones);
    const projectFeasibility = this.buildProjectFeasibilityScore(financialAnalysis, evidenceIntelligence, projectRiskAssessment, project.milestones);
    const riskAnalysis = { ...this.buildFeasibilityRiskAnalysis(project, project.documents), projectRiskAssessment };
    const shariahAssessment = this.buildShariahStructureAssessment(project.proposedShariahContract, project, project.documents);
    const aiRun = await this.analyzeProjectFeasibility(actor, { projectId, project: { projectId, projectCode: project.projectCode, projectName: project.projectName, description: project.description, sector: project.sector, totalProjectCost: project.totalProjectCost.toString(), sponsorContribution: project.sponsorContribution.toString(), fundingRequired: project.fundingRequired.toString(), proposedShariahContract: project.proposedShariahContract, status: project.status, milestones: project.milestones }, documents: project.documents.map(({ extractedText, ...document }) => ({ ...document, textLength: extractedText.length })), financialAnalysis, riskAnalysis });
    const investmentReadiness = this.buildInvestmentReadiness(evidenceIntelligence, financialAnalysis, projectRiskAssessment, shariahAssessment, projectFeasibility);
    const confidence = { level: evidenceIntelligence.scorePercent >= 70 ? 'MEDIUM' : 'LOW', scorePercent: evidenceIntelligence.scorePercent, disclaimer: 'Confidence reflects evidence quality and completeness, not project viability.', reasons: evidenceIntelligence.confidenceReasons };
    const output = { ...(aiRun.output || {}), evidenceIntelligence, projectFeasibility, confidence, investmentReadiness, shariahAssessment, humanReviewRequired: true, recommendation: { ...((aiRun.output?.recommendation || {}) as Record<string, unknown>), financialAnalysis, riskAnalysis, evidenceIntelligence, projectFeasibility, confidence, investmentReadiness, shariahAssessment, humanReviewRequired: true, requiresHumanReview: true, disclaimer: 'Assessment uses tenant-scoped project fields and extracted document evidence. It is not legal, financial, investment, or Shariah approval.' } } as Prisma.InputJsonValue;
    const history = [{ stage: 'DRAFT', reviewerId: actor.userId, reviewerRole: 'AI System', date: new Date().toISOString(), decision: 'AI_RECOMMENDATION', comment: 'AI analysis generated. Human review required; no funding approval was granted.' }];
    const updated = await this.prisma.aiRun.update({ where: { id: aiRun.id }, data: { output, reviewStage: 'DRAFT', reviewHistory: history } });
    await this.audit.recordActor(actor, { action: 'project.feasibility.analyze', resourceType: 'Project', resourceId: projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { aiRunId: updated.id, documentCount: project.documents.length, reviewStage: 'DRAFT' } });
    return { ...updated, project: { projectId, projectCode: project.projectCode, projectName: project.projectName, sector: project.sector, fundingRequired: project.fundingRequired, status: project.status }, financialAnalysis, riskAnalysis, evidenceIntelligence, projectFeasibility, confidence, investmentReadiness, shariahAssessment, humanReviewRequired: true, reviewStage: 'DRAFT' };
  }

  async latestProjectFeasibility(actor: AuthenticatedUser, projectId: string) { const project = await this.prisma.project.findUnique({ where: { projectId }, include: { documents: { select: { fileName: true, extractedText: true, extractionStatus: true } } } }); if (!project) throw new NotFoundException('Project not found in the current tenant'); assertTenantScope(actor, project, 'Project'); const runs = await this.prisma.aiRun.findMany({ where: { featureKey: 'project_feasibility', organisationId: project.organisationId, countryNodeId: project.countryNodeId }, orderBy: { createdAt: 'desc' }, take: 25 }); const run = runs.find((item) => (item.input as { projectId?: string }).projectId === projectId); if (!run) return null; const storedOutput = run.output as { recommendation?: { financialAnalysis?: Record<string, unknown>; riskAnalysis?: Record<string, unknown>; evidenceIntelligence?: Record<string, unknown>; confidence?: Record<string, unknown>; investmentReadiness?: Record<string, unknown>; shariahAssessment?: Record<string, unknown> }; evidenceIntelligence?: Record<string, unknown>; confidence?: Record<string, unknown>; investmentReadiness?: Record<string, unknown>; shariahAssessment?: Record<string, unknown>; humanReviewRequired?: boolean } | null; const recommendation = storedOutput?.recommendation; const financialAnalysis = recommendation?.financialAnalysis || {}; const evidenceIntelligence = recommendation?.evidenceIntelligence || storedOutput?.evidenceIntelligence || this.buildEvidenceIntelligence(project, project.documents, financialAnalysis); const confidence = recommendation?.confidence || storedOutput?.confidence || { level: Number(evidenceIntelligence.scorePercent || 0) >= 70 ? 'MEDIUM' : 'LOW', scorePercent: evidenceIntelligence.scorePercent || 0, disclaimer: 'Confidence reflects evidence quality and completeness, not project viability.', reasons: evidenceIntelligence.confidenceReasons || [] }; const riskAnalysis = recommendation?.riskAnalysis || {}; const investmentReadiness = recommendation?.investmentReadiness || storedOutput?.investmentReadiness || this.buildInvestmentReadiness(evidenceIntelligence, financialAnalysis, (riskAnalysis as { projectRiskAssessment?: unknown }).projectRiskAssessment || []); const shariahAssessment = recommendation?.shariahAssessment || storedOutput?.shariahAssessment || this.buildShariahStructureAssessment(project.proposedShariahContract, project, project.documents); return { ...run, project: { projectId: project.projectId, projectCode: project.projectCode, projectName: project.projectName, sector: project.sector, fundingRequired: project.fundingRequired, status: project.status }, financialAnalysis, riskAnalysis, evidenceIntelligence, confidence, investmentReadiness, shariahAssessment, humanReviewRequired: storedOutput?.humanReviewRequired !== false, reviewStage: run.reviewStage }; }

  async reviewProjectFeasibility(actor: AuthenticatedUser, projectId: string, runId: string, input: { reviewStage: string; decision: string; comment: string }) {
    const project = await this.prisma.project.findUnique({ where: { projectId } });
    if (!project) throw new NotFoundException('Project not found in the current tenant');
    assertTenantScope(actor, project, 'Project');
    const run = await this.prisma.aiRun.findFirst({ where: { id: runId, featureKey: 'project_feasibility', organisationId: project.organisationId, countryNodeId: project.countryNodeId } });
    if (!run || (run.input as { projectId?: string }).projectId !== projectId) throw new NotFoundException('Project feasibility run not found');
    if (!input.comment?.trim()) throw new BadRequestException('A review comment is required.');

    const nextStage: Record<string, string> = { DRAFT: 'FINANCE_REVIEW', FINANCE_REVIEW: 'RISK_REVIEW', RISK_REVIEW: 'COMPLIANCE_REVIEW', COMPLIANCE_REVIEW: 'SHARIAH_REVIEW', SHARIAH_REVIEW: 'INVESTMENT_COMMITTEE_REVIEW', INVESTMENT_COMMITTEE_REVIEW: 'FINAL_DECISION' };
    const reviewerRoles: Record<string, string[]> = {
      DRAFT: ['Project Sponsor', 'Project Manager', 'Country Admin', 'Organization Admin'],
      FINANCE_REVIEW: ['Finance Officer', 'Country Admin', 'Organization Admin'],
      RISK_REVIEW: ['Risk Officer', 'Country Admin', 'Organization Admin'],
      COMPLIANCE_REVIEW: ['Compliance Officer', 'Country Admin', 'Organization Admin'],
      SHARIAH_REVIEW: ['Shariah Reviewer', 'Shariah Advisor', 'Country Admin', 'Organization Admin'],
      INVESTMENT_COMMITTEE_REVIEW: ['Shariah Committee'],
      FINAL_DECISION: ['Shariah Committee'],
    };
    if (!reviewerRoles[run.reviewStage]?.includes(actor.role)) throw new ForbiddenException('Your role cannot perform this feasibility review stage.');
    const isFinalCommitteeReview = run.reviewStage === 'FINAL_DECISION';
    const accepted = ['ACCEPTED', 'ACCEPTED_WITH_CONDITIONS'].includes(input.decision);
    const targetStage = isFinalCommitteeReview || !accepted ? run.reviewStage : nextStage[run.reviewStage];
    if (!targetStage || (accepted && !isFinalCommitteeReview && ![run.reviewStage, targetStage].includes(input.reviewStage)) || (!accepted && input.reviewStage !== run.reviewStage) || (isFinalCommitteeReview && input.reviewStage !== run.reviewStage)) throw new BadRequestException(`Invalid feasibility review transition from ${run.reviewStage} to ${input.reviewStage}`);
    const history = Array.isArray(run.reviewHistory) ? run.reviewHistory : [];
    const reviewEntry = { stage: run.reviewStage, reviewerId: actor.userId, reviewerRole: actor.role, date: new Date().toISOString(), decision: input.decision, comment: input.comment.trim() };
    const updated = await this.prisma.aiRun.update({ where: { id: run.id }, data: { reviewStage: targetStage, reviewHistory: [...history, reviewEntry] } });
    await this.audit.recordActor(actor, { action: 'project.feasibility.review_decision', resourceType: 'AiRun', resourceId: run.id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { projectId, reviewStage: run.reviewStage, targetStage, decision: input.decision, comment: input.comment } });
    return { ...updated, humanReviewRequired: true, finalHumanDecisionRecorded: isFinalCommitteeReview };
  }

  private buildFinancialAnalysis(project: { totalProjectCost: Prisma.Decimal; sponsorContribution: Prisma.Decimal; fundingRequired: Prisma.Decimal }, text: string) {
    const facts = this.extractFinancialFacts(text);
    const initialInvestment = facts.capex ?? Number(project.fundingRequired);
    const cashFlows = facts.cashFlows;
    const npv = cashFlows.length && facts.discountRate !== null ? cashFlows.reduce((sum, cashFlow, index) => sum + cashFlow / Math.pow(1 + facts.discountRate!, index + 1), -initialInvestment) : null;
    const irr = cashFlows.length >= 2 ? this.calculateIrr([-initialInvestment, ...cashFlows]) : null;
    const dscr = facts.debtService && facts.operatingCashflow ? facts.operatingCashflow / facts.debtService : null;
    const roi = cashFlows.length && initialInvestment > 0 ? ((cashFlows.reduce((sum, cashFlow) => sum + cashFlow, 0) - initialInvestment) / initialInvestment) * 100 : null;
    const paybackPeriod = this.calculatePaybackPeriod(cashFlows, initialInvestment);
    const profitMargin = facts.revenue !== null && facts.opex !== null && facts.revenue > 0 ? ((facts.revenue - facts.opex) / facts.revenue) * 100 : null;
    const financialFeasibility = npv !== null && irr !== null && npv > 0 && irr >= 0 && (dscr === null || dscr >= 1) ? 'FEASIBLE_FOR_HUMAN_REVIEW' : npv === null || irr === null ? 'REQUIRES_ADDITIONAL_INFORMATION' : 'NOT_FINANCIALLY_FEASIBLE';
    return {
      projectInputs: { totalProjectCost: project.totalProjectCost.toString(), sponsorContribution: project.sponsorContribution.toString(), fundingRequired: project.fundingRequired.toString() },
      assumptions: { capex: facts.capex, opex: facts.opex, revenue: facts.revenue, discountRate: facts.discountRate, debtService: facts.debtService, source: facts.source },
      cashflow: { annualOperatingCashflow: facts.operatingCashflow, debtService: facts.debtService, extractedCashFlows: cashFlows, source: facts.source },
      npv, irr, dscr, roi, paybackPeriod, profitMargin, discountRate: facts.discountRate, fundingReadiness: financialFeasibility, financialFeasibility,
      scenarios: this.buildScenarioAnalysis(cashFlows, initialInvestment, facts),
      source: 'PROJECT_FIELDS_AND_EXTRACTED_DOCUMENT_TEXT',
    };
  }

  private buildShariahStructureAssessment(contractType: string, project: { description: string; sponsorContribution: Prisma.Decimal; projectSponsorId: string }, documents: Array<{ fileName: string; extractedText: string; extractionStatus: string }>) {
    const structure = ['Ijarah', 'Musharakah', 'Mudarabah', 'Wakalah', 'Sukuk'].find((item) => item.toLowerCase() === contractType.trim().toLowerCase()) || contractType || 'Unspecified';
    const text = documents.map((document) => document.extractedText).join('\n').toLowerCase();
    const has = (terms: string[]) => terms.some((term) => text.includes(term));
    const checksByStructure: Record<string, Array<{ label: string; complete: boolean; required: string }>> = {
      Musharakah: [
        { label: 'Partners identified', complete: Boolean(project.projectSponsorId), required: 'Identify all Musharakah partners and their legal capacity.' },
        { label: 'Capital contribution available', complete: Number(project.sponsorContribution) > 0, required: 'Document each partner contribution and funding source.' },
        { label: 'Profit sharing ratio', complete: has(['profit sharing ratio', 'profit-sharing ratio', 'profit split']), required: 'Provide the agreed profit-sharing ratio and calculation basis.' },
        { label: 'Loss allocation basis', complete: has(['loss sharing', 'loss allocation']), required: 'Confirm loss allocation follows contributed capital and applicable Shariah rules.' },
      ],
      Mudarabah: [
        { label: 'Capital provider identified', complete: has(['rab al mal', 'capital provider', 'investor']), required: 'Identify the Rabb al-Mal and document capital authority.' },
        { label: 'Mudarib identified', complete: has(['mudarib', 'manager', 'operator']), required: 'Identify the Mudarib and management mandate.' },
        { label: 'Profit sharing ratio', complete: has(['profit sharing ratio', 'profit-sharing ratio', 'profit split']), required: 'Provide a pre-agreed percentage profit-sharing ratio.' },
        { label: 'Loss treatment', complete: has(['loss treatment', 'capital loss']), required: 'Document capital loss treatment and negligence boundaries.' },
      ],
      Ijarah: [
        { label: 'Underlying asset identified', complete: has(['asset', 'equipment', 'property', 'land']), required: 'Identify the leased asset and evidence ownership or usufruct rights.' },
        { label: 'Ownership evidence', complete: has(['title deed', 'ownership document', 'certificate of title']), required: 'Provide title and ownership evidence before lease execution.' },
        { label: 'Lease term and rental basis', complete: has(['lease term', 'rental amount', 'rent schedule']), required: 'Provide lease tenor, rental schedule, maintenance, and risk terms.' },
      ],
      Wakalah: [
        { label: 'Mandate and investment scope', complete: has(['wakalah', 'mandate', 'investment parameters']), required: 'Define the agency mandate, investment universe, and restrictions.' },
        { label: 'Principal and agent identified', complete: has(['principal', 'agent', 'wakil']), required: 'Identify principal and Wakil legal entities.' },
        { label: 'Fee and incentive disclosed', complete: has(['agency fee', 'wakalah fee', 'incentive']), required: 'Document agency fee, incentive, and expense treatment.' },
      ],
      Sukuk: [
        { label: 'Underlying asset or activity identified', complete: has(['sukuk', 'underlying asset', 'project asset']), required: 'Identify the eligible underlying asset or activity.' },
        { label: 'Ownership and investor rights', complete: has(['beneficial ownership', 'certificate holder', 'investor rights']), required: 'Document ownership, beneficial rights, and recourse limitations.' },
        { label: 'Cashflow and redemption terms', complete: has(['redemption', 'distribution', 'periodic payment']), required: 'Provide distribution, maturity, redemption, and default terms.' },
      ],
    };
    const checks = checksByStructure[structure] || [{ label: 'Recognised structure identified', complete: false, required: 'Confirm the proposed structure and provide the approved term sheet.' }];
    const missing = checks.filter((check) => !check.complete).map((check) => check.required);
    return { structure, reviewTitle: `${structure} Review`, suitability: missing.length ? 'REQUIRES_SHARIAH_REVIEW' : 'SUITABLE_FOR_SHARIAH_REVIEW', checks: checks.map((check) => ({ label: check.label, status: check.complete ? 'COMPLETE' : 'MISSING' })), requiredInformation: missing, potentialConcerns: missing.length ? ['The proposed structure cannot be treated as Shariah-compliant until the missing information is independently reviewed.', ...missing] : ['Confirm asset ownership, risk allocation, profit treatment, and prohibited elements during formal Shariah review.'], status: 'PENDING_SHARIAH_REVIEW', humanReviewRequired: true };
  }

  private buildFeasibilityRiskAnalysis(project: { description: string; status: string }, documents: Array<{ fileName: string; extractedText: string; extractionStatus: string }>) { const text = documents.map((document) => document.extractedText).join('\n').toLowerCase(); const missingEvidence = ['financial model or cashflow forecast', 'asset appraisal or valuation', 'legal and ownership evidence'].filter((item) => !text.includes(item.split(' ')[0])); const riskFlags = [{ title: 'Missing evidence', severity: missingEvidence.length ? 'HIGH' : 'LOW', description: missingEvidence.length ? `Missing: ${missingEvidence.join(', ')}` : 'Core evidence keywords were found in uploaded documents.' }, ...(documents.some((document) => document.extractionStatus === 'FAILED') ? [{ title: 'Document extraction failure', severity: 'HIGH', description: 'One or more uploaded documents could not be reliably extracted.' }] : [])]; return { riskFlags, missingEvidence, keyAssumptions: [{ name: 'Project description', value: project.description }, { name: 'Project lifecycle status', value: project.status }, { name: 'Uploaded document count', value: documents.length }], sourceDocuments: documents.map((document) => document.fileName) }; }

  private buildProjectFeasibilityScore(financialAnalysis: Record<string, any>, evidenceIntelligence: Record<string, any>, projectRiskAssessment: { overallLevel: string }, milestones: Array<{ title: string; completionPct: number; status: string }>) {
    const hasCoverage = (key: string, status = 'COMPLETED') => evidenceIntelligence.coverage?.some((item: { key: string; status: string }) => item.key === key && item.status === status);
    const financialAvailable = financialAnalysis.npv !== null && financialAnalysis.irr !== null && hasCoverage('financial_model') && hasCoverage('cashflow_projection');
    const operationalAvailable = milestones.length > 0 && hasCoverage('project_information') && hasCoverage('sector_classification');
    if (!financialAvailable || !operationalAvailable) return { available: false, score: null, status: 'REQUIRES_ADDITIONAL_INFORMATION', components: { financialFeasibility: null, marketAssumptions: null, executionReadiness: null, riskExposure: null }, reason: 'Project Feasibility Score is withheld until sufficient financial and operational evidence is submitted.' };
    const marketScore = hasCoverage('market_study') ? 25 : 0;
    const score = Math.round(35 + marketScore + (operationalAvailable ? 20 : 0) + (projectRiskAssessment.overallLevel === 'LOW' ? 25 : projectRiskAssessment.overallLevel === 'MEDIUM' ? 15 : 0));
    return { available: true, score, status: score >= 70 ? 'SUFFICIENT_FEASIBILITY_EVIDENCE' : 'REQUIRES_ADDITIONAL_INFORMATION', components: { financialFeasibility: 35, marketAssumptions: marketScore, executionReadiness: 20, riskExposure: projectRiskAssessment.overallLevel === 'LOW' ? 25 : projectRiskAssessment.overallLevel === 'MEDIUM' ? 15 : 0 }, reason: 'Score reflects financial feasibility, market assumptions, execution readiness, and risk exposure. It is not an investment approval.' };
  }

  private buildEvidenceIntelligence(project: { description: string; sector: string; fundingRequired: Prisma.Decimal; totalProjectCost: Prisma.Decimal; sponsorContribution: Prisma.Decimal; proposedShariahContract: string }, documents: Array<{ fileName: string; extractedText: string; extractionStatus: string }>, financialAnalysis: Record<string, unknown>) {
    const text = documents.map((document) => `${document.fileName}\n${document.extractedText}`).join('\n').toLowerCase();
    const hasAny = (terms: string[]) => terms.some((term) => text.includes(term));
    const hasFinancialModel = hasAny(['financial model', 'income statement', 'profit and loss', 'financial projection', 'audited financial']);
    const hasCashflowProjection = Array.isArray((financialAnalysis.cashflow as { extractedCashFlows?: unknown[] } | undefined)?.extractedCashFlows) && ((financialAnalysis.cashflow as { extractedCashFlows?: unknown[] }).extractedCashFlows?.length || 0) >= 2;
    const hasAssetValuation = hasAny(['valuation report', 'asset valuation', 'asset appraisal', 'land appraisal', 'property valuation']);
    const hasLegalOwnership = hasAny(['legal ownership', 'land title', 'title deed', 'ownership document', 'certificate of title']);
    const hasBusinessPlan = hasAny(['business plan', 'feasibility study']) || Boolean(project.description.trim());
    const hasMarketStudy = hasAny(['market study', 'market analysis', 'market demand', 'offtake', 'customer research']);
    const hasShariahStructure = Boolean(project.proposedShariahContract && ['ijarah', 'musharakah', 'mudarabah', 'wakalah', 'sukuk'].includes(project.proposedShariahContract.toLowerCase()));
    const coverage = [
      { key: 'project_information', label: 'Project Information', status: project.description.trim() ? 'COMPLETED' : 'PENDING', importance: 'High', requiredAction: project.description.trim() ? 'Review project information.' : 'Add complete project information.' },
      { key: 'sector_classification', label: 'Sector Classification', status: project.sector.trim() ? 'COMPLETED' : 'PENDING', importance: 'Medium', requiredAction: project.sector.trim() ? 'Review sector classification.' : 'Specify the operating sector.' },
      { key: 'funding_requirement', label: 'Funding Requirement', status: Number(project.fundingRequired) > 0 ? 'COMPLETED' : 'PENDING', importance: 'Critical', requiredAction: Number(project.fundingRequired) > 0 ? 'No action required.' : 'Provide the requested funding amount.' },
      { key: 'proposed_shariah_structure', label: 'Proposed Shariah Structure', status: hasShariahStructure ? 'COMPLETED' : 'PENDING', importance: 'Critical', requiredAction: hasShariahStructure ? 'Submit the structure for Shariah review.' : 'Confirm the proposed Ijarah, Musharakah, Mudarabah, Wakalah, or Sukuk structure.' },
      { key: 'financial_model', label: 'Financial Model', status: hasFinancialModel ? 'COMPLETED' : 'PENDING', importance: 'Critical', requiredAction: hasFinancialModel ? 'No action required.' : 'Upload a complete historical and projected financial model.' },
      { key: 'cashflow_projection', label: 'Cashflow Projection', status: hasCashflowProjection ? 'COMPLETED' : 'PENDING', importance: 'Critical', requiredAction: hasCashflowProjection ? 'Review cashflow assumptions.' : 'Upload a 5-year cashflow projection with assumptions.' },
      { key: 'asset_valuation', label: 'Asset Valuation', status: hasAssetValuation ? 'COMPLETED' : 'PENDING', importance: 'High', requiredAction: hasAssetValuation ? 'No action required.' : 'Submit an independent asset valuation report.' },
      { key: 'legal_ownership', label: 'Legal Ownership Documents', status: hasLegalOwnership ? 'COMPLETED' : 'PENDING', importance: 'High', requiredAction: hasLegalOwnership ? 'No action required.' : 'Provide title, ownership, and legal registration evidence.' },
      { key: 'market_study', label: 'Market Study', status: hasMarketStudy ? 'COMPLETED' : 'PENDING', importance: 'High', requiredAction: hasMarketStudy ? 'Review market assumptions.' : 'Upload market demand, customer, pricing, and offtake evidence.' },
    ];
    const matrix = [
      { evidence: 'Business Plan', status: hasBusinessPlan ? 'AVAILABLE' : 'MISSING', priority: hasBusinessPlan ? 'Medium' : 'Critical', requiredAction: hasBusinessPlan ? 'No action required.' : 'Upload the business plan and market rationale.' },
      { evidence: 'Financial Model', status: hasFinancialModel ? 'AVAILABLE' : 'MISSING', priority: 'Critical', requiredAction: hasFinancialModel ? 'No action required.' : 'Upload a complete financial model.' },
      { evidence: 'Cashflow Forecast', status: hasCashflowProjection ? 'AVAILABLE' : 'MISSING', priority: 'Critical', requiredAction: hasCashflowProjection ? 'Review' : 'Upload' },
      { evidence: 'Valuation Report', status: hasAssetValuation ? 'AVAILABLE' : 'MISSING', priority: 'High', requiredAction: hasAssetValuation ? 'Review' : 'Upload' },
      { evidence: 'Legal Documents', status: hasLegalOwnership ? 'AVAILABLE' : 'MISSING', priority: 'High', requiredAction: hasLegalOwnership ? 'No action required.' : 'Submit ownership, title, and registration documents.' },
      { evidence: 'Market Study', status: hasMarketStudy ? 'AVAILABLE' : 'MISSING', priority: 'High', requiredAction: hasMarketStudy ? 'Review' : 'Upload' },
    ];
    const projectDataScore = [project.description.trim(), project.sector.trim(), Number(project.fundingRequired) > 0, Number(project.totalProjectCost) > 0, Number(project.sponsorContribution) >= 0].filter(Boolean).length / 5 * 25;
    const documentScore = matrix.filter((item) => item.status === 'AVAILABLE').length / matrix.length * 35;
    const financialScore = (hasFinancialModel ? 15 : 0) + (hasCashflowProjection ? 15 : 0);
    const supportingScore = documents.length > 0 && documents.every((document) => document.extractionStatus !== 'FAILED') ? 10 : documents.length ? 5 : 0;
    const scorePercent = Math.round(projectDataScore + documentScore + financialScore + supportingScore);
    const confidenceReasons = [
      `${documents.length} project document${documents.length === 1 ? '' : 's'} available for assessment.`,
      ...(hasFinancialModel ? [] : ['No financial model submitted.']),
      ...(hasCashflowProjection ? [] : ['No complete cashflow projection submitted.']),
      ...(hasAssetValuation ? [] : ['No asset valuation evidence submitted.']),
      ...(hasLegalOwnership ? [] : ['No legal ownership documents submitted.']),
      ...(hasMarketStudy ? [] : ['No market study or historical market evidence submitted.']),
    ];
    return { scorePercent, status: scorePercent >= 70 ? 'SUFFICIENT_EVIDENCE' : 'INSUFFICIENT_EVIDENCE', components: { projectData: Math.round(projectDataScore), requiredDocuments: Math.round(documentScore), financialAssumptions: financialScore, supportingEvidence: supportingScore }, coverage, matrix, nextActions: coverage.filter((item) => item.status === 'PENDING').map((item) => item.requiredAction).filter((action) => action !== 'No action required.').slice(0, 5), confidenceReasons, disclaimer: 'Evidence readiness measures the quality and completeness of submitted evidence. It does not indicate project viability, approval, or investment suitability.' };
  }
  private buildProjectRiskAssessment(financialAnalysis: Record<string, any>, evidenceIntelligence: Record<string, any>, milestones: Array<{ title: string; completionPct: number; status: string }>) {
    const matrix = evidenceIntelligence.matrix as Array<{ evidence: string; status: string }>;
    const available = (name: string) => matrix.some((item) => item.evidence === name && item.status === 'AVAILABLE');
    const financialMissing = financialAnalysis.financialFeasibility === 'REQUIRES_ADDITIONAL_INFORMATION';
    const risks = [
      { category: 'Market Risk', level: financialAnalysis.assumptions?.revenue === null ? 'HIGH' : 'MEDIUM', description: financialAnalysis.assumptions?.revenue === null ? 'Revenue assumptions were not found in the submitted financial evidence.' : 'Revenue assumptions require validation against market demand and offtake evidence.', impact: 'Revenue shortfall could reduce cash generation and debt repayment capacity.', mitigation: 'Submit customer, pricing, offtake, and market validation evidence.' },
      { category: 'Financial Risk', level: financialMissing || financialAnalysis.dscr === null ? 'HIGH' : financialAnalysis.dscr < 1 ? 'HIGH' : 'MEDIUM', description: financialMissing ? 'Core financial metrics cannot be calculated from the submitted model.' : financialAnalysis.dscr === null ? 'Debt service coverage cannot be assessed because debt service data is missing.' : 'Financial performance remains dependent on the submitted assumptions.', impact: 'Unexpected costs or weaker cashflow may impair returns and repayment.', mitigation: 'Provide an auditable model with CAPEX, OPEX, revenue, debt service, and sensitivity assumptions.' },
      { category: 'Execution Risk', level: milestones.length && milestones.every((milestone) => milestone.completionPct >= 0) ? 'MEDIUM' : 'HIGH', description: milestones.length ? 'Execution milestones are present but require delivery monitoring.' : 'No project execution milestones were submitted.', impact: 'Delays may increase costs and defer revenue generation.', mitigation: 'Provide a dated implementation plan, owners, dependencies, and completion evidence.' },
      { category: 'Operational Risk', level: financialAnalysis.assumptions?.opex === null ? 'HIGH' : 'MEDIUM', description: financialAnalysis.assumptions?.opex === null ? 'Operating expense assumptions were not found.' : 'Operating costs require validation against operating capacity and supplier assumptions.', impact: 'Higher operating costs could reduce profit margin and cashflow.', mitigation: 'Submit an OPEX schedule, supplier quotations, staffing plan, and operating controls.' },
      { category: 'Regulatory Risk', level: available('Legal Documents') ? 'MEDIUM' : 'HIGH', description: available('Legal Documents') ? 'Legal evidence is available for human compliance review.' : 'Legal ownership and registration evidence is missing.', impact: 'Unresolved ownership or regulatory matters may prevent approval or funding.', mitigation: 'Submit title, ownership, registration, permits, and compliance evidence for review.' },
    ];
    return { overallLevel: risks.some((risk) => risk.level === 'HIGH') ? 'HIGH' : risks.some((risk) => risk.level === 'MEDIUM') ? 'MEDIUM' : 'LOW', risks, requiresHumanReview: true };
  }

  private buildInvestmentReadiness(evidenceIntelligence: Record<string, any>, financialAnalysis: Record<string, any>, projectRiskAssessment: any, shariahAssessment: Record<string, any> = { requiredInformation: ['Shariah assessment not available in this stored run.'] }, projectFeasibility: Record<string, any> = { available: false }) {
    const complianceStatus = evidenceIntelligence.matrix?.some((item: { evidence: string; status: string }) => item.evidence === 'Legal Documents' && item.status === 'AVAILABLE') ? 'PENDING_HUMAN_COMPLIANCE_REVIEW' : 'INCOMPLETE';
    const financialStatus = financialAnalysis.financialFeasibility;
    const shariahComplete = shariahAssessment.requiredInformation?.length === 0;
    const criticalBlocker = financialStatus === 'NOT_FINANCIALLY_FEASIBLE' || projectRiskAssessment.overallLevel === 'HIGH';
    const complete = evidenceIntelligence.scorePercent >= 70 && financialStatus === 'FEASIBLE_FOR_HUMAN_REVIEW' && projectRiskAssessment.overallLevel !== 'HIGH' && complianceStatus !== 'INCOMPLETE' && shariahComplete && projectFeasibility.available;
    const status = complete ? 'GREEN' : criticalBlocker ? 'RED' : 'YELLOW';
    return { status, label: status === 'GREEN' ? 'Ready for Investment Review' : status === 'RED' ? 'Not Ready' : 'Requires Additional Information', evidenceStatus: evidenceIntelligence.status, financialStatus, riskLevel: projectRiskAssessment.overallLevel, complianceStatus, shariahStatus: shariahComplete ? 'INFORMATION_COMPLETE_PENDING_REVIEW' : 'INFORMATION_INCOMPLETE', requiresHumanReview: true, disclaimer: 'Investment readiness is a decision-support status and is not approval, investment advice, or a viability guarantee.' };
  }

  private extractFinancialFacts(text: string) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const money = (line: string) => {
      const matches = [...line.matchAll(/(?:MYR|RM|USD|EUR|GBP)\s*([\d,]+(?:\.\d+)?)\s*(million|billion|m|b)?/gi)];
      const match = matches.at(-1);
      if (!match) return null;
      const value = Number(match[1].replace(/,/g, ''));
      return match[2]?.toLowerCase().startsWith('b') ? value * 1e9 : match[2]?.toLowerCase().startsWith('m') ? value * 1e6 : value;
    };
    const labelled = (patterns: RegExp[]) => { const line = lines.find((candidate) => patterns.some((pattern) => pattern.test(candidate))); return line ? money(line) : null; };
    const cashflowLines = lines.filter((line) => /cash flow|free cash flow|net cash flow/i.test(line));
    const cashFlows = cashflowLines.map(money).filter((value): value is number => value !== null);
    const rateLine = lines.find((line) => /discount rate|hurdle rate/i.test(line));
    const rateMatch = rateLine?.match(/([\d.]+)\s*%/);
    const scenarioAdjustment = (scenario: string) => {
      const line = lines.find((candidate) => new RegExp(scenario, 'i').test(candidate) && /cash flow|revenue|opex|cost|sensitivity/.test(candidate));
      const match = line?.match(/([+-]?[\d.]+)\s*%/);
      return match ? Number(match[1]) / 100 : null;
    };
    return { cashFlows, capex: labelled([/capex|capital expenditure|construction cost/i]), opex: labelled([/opex|operating expense|operating cost/i]), revenue: labelled([/revenue|sales|turnover/i]), operatingCashflow: labelled([/operating cash flow|ebitda|operating profit/i]), debtService: labelled([/debt service|finance payment|principal and interest/i]), discountRate: rateMatch ? Number(rateMatch[1]) / 100 : null, scenarioAdjustments: { downside: scenarioAdjustment('downside'), upside: scenarioAdjustment('upside') }, source: cashflowLines.length ? 'EXTRACTED_DOCUMENT_LINES' : 'NOT_AVAILABLE' };
  }

  private buildScenarioAnalysis(cashFlows: number[], initialInvestment: number, facts: { discountRate: number | null; scenarioAdjustments: { downside: number | null; upside: number | null } }) {
    const calculate = (name: string, adjustment: number | null) => {
      if (name !== 'Base Case' && adjustment === null) return { name, status: 'REQUIRES_INPUT', adjustmentPercent: null, npv: null, irr: null, roi: null, paybackPeriod: null };
      const adjustedCashFlows = adjustment === null ? cashFlows : cashFlows.map((cashFlow) => cashFlow * (1 + adjustment));
      return { name, status: adjustedCashFlows.length >= 2 && facts.discountRate !== null ? 'CALCULATED' : 'REQUIRES_INPUT', adjustmentPercent: adjustment === null ? 0 : adjustment * 100, npv: adjustedCashFlows.length && facts.discountRate !== null ? adjustedCashFlows.reduce((sum, cashFlow, index) => sum + cashFlow / Math.pow(1 + facts.discountRate!, index + 1), -initialInvestment) : null, irr: adjustedCashFlows.length >= 2 ? this.calculateIrr([-initialInvestment, ...adjustedCashFlows]) : null, roi: adjustedCashFlows.length && initialInvestment > 0 ? ((adjustedCashFlows.reduce((sum, cashFlow) => sum + cashFlow, 0) - initialInvestment) / initialInvestment) * 100 : null, paybackPeriod: this.calculatePaybackPeriod(adjustedCashFlows, initialInvestment) };
    };
    return [calculate('Base Case', null), calculate('Downside Case', facts.scenarioAdjustments.downside), calculate('Upside Case', facts.scenarioAdjustments.upside)];
  }

  private calculatePaybackPeriod(cashFlows: number[], initialInvestment: number) { if (initialInvestment <= 0) return null; let cumulative = 0; for (let index = 0; index < cashFlows.length; index += 1) { const previous = cumulative; cumulative += cashFlows[index]; if (cumulative >= initialInvestment && cashFlows[index] > 0) return index + (initialInvestment - previous) / cashFlows[index]; } return null; }
  private calculateIrr(cashFlows: number[]) { let low = -0.99; let high = 10; for (let iteration = 0; iteration < 100; iteration += 1) { const rate = (low + high) / 2; const value = cashFlows.reduce((sum, cashFlow, index) => sum + cashFlow / Math.pow(1 + rate, index), 0); if (value > 0) low = rate; else high = rate; } return (low + high) / 2; }

  async reviewDecision(actor: AuthenticatedUser, runId: string, input: AiDecisionDto) {
    const run = await this.prisma.aiRun.findFirst({ where: { id: runId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId } });
    if (!run) throw new NotFoundException('AI run not found in the current tenant');
    if (!run.output) throw new BadRequestException('AI run has no completed output');
    if (await this.prisma.aiDecision.findUnique({ where: { runId } })) throw new BadRequestException('AI run already has a human decision');

    const decision = await this.prisma.aiDecision.create({
      data: { runId, decision: input.decision, justification: input.justification, reviewerId: actor.userId, reviewerRole: actor.role },
    });
    await this.audit.recordActor(actor, { action: 'ai.human_decision', resourceType: 'AiRun', resourceId: runId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { decision: input.decision, justification: input.justification } });
    return decision;
  }

  getConversation(actor: AuthenticatedUser, id: string) {
    return this.prisma.aiConversation.findFirst({
      where: { id, userId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, runs: { include: { decision: true }, orderBy: { createdAt: 'asc' } } },
    });
  }

  async createDocument(actor: AuthenticatedUser, input: RagDocumentDto) {
    const scope = scopeOf(actor);
    if (input.projectId) {
      const project = await this.prisma.project.findUnique({ where: { projectId: input.projectId } });
      if (!project) throw new NotFoundException('Project not found in the current tenant');
      assertTenantScope(actor, project, 'Project');
    }
    const contentHash = createHash('sha256').update(input.content).digest('hex');
    const document = await this.prisma.ragDocument.create({
      data: { ...scope, projectId: input.projectId || null, uploadedBy: actor.userId, title: input.title, sourceType: input.sourceType, documentCategory: input.documentCategory, contractType: input.contractType, authority: input.authority, jurisdiction: input.jurisdiction, industry: input.industry, approvalStatus: input.approvalStatus || 'DRAFT', contentHash, chunks: { create: this.chunk(input.content) } },
      include: { chunks: true },
    });
    await this.audit.recordActor(actor, { action: 'ai.rag.document_create', resourceType: 'RagDocument', resourceId: document.id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { title: input.title, scope: input.projectId ? 'PROJECT' : 'GLOBAL' } });
    return document;
  }

  async uploadPdf(actor: AuthenticatedUser, metadata: Partial<RagDocumentDto>, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('A PDF file is required');
    const parsed = await pdfParse(file.buffer);
    const content = parsed.text.trim();
    if (content.length < 20) throw new BadRequestException('The PDF contains no extractable text. Scanned PDFs require OCR before upload.');

    const title = file.originalname.replace(/\.pdf$/i, '').trim() || 'Uploaded PDF document';
    return this.createDocument(actor, { ...metadata, title: metadata.title || title, sourceType: metadata.sourceType || 'PDF_DOCUMENT', content });
  }

  async searchDocuments(actor: AuthenticatedUser, input: RagSearchDto) {
    const limit = input.limit || 5;
    const scope = tenantScopeFilter(actor);
    if (input.projectId) {
      const project = await this.prisma.project.findUnique({ where: { projectId: input.projectId } });
      if (!project) throw new NotFoundException('Project not found in the current tenant');
      assertTenantScope(actor, project, 'Project');
      if (project.organisationId !== actor.organisationId && actor.role !== 'Country Admin' && actor.role !== 'Super Admin') {
        throw new ForbiddenException('Project is outside your organisation scope');
      }
    }
    if (input.embedding?.length) {
      const vector = `[${input.embedding.join(',')}]`;
      const scopeSql = scope.organisationId
        ? Prisma.sql`AND d."organisationId" = ${scope.organisationId} AND d."countryNodeId" = ${scope.countryNodeId}`
        : scope.countryNodeId
          ? Prisma.sql`AND d."countryNodeId" = ${scope.countryNodeId}`
        : Prisma.sql``;
      const projectSql = input.projectId ? Prisma.sql`AND (d."projectId" = ${input.projectId} OR d."projectId" IS NULL)` : Prisma.sql`AND d."projectId" IS NULL`;
      const metadataSql = Prisma.sql`
        AND (${input.documentCategory || null}::text IS NULL OR d."documentCategory" = ${input.documentCategory})
        AND (${input.contractType || null}::text IS NULL OR d."contractType" = ${input.contractType})
        AND (${input.authority || null}::text IS NULL OR d."authority" = ${input.authority})
        AND (${input.jurisdiction || null}::text IS NULL OR d."jurisdiction" = ${input.jurisdiction})
        AND (${input.industry || null}::text IS NULL OR d."industry" = ${input.industry})
        AND (${input.approvalStatus || 'APPROVED'}::text IS NULL OR d."approvalStatus" = ${input.approvalStatus || 'APPROVED'})`;
      const vectorResults = await this.prisma.$queryRaw<Array<{ id: string; documentId: string; content: string; title: string; sourceType: string; score: number }>>(Prisma.sql`
        SELECT c."id", c."documentId", c."content", d."title", d."sourceType",
          1 - (c."embedding" <=> ${vector}::vector) AS score
        FROM "RagChunk" c
        INNER JOIN "RagDocument" d ON d."id" = c."documentId"
         WHERE d."status" = 'ACTIVE'
           ${scopeSql}
           ${projectSql}
           ${metadataSql}
           AND c."embedding" IS NOT NULL
        ORDER BY c."embedding" <=> ${vector}::vector
        LIMIT ${limit}
      `);
      await this.audit.recordActor(actor, { action: 'ai.rag.vector_search', resourceType: 'RagDocument', resourceId: actor.organisationId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { query: input.query, resultCount: vectorResults.length } });
      return vectorResults;
    }
    const documents = await this.prisma.ragChunk.findMany({
      where: { document: { ...scope, status: 'ACTIVE', approvalStatus: input.approvalStatus || 'APPROVED', ...(input.documentCategory ? { documentCategory: input.documentCategory } : {}), ...(input.contractType ? { contractType: input.contractType } : {}), ...(input.authority ? { authority: input.authority } : {}), ...(input.jurisdiction ? { jurisdiction: input.jurisdiction } : {}), ...(input.industry ? { industry: input.industry } : {}), ...(input.projectId ? { OR: [{ projectId: input.projectId }, { projectId: null }] } : { projectId: null }) }, content: { contains: input.query, mode: 'insensitive' } },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { document: true },
    });
    await this.audit.recordActor(actor, { action: 'ai.rag.search', resourceType: 'RagDocument', resourceId: actor.organisationId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { query: input.query, embeddingProvided: Boolean(input.embedding), resultCount: documents.length } });
    return documents;
  }

  private async run(actor: AuthenticatedUser, featureKey: string, action: string, prompt: string, context: Record<string, unknown>, conversationId?: string) {
    const operationKey = featureKey === 'contract_draft' ? 'CONTRACT_ANALYSIS' : featureKey === 'contract_advisor' ? 'CONTRACT_ANALYSIS' : featureKey === 'due_diligence_assistant' ? 'DUE_DILIGENCE' : featureKey === 'project_feasibility' ? 'FULL_PROJECT_INTELLIGENCE' : featureKey === 'chat' ? 'SIMPLE_QUERY' : featureKey === 'shariah_assistant' ? 'RISK_ANALYSIS' : 'PROJECT_SUMMARY';
    await this.membership.consumeCredits(actor, operationKey, String(context.projectId || context.subjectId || featureKey));
    const requestId = randomUUID();
    const run = await this.prisma.aiRun.create({ data: { requestId, featureKey, action, userId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, conversationId, input: context as Prisma.InputJsonValue, status: 'RUNNING', provider: this.provider.providerName, model: this.provider.modelName } });
    await this.audit.recordActor(actor, { action: 'ai.request', resourceType: 'AiRun', resourceId: run.id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { featureKey, requestId } });
    try {
      const output = this.applyEvidenceGuard(featureKey, context, await this.provider.generate({ featureKey, action, prompt, context }));
      const completed = await this.prisma.aiRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', output: output as unknown as Prisma.InputJsonValue, completedAt: new Date() } });
      await this.audit.recordActor(actor, { action: 'ai.response', resourceType: 'AiRun', resourceId: run.id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { featureKey, provider: this.provider.providerName, requiresHumanReview: output.requiresHumanReview } });
      return { ...completed, output };
    } catch (error) {
      await this.prisma.aiRun.update({ where: { id: run.id }, data: { status: 'FAILED', output: { error: 'AI provider failed' } } });
      throw new ServiceUnavailableException('AI provider is unavailable. Check that the configured Ollama or OpenAI endpoint is running.');
    }
  }

  private applyEvidenceGuard(featureKey: string, context: Record<string, unknown>, output: Awaited<ReturnType<AiProvider['generate']>>) {
    if (featureKey !== 'contract_advisor') return output;
    const evidence = context.evidence && typeof context.evidence === 'object' ? context.evidence as Record<string, unknown> : {};
    const documentCount = typeof evidence.projectDocumentCount === 'number' ? evidence.projectDocumentCount : 0;
    const missingEvidence = documentCount === 0 || evidence.hasVerifiedCashflowEvidence !== true || evidence.hasVerifiedAssetBackingEvidence !== true;
    if (!missingEvidence) return output;

    const concern = documentCount === 0
      ? 'No project documents were retrieved. The project basis, cashflows, assets, and legitimacy are unverified.'
      : 'Verified cashflow and asset-backing evidence is incomplete. No structure can be recommended from the available evidence.';
    return {
      ...output,
      recommendation: {
        ...output.recommendation,
        primaryStructure: 'Review Required',
        secondaryStructure: 'No recommendation until evidence is verified.',
        rationale: 'The system cannot recommend an Islamic contract because the selected project does not have sufficient verified evidence. A proposed contract and funding amount are not proof of viability or legitimacy.',
        keyConsiderations: [concern, 'Verify sponsor identity, ownership, source of funds, financial model, asset title, permits, and independent due diligence.'],
        disclaimer: 'This is an evidence-gap result, not a contract recommendation. Authorised legal, financial, compliance, and Shariah review is mandatory.',
      },
      confidence: {
        level: 'LOW' as const,
        scorePercent: 0,
        disclaimer: 'Confidence is zero because the project evidence is insufficient for a reliable recommendation.',
      },
      reasoningSummary: {
        positiveFactors: [],
        concerns: [concern, 'Do not approve, fund, or execute based on the current project record.'],
      },
      riskFlags: [
        ...output.riskFlags,
        { title: 'Insufficient Project Evidence', description: concern, severity: 'CRITICAL' as const },
      ],
      limitations: [
        ...output.limitations,
        'The project record does not contain verified cashflow, asset-backing, ownership, or legitimacy evidence.',
      ],
      requiresHumanReview: true,
    };
  }

  private chunk(content: string) {
    const size = 1200;
    const chunks: { chunkIndex: number; content: string }[] = [];
    for (let offset = 0, index = 0; offset < content.length; offset += size, index += 1) chunks.push({ chunkIndex: index, content: content.slice(offset, offset + size) });
    return chunks;
  }

  private assertProjectSponsorScope(actor: AuthenticatedUser, projectSponsorId: string) {
    if (actor.role === 'Project Sponsor' && projectSponsorId !== actor.userId) {
      throw new ForbiddenException('Project is not assigned to this sponsor');
    }
  }
}
