import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentTransaction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { localPhoneDigits } from '../tenancy/country-phone';
import { assertTenantScope } from '../tenancy/tenant-scope';

type BillInput = {
  productType: string;
  productId: string;
  description: string;
  amountMYR: number;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
};

type PaymentHook = (payment: PaymentTransaction) => Promise<void>;

@Injectable()
export class ToyyibPayService {
  private readonly baseUrl = (process.env.TOYYIBPAY_BASE_URL || '').replace(/\/$/, '');
  private readonly secretKey = process.env.TOYYIBPAY_SECRET_KEY;
  private readonly categoryCode = process.env.TOYYIBPAY_CATEGORY_CODE;
  private readonly callbackUrl = process.env.TOYYIBPAY_CALLBACK_URL;

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  isConfigured() {
    return Boolean(this.baseUrl && this.secretKey && this.categoryCode && this.callbackUrl);
  }

  // hooks.onCreated runs once the local payment row exists (e.g. to hold AI credits);
  // hooks.onFailed runs exactly once if that payment later fails or is cancelled.
  async createBill(actor: AuthenticatedUser, input: BillInput, hooks: { onCreated?: (paymentId: string) => Promise<void>; onFailed?: PaymentHook } = {}) {
    if (!this.isConfigured()) throw new ServiceUnavailableException('ToyyibPay is not configured. Set TOYYIBPAY_BASE_URL, TOYYIBPAY_SECRET_KEY, TOYYIBPAY_CATEGORY_CODE and TOYYIBPAY_CALLBACK_URL.');
    if (input.amountMYR <= 0) throw new BadRequestException('Payment amount must be greater than zero.');
    const payment = await this.prisma.paymentTransaction.create({ data: { userId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, productType: input.productType, productId: input.productId, amountMYR: new Prisma.Decimal(input.amountMYR), metadata: (input.metadata || {}) as Prisma.InputJsonValue } });
    if (hooks.onCreated) {
      try {
        await hooks.onCreated(payment.id);
      } catch (error) {
        await this.markUnsuccessful(payment.id, 'CANCELLED', error instanceof Error ? error.message : 'Checkout could not be prepared.', hooks.onFailed);
        throw error;
      }
    }
    // ToyyibPay only accepts alphanumerics, spaces and underscores in bill name/description.
    const billText = (value: string, max: number) => value.replace(/[^A-Za-z0-9 _]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
    // The payer's phone from their profile (stored E.164); ToyyibPay requires a value, so fall back to zeros.
    const profile = (await this.prisma.user.findUnique({ where: { id: actor.userId }, select: { profile: true } }))?.profile as { phone?: unknown } | null;
    const billPhone = typeof profile?.phone === 'string' && profile.phone ? localPhoneDigits(profile.phone) : '0000000000';
    // billAmount is in sen (cents), not ringgit: RM 99.00 must be sent as "9900".
    const body = new URLSearchParams({ userSecretKey: this.secretKey!, categoryCode: this.categoryCode!, billName: billText(input.description, 30), billDescription: billText(input.description, 100), billPriceSetting: '1', billPayorInfo: '1', billAmount: String(Math.round(input.amountMYR * 100)), billReturnUrl: input.returnUrl || process.env.TOYYIBPAY_RETURN_URL || '', billCallbackUrl: this.callbackUrl!, billExternalReferenceNo: payment.id, billTo: actor.name.slice(0, 100), billEmail: actor.email, billPhone, billPaymentChannel: '0', billChargeToCustomer: '0' });
    const fail = async (reason: string) => {
      await this.markUnsuccessful(payment.id, 'FAILED', reason, hooks.onFailed);
      return new ServiceUnavailableException(reason);
    };
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/index.php/api/createBill`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    } catch {
      throw await fail('ToyyibPay could not be reached.');
    }
    if (!response.ok) throw await fail(`ToyyibPay createBill returned HTTP ${response.status}.`);
    // Success is [{ BillCode }]; errors come back as { status: 'error', msg } or a bare string.
    const raw = (await response.text()).trim();
    let result: unknown = raw;
    try { result = JSON.parse(raw); } catch { /* keep raw text */ }
    const billCode = Array.isArray(result) ? (result[0] as { BillCode?: string } | undefined)?.BillCode : undefined;
    if (!billCode) {
      const providerMessage = result && typeof result === 'object' && 'msg' in result ? String((result as { msg: unknown }).msg) : raw.slice(0, 200);
      throw await fail(`ToyyibPay rejected the bill: ${providerMessage || 'no bill code returned'}`);
    }
    const updated = await this.prisma.paymentTransaction.update({ where: { id: payment.id }, data: { providerBillCode: billCode, status: 'PENDING' } });
    await this.audit.recordActor(actor, { action: 'payment.toyyibpay.bill_created', resourceType: 'PaymentTransaction', resourceId: payment.id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { billCode, productType: input.productType, productId: input.productId, amountMYR: input.amountMYR } });
    return { paymentId: updated.id, status: updated.status, billCode, paymentUrl: `${this.baseUrl}/${billCode}` };
  }

  // The callback body is untrusted: it only identifies the payment, and the outcome is
  // always re-verified against ToyyibPay. `fulfil` runs in the same transaction that
  // marks the payment PAID, so a payment is fulfilled exactly once or not at all.
  async handleCallback(input: Record<string, unknown>, fulfil: (tx: Prisma.TransactionClient, payment: PaymentTransaction) => Promise<void>, onFailed?: PaymentHook) {
    const paymentId = String(input.order_id || input.billExternalReferenceNo || '');
    const billCode = String(input.billcode || input.billCode || '');
    if (!paymentId && !billCode) throw new BadRequestException('ToyyibPay callback is missing payment identifiers.');
    const payment = await this.prisma.paymentTransaction.findFirst({ where: paymentId ? { id: paymentId } : { providerBillCode: billCode } });
    if (!payment) throw new BadRequestException('Payment transaction not found.');
    if (payment.status === 'PAID') return { status: 'PAID', paymentId: payment.id, idempotent: true };
    const verification = await this.verifyBill(payment.providerBillCode || billCode);
    const verifiedStatus = verification.status;
    // ToyyibPay billpaymentStatus: 1 = successful, 3 = unsuccessful, anything else (2, 4, empty) is still pending.
    const status = verifiedStatus === '1' ? 'PAID' : verifiedStatus === '3' ? 'FAILED' : 'PENDING';
    if (status === 'PENDING') return { status: 'PENDING', paymentId: payment.id, idempotent: false };
    const callbackTransactionId = String(input.refno || input.transaction_id || '') || undefined;
    const providerTransactionId = verification.transactionId || callbackTransactionId;
    if (status === 'PAID') {
      if (verification.amountMYR !== undefined && Math.abs(verification.amountMYR - Number(payment.amountMYR)) > 0.01) throw new BadRequestException('ToyyibPay amount does not match the local payment.');
      if (verification.currency && verification.currency.toUpperCase() !== payment.currency.toUpperCase()) throw new BadRequestException('ToyyibPay currency does not match the local payment.');
      if (callbackTransactionId && verification.transactionId && callbackTransactionId !== verification.transactionId) throw new BadRequestException('ToyyibPay transaction reference does not match the provider response.');
      if (!providerTransactionId) throw new BadRequestException('ToyyibPay did not provide a payment transaction reference.');
    }
    if (status === 'FAILED') {
      await this.markUnsuccessful(payment.id, 'FAILED', String(input.reason || 'ToyyibPay payment was not successful.'), onFailed, providerTransactionId);
      return { status: 'FAILED', paymentId: payment.id, idempotent: false };
    }
    const claimed = await this.prisma.$transaction(async (tx) => {
      // Conditional update is the claim: concurrent callbacks see count 0 and skip fulfilment.
      const result = await tx.paymentTransaction.updateMany({ where: { id: payment.id, status: { not: 'PAID' } }, data: { status: 'PAID', providerTransactionId, paidAt: new Date(), failureReason: null } });
      if (result.count) await fulfil(tx, payment);
      return result.count === 1;
    });
    return { status: 'PAID', paymentId: payment.id, idempotent: !claimed };
  }

  // Marks an open payment FAILED/CANCELLED. The conditional update is the claim, so
  // onFailed (e.g. returning held credits) runs at most once per payment.
  private async markUnsuccessful(paymentId: string, status: 'FAILED' | 'CANCELLED', reason: string, onFailed?: PaymentHook, providerTransactionId?: string) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentTransaction.updateMany({ where: { id: paymentId, status: { in: ['INITIATED', 'PENDING'] } }, data: { status, failureReason: reason, providerTransactionId } });
      if (!claimed.count) return null;
      const updated = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: paymentId } });
      await this.audit.record({ userId: updated.userId, action: `payment.toyyibpay.${status.toLowerCase()}`, resourceType: 'PaymentTransaction', resourceId: updated.id, organisationId: updated.organisationId, countryNodeId: updated.countryNodeId, metadata: { productType: updated.productType, productId: updated.productId, reason, providerTransactionId: providerTransactionId || null } }, tx);
      return updated;
    });
    if (payment && onFailed) await onFailed(payment);
    return Boolean(payment);
  }

  cancel(paymentId: string, onFailed?: PaymentHook) {
    return this.markUnsuccessful(paymentId, 'CANCELLED', 'Cancelled by the member before payment.', onFailed);
  }

  async findForUser(actor: AuthenticatedUser, paymentId: string) {
    const payment = await this.prisma.paymentTransaction.findFirst({ where: { id: paymentId, userId: actor.userId } });
    if (!payment) throw new NotFoundException('Payment not found.');
    return payment;
  }

  async findForSettlement(actor: AuthenticatedUser, paymentId: string) {
    const payment = await this.prisma.paymentTransaction.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found.');
    assertTenantScope(actor, payment, 'Payment');
    return payment;
  }

  private async verifyBill(billCode: string): Promise<{ status: string; transactionId?: string; amountMYR?: number; currency?: string }> {
    if (!this.secretKey || !billCode) throw new ServiceUnavailableException('ToyyibPay verification is not configured.');
    const response = await fetch(`${this.baseUrl}/index.php/api/getBillTransactions`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ userSecretKey: this.secretKey, billCode }) });
    if (!response.ok) throw new ServiceUnavailableException('ToyyibPay verification failed.');
    const result = await response.json() as Array<Record<string, unknown>>;
    const latest = result[result.length - 1];
    const amountValue = latest?.billpaymentAmount ?? latest?.amount ?? latest?.billAmount;
    const parsedAmount = amountValue === undefined || amountValue === null || amountValue === '' ? undefined : Number(String(amountValue).replace(/[^0-9.-]/g, ''));
    const transactionId = String(latest?.billpaymentTransactionId || latest?.transaction_id || latest?.refno || latest?.billpaymentInvoiceNo || '') || undefined;
    const currency = String(latest?.currency || latest?.billpaymentCurrency || '') || undefined;
    return { status: String(latest?.billpaymentStatus || latest?.status || ''), transactionId, amountMYR: Number.isFinite(parsedAmount) ? parsedAmount : undefined, currency };
  }
}
