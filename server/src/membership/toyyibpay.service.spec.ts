import { BadRequestException } from '@nestjs/common';
import { PaymentTransaction } from '@prisma/client';
import { ToyyibPayService } from './toyyibpay.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const payment = (overrides: Partial<PaymentTransaction> = {}) => ({
  id: 'PAY-1', userId: 'USR-1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', productType: 'AI_CREDIT_TOP_UP', productId: 'topup_50',
  amountMYR: 25, currency: 'MYR', status: 'PENDING', providerBillCode: 'BILL-1', metadata: {}, ...overrides,
}) as unknown as PaymentTransaction;

/** ToyyibPay getBillTransactions response for a successfully paid bill. */
const paidBill = (overrides: Record<string, unknown> = {}) => [{ billpaymentStatus: '1', billpaymentAmount: '25.00', billpaymentInvoiceNo: 'TP-REF-1', billExternalReferenceNo: 'PAY-1', ...overrides }];

describe('ToyyibPayService.handleCallback', () => {
  const tx = { paymentTransaction: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
  const prisma = {
    paymentTransaction: { findFirst: jest.fn() },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const fulfil = jest.fn().mockResolvedValue(undefined);
  let service: ToyyibPayService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TOYYIBPAY_BASE_URL = 'https://dev.toyyibpay.test';
    process.env.TOYYIBPAY_SECRET_KEY = 'secret';
    service = new ToyyibPayService(prisma as unknown as PrismaService, { record: jest.fn() } as unknown as AuditService);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => paidBill() }) as unknown as typeof fetch;
  });

  it('fulfils a verified paid bill exactly once', async () => {
    prisma.paymentTransaction.findFirst.mockResolvedValue(payment());
    await expect(service.handleCallback({ order_id: 'PAY-1' }, fulfil)).resolves.toMatchObject({ status: 'PAID', idempotent: false });
    expect(fulfil).toHaveBeenCalledTimes(1);
    // The claim only moves open payments to PAID, never a final one.
    expect(tx.paymentTransaction.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'PAY-1', status: { in: ['INITIATED', 'PENDING', 'FAILED', 'CANCELLED'] } } }));
  });

  it('never fulfils a refunded payment again, even though ToyyibPay still reports the bill as paid', async () => {
    prisma.paymentTransaction.findFirst.mockResolvedValue(payment({ status: 'REFUNDED' }));
    await expect(service.handleCallback({ order_id: 'PAY-1' }, fulfil)).resolves.toMatchObject({ status: 'REFUNDED', idempotent: true });
    expect(fulfil).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('ignores a bill code from the callback that is not the payment\'s own bill', async () => {
    prisma.paymentTransaction.findFirst.mockResolvedValue(payment({ status: 'CANCELLED' }));
    await expect(service.handleCallback({ order_id: 'PAY-1', billcode: 'SOMEONE-ELSES-PAID-BILL' }, fulfil)).rejects.toBeInstanceOf(BadRequestException);
    expect(fulfil).not.toHaveBeenCalled();
  });

  it('refuses to verify a payment that never got a bill of its own', async () => {
    prisma.paymentTransaction.findFirst.mockResolvedValue(payment({ status: 'FAILED', providerBillCode: null }));
    await expect(service.handleCallback({ order_id: 'PAY-1', billcode: 'OTHER-BILL' }, fulfil)).rejects.toThrow(/no ToyyibPay bill/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a bill whose external reference belongs to another payment', async () => {
    prisma.paymentTransaction.findFirst.mockResolvedValue(payment());
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => paidBill({ billExternalReferenceNo: 'PAY-OTHER' }) }) as unknown as typeof fetch;
    await expect(service.handleCallback({ order_id: 'PAY-1' }, fulfil)).rejects.toThrow(/reference does not match/);
    expect(fulfil).not.toHaveBeenCalled();
  });
});
