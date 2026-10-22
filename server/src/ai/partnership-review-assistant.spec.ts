import { AuthenticatedUser } from '../auth/identity.service';
import { AiService } from './ai.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

const shariah: AuthenticatedUser = { userId: 'USR-SR', idpSubjectId: 'USR-SR', email: 'sr@example.test', name: 'SR', role: 'Shariah Reviewer', countryNodeId: 'CN-MYS', organisationId: 'ORG-ADMIN', assignedRoles: ['Shariah Reviewer'] };

describe('AI help for the reviewer of an asset partnership', () => {
  const prisma = { aiRun: { create: jest.fn().mockResolvedValue({ id: 'RUN-1' }), update: jest.fn().mockImplementation(async ({ data }) => ({ id: 'RUN-1', ...data })) } };
  const membership = { consumeCredits: jest.fn().mockResolvedValue({ cost: 0, exempt: true }), refundFailedUse: jest.fn() };
  const provider = { providerName: 'test', modelName: 'test', generate: jest.fn() };
  const partnerships = {
    reviewChecks: jest.fn().mockResolvedValue({ checks: [
      { key: 'loss-by-capital', track: 'SHARIAH', label: 'Losses borne by capital', status: 'FAIL', detail: 'Capital shares are unknown.' },
      { key: 'type-match', track: 'BOTH', label: 'Asset type matches the need', status: 'PASS', detail: 'ok' },
      { key: 'search-date', track: 'LEGAL', label: 'Official search is recent', status: 'FAIL', detail: 'Old search.' },
    ] }),
    getEngagement: jest.fn().mockResolvedValue({ akad: 'MUSHARAKAH', terms: { contributionValue: 500000, profitSharePct: 6 }, startDate: '2026-11-01', endDate: '2027-01-31', asset: { assetType: 'LAND', region: 'Hulu Langat, Selangor' }, project: { projectName: 'Irrigation', sector: 'Agriculture' }, need: null, history: [{ party: 'OWNER', action: 'PROPOSED', note: 'untuk cubaan demo.' }] }),
  };
  const service = new AiService(prisma as never, { recordActor: jest.fn() } as never, membership as never, {} as never, {} as never, provider as never, undefined, partnerships as never);

  it('sends only this reviewer\'s checks, and never suggests approving while one fails', async () => {
    provider.generate.mockResolvedValueOnce({ recommendation: { rationale: 'Fine.', suggestedDecision: 'APPROVE', draftNote: 'OK' }, requiresHumanReview: true });
    const result = await service.partnershipReviewAssistant(shariah, 'ENG-1');
    const context = provider.generate.mock.calls[0][0].context;
    expect(result.track).toBe('SHARIAH');
    expect(context.checks).toEqual([{ label: 'Losses borne by capital', status: 'FAIL', detail: 'Capital shares are unknown.' }]);
    expect(context.checksPassed).toEqual(['Asset type matches the need']);
    expect(provider.generate.mock.calls[0][0].systemPrompt).toContain('Shariah reviewer');
    expect((result.output.recommendation as Record<string, unknown>).suggestedDecision).toBe('REQUEST_CHANGES');
  });
});
