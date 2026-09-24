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
    const operationKey = featureKey === 'contract_draft' ? 'CONTRACT_ANALYSIS' : featureKey === 'contract_advisor' ? 'CONTRACT_ANALYSIS' : featureKey === 'due_diligence_assistant' ? 'DUE_DILIGENCE' : featureKey === 'chat' ? 'SIMPLE_QUERY' : featureKey === 'shariah_assistant' ? 'RISK_ANALYSIS' : 'PROJECT_SUMMARY';
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
