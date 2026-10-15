import { ConflictException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DemoRegisterDto, DemoRegistrationService } from './demo-registration.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

import { RoleAvailabilityService } from '../roles/role-availability.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const tx = {
  organisation: { create: jest.fn() },
  user: { create: jest.fn() },
  userRoleAssignment: { create: jest.fn() },
};
const prisma = {
  countryNode: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
};
const audit = { record: jest.fn().mockResolvedValue(undefined) };
const input = { name: 'Aminah Yusof', email: 'Aminah@Example.com', organisation: 'Aminah Holdings', countryNodeId: 'CN-MYS', role: 'Retail Investor' as const };

const roleAvailabilityStub = { disabledRoles: jest.fn(async () => new Set<string>()), isEnabled: jest.fn(async () => true) };

describe('DemoRegistrationService', () => {
  const service = new DemoRegistrationService(prisma as unknown as PrismaService, audit as unknown as AuditService, roleAvailabilityStub as unknown as RoleAvailabilityService);
  const originalMode = process.env.AUTH_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AUTH_MODE = 'mock';
    prisma.countryNode.findUnique.mockResolvedValue({ code: 'CN-MYS' });
    prisma.user.findUnique.mockResolvedValue(null);
  });
  afterAll(() => { process.env.AUTH_MODE = originalMode; });

  it('creates the user, a new organisation and the chosen role in one transaction', async () => {
    const result = await service.register(input);

    // Member ID: country of registration plus 8 Crockford characters; an individual gets a private organisation.
    expect(result.userId).toMatch(/^USR-MYS-[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(result.organisationId).toBe(result.userId.replace('USR-MYS-', 'ORG-MYS-IND-'));
    expect(tx.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userType: 'INDIVIDUAL', homeCountryNodeId: 'CN-MYS' }) });
    expect(result.email).toBe('aminah@example.com');
    expect(tx.userRoleAssignment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role: 'Retail_Investor', organisationId: result.organisationId, countryNodeId: 'CN-MYS' }) });
  });

  it('gives an institution its own organisation and marks the user as an institution', async () => {
    const result = await service.register({ ...input, role: 'Project Sponsor' });
    expect(result.organisationId).toBe(result.userId.replace(/^USR-/, 'ORG-'));
    expect(tx.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userType: 'INSTITUTION' }) });
  });

  it('refuses sign-up with a role that is disabled on the platform', async () => {
    roleAvailabilityStub.isEnabled.mockResolvedValueOnce(false);
    await expect(service.register(input)).rejects.toThrow('is not open at the moment');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('is refused outside demo mode, where Keycloak handles sign-up', async () => {
    process.env.AUTH_MODE = 'oidc';

    await expect(service.register(input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an email that already has an account', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'USR-EXISTING' });

    await expect(service.register(input)).rejects.toBeInstanceOf(ConflictException);
  });

  it('reports a simultaneous sign-up with the same email as a conflict, not a server error', async () => {
    prisma.$transaction.mockImplementationOnce(() => { throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }); });

    await expect(service.register(input)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('DemoRegisterDto', () => {
  const check = (organisation: string) => validate(plainToInstance(DemoRegisterDto, { ...input, organisation }));

  it('rejects an email address as the organisation (browser autofill)', async () => {
    const errors = await check('adtest@test.com');
    expect(errors.map((error) => error.property)).toEqual(['organisation']);
  });

  it('rejects an organisation made only of spaces', async () => {
    const errors = await check('   ');
    expect(errors.map((error) => error.property)).toEqual(['organisation']);
  });

  it('accepts and trims a normal organisation name', async () => {
    const dto = plainToInstance(DemoRegisterDto, { ...input, organisation: '  Aminah Holdings  ' });
    expect(await validate(dto)).toEqual([]);
    expect(dto.organisation).toBe('Aminah Holdings');
  });
});
