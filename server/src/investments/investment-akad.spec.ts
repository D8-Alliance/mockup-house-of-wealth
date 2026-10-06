import { BadRequestException, ConflictException } from '@nestjs/common';
import { InvestmentsService } from './investments.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../financial/financial-ledger.service', () => ({ FinancialLedgerService: class {} }));

const investor: AuthenticatedUser = { userId: 'USR-INV', idpSubjectId: 'USR-INV', email: 'inv@example.test', name: 'Investor', role: 'Retail Investor', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Retail Investor'] };
const input = { poolId: 'POOL-1', amount: 1000, currency: 'MYR', idempotencyKey: 'KEY-1', akadTermsId: 'TERMS-1', acceptAkad: true };

function setup(terms: { id: string; version: number; termsHash: string; akadType: string } | null) {
  const tx = {
    $queryRaw: jest.fn(async () => []),
    poolAkadTerms: { findFirst: jest.fn(async () => terms) },
    investmentOrder: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'ORD-1', ...data })) },
  };
  const prisma = {
    wealthPool: { findUnique: jest.fn(async () => ({ poolId: 'POOL-1', projectId: 'P1', status: 'OPEN', currency: 'MYR', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', project: { projectId: 'P1', fundingRequired: 100000 } })) },
    investmentOrder: { findUnique: jest.fn(async () => null) },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const service = new InvestmentsService(prisma as never, {} as never, { recordActor: jest.fn() } as never);
  return { service, tx };
}

describe('InvestmentsService.createOrder akad acceptance', () => {
  it('records which terms were accepted, their hash and when', async () => {
    const { service, tx } = setup({ id: 'TERMS-1', version: 1, termsHash: 'abc123', akadType: 'MUDARABAH' });
    const order = await service.createOrder(investor, input);
    expect(order).toMatchObject({ akadTermsId: 'TERMS-1', akadTermsHash: 'abc123' });
    expect((order as { akadAcceptedAt?: unknown }).akadAcceptedAt).toBeInstanceOf(Date);
    expect(tx.$queryRaw).toHaveBeenCalled();
  });

  it('refuses an order that accepted an older version of the terms', async () => {
    const { service, tx } = setup({ id: 'TERMS-2', version: 2, termsHash: 'def456', akadType: 'MUDARABAH' });
    await expect(service.createOrder(investor, input)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.investmentOrder.create).not.toHaveBeenCalled();
  });

  it('refuses investment in a pool that has no akad terms', async () => {
    const { service } = setup(null);
    await expect(service.createOrder(investor, input)).rejects.toBeInstanceOf(BadRequestException);
  });
});
