import { IdentityService, JwtPayload } from './identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

function setup(profile: unknown = { bio: 'kept' }, created = 1) {
  const prisma = {
    session: { findUnique: jest.fn(async () => null), createMany: jest.fn(async () => ({ count: created })) },
    user: { findUnique: jest.fn(async () => ({ profile })), update: jest.fn(async () => ({})) },
  };
  const service = new IdentityService(prisma as never, {} as never);
  const ensureSession = (payload: JwtPayload) => (service as unknown as { ensureSession: (t: string, p: JwtPayload, i: unknown) => Promise<void> }).ensureSession('token', { exp: Date.now() / 1000 + 300, ...payload }, { userId: 'U1', role: 'Country Admin', countryNodeId: 'CN-MYS', organisationId: 'ORG-1' });
  return { prisma, ensureSession };
}

describe('recording how a person signed in', () => {
  it('marks MFA as used when Keycloak reports an OTP sign-in, keeping the rest of the profile', async () => {
    const { prisma, ensureSession } = setup();
    await ensureSession({ amr: ['pwd', 'otp'], auth_time: 1793260800 });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'U1' }, data: { profile: { bio: 'kept', signInMethods: ['pwd', 'otp'], mfaEnabled: true, mfaStatus: 'Enabled', lastLogin: new Date(1793260800 * 1000).toISOString() } } });
  });

  it('records a password-only sign-in as MFA not used', async () => {
    const { prisma, ensureSession } = setup({});
    await ensureSession({ amr: ['pwd'] });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'U1' }, data: { profile: { signInMethods: ['pwd'], mfaEnabled: false, mfaStatus: 'Not used' } } });
  });

  it('writes nothing for a token already seen, a token without sign-in details, or an unchanged profile', async () => {
    const seen = setup({}, 0);
    await seen.ensureSession({ amr: ['pwd', 'otp'] });
    const bare = setup({});
    await bare.ensureSession({});
    const same = setup({ signInMethods: ['pwd'], mfaEnabled: false, mfaStatus: 'Not used' });
    await same.ensureSession({ amr: ['pwd'] });
    expect(seen.prisma.user.update).not.toHaveBeenCalled();
    expect(bare.prisma.user.update).not.toHaveBeenCalled();
    expect(same.prisma.user.update).not.toHaveBeenCalled();
  });
});
