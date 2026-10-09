import { AuthenticatedUser } from '../auth/identity.service';
import { isWithinTenantScope } from '../tenancy/tenant-scope';

/**
 * Who may move an Islamic finance agreement through drafting, legal review, Shariah review
 * and execution. Kept as data so the chain can later move into the configurable workflow
 * engine (Master Architecture, Phase 3) without changing the callers.
 *
 *   DRAFT ──submit──▶ LEGAL_REVIEW ──legal approves──▶ SHARIAH_REVIEW ──Shariah approves──▶ APPROVED ──sign──▶ EXECUTION
 *                          │                                 │
 *                          └──────── CHANGES_REQUESTED ◀─────┘ ──resubmit──▶ LEGAL_REVIEW
 */
export const DRAFTER_ROLES = ['Project Sponsor', 'Project Manager', 'Organization Admin', 'Country Admin', 'Super Admin'] as const;
export const LEGAL_ROLES = ['Legal Officer'] as const;
export const SHARIAH_ROLES = ['Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'] as const;

export type AgreementStatus = 'DRAFT' | 'LEGAL_REVIEW' | 'SHARIAH_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'EXECUTION';
export type AgreementAction = 'LEGAL_REVIEW' | 'SHARIAH_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'EXECUTION';
/** maker: the drafting organisation; legal / shariah: country-level reviewers outside it. */
export type AgreementStep = 'maker' | 'legal' | 'shariah';

export const AGREEMENT_TRANSITIONS: Record<AgreementStatus, Partial<Record<AgreementAction, { roles: readonly string[]; step: AgreementStep; label: string }>>> = {
  DRAFT: { LEGAL_REVIEW: { roles: DRAFTER_ROLES, step: 'maker', label: 'Submit for legal review' } },
  LEGAL_REVIEW: {
    SHARIAH_REVIEW: { roles: LEGAL_ROLES, step: 'legal', label: 'Legal approved: send to Shariah review' },
    CHANGES_REQUESTED: { roles: LEGAL_ROLES, step: 'legal', label: 'Request changes' },
  },
  SHARIAH_REVIEW: {
    APPROVED: { roles: SHARIAH_ROLES, step: 'shariah', label: 'Shariah approved' },
    CHANGES_REQUESTED: { roles: SHARIAH_ROLES, step: 'shariah', label: 'Request changes' },
  },
  APPROVED: { EXECUTION: { roles: DRAFTER_ROLES, step: 'maker', label: 'Mark as signed and executed' } },
  CHANGES_REQUESTED: { LEGAL_REVIEW: { roles: DRAFTER_ROLES, step: 'maker', label: 'Resubmit for legal review' } },
  EXECUTION: {},
};

export interface AgreementDecision { approverId: string; status: string; decidedAt: Date | null }
export interface AgreementForReview { status: string; createdBy: string; organisationId: string; countryNodeId: string; approvals: AgreementDecision[] }

const isReviewer = (role: string) => (LEGAL_ROLES as readonly string[]).includes(role) || (SHARIAH_ROLES as readonly string[]).includes(role);

/**
 * Reviewers work for the whole country (they rarely sit in the drafting organisation), but an
 * unsubmitted draft stays private to its organisation. Everyone else needs the organisation too.
 */
export function canSeeAgreement(actor: AuthenticatedUser, agreement: Pick<AgreementForReview, 'organisationId' | 'countryNodeId' | 'status'>): boolean {
  if (isWithinTenantScope(actor, agreement)) return true;
  return isReviewer(actor.role) && actor.countryNodeId === agreement.countryNodeId && agreement.status !== 'DRAFT';
}

export const isAgreementReviewer = isReviewer;

/** Decisions since the latest submission to legal review: the current review round. */
export function currentRound(approvals: AgreementDecision[]): AgreementDecision[] {
  const ordered = [...approvals].sort((a, b) => (a.decidedAt?.getTime() ?? 0) - (b.decidedAt?.getTime() ?? 0));
  const start = ordered.map((decision) => decision.status).lastIndexOf('LEGAL_REVIEW');
  return start < 0 ? [] : ordered.slice(start);
}

/**
 * Why the actor may not take this action, or null when allowed. Covers role, scope and
 * segregation of duties: one person never both drafts and reviews, never gives both the
 * legal and the Shariah approval, and never executes an agreement they reviewed.
 */
export function reviewBlocker(actor: AuthenticatedUser, agreement: AgreementForReview, action: AgreementAction): string | null {
  const transition = AGREEMENT_TRANSITIONS[agreement.status as AgreementStatus]?.[action];
  if (!transition) return `An agreement in ${agreement.status} cannot move to ${action}.`;
  if (!transition.roles.includes(actor.role)) return `Your role (${actor.role}) cannot take this step.`;
  const inScope = transition.step === 'maker' ? isWithinTenantScope(actor, agreement) : actor.countryNodeId === agreement.countryNodeId;
  if (!inScope) return 'This agreement is outside your scope.';
  const round = currentRound(agreement.approvals);
  const submitter = round[0]?.approverId;
  const legalDecider = round.find((decision) => decision.status === 'SHARIAH_REVIEW')?.approverId;
  const shariahDecider = round.find((decision) => decision.status === 'APPROVED')?.approverId;
  if (transition.step !== 'maker' && (actor.userId === agreement.createdBy || actor.userId === submitter)) return 'You drafted or submitted this agreement, so another person must review it.';
  if (transition.step === 'shariah' && actor.userId === legalDecider) return 'You gave the legal approval, so another person must give the Shariah decision.';
  if (action === 'EXECUTION' && (actor.userId === legalDecider || actor.userId === shariahDecider)) return 'You reviewed this agreement, so another person must execute it.';
  return null;
}

/** The actions the actor can take now, for the review screen's buttons. */
export function availableActions(actor: AuthenticatedUser, agreement: AgreementForReview): Array<{ action: AgreementAction; label: string }> {
  const transitions = AGREEMENT_TRANSITIONS[agreement.status as AgreementStatus] ?? {};
  return (Object.entries(transitions) as Array<[AgreementAction, { label: string }]>)
    .filter(([action]) => reviewBlocker(actor, agreement, action) === null)
    .map(([action, transition]) => ({ action, label: transition.label }));
}
