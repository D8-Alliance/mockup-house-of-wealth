import { StuckAiRunSweeper } from './stuck-ai-run.sweeper';

describe('StuckAiRunSweeper', () => {
  const now = new Date('2026-10-22T10:00:00Z');
  const run = (id: string, output: unknown, featureKey = 'asset_offer_advisor') => ({ id, userId: 'USR-1', organisationId: 'ORG-1', countryNodeId: 'MYS', featureKey, input: { documentId: 'DOC-1' }, output, status: 'RUNNING' });

  function setup(rows: ReturnType<typeof run>[], claimed = 1) {
    const prisma = {
      aiRun: { findMany: jest.fn().mockResolvedValue(rows), updateMany: jest.fn().mockResolvedValue({ count: claimed }) },
      projectEvidenceRequirement: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const membership = { refundFailedUse: jest.fn().mockResolvedValue(undefined) };
    const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };
    return { prisma, membership, notifications, sweeper: new StuckAiRunSweeper(prisma as never, membership as never, notifications as never) };
  }

  it('fails runs left running, returns their credits and tells the user', async () => {
    const { prisma, membership, notifications, sweeper } = setup([run('RUN-1', { charge: { cost: 20, usageTransactionId: 'USE-1', exempt: false } })]);
    expect(await sweeper.sweep(now)).toBe(1);
    expect(prisma.aiRun.findMany.mock.calls[0][0].where.createdAt.lt).toEqual(new Date('2026-10-22T09:45:00Z'));
    expect(prisma.aiRun.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'RUN-1', status: 'RUNNING' } }));
    expect(membership.refundFailedUse).toHaveBeenCalledWith({ userId: 'USR-1', organisationId: 'ORG-1' }, { cost: 20, usageTransactionId: 'USE-1', exempt: false }, 'AIRUN-RUN-1');
    expect(notifications.enqueue.mock.calls[0][0].message).toContain('20 credits were returned');
  });

  it('refunds nothing for exempt or old runs without a recorded charge, and puts evidence back to review', async () => {
    const { prisma, membership, sweeper } = setup([run('RUN-2', null, 'project_evidence_verification'), run('RUN-3', { charge: { cost: 0, usageTransactionId: 'USE-3', exempt: true } })]);
    expect(await sweeper.sweep(now)).toBe(2);
    expect(membership.refundFailedUse).not.toHaveBeenCalled();
    expect(prisma.projectEvidenceRequirement.updateMany).toHaveBeenCalledWith({ where: { uploadedDocumentId: 'DOC-1', status: 'AI_PROCESSING' }, data: { status: 'REQUIRES_REVIEW', verificationStatus: 'REQUIRES_REVIEW' } });
  });

  it('does not refund a run another process already finished', async () => {
    const { membership, notifications, sweeper } = setup([run('RUN-4', { charge: { cost: 20, usageTransactionId: 'USE-4', exempt: false } })], 0);
    expect(await sweeper.sweep(now)).toBe(0);
    expect(membership.refundFailedUse).not.toHaveBeenCalled();
    expect(notifications.enqueue).not.toHaveBeenCalled();
  });
});
