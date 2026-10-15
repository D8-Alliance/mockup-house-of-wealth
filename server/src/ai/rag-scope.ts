import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/identity.service';

/**
 * Three-tier RAG knowledge base for the D-8 platform:
 *  - GLOBAL:  shared by all D-8 member-state country nodes (AAOIFI, fatwa, platform policy).
 *  - COUNTRY: visible only inside one country node (local regulator guidance, national fatwa).
 *  - PROJECT: visible only to actors who can access that project.
 * Only APPROVED documents are ever retrieved for the LLM.
 */
export const RAG_SCOPES = ['GLOBAL', 'COUNTRY', 'PROJECT'] as const;
export type RagScope = typeof RAG_SCOPES[number];

export const RAG_REVIEW_DECISIONS = ['REVIEWED', 'APPROVED', 'REJECTED'] as const;
export type RagReviewDecision = typeof RAG_REVIEW_DECISIONS[number];

/** Roles allowed to create and review knowledge-base content, per scope. */
const MANAGERS: Record<RagScope, readonly string[]> = {
  GLOBAL: ['Super Admin', 'AI Administrator'],
  COUNTRY: ['Super Admin', 'AI Administrator', 'Country Admin'],
  PROJECT: ['Super Admin', 'AI Administrator', 'Country Admin'],
};

/** Stable key used for per-scope de-duplication: GLOBAL, the country code, or the project id. */
export function ragScopeKey(scope: RagScope, target: { countryNodeId: string; projectId?: string | null }): string {
  if (scope === 'GLOBAL') return 'GLOBAL';
  if (scope === 'COUNTRY') return target.countryNodeId;
  if (!target.projectId) throw new Error('PROJECT scope requires a projectId');
  return target.projectId;
}

/**
 * Whether the actor may create or review content at this scope. Outside GLOBAL,
 * everyone except Super Admin is limited to their own country node.
 */
export function canManageRagScope(actor: Pick<AuthenticatedUser, 'role' | 'countryNodeId'>, scope: RagScope, countryNodeId: string): boolean {
  if (!MANAGERS[scope].includes(actor.role)) return false;
  if (actor.role === 'Super Admin' || scope === 'GLOBAL') return true;
  return actor.countryNodeId === countryNodeId;
}

/** Roles that can manage at least one scope (used for the management listing). */
export function isRagManager(role: string): boolean {
  return RAG_SCOPES.some((scope) => MANAGERS[scope].includes(role));
}

/**
 * Retrieval visibility: GLOBAL + the relevant country's COUNTRY documents,
 * plus the project's own documents when a project context is given. The
 * caller must already have verified access to the project.
 */
export function ragVisibilityWhere(actor: Pick<AuthenticatedUser, 'countryNodeId'>, project?: { projectId: string; countryNodeId: string }): Prisma.RagDocumentWhereInput {
  const countryNodeId = project?.countryNodeId ?? actor.countryNodeId;
  const visible: Prisma.RagDocumentWhereInput[] = [{ scope: 'GLOBAL' }, { scope: 'COUNTRY', countryNodeId }];
  if (project) visible.push({ scope: 'PROJECT', projectId: project.projectId });
  return { OR: visible };
}

/** Same rule as ragVisibilityWhere, as SQL for the pgvector query (table alias `d`). */
export function ragVisibilitySql(actor: Pick<AuthenticatedUser, 'countryNodeId'>, project?: { projectId: string; countryNodeId: string }): Prisma.Sql {
  const countryNodeId = project?.countryNodeId ?? actor.countryNodeId;
  const projectClause = project ? Prisma.sql`OR (d."scope" = 'PROJECT' AND d."projectId" = ${project.projectId})` : Prisma.empty;
  return Prisma.sql`AND (d."scope" = 'GLOBAL' OR (d."scope" = 'COUNTRY' AND d."countryNodeId" = ${countryNodeId}) ${projectClause})`;
}

/**
 * Management listing: GLOBAL documents for everyone who manages content;
 * COUNTRY/PROJECT documents across all countries for Super Admin, else own country only.
 */
export function ragManagementWhere(actor: Pick<AuthenticatedUser, 'role' | 'countryNodeId'>): Prisma.RagDocumentWhereInput {
  if (actor.role === 'Super Admin') return {};
  return { OR: [{ scope: 'GLOBAL' }, { scope: { in: ['COUNTRY', 'PROJECT'] }, countryNodeId: actor.countryNodeId }] };
}

/**
 * Two-person rule: DRAFT -> REVIEWED -> APPROVED, and neither step may be
 * taken by the uploader. REJECTED is allowed from DRAFT or REVIEWED.
 */
export function assertRagTransition(document: { approvalStatus: string; uploadedBy: string; reviewedBy: string | null }, decision: RagReviewDecision, actorUserId: string): string | null {
  if (document.uploadedBy === actorUserId) return 'The uploader cannot review or approve their own document.';
  if (decision === 'REJECTED') return ['DRAFT', 'REVIEWED'].includes(document.approvalStatus) ? null : `Cannot reject a document in ${document.approvalStatus}.`;
  if (decision === 'REVIEWED') return document.approvalStatus === 'DRAFT' ? null : `Only DRAFT documents can be marked REVIEWED (current: ${document.approvalStatus}).`;
  if (document.approvalStatus !== 'REVIEWED') return `Only REVIEWED documents can be approved (current: ${document.approvalStatus}).`;
  if (document.reviewedBy === actorUserId) return 'The approver must be a different person from the reviewer.';
  return null;
}
