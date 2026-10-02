import { AuditService } from './audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';

const actor: AuthenticatedUser = {
  userId: 'USR-A', idpSubjectId: 'SUB-A', email: 'a@example.test', name: 'A',
  role: 'Organization Admin', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Organization Admin'],
};

describe('AuditService admin access', () => {
  it('scopes audit list queries to the actor organization and country', async () => {
    const prisma = { auditEvent: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) } };
    const service = new AuditService(prisma as unknown as PrismaService);

    await service.list(actor, { page: 1, limit: 50, action: 'payment' });

    expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ countryNodeId: 'CN-MYS', organisationId: 'ORG-A', action: { contains: 'payment', mode: 'insensitive' } }) }));
    expect(prisma.auditEvent.count).toHaveBeenCalledWith({ where: expect.objectContaining({ countryNodeId: 'CN-MYS', organisationId: 'ORG-A' }) });
  });

  it('exports CSV values with quotes escaped', async () => {
    const prisma = { auditEvent: { findMany: jest.fn().mockResolvedValue([{ id: 'AUD-1', createdAt: new Date('2026-10-02T00:00:00.000Z'), userId: 'USR-A', userEmail: 'a@example.test', action: 'project.update', resourceType: 'Project', resourceId: 'PROJ-1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', result: 'Success', metadata: { note: 'a, b' } }]) } };
    const service = new AuditService(prisma as unknown as PrismaService);

    const result = await service.exportCsv(actor, { page: 1, limit: 50 });

    expect(result.content).toContain('"{""note"":""a, b""}"');
    expect(result.fileName).toMatch(/^house-of-wealth-audit-2026-10-02\.csv$/);
  });
});
