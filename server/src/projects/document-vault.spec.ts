import { ProjectsService } from './projects.service';
import { PolicyService } from '../policy/policy.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const actor = (role: string) => ({ userId: 'U1', role, countryNodeId: 'CN-MYS', organisationId: 'ORG-1' }) as unknown as AuthenticatedUser;

function setup() {
  const prisma = { projectDocument: { findMany: jest.fn(async () => []) } };
  return { prisma, service: new ProjectsService(prisma as never, {} as never, new PolicyService()) };
}

describe('ProjectsService.documentVault', () => {
  it('lets Super Admin see every project document, metadata only', async () => {
    const { prisma, service } = setup();
    await service.documentVault(actor('Super Admin'));
    const query = (prisma.projectDocument.findMany.mock.calls[0] as unknown as [{ where: unknown; select: Record<string, unknown> }])[0];
    expect(query.where).toEqual({ project: {} });
    expect(query.select.fileContent).toBeUndefined();
    expect(query.select.extractedText).toBeUndefined();
  });

  it('keeps a Country Admin to their country and a sponsor to their own projects', async () => {
    const { prisma, service } = setup();
    await service.documentVault(actor('Country Admin'));
    await service.documentVault(actor('Project Sponsor'));
    const calls = prisma.projectDocument.findMany.mock.calls as unknown as Array<[{ where: unknown }]>;
    expect(calls[0][0].where).toEqual({ project: { countryNodeId: 'CN-MYS' } });
    expect(calls[1][0].where).toEqual({ project: { countryNodeId: 'CN-MYS', organisationId: 'ORG-1', projectSponsorId: 'U1' } });
  });

  it('shows a reviewer the submitted projects of their country, not other organisations\' drafts', async () => {
    const { prisma, service } = setup();
    await service.documentVault(actor('Finance Officer'));
    const calls = prisma.projectDocument.findMany.mock.calls as unknown as Array<[{ where: unknown }]>;
    expect(calls[0][0].where).toEqual({ project: { countryNodeId: 'CN-MYS', OR: [{ organisationId: 'ORG-1' }, { status: { not: 'DRAFT' } }] } });
  });
});
