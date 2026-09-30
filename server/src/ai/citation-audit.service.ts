import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { auditCountry, canReviewCitations, canViewCitationAudit, CitationAuditFilter, citationAuditWhere, CitationReviewStatus, dateRange, toCsv } from './citation-audit';

type AssistantMetadata = { question?: string; groundingStatus?: string; confidence?: { level?: string; scorePercent?: number } } | null;

/**
 * Citation Audit: lists, summarises, reviews and exports the citations
 * attached to AI assistant answers. Every access is audit-logged because the
 * rows contain users' questions and answers.
 */
@Injectable()
export class CitationAuditService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private assertViewer(actor: AuthenticatedUser) {
    if (!canViewCitationAudit(actor.role)) throw new ForbiddenException('Your role cannot access the Citation Audit.');
  }

  /** The question is the latest user message before the answer (older answers do not store it in metadata). */
  private async questionsFor(messages: Array<{ id: string; conversationId: string; createdAt: Date; metadata: unknown }>): Promise<Map<string, string>> {
    const questions = new Map<string, string>();
    const missing = messages.filter((message) => !(message.metadata as AssistantMetadata)?.question);
    for (const message of messages) {
      const stored = (message.metadata as AssistantMetadata)?.question;
      if (stored) questions.set(message.id, stored);
    }
    if (missing.length) {
      const userMessages = await this.prisma.aiMessage.findMany({
        where: { role: 'user', conversationId: { in: [...new Set(missing.map((message) => message.conversationId))] } },
        select: { conversationId: true, content: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      for (const message of missing) {
        const previous = userMessages.filter((item) => item.conversationId === message.conversationId && item.createdAt <= message.createdAt).pop();
        if (previous) questions.set(message.id, previous.content);
      }
    }
    return questions;
  }

  async list(actor: AuthenticatedUser, filter: CitationAuditFilter & { page?: string; pageSize?: string }) {
    this.assertViewer(actor);
    const where = citationAuditWhere(actor, filter);
    const pageSize = Math.min(Math.max(Number(filter.pageSize) || 25, 1), 100);
    const page = Math.max(Number(filter.page) || 1, 1);
    const [total, rows] = await Promise.all([
      this.prisma.aiCitation.count({ where }),
      this.prisma.aiCitation.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { marker: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          message: { select: { id: true, conversationId: true, content: true, metadata: true, createdAt: true, conversation: { select: { userId: true, organisationId: true, countryNodeId: true } } } },
          document: { select: { id: true, title: true, supersededById: true, approvalStatus: true, status: true } },
        },
      }),
    ]);
    const questions = await this.questionsFor(rows.map((row) => row.message));
    await this.audit.recordActor(actor, { action: 'ai.citation_audit.view', resourceType: 'AiCitation', resourceId: actor.organisationId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { filter, page, resultCount: rows.length } });
    return {
      total,
      page,
      pageSize,
      canReview: canReviewCitations(actor.role),
      items: rows.map(({ message, document, ...citation }) => ({
        ...citation,
        question: questions.get(message.id) ?? null,
        answer: message.content,
        answerCreatedAt: message.createdAt,
        conversationId: message.conversationId,
        messageId: message.id,
        groundingStatus: (message.metadata as AssistantMetadata)?.groundingStatus ?? null,
        confidence: (message.metadata as AssistantMetadata)?.confidence ?? null,
        userId: message.conversation.userId,
        organisationId: message.conversation.organisationId,
        countryNodeId: message.conversation.countryNodeId,
        documentStatus: !document ? 'DELETED' : document.supersededById ? 'SUPERSEDED' : document.status !== 'ACTIVE' ? document.status : document.approvalStatus,
      })),
    };
  }

  /** Answer-level grounding mix, citation quality, review outcomes, and the most cited documents. */
  async summary(actor: AuthenticatedUser, filter: Pick<CitationAuditFilter, 'countryNodeId' | 'from' | 'to'>) {
    this.assertViewer(actor);
    const country = auditCountry(actor, filter.countryNodeId);
    const range = dateRange(filter);
    const answerWhere: Prisma.AiMessageWhereInput = { role: 'assistant', ...(range ? { createdAt: range } : {}), ...(country ? { conversation: { countryNodeId: country } } : {}) };
    const citationWhere = citationAuditWhere(actor, { countryNodeId: filter.countryNodeId, from: filter.from, to: filter.to });

    const countrySql = country ? Prisma.sql`AND c."countryNodeId" = ${country}` : Prisma.empty;
    const fromSql = range?.gte ? Prisma.sql`AND m."createdAt" >= ${range.gte}` : Prisma.empty;
    const toSql = range?.lt ? Prisma.sql`AND m."createdAt" < ${range.lt}` : Prisma.empty;
    const [grounding, totalAnswers, totalCitations, unverifiedQuotes, reviews, topDocuments] = await Promise.all([
      this.prisma.$queryRaw<Array<{ status: string | null; count: number }>>(Prisma.sql`
        SELECT m."metadata"->>'groundingStatus' AS status, COUNT(*)::int AS count
        FROM "AiMessage" m INNER JOIN "AiConversation" c ON c."id" = m."conversationId"
        WHERE m."role" = 'assistant' ${countrySql} ${fromSql} ${toSql}
        GROUP BY 1`),
      this.prisma.aiMessage.count({ where: answerWhere }),
      this.prisma.aiCitation.count({ where: citationWhere }),
      this.prisma.aiCitation.count({ where: { AND: [citationWhere, { quote: { not: null }, quoteVerified: false }] } }),
      this.prisma.aiCitation.groupBy({ by: ['reviewStatus'], where: citationWhere, _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ documentId: string | null; title: string; answers: number; citations: number; supersededById: string | null }>>(Prisma.sql`
        SELECT a."documentId", MAX(a."documentTitle") AS title, COUNT(DISTINCT a."messageId")::int AS answers, COUNT(*)::int AS citations, MAX(d."supersededById") AS "supersededById"
        FROM "AiCitation" a
        INNER JOIN "AiMessage" m ON m."id" = a."messageId"
        INNER JOIN "AiConversation" c ON c."id" = m."conversationId"
        LEFT JOIN "RagDocument" d ON d."id" = a."documentId"
        WHERE TRUE ${countrySql} ${fromSql} ${toSql}
        GROUP BY a."documentId"
        ORDER BY answers DESC, citations DESC
        LIMIT 10`),
    ]);
    await this.audit.recordActor(actor, { action: 'ai.citation_audit.summary', resourceType: 'AiCitation', resourceId: actor.organisationId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { countryNodeId: country ?? 'ALL', from: filter.from ?? null, to: filter.to ?? null } });
    return {
      countryNodeId: country ?? null,
      totalAnswers,
      grounding: Object.fromEntries(['GROUNDED', 'PARTIALLY_GROUNDED', 'UNSUPPORTED', 'NO_SOURCES'].map((status) => [status, grounding.find((row) => row.status === status)?.count ?? 0])),
      totalCitations,
      unverifiedQuotes,
      reviews: Object.fromEntries(['UNREVIEWED', 'CONFIRMED', 'INCORRECT', 'IRRELEVANT'].map((status) => [status, reviews.find((row) => row.reviewStatus === status)?._count._all ?? 0])),
      topDocuments: topDocuments.map((row) => ({ ...row, superseded: Boolean(row.supersededById) })),
    };
  }

  /** Records a reviewer's verdict on a citation. The answer itself is never changed. */
  async review(actor: AuthenticatedUser, id: string, input: { status: CitationReviewStatus; comment?: string }) {
    if (!canReviewCitations(actor.role)) throw new ForbiddenException('Your role cannot review citations.');
    const citation = await this.prisma.aiCitation.findUnique({ where: { id }, include: { message: { select: { conversation: { select: { countryNodeId: true, organisationId: true } } } } } });
    if (!citation) throw new NotFoundException('Citation not found');
    const conversation = citation.message.conversation;
    if (actor.role !== 'Super Admin' && conversation.countryNodeId !== actor.countryNodeId) throw new ForbiddenException('Citation is outside your country scope.');
    const comment = input.comment?.trim() || null;
    if ((input.status === 'INCORRECT' || input.status === 'IRRELEVANT') && !comment) throw new BadRequestException('A comment is required when flagging a citation as incorrect or irrelevant.');
    const reset = input.status === 'UNREVIEWED';
    const updated = await this.prisma.aiCitation.update({
      where: { id },
      data: { reviewStatus: input.status, reviewComment: reset ? null : comment, reviewedBy: reset ? null : actor.userId, reviewedAt: reset ? null : new Date() },
    });
    await this.audit.recordActor(actor, { action: 'ai.citation.review', resourceType: 'AiCitation', resourceId: id, organisationId: conversation.organisationId, countryNodeId: conversation.countryNodeId, metadata: { from: citation.reviewStatus, to: input.status, comment, documentId: citation.documentId } });
    return updated;
  }

  /** CSV of the filtered citations (max 5,000 rows). User ids are included; names and emails are not. */
  async exportCsv(actor: AuthenticatedUser, filter: CitationAuditFilter): Promise<{ fileName: string; csv: string; rowCount: number }> {
    this.assertViewer(actor);
    const rows = await this.prisma.aiCitation.findMany({
      where: citationAuditWhere(actor, filter),
      orderBy: [{ createdAt: 'desc' }, { marker: 'asc' }],
      take: 5000,
      include: { message: { select: { id: true, conversationId: true, content: true, metadata: true, createdAt: true, conversation: { select: { userId: true, organisationId: true, countryNodeId: true } } } }, document: { select: { supersededById: true } } },
    });
    const questions = await this.questionsFor(rows.map((row) => row.message));
    const csv = toCsv(
      ['answeredAt', 'countryNodeId', 'organisationId', 'userId', 'conversationId', 'messageId', 'question', 'answer', 'groundingStatus', 'confidencePercent', 'marker', 'documentId', 'documentTitle', 'documentSuperseded', 'scope', 'sourceType', 'pageStart', 'pageEnd', 'paragraphRefs', 'quote', 'quoteVerified', 'reviewStatus', 'reviewedBy', 'reviewedAt', 'reviewComment'],
      rows.map((row) => {
        const metadata = row.message.metadata as AssistantMetadata;
        return [row.message.createdAt.toISOString(), row.message.conversation.countryNodeId, row.message.conversation.organisationId, row.message.conversation.userId, row.message.conversationId, row.message.id, questions.get(row.message.id) ?? '', row.message.content, metadata?.groundingStatus ?? '', metadata?.confidence?.scorePercent ?? '', row.marker, row.documentId ?? '', row.documentTitle, row.document?.supersededById ? 'yes' : row.documentId ? 'no' : 'deleted', row.scope, row.sourceType, row.pageStart, row.pageEnd, Array.isArray(row.paragraphRefs) ? (row.paragraphRefs as string[]).join(' ') : '', row.quote ?? '', row.quoteVerified, row.reviewStatus, row.reviewedBy ?? '', row.reviewedAt?.toISOString() ?? '', row.reviewComment ?? ''];
      }),
    );
    await this.audit.recordActor(actor, { action: 'ai.citation_audit.export', resourceType: 'AiCitation', resourceId: actor.organisationId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { filter, rowCount: rows.length } });
    return { fileName: `citation-audit-${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length };
  }
}
