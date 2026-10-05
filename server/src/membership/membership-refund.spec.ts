import { BadRequestException } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { ToyyibPayService } from './toyyibpay.service';
import { FinancialLedgerService } from '../financial/financial-ledger.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('./toyyibpay.service', () => ({ ToyyibPayService: class {} }));
jest.mock('../financial/financial-ledger.service', () => ({ FinancialLedgerService: class {}, toyyibPayCashAccount: (organisationId: string, countryNodeId: string, currency: string) => ({ accountCode: `GW-${organisationId}`, organisationId, countryNodeId, currency }) }));

const admin: AuthenticatedUser = { userId: 'USR-ADMIN', idpSubjectId: 'USR-ADMIN', email: 'admin@example.test', name: 'Admin', role: 'Super Admin', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Super Admin'] };

/** A RM 100 payment; `refunds` are the amounts already refunded. */
function setup(status: string, refunds: number[]) {
  const state = { status, refunds: [...refunds] };
  const tx = {
    $queryRaw: jest.fn(async () => []),
    paymentTransaction: {
      findUniqueOrThrow: jest.fn(async () => ({ status: state.status })),
      update: jest.fn(async ({ data }: { data: { status: string } }) => { state.status = data.status; return {}; }),
    },
    refund: { aggregate: jest.fn(async () => ({ _sum: { amount: state.refunds.reduce((sum, value) => sum + value, 0) }, _count: state.refunds.length })) },
  };
  const ledger = {
    ensureAccount: jest.fn(async (_actor: unknown, input: { accountCode: string }) => ({ id: input.accountCode })),
    recordRefundInTransaction: jest.fn(async (_tx: unknown, _actor: unknown, input: { amount: number }) => { state.refunds.push(input.amount); return { id: `REF-${state.refunds.length}` }; }),
  };
  const toyyibPay = { findForSettlement: jest.fn(async () => ({ id: 'PAY-1', userId: 'USR-1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', amountMYR: 100, currency: 'MYR', status: state.status, providerBillCode: 'BILL-1' })) };
  const prisma = { $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)) };
  const service = new MembershipService(prisma as unknown as PrismaService, { recordActor: jest.fn() } as unknown as AuditService, toyyibPay as unknown as ToyyibPayService, ledger as unknown as FinancialLedgerService);
  return { service, state, ledger };
}

describe('MembershipService.settleVerifiedRefund', () => {
  it('allows several partial refunds and marks the payment REFUNDED only when fully returned', async () => {
    const { service, state } = setup('PAID', []);
    await service.settleVerifiedRefund(admin, 'PAY-1', 30, 'Partial goodwill refund');
    expect(state.status).toBe('PARTIALLY_REFUNDED');
    await service.settleVerifiedRefund(admin, 'PAY-1', 30, 'Second partial refund');
    expect(state.status).toBe('PARTIALLY_REFUNDED');
    await service.settleVerifiedRefund(admin, 'PAY-1', 40, 'Remaining balance');
    expect(state.status).toBe('REFUNDED');
  });

  it('gives each refund its own ledger key, so two refunds of the same amount are both posted', async () => {
    const { service, ledger } = setup('PAID', []);
    await service.settleVerifiedRefund(admin, 'PAY-1', 30, 'First');
    await service.settleVerifiedRefund(admin, 'PAY-1', 30, 'Second');
    const keys = ledger.recordRefundInTransaction.mock.calls.map((call) => (call[2] as unknown as { posting: { idempotencyKey: string } }).posting.idempotencyKey);
    expect(keys).toEqual(['refund:PAY-1:1', 'refund:PAY-1:2']);
  });

  it('rejects a refund larger than what is left, checked inside the locked transaction', async () => {
    const { service, ledger } = setup('PARTIALLY_REFUNDED', [80]);
    await expect(service.settleVerifiedRefund(admin, 'PAY-1', 30, 'Too much')).rejects.toThrow(/remaining refundable amount \(20\.00 MYR\)/);
    expect(ledger.recordRefundInTransaction).not.toHaveBeenCalled();
  });

  it('does not refund a payment that is already fully refunded or was never paid', async () => {
    await expect(setup('REFUNDED', [100]).service.settleVerifiedRefund(admin, 'PAY-1', 10, 'Again')).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup('PENDING', []).service.settleVerifiedRefund(admin, 'PAY-1', 10, 'Unpaid')).rejects.toBeInstanceOf(BadRequestException);
  });
});
