import { ServiceUnavailableException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/identity.service';
import { AiService } from './ai.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

const actor: AuthenticatedUser = { userId: 'USR-AO', idpSubjectId: 'USR-AO', email: 'ao@example.test', name: 'AO', role: 'Asset Owner', countryNodeId: 'CN-MYS', organisationId: 'ORG-AO', assignedRoles: ['Asset Owner'] };

describe('AI requests that fail', () => {
  const prisma = { aiRun: { create: jest.fn().mockResolvedValue({ id: 'RUN-1' }), update: jest.fn().mockResolvedValue({}) } };
  const membership = { consumeCredits: jest.fn().mockResolvedValue({ cost: 20, usageTransactionId: 'USE-1' }), refundFailedUse: jest.fn().mockResolvedValue(undefined) };
  const provider = { providerName: 'test', modelName: 'test', generate: jest.fn().mockRejectedValue(new Error('timeout')) };
  const service = new AiService(prisma as never, { recordActor: jest.fn() } as never, membership as never, {} as never, {} as never, provider as never);
  const run = (service as unknown as { run: (a: AuthenticatedUser, f: string, x: string, p: string, c: Record<string, unknown>) => Promise<unknown> }).run.bind(service);

  it('returns the credits and says so when the model does not answer', async () => {
    await expect(run(actor, 'asset_advisor', 'RECOMMEND_CONTRACT', 'Which contract?', { subjectId: 'ASSET-MYS-1' })).rejects.toThrow('Your credits were returned');
    expect(membership.consumeCredits).toHaveBeenCalledWith(actor, 'CONTRACT_ANALYSIS', 'ASSET-MYS-1');
    expect(membership.refundFailedUse).toHaveBeenCalledWith(actor, { cost: 20, usageTransactionId: 'USE-1' }, 'AIRUN-RUN-1');
    expect(prisma.aiRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }));
  });

  it('still reports the failure if the refund itself fails', async () => {
    membership.refundFailedUse.mockRejectedValueOnce(new Error('db down'));
    await expect(run(actor, 'asset_advisor', 'RECOMMEND_CONTRACT', 'Which contract?', { subjectId: 'ASSET-MYS-1' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
