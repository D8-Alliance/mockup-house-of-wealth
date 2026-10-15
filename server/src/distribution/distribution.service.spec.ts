import { DistributionService } from './distribution.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { FinancialLedgerService } from '../financial/financial-ledger.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../financial/financial-ledger.service', () => ({ FinancialLedgerService: class {} }));

const officer: AuthenticatedUser = { userId: 'USR-OPS', idpSubjectId: 'USR-OPS', email: 'ops@example.test', name: 'Ops', role: 'Settlement Officer', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Settlement Officer'] };
const distribution = { id: 'DIST-1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS' };
const payout = (status: string, ledgerTransactionId = 'LTX-1') => ({ id: 'PAY-OUT-1', status, amount: 100, providerReference: 'BANK-REF-1', allocationId: 'ALLOC-1', allocation: { distributionId: 'DIST-1', ledgerTransactionId, distribution } });

/** In-memory payout status so the conditional claims behave like the database. */
function setup(initialStatus: string) {
  const state = { status: initialStatus, ledgerTransactionId: 'LTX-1' as string | null };
  const tx = {
    payoutInstruction: {
      updateMany: jest.fn(async ({ where, data }: { where: { status: string | { in: string[] } }; data: { status: string } }) => {
        const allowed = typeof where.status === 'string' ? [where.status] : where.status.in;
        if (!allowed.includes(state.status)) return { count: 0 };
        state.status = data.status;
        return { count: 1 };
      }),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'PAY-OUT-1', status: state.status })),
    },
    distributionAllocation: {
      findUniqueOrThrow: jest.fn(async () => ({ id: 'ALLOC-1', ledgerTransactionId: state.ledgerTransactionId })),
      update: jest.fn(async ({ data }: { data: { ledgerTransactionId?: string } }) => { if (data.ledgerTransactionId) state.ledgerTransactionId = data.ledgerTransactionId; return {}; }),
    },
    distribution: { update: jest.fn(async () => distribution), findUniqueOrThrow: jest.fn(async () => distribution) },
    payoutProviderEvent: { findUnique: jest.fn(async () => null), create: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    payoutInstruction: { findUnique: jest.fn(async () => payout(state.status, state.ledgerTransactionId ?? 'LTX-1')) },
    ledgerTransaction: { findUnique: jest.fn(async () => ({ id: 'LTX-1', currency: 'MYR', entries: [{ accountId: 'USER-ACC', direction: 'DEBIT', amount: 100, description: 'Beneficiary distribution' }, { accountId: 'POOL-ACC', direction: 'CREDIT', amount: 100, description: 'Pool distribution' }] })) },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const ledger = {
    reverseInTransaction: jest.fn(async () => ({ id: 'LTX-REV' })),
    postInTransaction: jest.fn(async () => ({ id: 'LTX-2' })),
    getBalance: jest.fn(async () => ({ balance: 1000 })),
  };
  const service = new DistributionService(prisma as unknown as PrismaService, ledger as unknown as FinancialLedgerService, { recordActor: jest.fn() } as unknown as AuditService);
  return { service, state, ledger };
}

describe('DistributionService payouts', () => {
  it('reverses a failed payout only once, even when the provider later reports FAILED too', async () => {
    const { service, state, ledger } = setup('SUBMITTED');
    await service.failPayout(officer, 'PAY-OUT-1', 'Bank rejected the account');
    const webhook = await service.handleProviderWebhook('bank', 'EVT-1', 'PAY-OUT-1', 'payout.failed', 'FAILED', 'BANK-REF-1', { reason: 'rejected' });
    expect(ledger.reverseInTransaction).toHaveBeenCalledTimes(1);
    expect(webhook).toMatchObject({ applied: false, status: 'FAILED' });
    expect(state.status).toBe('FAILED');
  });

  it('never reverses a settled payout from a FAILED webhook; it is left for an operator', async () => {
    const { service, state, ledger } = setup('SETTLED');
    const webhook = await service.handleProviderWebhook('bank', 'EVT-2', 'PAY-OUT-1', 'payout.failed', 'FAILED', 'BANK-REF-1', { reason: 'returned' });
    expect(ledger.reverseInTransaction).not.toHaveBeenCalled();
    expect(webhook).toMatchObject({ applied: false, status: 'SETTLED' });
    expect(state.status).toBe('SETTLED');
  });

  it('posts the distribution again when a failed payout is retried', async () => {
    const { service, state, ledger } = setup('FAILED');
    await service.retryPayout(officer, 'PAY-OUT-1');
    expect(ledger.postInTransaction).toHaveBeenCalledWith(expect.anything(), officer, expect.objectContaining({
      idempotencyKey: 'payout-retry:PAY-OUT-1:LTX-1',
      entries: [expect.objectContaining({ accountId: 'USER-ACC', direction: 'DEBIT', amount: 100 }), expect.objectContaining({ accountId: 'POOL-ACC', direction: 'CREDIT', amount: 100 })],
    }));
    expect(state).toEqual({ status: 'QUEUED', ledgerTransactionId: 'LTX-2' });
  });

  it('reverses the re-posted entry, not the old one, when a retried payout fails again', async () => {
    const { service, ledger } = setup('FAILED');
    await service.retryPayout(officer, 'PAY-OUT-1');
    await service.failPayout(officer, 'PAY-OUT-1', 'Rejected again');
    expect(ledger.reverseInTransaction).toHaveBeenCalledWith(expect.anything(), officer, 'LTX-2', 'payout-failure:PAY-OUT-1:LTX-2', expect.any(String));
  });

  it('refuses to retry when the pool no longer has the money', async () => {
    const { service, ledger } = setup('FAILED');
    ledger.getBalance.mockResolvedValueOnce({ balance: 40 });
    await expect(service.retryPayout(officer, 'PAY-OUT-1')).rejects.toThrow(/enough balance/);
    expect(ledger.postInTransaction).not.toHaveBeenCalled();
  });
});
