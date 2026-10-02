import { ConflictException, ForbiddenException } from '@nestjs/common';
import { DemoRegistrationService } from './demo-registration.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

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

describe('DemoRegistrationService', () => {
  const service = new DemoRegistrationService(prisma as unknown as PrismaService, audit as unknown as AuditService);
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

    expect(result.userId).toMatch(/^USR-REG-/);
    expect(result.organisationId).toMatch(/^ORG-REG-/);
    expect(result.email).toBe('aminah@example.com');
    expect(tx.userRoleAssignment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role: 'Retail_Investor', organisationId: result.organisationId, countryNodeId: 'CN-MYS' }) });
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
});
