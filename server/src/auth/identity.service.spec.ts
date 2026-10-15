import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { allowedJwtAlgorithms, assertAuthConfig, IdentityService } from './identity.service';
import { PrismaService } from '../prisma.service';

import { RoleAvailabilityService } from '../roles/role-availability.service';

jest.mock('../prisma.service', () => ({
  PrismaService: class {},
}));

const prismaMock = {
  user: { findFirst: jest.fn() },
  userRoleAssignment: { findMany: jest.fn().mockResolvedValue([]) },
};

const roleAvailabilityStub = { disabledRoles: jest.fn(async () => new Set<string>()), isEnabled: jest.fn(async () => true) };

function tokenForMockHeader(header: Record<string, unknown>): string {
  return `${Buffer.from(JSON.stringify(header)).toString('base64url')}.payload.sig`;
}

describe('IdentityService role extraction', () => {
  const service = new IdentityService(prismaMock as unknown as PrismaService, roleAvailabilityStub as unknown as RoleAvailabilityService);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AUTH_MODE = 'mock';
  });

  it('derives the effective role from the database, ignoring any token role claim', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'USR-MYS-P2-001',
      idpSubjectId: 'USR-MYS-P2-001',
       email: 'ahmad.admin@wealthpooling.my',
       name: 'Ahmad bin Razak',
      isActive: true,
      roleAssignments: [
         { role: 'Country_Admin', assignedAt: new Date(), organisation: { id: 'ORG-PUBLIC', countryNodeId: 'CN-MYS', status: 'ACTIVE' }, countryNode: { code: 'CN-MYS', status: 'ACTIVE' } },
         { role: 'Institutional_Investor', assignedAt: new Date(), organisation: { id: 'ORG-PUBLIC', countryNodeId: 'CN-MYS', status: 'ACTIVE' }, countryNode: { code: 'CN-MYS', status: 'ACTIVE' } },
      ],
    });

    // The mock token claims a forged role; it must be ignored.
    const user = await service.verifyToken(tokenForMockHeader({ mock: 'MYS-P2-001', role: 'Super Admin' }));

    expect(user.role).toBe('Country Admin');
    expect(user.assignedRoles).toEqual(['Country Admin', 'Institutional Investor']);
    expect(user.email).toBe('ahmad.admin@wealthpooling.my');
  });

  it('ignores roles a Super Admin has disabled, and refuses sign-in when no enabled role is left', async () => {
    const assignment = (role: string) => ({ role, assignedAt: new Date(), organisation: { id: 'ORG-PUBLIC', countryNodeId: 'CN-MYS', status: 'ACTIVE' }, countryNode: { code: 'CN-MYS', status: 'ACTIVE' } });
    prismaMock.user.findFirst.mockResolvedValue({ id: 'USR-A', idpSubjectId: 'USR-A', email: 'a@example.test', name: 'A', isActive: true, roleAssignments: [assignment('Shariah_Reviewer'), assignment('Retail_Investor')] });
    roleAvailabilityStub.disabledRoles.mockResolvedValueOnce(new Set(['Shariah Reviewer']));
    const user = await service.verifyToken(tokenForMockHeader({ mock: 'A', role: 'Shariah Reviewer' }));
    expect(user.role).toBe('Retail Investor');
    expect(user.assignedRoles).toEqual(['Retail Investor']);

    roleAvailabilityStub.disabledRoles.mockResolvedValueOnce(new Set(['Shariah Reviewer', 'Retail Investor']));
    await expect(service.verifyToken(tokenForMockHeader({ mock: 'A' }))).rejects.toThrow('Your role is currently disabled on this platform');
  });

  it('rejects a user with no active role assignments instead of defaulting to a role', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'USR-X',
      idpSubjectId: 'USR-X',
      email: 'x@example.test',
      name: 'X',
      isActive: true,
      roleAssignments: [],
    });

    await expect(service.verifyToken(tokenForMockHeader({ mock: 'X' }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an inactive (suspended) user', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'USR-Y',
      idpSubjectId: 'USR-Y',
      email: 'y@example.test',
      name: 'Y',
      isActive: false,
       roleAssignments: [{ role: 'Guest', assignedAt: new Date(), organisation: { id: 'ORG-PUBLIC', countryNodeId: 'CN-MYS', status: 'ACTIVE' }, countryNode: { code: 'CN-MYS', status: 'ACTIVE' } }],
    });

    await expect(service.verifyToken(tokenForMockHeader({ mock: 'Y' }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an inactive organisation or country node', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'USR-Z', idpSubjectId: 'USR-Z', email: 'z@example.test', name: 'Z', isActive: true,
      roleAssignments: [{ role: 'Guest', assignedAt: new Date(), organisation: { id: 'ORG-PUBLIC', countryNodeId: 'CN-MYS', status: 'SUSPENDED' }, countryNode: { code: 'CN-MYS', status: 'ACTIVE' } }],
    });

    await expect(service.verifyToken(tokenForMockHeader({ mock: 'Z' }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when no bearer token is supplied', async () => {
    await expect(service.verifyToken('')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('production sign-in restrictions', () => {
  const service = new IdentityService(prismaMock as unknown as PrismaService, roleAvailabilityStub as unknown as RoleAvailabilityService);
  const saved = { ...process.env };
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const hs256Token = (header: object) => {
    const body = `${b64(header)}.${b64({ sub: 'USR-A', iss: 'https://idp.test/realms/how', aud: 'how-api', exp: Math.floor(Date.now() / 1000) + 300 })}`;
    return `${body}.${createHmac('sha256', 'shared-secret').update(body).digest('base64url')}`;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(process.env, { OIDC_ISSUER: 'https://idp.test/realms/how', OIDC_AUDIENCE: 'how-api', JWT_SHARED_SECRET: 'shared-secret' });
  });
  afterEach(() => { process.env = { ...saved }; });

  it('refuses unsigned mock tokens when NODE_ENV=production', async () => {
    Object.assign(process.env, { NODE_ENV: 'production', AUTH_MODE: 'mock' });
    await expect(service.verifyToken(tokenForMockHeader({ mock: 'MYS-P2-001' }))).rejects.toThrow('Mock sign-in is disabled in production');
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });

  it('refuses HS256 shared-secret tokens in production but accepts the signature in development', async () => {
    Object.assign(process.env, { NODE_ENV: 'production', AUTH_MODE: 'oidc' });
    await expect(service.verifyToken(hs256Token({ alg: 'HS256' }))).rejects.toThrow('Unsupported token algorithm: HS256');

    process.env.NODE_ENV = 'development';
    prismaMock.user.findFirst.mockResolvedValue(null);
    await expect(service.verifyToken(hs256Token({ alg: 'HS256' }))).rejects.toThrow('User is not provisioned');
  });

  it('refuses tokens that state no algorithm or "none"', async () => {
    Object.assign(process.env, { NODE_ENV: 'development', AUTH_MODE: 'oidc' });
    await expect(service.verifyToken(hs256Token({}))).rejects.toThrow('Unsupported token algorithm: none');
    await expect(service.verifyToken(hs256Token({ alg: 'none' }))).rejects.toThrow('Unsupported token algorithm: none');
  });
});

describe('assertAuthConfig', () => {
  const oidc = { NODE_ENV: 'production', AUTH_MODE: 'oidc', OIDC_ISSUER: 'https://idp.test/realms/how', OIDC_AUDIENCE: 'how-api', OIDC_JWKS_URI: 'https://idp.test/certs' };

  it('stops a production server that is configured for mock or no sign-in mode', () => {
    expect(() => assertAuthConfig({ ...oidc, AUTH_MODE: 'mock' } as NodeJS.ProcessEnv)).toThrow('AUTH_MODE must be "oidc" in production');
    expect(() => assertAuthConfig({ ...oidc, AUTH_MODE: undefined } as NodeJS.ProcessEnv)).toThrow('AUTH_MODE must be "oidc" in production');
  });

  it('requires issuer, audience and a public key in production', () => {
    expect(() => assertAuthConfig({ ...oidc, OIDC_AUDIENCE: '' } as NodeJS.ProcessEnv)).toThrow('OIDC_ISSUER and OIDC_AUDIENCE');
    expect(() => assertAuthConfig({ ...oidc, OIDC_JWKS_URI: undefined } as NodeJS.ProcessEnv)).toThrow('OIDC_JWKS_URI or OIDC_PUBLIC_KEY_PEM');
  });

  it('accepts a complete OIDC setup, and leaves development (mock) alone', () => {
    expect(() => assertAuthConfig(oidc as NodeJS.ProcessEnv)).not.toThrow();
    expect(() => assertAuthConfig({ NODE_ENV: 'development', AUTH_MODE: 'mock' } as NodeJS.ProcessEnv)).not.toThrow();
    expect(allowedJwtAlgorithms({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toEqual(['RS256']);
  });
});

describe('IdentityService name and email from the identity provider', () => {
  const prisma = { user: { update: jest.fn() } };
  const service = new IdentityService(prisma as unknown as PrismaService, roleAvailabilityStub as unknown as RoleAvailabilityService);
  const identity = { userId: 'USR-SYS-002', idpSubjectId: 'kc-sub', email: 'admin.demo@wealthpooling.my', name: 'Dr. Farid Hakim', role: 'Super Admin' as const, countryNodeId: 'CN-MYS', organisationId: 'ORG-PUBLIC', assignedRoles: ['Super Admin' as const] };
  const sync = (payload: Record<string, unknown>) => (service as unknown as { syncNameAndEmail: (i: typeof identity, p: Record<string, unknown>) => Promise<typeof identity> }).syncNameAndEmail(identity, payload);

  beforeEach(() => jest.clearAllMocks());

  it('copies a changed name and email from the token into the database', async () => {
    const result = await sync({ sub: 'kc-sub', email: 'IT.Manager@Example.com', name: 'Anuar bin Jamin' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'USR-SYS-002' }, data: { email: 'it.manager@example.com', name: 'Anuar bin Jamin' } });
    expect(result).toMatchObject({ email: 'it.manager@example.com', name: 'Anuar bin Jamin' });
  });

  it('writes nothing when they already match', async () => {
    await sync({ sub: 'kc-sub', email: identity.email, name: identity.name });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('keeps the email when another account already uses it, but still updates the name', async () => {
    const { Prisma } = jest.requireActual('@prisma/client');
    prisma.user.update.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }));
    const result = await sync({ sub: 'kc-sub', email: 'taken@example.com', name: 'Anuar bin Jamin' });
    expect(prisma.user.update).toHaveBeenLastCalledWith({ where: { id: 'USR-SYS-002' }, data: { name: 'Anuar bin Jamin' } });
    expect(result).toMatchObject({ email: identity.email, name: 'Anuar bin Jamin' });
  });
});

describe('IdentityService organisation and country for a sign-in', () => {
  const prisma = { userRoleAssignment: { findMany: jest.fn() } };
  const service = new IdentityService(prisma as unknown as PrismaService, roleAvailabilityStub as unknown as RoleAvailabilityService);
  const tenantFor = (country?: string, org?: string) => (service as unknown as { tenantFor: (s: string, c?: string, o?: string) => Promise<{ countryNodeId: string; organisationId: string }> }).tenantFor('kc-sub', country, org);
  const originalCell = process.env.COUNTRY_NODE_ID;

  beforeEach(() => { jest.clearAllMocks(); delete process.env.COUNTRY_NODE_ID; });
  afterAll(() => { process.env.COUNTRY_NODE_ID = originalCell; });

  it('uses the organisation and country named in the token', async () => {
    await expect(tenantFor('CN-MYS', 'ORG-INV-MYS-01')).resolves.toEqual({ countryNodeId: 'CN-MYS', organisationId: 'ORG-INV-MYS-01' });
    expect(prisma.userRoleAssignment.findMany).not.toHaveBeenCalled();
  });

  it('takes them from the user\'s roles when the token has none, instead of a default', async () => {
    prisma.userRoleAssignment.findMany.mockResolvedValueOnce([{ countryNodeId: 'CN-MYS', organisationId: 'ORG-PUBLIC' }, { countryNodeId: 'CN-MYS', organisationId: 'ORG-PUBLIC' }]);
    await expect(tenantFor()).resolves.toEqual({ countryNodeId: 'CN-MYS', organisationId: 'ORG-PUBLIC' });
  });

  it('refuses to guess when the user belongs to more than one organisation', async () => {
    prisma.userRoleAssignment.findMany.mockResolvedValueOnce([{ countryNodeId: 'CN-MYS', organisationId: 'ORG-A' }, { countryNodeId: 'CN-MYS', organisationId: 'ORG-B' }]);
    await expect(tenantFor()).rejects.toThrow('more than one organisation');
    prisma.userRoleAssignment.findMany.mockResolvedValueOnce([]);
    await expect(tenantFor()).rejects.toThrow('not provisioned or has no active role');
  });

  it('refuses another country when the deployment serves one country', async () => {
    process.env.COUNTRY_NODE_ID = 'CN-MYS';
    await expect(tenantFor('CN-IDN', 'ORG-IDN-1')).rejects.toThrow('This platform serves CN-MYS');
    await expect(tenantFor('CN-MYS', 'ORG-A')).resolves.toEqual({ countryNodeId: 'CN-MYS', organisationId: 'ORG-A' });
  });
});
