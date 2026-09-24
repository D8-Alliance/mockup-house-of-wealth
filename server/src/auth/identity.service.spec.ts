import { UnauthorizedException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { PrismaService } from '../prisma.service';

jest.mock('../prisma.service', () => ({
  PrismaService: class {},
}));

const prismaMock = {
  user: { findFirst: jest.fn() },
};

function tokenForMockHeader(header: Record<string, unknown>): string {
  return `${Buffer.from(JSON.stringify(header)).toString('base64url')}.payload.sig`;
}

describe('IdentityService role extraction', () => {
  const service = new IdentityService(prismaMock as unknown as PrismaService);

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
        { role: 'Country_Admin', assignedAt: new Date() },
        { role: 'Institutional_Investor', assignedAt: new Date() },
      ],
    });

    // The mock token claims a forged role; it must be ignored.
    const user = await service.verifyToken(tokenForMockHeader({ mock: 'MYS-P2-001', role: 'Super Admin' }));

    expect(user.role).toBe('Country Admin');
    expect(user.assignedRoles).toEqual(['Country Admin', 'Institutional Investor']);
    expect(user.email).toBe('ahmad.admin@wealthpooling.my');
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
      roleAssignments: [{ role: 'Guest', assignedAt: new Date() }],
    });

    await expect(service.verifyToken(tokenForMockHeader({ mock: 'Y' }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws when no bearer token is supplied', async () => {
    await expect(service.verifyToken('')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
