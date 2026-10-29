import { BadRequestException } from '@nestjs/common';
import { PoolsService } from './pools.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../policy/policy.service', () => ({ PolicyService: class {} }));
jest.mock('../projects/project-lock', () => ({ FUNDABLE_PROJECT_STATUSES: [], hasCurrentFinalApproval: jest.fn() }));

const approver: AuthenticatedUser = { userId: 'USR-PM', idpSubjectId: 'USR-PM', email: 'pm@example.test', name: 'Pool Manager A', role: 'Pool Manager', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Pool Manager'] };
const unsigned = { shariahApprovedAt: null, complianceApprovedAt: null, riskApprovedAt: null, authorisedApprovedAt: null };

/** An in-memory pool behind the Prisma calls the service makes. */
function setup(initial: Record<string, unknown>) {
  let pool: Record<string, unknown> = { poolId: 'POOL-1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', ...unsigned, ...initial };
  const audit = { recordActor: jest.fn() };
  const wealthPool = {
    findUnique: jest.fn(async () => ({ ...pool })),
    findUniqueOrThrow: jest.fn(async () => ({ ...pool })),
    updateMany: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const matches = Object.entries(where).every(([key, value]) => key === 'poolId' || pool[key] === value);
      if (!matches) return { count: 0 };
      pool = { ...pool, ...data };
      return { count: 1 };
    }),
    update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { pool = { ...pool, ...data }; return { ...pool }; }),
  };
  const prisma = { wealthPool, $transaction: jest.fn((fn: (client: unknown) => unknown) => fn({ wealthPool })) };
  const service = new PoolsService(prisma as never, audit as never, {} as never);
  return { service, audit, current: () => pool };
}

describe('pool governance sign-off', () => {
  it('keeps the pool DRAFT until all four sign-offs, then makes it APPROVED', async () => {
    const { service, current } = setup({ status: 'DRAFT' });
    await service.signOff('POOL-1', 'shariah', approver);
    await service.signOff('POOL-1', 'compliance', approver);
    await service.signOff('POOL-1', 'risk', approver);
    expect(current().status).toBe('DRAFT');
    expect(current().shariahApprovedBy).toBe('Pool Manager A');

    const result = await service.signOff('POOL-1', 'authorised', approver);
    expect(result.status).toBe('APPROVED');
  });

  it('does not sign the same step twice', async () => {
    const { service, audit } = setup({ status: 'DRAFT', shariahApprovedAt: new Date('2026-10-01'), shariahApprovedBy: 'Someone else' });
    const result = await service.signOff('POOL-1', 'shariah', approver);
    expect(result.shariahApprovedBy).toBe('Someone else');
    expect(audit.recordActor).not.toHaveBeenCalled();
  });

  it('refuses sign-offs once the pool has left DRAFT', async () => {
    const { service } = setup({ status: 'OPEN' });
    await expect(service.signOff('POOL-1', 'risk', approver)).rejects.toThrow(BadRequestException);
  });

  it('opens only an APPROVED pool', async () => {
    const draft = setup({ status: 'DRAFT' });
    await expect(draft.service.open('POOL-1', approver)).rejects.toThrow(/governance sign-offs/);

    const approved = setup({ status: 'APPROVED' });
    const opened = await approved.service.open('POOL-1', approver);
    expect(opened.status).toBe('OPEN');
    expect(approved.audit.recordActor).toHaveBeenCalledWith(approver, expect.objectContaining({ metadata: expect.objectContaining({ fromStatus: 'APPROVED', toStatus: 'OPEN' }) }), expect.anything());
  });
});
