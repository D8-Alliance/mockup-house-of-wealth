import { AuthenticatedUser } from '../auth/identity.service';
import { AgreementGenerationService } from './agreement-generation.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

const legal: AuthenticatedUser = { userId: 'USR-LEGAL', idpSubjectId: 'USR-LEGAL', email: 'legal@example.test', name: 'Anuar Legal', role: 'Legal Officer', countryNodeId: 'CN-MYS', organisationId: 'ORG-ADMIN', assignedRoles: ['Legal Officer'] };

describe('agreement review evidence', () => {
  const contract = {
    id: 'AGR-1', contractNumber: 'HOF-1', contractType: 'MUSHARAKAH', status: 'LEGAL_REVIEW', createdBy: 'USR-DRAFT', organisationId: 'ORG-AO', countryNodeId: 'CN-MYS', engagementId: null, complianceReport: { status: 'PASS' },
    approvals: [{ approverId: 'USR-DRAFT', status: 'LEGAL_REVIEW', decidedAt: new Date('2026-10-22T08:00:00Z') }], parties: [], events: [],
    versions: [{ id: 'V1', version: 1, content: { sections: [{ number: '3', title: 'Terms', paragraphs: ['Profit: owner 60%. FELCRA: [state its capital contribution].'] }], approvedClauseIds: ['C1'], shariahRuleIds: ['R1'] } }],
  };
  const tx = { contract: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue({ ...contract, status: 'SHARIAH_REVIEW', updatedAt: new Date() }) }, contractEvent: { create: jest.fn() }, contractApproval: { create: jest.fn() } };
  const prisma = { contract: { findUnique: jest.fn().mockResolvedValue(contract) }, assetEngagement: { findUnique: jest.fn() }, aiRun: { findFirst: jest.fn() }, $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)) };
  const audit = { recordActor: jest.fn() };
  const service = new AgreementGenerationService(prisma as never, audit as never, {} as never, {} as never);

  beforeEach(() => jest.clearAllMocks());

  it('asks Legal for a reason to approve text with blanks, and keeps the reason, the checks and the version fingerprint', async () => {
    await expect(service.review(legal, 'AGR-1', { reviewStatus: 'SHARIAH_REVIEW', note: 'Fine.' })).rejects.toThrow('Give your reason for approving: 2 text checks failed: No blanks left in the text, Losses borne by capital');
    await service.review(legal, 'AGR-1', { reviewStatus: 'SHARIAH_REVIEW', note: 'Fine.', overrideReason: 'The capital is set in the schedule signed separately.' });
    const metadata = tx.contractEvent.create.mock.calls[0][0].data.metadata;
    expect(metadata).toMatchObject({ version: 1, versionHash: expect.stringMatching(/^[0-9a-f]{64}$/), checks: { fail: ['No blanks left in the text', 'Losses borne by capital'] }, override: { reason: 'The capital is set in the schedule signed separately.' } });
    expect(audit.recordActor).toHaveBeenCalledWith(legal, expect.objectContaining({ action: 'agreement.review_status_changed', metadata: expect.objectContaining({ versionHash: metadata.versionHash }) }));
  });

  it('records a note drafted with the AI scan, and refuses a scan of another agreement', async () => {
    prisma.aiRun.findFirst.mockResolvedValueOnce({ id: 'RUN-1', input: { subjectId: 'AGR-OTHER' }, output: {} });
    await expect(service.review(legal, 'AGR-1', { reviewStatus: 'CHANGES_REQUESTED', note: 'Fill the blanks.', aiRunId: 'RUN-1' })).rejects.toThrow('not for this agreement');
    prisma.aiRun.findFirst.mockResolvedValueOnce({ id: 'RUN-2', input: { subjectId: 'AGR-1' }, output: { recommendation: { gaps: [{ severity: 'HIGH' }] } } });
    await service.review(legal, 'AGR-1', { reviewStatus: 'CHANGES_REQUESTED', note: 'Fill the blanks.', aiRunId: 'RUN-2' });
    expect(tx.contractEvent.create.mock.calls[0][0].data.metadata).toMatchObject({ aiAssisted: { runId: 'RUN-2' } });
  });

  it('resubmits a partnership agreement once a new version follows the changes request', async () => {
    const amran = { ...legal, userId: 'USR-AO', name: 'Amran', role: 'Asset Owner' as const, organisationId: 'ORG-AO' };
    const parties = [{ id: 'P1', role: 'OWNER', organisationId: 'ORG-AO', displayName: 'Al Hidayah', consentedVersion: 2, signedAt: null }, { id: 'P2', role: 'PDP', organisationId: 'ORG-PDP', displayName: 'FELCRA', consentedVersion: 2, signedAt: null }];
    const sentBack = { ...contract, status: 'CHANGES_REQUESTED', parties, approvals: [...contract.approvals, { approverId: 'USR-LEGAL', status: 'CHANGES_REQUESTED', decidedAt: new Date('2026-10-23T00:56:00Z') }],
      versions: [{ ...contract.versions[0], id: 'V2', version: 2, createdAt: new Date('2026-10-23T01:04:00Z'), content: { sections: [{ number: '4', title: 'Profit and loss', paragraphs: ['Owner 60% of profit. Losses are borne in proportion to capital. No partner guarantees a return.'] }], approvedClauseIds: ['C1'], shariahRuleIds: ['R1'] } }] };
    prisma.contract.findUnique.mockResolvedValueOnce(sentBack).mockResolvedValueOnce(sentBack);
    await expect(service.review(amran, 'AGR-1', { reviewStatus: 'LEGAL_REVIEW', note: 'Version 2.' })).resolves.toBeDefined();
  });
});
