import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PolicyService } from '../policy/policy.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const sponsor = { userId: 'USR-SP', role: 'Project Sponsor', countryNodeId: 'CN-MYS', organisationId: 'ORG-1' } as unknown as AuthenticatedUser;
const project = { projectId: 'P1', organisationId: 'ORG-1', countryNodeId: 'CN-MYS', projectSponsorId: 'USR-SP', status: 'DUE_DILIGENCE' };

function setup(document: unknown, status = 'DUE_DILIGENCE') {
  const tx = { projectDocument: { delete: jest.fn() } };
  const prisma = {
    project: { findUnique: jest.fn(async () => ({ ...project, status })) },
    projectDocument: { findFirst: jest.fn(async () => document) },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const audit = { recordActor: jest.fn() };
  return { tx, audit, service: new ProjectsService(prisma as never, audit as never, new PolicyService()) };
}

describe('ProjectsService.deleteDocument', () => {
  it('removes a duplicate upload and records its name and hash', async () => {
    const { tx, audit, service } = setup({ id: 'D3', fileName: '01_Model_Kewangan_Kilang_Baja_Gambang2.pdf', sha256: 'abc', evidenceRequirements: [] });
    await expect(service.deleteDocument('P1', 'D3', sponsor)).resolves.toEqual({ id: 'D3' });
    expect(tx.projectDocument.delete).toHaveBeenCalledWith({ where: { id: 'D3' } });
    expect(audit.recordActor).toHaveBeenCalledWith(sponsor, expect.objectContaining({ action: 'project.document.delete', metadata: { projectId: 'P1', fileName: '01_Model_Kewangan_Kilang_Baja_Gambang2.pdf', sha256: 'abc' } }), tx);
  });

  it('keeps a file that is the project\'s evidence', async () => {
    const { tx, service } = setup({ id: 'D1', fileName: '01_Model.pdf', sha256: 'x', evidenceRequirements: [{ evidenceType: 'FINANCIAL_MODEL' }] });
    await expect(service.deleteDocument('P1', 'D1', sponsor)).rejects.toThrow(/financial model evidence, so it is kept/);
    await expect(service.deleteDocument('P1', 'D1', sponsor)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.projectDocument.delete).not.toHaveBeenCalled();
  });

  it('removes nothing once the project is locked, and refuses an unknown file', async () => {
    const locked = setup({ id: 'D3', fileName: 'x.pdf', sha256: null, evidenceRequirements: [] }, 'APPROVED');
    await expect(locked.service.deleteDocument('P1', 'D3', sponsor)).rejects.toBeInstanceOf(Error);
    expect(locked.tx.projectDocument.delete).not.toHaveBeenCalled();
    const missing = setup(null);
    await expect(missing.service.deleteDocument('P1', 'NOPE', sponsor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses another organisation\'s project', async () => {
    const { service } = setup({ id: 'D3', fileName: 'x.pdf', sha256: null, evidenceRequirements: [] });
    await expect(service.deleteDocument('P1', 'D3', { ...sponsor, organisationId: 'ORG-2' } as AuthenticatedUser)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
