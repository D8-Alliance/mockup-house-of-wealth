import { ConflictException } from '@nestjs/common';
import { AiService } from './ai.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../membership/membership.service', () => ({ MembershipService: class {} }));
jest.mock('./contract-clause-retriever.service', () => ({ ContractClauseRetriever: class {} }));
jest.mock('./rag-embedding.service', () => ({ RAG_EMBEDDING_DIMENSIONS: 768, RagEmbeddingService: class {} }));

const committee: AuthenticatedUser = { userId: 'USR-SC', idpSubjectId: 'USR-SC', email: 'sc@example.test', name: 'Committee', role: 'Shariah Committee', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Shariah Committee'] };
const finance: AuthenticatedUser = { ...committee, userId: 'USR-FIN', idpSubjectId: 'USR-FIN', role: 'Finance Officer', assignedRoles: ['Finance Officer'] };

/** One project with one feasibility run at `stage`; approvals and history live in `state`. */
function setup(stage: string, options: { activeFinal?: boolean; latestRevisionId?: string } = {}) {
  const state = {
    stage,
    history: [] as unknown[],
    approvals: options.activeFinal ? [{ id: 'A0', revisionId: 'REV-1', stage: 'FINAL_DECISION', status: 'APPROVED' }] : [] as Array<{ id: string; revisionId: string; stage: string; status: string }>,
    locks: 0,
  };
  const run = { id: 'RUN-1', input: { projectId: 'P1' }, reviewStage: stage, reviewHistory: [] };
  const tx = {
    $queryRaw: jest.fn(async () => { state.locks += 1; return []; }),
    projectFeasibilityRevision: {
      findUnique: jest.fn(async () => ({ id: 'REV-1' })),
      findFirst: jest.fn(async () => ({ id: options.latestRevisionId ?? 'REV-1' })),
    },
    projectApproval: {
      findFirst: jest.fn(async ({ where }: { where: { stage: string } }) => state.approvals.find((item) => item.stage === where.stage && item.status !== 'SUPERSEDED') ?? null),
      updateMany: jest.fn(async ({ where }: { where: { stage: string } }) => { state.approvals.filter((item) => item.stage === where.stage && item.status !== 'SUPERSEDED').forEach((item) => { item.status = 'SUPERSEDED'; }); return { count: 1 }; }),
      create: jest.fn(async ({ data }: { data: { stage: string; status: string } }) => { state.approvals.push({ id: `A${state.approvals.length + 1}`, revisionId: 'REV-1', ...data }); return {}; }),
    },
    aiRun: {
      findUniqueOrThrow: jest.fn(async () => ({ reviewStage: state.stage, reviewHistory: state.history })),
      update: jest.fn(async ({ data }: { data: { reviewStage: string; reviewHistory: unknown[] } }) => { state.stage = data.reviewStage; state.history = data.reviewHistory; return { ...run, ...data }; }),
    },
    project: { update: jest.fn(async () => ({})) },
  };
  const prisma = {
    project: { findUnique: jest.fn(async () => ({ projectId: 'P1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS' })) },
    aiRun: { findFirst: jest.fn(async () => ({ ...run, reviewStage: stage })) },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const service = new AiService(prisma as never, { recordActor: jest.fn() } as never, {} as never, {} as never, {} as never, {} as never);
  return { service, state, tx };
}

describe('AiService.reviewProjectFeasibility', () => {
  it('records the final decision once, under the project lock', async () => {
    const { service, state, tx } = setup('FINAL_DECISION');
    await service.reviewProjectFeasibility(committee, 'P1', 'RUN-1', { reviewStage: 'FINAL_DECISION', decision: 'ACCEPTED', comment: 'Approved by committee' });
    expect(state.locks).toBe(1);
    expect(state.approvals.filter((item) => item.status !== 'SUPERSEDED')).toHaveLength(1);
    expect(tx.project.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'APPROVED' } }));
  });

  it('refuses a second final decision on the same revision', async () => {
    const { service, tx } = setup('FINAL_DECISION', { activeFinal: true });
    await expect(service.reviewProjectFeasibility(committee, 'P1', 'RUN-1', { reviewStage: 'FINAL_DECISION', decision: 'REJECTED', comment: 'Changed my mind' })).rejects.toThrow(/final decision is already recorded/);
    expect(tx.projectApproval.create).not.toHaveBeenCalled();
    expect(tx.project.update).not.toHaveBeenCalled();
  });

  it('replaces an earlier decision at the same stage instead of keeping both active', async () => {
    const { service, state } = setup('FINANCE_REVIEW');
    await service.reviewProjectFeasibility(finance, 'P1', 'RUN-1', { reviewStage: 'FINANCE_REVIEW', decision: 'REQUEST_CHANGES', comment: 'Need cashflow' });
    await service.reviewProjectFeasibility(finance, 'P1', 'RUN-1', { reviewStage: 'RISK_REVIEW', decision: 'ACCEPTED', comment: 'Cashflow provided' });
    expect(state.approvals.map((item) => item.status)).toEqual(['SUPERSEDED', 'APPROVED']);
    expect(state.history).toHaveLength(2);
    expect(state.stage).toBe('RISK_REVIEW');
  });

  it('rejects a review when the stage moved on after it was validated', async () => {
    const { service, state, tx } = setup('FINANCE_REVIEW');
    tx.aiRun.findUniqueOrThrow.mockImplementationOnce(async () => ({ reviewStage: 'RISK_REVIEW', reviewHistory: state.history }));
    await expect(service.reviewProjectFeasibility(finance, 'P1', 'RUN-1', { reviewStage: 'RISK_REVIEW', decision: 'ACCEPTED', comment: 'Late click' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.projectApproval.create).not.toHaveBeenCalled();
  });

  it('rejects a review of a superseded revision', async () => {
    const { service } = setup('FINANCE_REVIEW', { latestRevisionId: 'REV-2' });
    await expect(service.reviewProjectFeasibility(finance, 'P1', 'RUN-1', { reviewStage: 'RISK_REVIEW', decision: 'ACCEPTED', comment: 'Old run' })).rejects.toThrow(/superseded/);
  });
});
