import { AuthenticatedUser } from '../../auth/identity.service';
import { AgreementSigningService, maskEmail } from './agreement-signing.service';
import { createSelfSignedSeal, sha256Hex } from './pdf-seal';
import { fakeTimestampResponse } from './timestamp.fixture';

jest.mock('../../prisma.service', () => ({ PrismaService: class {} }));

const umar: AuthenticatedUser = { userId: 'USR-UMAR', idpSubjectId: 'USR-UMAR', email: 'r.muhd.umar@gmail.com', name: 'Raja Muhamad Umar', role: 'Project Sponsor', countryNodeId: 'CN-MYS', organisationId: 'ORG-FELCRA', assignedRoles: ['Project Sponsor'] };

/** Just enough of Prisma, in memory, for codes and the signed document. */
function memoryPrisma() {
  const challenges: Array<Record<string, any>> = [];
  let document: Record<string, any> | null = null;
  return {
    challenges, get document() { return document; }, set document(value) { document = value; },
    signatureChallenge: {
      findMany: jest.fn(async () => [...challenges].reverse()),
      create: jest.fn(async ({ data }) => { challenges.push({ attempts: 0, usedAt: null, createdAt: new Date(), ...data }); return data; }),
      findFirst: jest.fn(async ({ where }) => challenges.find((item) => item.id === where.id && item.userId === where.userId) ?? challenges.find((item) => item.usedAt && item.userId === where.userId) ?? null),
      update: jest.fn(async ({ where, data }) => { const item = challenges.find((row) => row.id === where.id)!; item.attempts += data.attempts.increment; return item; }),
      updateMany: jest.fn(async ({ where, data }) => { const item = challenges.find((row) => row.id === where.id && !row.usedAt); if (item) Object.assign(item, data); return { count: item ? 1 : 0 }; }),
    },
    signedAgreementDocument: {
      findUnique: jest.fn(async () => document),
      findUniqueOrThrow: jest.fn(async () => document),
      create: jest.fn(async ({ data }) => { document = { integrityStatus: 'SEALED', timestampToken: null, ...data }; return document; }),
      update: jest.fn(async ({ data }) => { Object.assign(document!, data); return document; }),
    },
    contract: {
      findUnique: jest.fn(async () => ({
        id: 'AGR-1', contractNumber: 'HOF-1', title: 'Musharakah Joint Venture Agreement', contractType: 'MUSHARAKAH', status: 'EXECUTION', countryNodeId: 'CN-MYS', organisationId: 'ORG-AO',
        versions: [{ version: 2, content: { sections: [{ number: '1', title: 'Terms', paragraphs: ['Owner 60% of profit.'] }, { number: '8', title: 'Signatures', paragraphs: ['Name: ____'] }] } }],
        parties: [
          { role: 'OWNER', displayName: 'Al Hidayah Group Sdn Bhd', signedBy: 'USR-AMRAN', signatureName: 'Amran Zain', signedAt: new Date('2026-10-22T07:00:00Z') },
          { role: 'PDP', displayName: 'FELCRA', signedBy: 'USR-UMAR', signatureName: 'Raja Muhamad Umar', signedAt: new Date('2026-10-22T07:30:00Z') },
        ],
        approvals: [{ status: 'SHARIAH_REVIEW', approverId: 'USR-LEGAL', decidedAt: new Date('2026-10-22T05:00:00Z') }, { status: 'APPROVED', approverId: 'USR-SR', decidedAt: new Date('2026-10-22T06:00:00Z') }],
        events: [{ actorId: 'USR-LEGAL', eventType: 'STATUS_CHANGED', metadata: { byName: 'Anuar Legal' } }, { actorId: 'USR-AMRAN', eventType: 'PARTY_SIGNED', metadata: { byName: 'Amran Zain' } }],
      })),
    },
    kycApplication: { findFirst: jest.fn(async ({ where }) => (where.userId === 'USR-UMAR' ? { applicationNumber: 'KYC-MYS-0001' } : null)) },
    userRoleAssignment: { findMany: jest.fn(async () => [{ userId: 'USR-SYS-002', organisationId: 'ORG-D8', countryNodeId: 'CN-MYS' }]) },
  };
}

describe('platform e-signature', () => {
  const audit = { recordActor: jest.fn(), record: jest.fn() };
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; jest.restoreAllMocks(); });

  it('sends a one-time code (shown on screen in test mode) and accepts it once, for this signer and version only', async () => {
    const prisma = memoryPrisma();
    const service = new AgreementSigningService(prisma as never, audit as never);
    const issued = await service.issueCode(umar, { id: 'AGR-1', contractNumber: 'HOF-1', version: 2 });
    expect(issued).toMatchObject({ channel: 'TEST', testCode: expect.stringMatching(/^\d{6}$/) });
    expect(prisma.challenges[0].codeHash).not.toContain(issued.testCode);
    await expect(service.issueCode(umar, { id: 'AGR-1', contractNumber: 'HOF-1', version: 2 })).rejects.toThrow('less than a minute');
    await expect(service.verifyCode(umar, 'AGR-1', 2, issued.challengeId, '000000' === issued.testCode ? '111111' : '000000')).rejects.toThrow('Wrong code. 4 tries left.');
    await expect(service.verifyCode(umar, 'AGR-1', 3, issued.challengeId, issued.testCode)).rejects.toThrow('agreement changed');
    await expect(service.verifyCode(umar, 'AGR-1', 2, issued.challengeId, issued.testCode)).resolves.toEqual({ channel: 'TEST', destination: 'shown on screen (test mode)' });
    await expect(service.verifyCode(umar, 'AGR-1', 2, issued.challengeId, issued.testCode)).rejects.toThrow('already used');
  });

  it('never shows the code on screen in production without an email provider', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;
    expect(() => new AgreementSigningService({} as never, audit as never).codeChannel()).toThrow('no email provider');
    expect(maskEmail('r.muhd.umar@gmail.com')).toBe('r***@gmail.com');
  });

  it('seals the final PDF with its Certificate of Completion, time-stamps it, and detects a later change', async () => {
    const prisma = memoryPrisma();
    const service = new AgreementSigningService(prisma as never, audit as never, undefined, { enqueue: jest.fn().mockResolvedValue(undefined) } as never);
    (service as unknown as { seal: unknown }).seal = createSelfSignedSeal('Test seal', 'pass');
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const body = Buffer.from((init as RequestInit).body as Buffer);
      const sha = prisma.document!.sha256 as string;
      expect(body.toString('hex')).toContain(sha);
      return { ok: true, arrayBuffer: async () => fakeTimestampResponse(sha) } as unknown as Response;
    });
    await service.finalize('AGR-1');
    expect(prisma.document).toMatchObject({ version: 2, timestampSerial: '0102', integrityStatus: 'VERIFIED' });
    expect(sha256Hex(Buffer.from(prisma.document!.pdf))).toBe(prisma.document!.sha256);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'agreement.sealed' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'agreement.timestamped' }));
    await expect(service.signedPdf('AGR-1')).resolves.toBeInstanceOf(Buffer);

    // Someone edits the stored file: the check fails, an admin is told, and the file is not handed out.
    const tampered = Buffer.from(prisma.document!.pdf);
    tampered[500] = tampered[500] ^ 0xff;
    prisma.document!.pdf = tampered;
    await expect(service.checkIntegrity('AGR-1')).resolves.toMatchObject({ status: 'MISMATCH' });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'agreement.integrity_mismatch' }));
    await expect(service.signedPdf('AGR-1')).rejects.toThrow('no longer matches');
  }, 60000);
});
