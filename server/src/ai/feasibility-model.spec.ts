import { AuthenticatedUser } from '../auth/identity.service';
import { AiService } from './ai.service';
import { feasibilityModelContext } from './feasibility-model';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

const sponsor = { userId: 'USR-SP', role: 'Project Sponsor', countryNodeId: 'CN-MYS', organisationId: 'ORG-1' } as unknown as AuthenticatedUser;

const input = {
  projectId: 'P1',
  project: { projectId: 'P1', projectName: 'Kilang Baja', sector: 'Agro', fundingRequired: '2400000', milestones: Array.from({ length: 20 }, (_, index) => ({ title: `Tranche ${index}` })), description: 'x'.repeat(5000) },
  documents: [{ fileName: 'A1.pdf', textLength: 4000 }, { fileName: 'B2.pdf', textLength: 9000 }],
  financialAnalysis: { npv: 120000, irr: 0.14, dscr: 1.6, scenarios: Array.from({ length: 9 }, () => ({ cashFlows: [1, 2, 3] })), assumptions: { source: 'doc' } },
  riskAnalysis: { projectRiskAssessment: { overallLevel: 'MEDIUM', items: Array.from({ length: 30 }, (_, index) => ({ title: `Risk ${index}`, detail: 'y'.repeat(1000) })) } },
};

describe('feasibility AI call', () => {
  it('gives the model the key figures, not the scenario tables or every milestone', () => {
    const context = feasibilityModelContext(input);
    expect(context.projectId).toBe('P1');
    expect(context.financialFigures).toEqual({ npv: 120000, irr: 0.14, dscr: 1.6 });
    expect(JSON.stringify(context)).not.toContain('scenarios');
    expect(context.project).toEqual({ projectName: 'Kilang Baja', sector: 'Agro', fundingRequired: '2400000', milestoneCount: 20 });
    expect(JSON.stringify(context).length).toBeLessThan(4000);
  });

  it('completes on the platform\'s figures when the model does not answer, and returns the credits', async () => {
    const prisma = { aiRun: { create: jest.fn().mockResolvedValue({ id: 'RUN-1' }), update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'RUN-1', ...data })) } };
    const membership = { consumeCredits: jest.fn().mockResolvedValue({ cost: 30, usageTransactionId: 'USE-1' }), refundFailedUse: jest.fn().mockResolvedValue(undefined) };
    const provider = { providerName: 'test', modelName: 'test', generate: jest.fn().mockRejectedValue(new Error('The operation was aborted due to timeout')) };
    const audit = { recordActor: jest.fn() };
    const service = new AiService(prisma as never, audit as never, membership as never, {} as never, {} as never, provider as never);

    const result = await service.analyzeProjectFeasibility(sponsor, input) as unknown as { status: string; output: Record<string, unknown> };

    expect(provider.generate).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 450 }));
    expect(result.status).toBe('COMPLETED');
    expect(result.output).toMatchObject({ aiNarrative: 'UNAVAILABLE', requiresHumanReview: true, recommendation: { status: 'Review Required', financialFigures: { npv: 120000, irr: 0.14, dscr: 1.6 } } });
    expect(membership.refundFailedUse).toHaveBeenCalledWith(sponsor, { cost: 30, usageTransactionId: 'USE-1' }, 'AIRUN-RUN-1');
    expect(audit.recordActor).toHaveBeenCalledWith(sponsor, expect.objectContaining({ action: 'ai.fallback' }));
  });
});
