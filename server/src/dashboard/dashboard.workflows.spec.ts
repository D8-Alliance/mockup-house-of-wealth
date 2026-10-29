import { workflowPipelines } from './dashboard.workflows';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

const actor = (role: string) => ({ userId: 'U1', role, countryNodeId: 'CN-MYS', organisationId: 'ORG-1' }) as unknown as AuthenticatedUser;
const group = (rows: Array<Record<string, unknown>>) => ({ groupBy: jest.fn(async () => rows) });

function prismaMock() {
  return {
    project: group([{ status: 'APPROVED', _count: { _all: 2 } }, { status: 'LEGACY_STATE', _count: { _all: 1 } }]),
    contract: group([]),
    fundingRequest: group([{ status: 'PENDING', _count: { _all: 3 } }]),
    investmentOrder: group([]),
    kycApplication: group([]),
    organisation: group([{ kybStatus: 'SUBMITTED', _count: { _all: 4 } }]),
    pdpApplication: group([]),
  };
}

describe('workflow pipelines', () => {
  it('counts each status in the workflow\'s own order, keeping unknown statuses at the end', async () => {
    const result = await workflowPipelines(prismaMock() as never, actor('Super Admin'));
    const projects = result.find((item) => item.key === 'projects')!;
    expect(projects.stages.find((stage) => stage.status === 'APPROVED')?.count).toBe(2);
    expect(projects.stages.find((stage) => stage.status === 'DRAFT')?.count).toBe(0);
    expect(projects.stages[projects.stages.length - 1]).toEqual({ status: 'LEGACY_STATE', count: 1 });
    expect(result.find((item) => item.key === 'kyb')!.stages.find((stage) => stage.status === 'SUBMITTED')?.count).toBe(4);
  });

  it('keeps a Country Admin to their country, PDP applications by country code', async () => {
    const prisma = prismaMock();
    await workflowPipelines(prisma as never, actor('Country Admin'));
    expect(prisma.project.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { countryNodeId: 'CN-MYS' } }));
    expect(prisma.pdpApplication.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { countryCode: 'MYS' } }));
  });
});
