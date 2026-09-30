import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/identity.service';

/**
 * Citation Audit access. Questions and answers are user data, so everyone
 * except Super Admin is limited to conversations in their own country node.
 * Shariah reviewers can read; only knowledge-base managers can flag.
 */
export const CITATION_AUDIT_VIEWERS = ['Super Admin', 'AI Administrator', 'Country Admin', 'Shariah Reviewer', 'Shariah Committee'] as const;
export const CITATION_REVIEWERS = ['Super Admin', 'AI Administrator', 'Country Admin'] as const;

export const CITATION_REVIEW_STATUSES = ['UNREVIEWED', 'CONFIRMED', 'INCORRECT', 'IRRELEVANT'] as const;
export type CitationReviewStatus = typeof CITATION_REVIEW_STATUSES[number];
export const GROUNDING_STATUSES = ['GROUNDED', 'PARTIALLY_GROUNDED', 'UNSUPPORTED', 'NO_SOURCES'] as const;

export function canViewCitationAudit(role: string): boolean {
  return (CITATION_AUDIT_VIEWERS as readonly string[]).includes(role);
}

export function canReviewCitations(role: string): boolean {
  return (CITATION_REVIEWERS as readonly string[]).includes(role);
}

/** Country filter for the actor; a Super Admin may optionally narrow to one country. */
export function auditCountry(actor: Pick<AuthenticatedUser, 'role' | 'countryNodeId'>, requestedCountry?: string): string | undefined {
  return actor.role === 'Super Admin' ? requestedCountry || undefined : actor.countryNodeId;
}

export interface CitationAuditFilter {
  documentId?: string;
  scope?: string;
  countryNodeId?: string;
  groundingStatus?: string;
  quoteVerified?: 'true' | 'false';
  reviewStatus?: string;
  from?: string;
  to?: string;
  search?: string;
}

/** Inclusive date range; a bare "to" date covers that whole day. */
export function dateRange(filter: Pick<CitationAuditFilter, 'from' | 'to'>): { gte?: Date; lt?: Date } | undefined {
  const range: { gte?: Date; lt?: Date } = {};
  if (filter.from) range.gte = new Date(filter.from);
  if (filter.to) {
    const end = new Date(filter.to);
    if (/^\d{4}-\d{2}-\d{2}$/.test(filter.to)) end.setUTCDate(end.getUTCDate() + 1);
    range.lt = end;
  }
  return range.gte || range.lt ? range : undefined;
}

export function citationAuditWhere(actor: Pick<AuthenticatedUser, 'role' | 'countryNodeId'>, filter: CitationAuditFilter): Prisma.AiCitationWhereInput {
  const country = auditCountry(actor, filter.countryNodeId);
  const created = dateRange(filter);
  return {
    ...(filter.documentId ? { documentId: filter.documentId } : {}),
    ...(filter.scope ? { scope: filter.scope } : {}),
    ...(filter.reviewStatus ? { reviewStatus: filter.reviewStatus } : {}),
    ...(filter.quoteVerified === 'true' ? { quoteVerified: true } : filter.quoteVerified === 'false' ? { quote: { not: null }, quoteVerified: false } : {}),
    ...(filter.search ? { documentTitle: { contains: filter.search, mode: 'insensitive' as const } } : {}),
    ...(created ? { createdAt: created } : {}),
    message: {
      ...(filter.groundingStatus ? { metadata: { path: ['groundingStatus'], equals: filter.groundingStatus } } : {}),
      ...(country ? { conversation: { countryNodeId: country } } : {}),
    },
  };
}

/** RFC 4180 CSV; cells starting with = + - @ are prefixed to prevent formula injection in spreadsheets. */
export function toCsv(header: string[], rows: Array<Array<string | number | boolean | null | undefined>>): string {
  const cell = (value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined) return '';
    let text = String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}
