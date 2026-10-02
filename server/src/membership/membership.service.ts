import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentTransaction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { UpgradeMembershipDto } from './membership.dto';
import { ToyyibPayService } from './toyyibpay.service';
import { formatLocalDateTime } from '../tenancy/country-time';
import { tenantScopeFilter } from '../tenancy/tenant-scope';
import { FinancialLedgerService } from '../financial/financial-ledger.service';

const AI_CAPABILITIES = ['SIMPLE_QUERY', 'PROJECT_SUMMARY', 'FULL_FEASIBILITY_ANALYSIS', 'INVESTMENT_ANALYSIS', 'RISK_ANALYSIS', 'CONTRACT_ANALYSIS', 'DUE_DILIGENCE', 'FULL_PROJECT_INTELLIGENCE'] as const;
const PLANS = [
  { id: 'plan_free', tier: 'FREE', name: 'Wealth Pooling Free', monthlyPriceMYR: 0, annualPriceMYR: 0, monthlyPriceUSD: 0, annualPriceUSD: 0, aiCreditsMonthly: 20, aiCapabilities: AI_CAPABILITIES, userSeats: 1, reportAccess: false, apiAccess: false },
  { id: 'plan_plus', tier: 'PLUS', name: 'Wealth Pooling Plus', monthlyPriceMYR: 39, annualPriceMYR: 390, monthlyPriceUSD: 9, annualPriceUSD: 90, aiCreditsMonthly: 100, aiCapabilities: AI_CAPABILITIES, userSeats: 3, reportAccess: true, apiAccess: false },
  { id: 'plan_pro', tier: 'PROFESSIONAL', name: 'Wealth Pooling Professional', monthlyPriceMYR: 149, annualPriceMYR: 1490, monthlyPriceUSD: 35, annualPriceUSD: 350, aiCreditsMonthly: 400, aiCapabilities: AI_CAPABILITIES, userSeats: 10, reportAccess: true, apiAccess: true },
  { id: 'plan_enterprise', tier: 'ENTERPRISE', name: 'Wealth Pooling Enterprise', monthlyPriceMYR: 999, annualPriceMYR: 9990, monthlyPriceUSD: 240, annualPriceUSD: 2400, aiCreditsMonthly: 2500, aiCapabilities: AI_CAPABILITIES, userSeats: 50, reportAccess: true, apiAccess: true },
] as const;

const CREDIT_PACKAGES = [
  { id: 'topup_50', credits: 50, bonusCredits: 0, priceMYR: 25 },
  { id: 'topup_250', credits: 250, bonusCredits: 25, priceMYR: 99 },
  { id: 'topup_1000', credits: 1000, bonusCredits: 150, priceMYR: 349 },
  { id: 'topup_3000', credits: 3000, bonusCredits: 600, priceMYR: 899 },
] as const;

const FALLBACK_PRICING: Record<string, { featureType: string; operationName: string; creditsRequired: number }> = { SIMPLE_QUERY: { featureType: 'AI_QUERY', operationName: 'AI Query', creditsRequired: 1 }, PROJECT_SUMMARY: { featureType: 'PROJECT', operationName: 'Project Summary', creditsRequired: 5 }, FULL_FEASIBILITY_ANALYSIS: { featureType: 'PROJECT_FEASIBILITY', operationName: 'Full Feasibility Analysis', creditsRequired: 20 }, INVESTMENT_ANALYSIS: { featureType: 'INVESTMENT', operationName: 'Investment Analysis', creditsRequired: 30 }, RISK_ANALYSIS: { featureType: 'RISK', operationName: 'Risk Analysis', creditsRequired: 15 }, CONTRACT_ANALYSIS: { featureType: 'CONTRACT', operationName: 'Contract Analysis', creditsRequired: 20 }, DUE_DILIGENCE: { featureType: 'DUE_DILIGENCE', operationName: 'Due Diligence', creditsRequired: 30 }, FULL_PROJECT_INTELLIGENCE: { featureType: 'PROJECT_INTELLIGENCE', operationName: 'Full Project Intelligence', creditsRequired: 100 } };

const DAY_MS = 24 * 60 * 60 * 1000;
// Paid plans keep working for this long after the period ends, then fall back to Free.
const GRACE_PERIOD_DAYS = 7;
// Members are warned this many days before the period ends.
const EXPIRY_WARNING_DAYS = 7;
const FREE_PERIOD_DAYS = 30;
// Free monthly AI credits are granted per cycle and expire at its end, for every plan
// (an annual plan gets a fresh allowance every cycle).
const ALLOWANCE_CYCLE_DAYS = 30;
// ToyyibPay passes its FPX fee to the payer (billChargeToCustomer=0); shown before checkout.
const TOYYIBPAY_FPX_FEE_MYR = 1;
const TOYYIBPAY_MINIMUM_MYR = 1;
// Value of one purchased AI credit when paying for membership. Kept below the cheapest
// pack price (RM 899 / 3,600 credits ≈ RM 0.25) so credits cannot be bought and redeemed at a profit.
const creditValueMYR = () => {
  const configured = Number(process.env.MEMBERSHIP_CREDIT_VALUE_MYR);
  return Number.isFinite(configured) && configured > 0 ? configured : 0.2;
};
const roundMYR = (value: number) => Math.round(value * 100) / 100;
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
const planOf = (planId: string) => PLANS.find((candidate) => candidate.id === planId) || PLANS[0];
const isPaidPlan = (planId: string) => planOf(planId).monthlyPriceMYR > 0;

type WalletBalances = { availableBalance: number; purchasedCredits: number; bonusCredits: number };
// The wallet keeps one spendable balance. The monthly allowance is spent first, so the
// purchased/bonus credits still on hand are whatever part of the balance they can cover.
export function remainingPaidCredits(wallet: WalletBalances) {
  const remaining = Math.max(0, Math.min(wallet.purchasedCredits + wallet.bonusCredits, wallet.availableBalance));
  const spent = wallet.purchasedCredits + wallet.bonusCredits - remaining;
  const bonus = Math.max(0, wallet.bonusCredits - spent);
  return { total: remaining, bonus, purchased: remaining - bonus };
}

// Spending order for AI usage: the free monthly allowance first, then bonus credits,
// then purchased credits. Returns the bucket values after spending `cost`.
export function allocateConsumption(wallet: WalletBalances, cost: number) {
  const paid = remainingPaidCredits(wallet);
  const allowanceLeft = Math.max(0, wallet.availableBalance - paid.total);
  const fromAllowance = Math.min(cost, allowanceLeft);
  const fromBonus = Math.min(cost - fromAllowance, paid.bonus);
  const fromPurchased = cost - fromAllowance - fromBonus;
  return { fromAllowance, fromBonus, fromPurchased, bonusCredits: paid.bonus - fromBonus, purchasedCredits: Math.max(0, paid.purchased - fromPurchased) };
}

// Free credits are granted in 30-day cycles and anything unused expires at the end of
// the cycle. A cycle never runs past the paid period, so no allowance is granted in grace.
export function nextAllowanceReset(from: Date, periodEnd: Date) {
  const next = addDays(from, ALLOWANCE_CYCLE_DAYS);
  return next < periodEnd ? next : periodEnd;
}

// Splits a plan price between purchased AI credits and cash. Any cash part must meet
// ToyyibPay's RM 1 minimum, so fewer credits are applied when needed.
export function splitMembershipPayment(priceMYR: number, requestedCredits: number, availableCredits: number, rate = creditValueMYR()) {
  let credits = Math.max(0, Math.min(Math.floor(requestedCredits || 0), availableCredits, Math.ceil(priceMYR / rate - 1e-9)));
  let cashMYR = roundMYR(Math.max(0, priceMYR - credits * rate));
  if (cashMYR > 0 && cashMYR < TOYYIBPAY_MINIMUM_MYR) {
    credits = Math.max(0, Math.floor((priceMYR - TOYYIBPAY_MINIMUM_MYR) / rate + 1e-9));
    cashMYR = roundMYR(priceMYR - credits * rate);
  }
  return { credits, creditValueMYR: roundMYR(priceMYR - cashMYR), cashMYR };
}

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly toyyibPay: ToyyibPayService,
    private readonly ledger: FinancialLedgerService,
  ) {}

  getPlans() {
    return PLANS;
  }

  async getCapabilityPricing() {
    const rows = await this.prisma.aiCapabilityPricing.findMany({ where: { enabled: true }, orderBy: { operationKey: 'asc' } });
    return rows.length ? rows : Object.entries(FALLBACK_PRICING).map(([operationKey, value]) => ({ operationKey, ...value, enabled: true }));
  }

  private async getPricing(operationKey: string) {
    const databasePricing = await this.prisma.aiCapabilityPricing.findUnique({ where: { operationKey } });
    const pricing = databasePricing || FALLBACK_PRICING[operationKey];
    if (!pricing || ('enabled' in pricing && !pricing.enabled)) throw new BadRequestException('This AI capability is currently unavailable.');
    return pricing;
  }

  private async getWallet(actor: AuthenticatedUser) {
    const subscription = await this.getCurrent(actor);
    const existing = await this.prisma.aiCreditWallet.findUnique({ where: { userId_organisationId: { userId: actor.userId, organisationId: actor.organisationId } } });
    if (existing && existing.subscriptionPlan !== subscription.tier) {
      // Self-heal wallets left on the old tier (earlier ToyyibPay upgrades did not update them).
      return this.prisma.$transaction((tx) => this.resetWalletAllowance(tx, actor.userId, actor.organisationId, planOf(subscription.planId), nextAllowanceReset(new Date(), subscription.currentPeriodEnd)));
    }
    if (existing && existing.resetDate <= new Date()) return this.rollAllowanceCycle(actor, subscription, existing);
    if (existing) return existing;
    const [purchased, used] = await Promise.all([
      this.prisma.aiCreditTransaction.aggregate({ _sum: { credits: true }, where: { userId: actor.userId, type: 'TOP_UP' } }),
      this.prisma.aiCreditTransaction.aggregate({ _sum: { credits: true }, where: { userId: actor.userId, type: 'CONSUMPTION', createdAt: { gte: subscription.currentPeriodStart } } }),
    ]);
    const purchasedCredits = purchased._sum.credits || 0;
    const usedCredits = Math.abs(used._sum.credits || 0);
    return this.prisma.aiCreditWallet.create({ data: { userId: actor.userId, organisationId: actor.organisationId, subscriptionPlan: subscription.tier, monthlyAllowance: subscription.aiCreditsTotal, purchasedCredits, bonusCredits: 0, usedCredits, availableBalance: subscription.aiCreditsTotal + purchasedCredits - usedCredits, resetDate: subscription.currentPeriodEnd } });
  }

  async getCurrent(actor: AuthenticatedUser) {
    const subscription = await this.prisma.membershipSubscription.findUnique({ where: { userId: actor.userId } });
    if (subscription) return this.applyLifecycle(actor, subscription);

    const free = PLANS[0];
    const now = new Date();
    const end = new Date(now);
    end.setUTCDate(end.getUTCDate() + 30);
    return this.prisma.membershipSubscription.create({
      data: {
        userId: actor.userId,
        planId: free.id,
        tier: free.tier,
        billingInterval: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: end,
        autoRenew: false,
        paymentMethodSummary: 'None (Free Plan)',
        aiCreditsRemaining: free.aiCreditsMonthly,
        aiCreditsTotal: free.aiCreditsMonthly,
      },
    });
  }

  // Lifecycle is evaluated on read, so no scheduler is needed for it to be accurate:
  // a paid plan past its period end stays usable for the grace period, then drops to Free;
  // a Free plan simply starts a new allowance period.
  private async applyLifecycle(actor: AuthenticatedUser, subscription: Prisma.MembershipSubscriptionGetPayload<object>) {
    const now = new Date();
    if (subscription.currentPeriodEnd > now) return subscription;
    const paid = isPaidPlan(subscription.planId);
    if (paid && addDays(subscription.currentPeriodEnd, GRACE_PERIOD_DAYS) > now) return subscription;
    const free = PLANS[0];
    const periodEnd = addDays(now, FREE_PERIOD_DAYS);
    const updated = await this.prisma.$transaction(async (tx) => {
      // Conditional on the period we evaluated, so concurrent reads apply the transition once.
      const claimed = await tx.membershipSubscription.updateMany({ where: { id: subscription.id, currentPeriodEnd: subscription.currentPeriodEnd }, data: { planId: free.id, tier: free.tier, billingInterval: 'monthly', status: 'Active', currentPeriodStart: now, currentPeriodEnd: periodEnd, autoRenew: false, paymentMethodSummary: 'None (Free Plan)', aiCreditsTotal: free.aiCreditsMonthly } });
      if (claimed.count) await this.resetWalletAllowance(tx, actor.userId, actor.organisationId, free, periodEnd);
      return { claimed: claimed.count === 1, subscription: await tx.membershipSubscription.findUniqueOrThrow({ where: { id: subscription.id } }) };
    });
    if (updated.claimed && paid) {
      await this.audit.recordActor(actor, { action: 'membership.expired', resourceType: 'MembershipSubscription', resourceId: subscription.id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { expiredPlanId: subscription.planId, periodEnd: subscription.currentPeriodEnd.toISOString(), graceDays: GRACE_PERIOD_DAYS } });
    }
    return updated.subscription;
  }

  async getMembershipStatus(actor: AuthenticatedUser) {
    const subscription = await this.getCurrent(actor);
    const wallet = await this.getWallet(actor);
    const plan = planOf(subscription.planId);
    const paid = plan.monthlyPriceMYR > 0;
    const now = Date.now();
    const periodEnd = subscription.currentPeriodEnd.getTime();
    const daysRemaining = Math.max(0, Math.ceil((periodEnd - now) / DAY_MS));
    const graceEndsAt = paid ? addDays(subscription.currentPeriodEnd, GRACE_PERIOD_DAYS) : null;
    const lifecycleStatus = !paid ? 'FREE' : now > periodEnd ? 'GRACE' : daysRemaining <= EXPIRY_WARNING_DAYS ? 'EXPIRING_SOON' : 'ACTIVE';
    const pendingPayments = await this.prisma.paymentTransaction.count({ where: { userId: actor.userId, productType: 'MEMBERSHIP', status: { in: ['INITIATED', 'PENDING'] } } });
    return {
      ...subscription,
      planName: plan.name,
      lifecycleStatus,
      daysRemaining,
      graceEndsAt,
      graceDays: GRACE_PERIOD_DAYS,
      // ToyyibPay bills are one-off, so paid plans are renewed manually.
      renewalMode: paid ? 'MANUAL' : 'NONE',
      autoRenew: false,
      redeemableCredits: remainingPaidCredits(wallet).total,
      creditValueMYR: creditValueMYR(),
      fpxFeeMYR: TOYYIBPAY_FPX_FEE_MYR,
      toyyibPayMinimumMYR: TOYYIBPAY_MINIMUM_MYR,
      pendingMembershipPayments: pendingPayments,
    };
  }

  // The free-credit cycle ended: expire what is left of it and grant the next cycle's
  // allowance. Paid plans in grace get nothing until renewed; lifecycle then moves them to Free.
  private async rollAllowanceCycle(actor: AuthenticatedUser, subscription: Prisma.MembershipSubscriptionGetPayload<object>, wallet: Prisma.AiCreditWalletGetPayload<object>) {
    const now = new Date();
    const plan = planOf(subscription.planId);
    const inGrace = isPaidPlan(plan.id) && subscription.currentPeriodEnd <= now;
    let expiresAt = wallet.resetDate;
    // Skip whole cycles missed while the member was away; their credits would have expired anyway.
    while (expiresAt <= now) expiresAt = addDays(expiresAt, ALLOWANCE_CYCLE_DAYS);
    if (inGrace) expiresAt = addDays(subscription.currentPeriodEnd, GRACE_PERIOD_DAYS);
    else if (expiresAt > subscription.currentPeriodEnd) expiresAt = subscription.currentPeriodEnd;
    return this.prisma.$transaction(async (tx) => {
      // Lock the wallet and re-check the cycle so concurrent requests roll it only once.
      await tx.$queryRaw`SELECT id FROM "AiCreditWallet" WHERE id = ${wallet.id} FOR UPDATE`;
      const current = await tx.aiCreditWallet.findUniqueOrThrow({ where: { id: wallet.id } });
      if (current.resetDate.getTime() !== wallet.resetDate.getTime()) return current;
      const expired = Math.max(0, current.availableBalance - remainingPaidCredits(current).total);
      const result = await this.resetWalletAllowance(tx, actor.userId, actor.organisationId, plan, expiresAt, inGrace ? 0 : plan.aiCreditsMonthly);
      if (expired) {
        await tx.aiCreditTransaction.create({ data: { userId: actor.userId, subscriptionId: subscription.id, type: 'EXPIRY', operationKey: 'MONTHLY_ALLOWANCE', credits: -expired, balanceBefore: current.availableBalance, balanceAfter: current.availableBalance - expired, reference: `ALLOWANCE-EXPIRY-${current.resetDate.toISOString().slice(0, 10)}` } });
      }
      return result;
    });
  }

  // Starts a new free-credit cycle: unused allowance from the previous cycle expires and
  // `grant` fresh credits are added (0 during grace). Purchased/bonus credits never expire.
  private async resetWalletAllowance(tx: Prisma.TransactionClient, userId: string, organisationId: string, plan: (typeof PLANS)[number], allowanceExpiresAt: Date, grant: number = plan.aiCreditsMonthly) {
    const wallet = await tx.aiCreditWallet.findUnique({ where: { userId_organisationId: { userId, organisationId } } });
    const paid = wallet ? remainingPaidCredits(wallet) : { total: 0, bonus: 0, purchased: 0 };
    const data = { subscriptionPlan: plan.tier, monthlyAllowance: plan.aiCreditsMonthly, purchasedCredits: paid.purchased, bonusCredits: paid.bonus, usedCredits: 0, availableBalance: grant + paid.total, resetDate: allowanceExpiresAt };
    const result = wallet
      ? await tx.aiCreditWallet.update({ where: { id: wallet.id }, data })
      : await tx.aiCreditWallet.create({ data: { userId, organisationId, ...data } });
    await tx.membershipSubscription.updateMany({ where: { userId }, data: { aiCreditsRemaining: result.availableBalance, aiCreditsTotal: plan.aiCreditsMonthly } });
    return result;
  }

  // Activates or renews a plan. Renewing the same plan and interval (while active or in
  // grace) extends from the current period end, so renewing early loses no days.
  private async activatePlan(tx: Prisma.TransactionClient, userId: string, organisationId: string, plan: (typeof PLANS)[number], interval: 'monthly' | 'annual', billing: { invoiceNumber: string; amountMYR: number | Prisma.Decimal; amountUSD: number | Prisma.Decimal; paymentMethod: string }) {
    const existing = await tx.membershipSubscription.findUnique({ where: { userId } });
    const now = new Date();
    const renewing = Boolean(existing && existing.planId === plan.id && existing.billingInterval === interval && addDays(existing.currentPeriodEnd, GRACE_PERIOD_DAYS) > now);
    const periodStart = renewing && existing ? existing.currentPeriodStart : now;
    const periodEnd = addDays(renewing && existing ? existing.currentPeriodEnd : now, interval === 'monthly' ? 30 : 365);
    const fields = { planId: plan.id, tier: plan.tier, billingInterval: interval, status: 'Active', currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, autoRenew: false, paymentMethodSummary: billing.paymentMethod, aiCreditsRemaining: plan.aiCreditsMonthly, aiCreditsTotal: plan.aiCreditsMonthly };
    const subscription = await tx.membershipSubscription.upsert({ where: { userId }, update: fields, create: { userId, ...fields } });
    await tx.membershipBillingRecord.create({ data: { userId, invoiceNumber: billing.invoiceNumber, planId: plan.id, billingInterval: interval, amountMYR: new Prisma.Decimal(billing.amountMYR), amountUSD: new Prisma.Decimal(billing.amountUSD), status: 'Paid', paymentMethod: billing.paymentMethod } });
    await this.resetWalletAllowance(tx, userId, organisationId, plan, nextAllowanceReset(now, periodEnd));
    return { subscription, renewed: renewing };
  }

  // Spends purchased/bonus credits (bonus first) towards a membership payment.
  private async redeemCredits(tx: Prisma.TransactionClient, userId: string, organisationId: string, credits: number, valueMYR: number, reference: string, planId: string) {
    const wallet = await tx.aiCreditWallet.findUniqueOrThrow({ where: { userId_organisationId: { userId, organisationId } } });
    const paid = remainingPaidCredits(wallet);
    if (paid.total < credits) throw new BadRequestException(`Only ${paid.total} purchased AI credits are available to apply.`);
    const fromBonus = Math.min(paid.bonus, credits);
    const updated = await tx.aiCreditWallet.updateMany({ where: { id: wallet.id, availableBalance: { gte: credits } }, data: { availableBalance: { decrement: credits }, bonusCredits: paid.bonus - fromBonus, purchasedCredits: paid.purchased - (credits - fromBonus) } });
    if (!updated.count) throw new BadRequestException('Your AI credit balance changed; please try again.');
    const subscription = await tx.membershipSubscription.findUniqueOrThrow({ where: { userId } });
    await tx.aiCreditTransaction.create({ data: { userId, subscriptionId: subscription.id, type: 'REDEMPTION', operationKey: 'MEMBERSHIP_PAYMENT', targetEntity: planId, credits: -credits, balanceBefore: wallet.availableBalance, balanceAfter: wallet.availableBalance - credits, amountMYR: new Prisma.Decimal(valueMYR), paymentMethod: 'AI credits', reference } });
  }

  // Returns credits held for a membership payment that failed or was cancelled.
  private async refundCredits(tx: Prisma.TransactionClient, userId: string, organisationId: string, credits: number, reference: string) {
    const wallet = await tx.aiCreditWallet.update({ where: { userId_organisationId: { userId, organisationId } }, data: { availableBalance: { increment: credits }, purchasedCredits: { increment: credits } } });
    const subscription = await tx.membershipSubscription.findUniqueOrThrow({ where: { userId } });
    await tx.membershipSubscription.update({ where: { id: subscription.id }, data: { aiCreditsRemaining: wallet.availableBalance } });
    await tx.aiCreditTransaction.create({ data: { userId, subscriptionId: subscription.id, type: 'REFUND', operationKey: 'MEMBERSHIP_PAYMENT', credits, balanceBefore: wallet.availableBalance - credits, balanceAfter: wallet.availableBalance, paymentMethod: 'AI credits', reference } });
  }


  async upgrade(actor: AuthenticatedUser, input: UpgradeMembershipDto) {
    const plan = PLANS.find((candidate) => candidate.id === input.planId);
    if (!plan) throw new BadRequestException('Unknown membership plan');

    const priceMYR = input.billingInterval === 'monthly' ? plan.monthlyPriceMYR : plan.annualPriceMYR;
    const amountUSD = input.billingInterval === 'monthly' ? plan.monthlyPriceUSD : plan.annualPriceUSD;
    const invoiceNumber = `HOW-INV-${actor.userId.replace(/[^A-Za-z0-9]/g, '')}-${Date.now()}`;
    const wallet = await this.getWallet(actor);
    const split = splitMembershipPayment(priceMYR, input.creditsToApply || 0, remainingPaidCredits(wallet).total);
    const creditLabel = split.credits ? ` + ${split.credits} AI credits` : '';

    // Fully covered by purchased AI credits: no gateway involved.
    if (split.cashMYR === 0) {
      const result = await this.prisma.$transaction(async (tx) => {
        if (split.credits) await this.redeemCredits(tx, actor.userId, actor.organisationId, split.credits, split.creditValueMYR, invoiceNumber, plan.id);
        return this.activatePlan(tx, actor.userId, actor.organisationId, plan, input.billingInterval, { invoiceNumber, amountMYR: priceMYR, amountUSD, paymentMethod: split.credits ? `${split.credits} AI credits` : 'None (Free Plan)' });
      });
      await this.audit.recordActor(actor, { action: result.renewed ? 'membership.renew' : 'membership.upgrade', resourceType: 'MembershipSubscription', resourceId: result.subscription.id, countryNodeId: actor.countryNodeId, organisationId: actor.organisationId, metadata: { planId: plan.id, billingInterval: input.billingInterval, invoiceNumber, creditsApplied: split.credits, creditValueMYR: split.creditValueMYR, cashMYR: 0 } });
      return result.subscription;
    }

    if (input.paymentMethod.toUpperCase() === 'TOYYIBPAY') {
      const metadata = { planId: plan.id, billingInterval: input.billingInterval, amountUSD, invoiceNumber, planPriceMYR: priceMYR, creditsApplied: split.credits, creditValueMYR: split.creditValueMYR, fpxFeeMYR: TOYYIBPAY_FPX_FEE_MYR };
      // Credits are held when the bill is created and returned if the payment fails or is cancelled.
      return this.toyyibPay.createBill(actor, { productType: 'MEMBERSHIP', productId: plan.id, description: `${plan.name} ${input.billingInterval}`, amountMYR: split.cashMYR, metadata }, {
        onCreated: split.credits ? (paymentId) => this.prisma.$transaction((tx) => this.redeemCredits(tx, actor.userId, actor.organisationId, split.credits, split.creditValueMYR, `TOYYIBPAY-${paymentId}`, plan.id)) : undefined,
        onFailed: split.credits ? (payment) => this.releaseCreditHold(payment) : undefined,
      });
    }

    this.assertSimulatedPaymentAllowed();
    const result = await this.prisma.$transaction(async (tx) => {
      if (split.credits) await this.redeemCredits(tx, actor.userId, actor.organisationId, split.credits, split.creditValueMYR, invoiceNumber, plan.id);
      return this.activatePlan(tx, actor.userId, actor.organisationId, plan, input.billingInterval, { invoiceNumber, amountMYR: priceMYR, amountUSD, paymentMethod: `${input.paymentMethod}${creditLabel}` });
    });
    await this.audit.recordActor(actor, { action: result.renewed ? 'membership.renew' : 'membership.upgrade', resourceType: 'MembershipSubscription', resourceId: result.subscription.id, countryNodeId: actor.countryNodeId, organisationId: actor.organisationId, metadata: { planId: plan.id, billingInterval: input.billingInterval, invoiceNumber, creditsApplied: split.credits, creditValueMYR: split.creditValueMYR, cashMYR: split.cashMYR } });
    return result.subscription;
  }

  private async releaseCreditHold(payment: PaymentTransaction) {
    const metadata = (payment.metadata || {}) as Record<string, unknown>;
    const credits = Number(metadata.creditsApplied || 0);
    if (!credits) return;
    await this.prisma.$transaction((tx) => this.refundCredits(tx, payment.userId, payment.organisationId, credits, `TOYYIBPAY-${payment.id}`));
  }

  // Cancels an unpaid checkout and returns any held credits. Checks ToyyibPay first so a
  // bill that was actually paid is settled instead of cancelled.
  async cancelToyyibPayPayment(actor: AuthenticatedUser, paymentId: string) {
    const payment = await this.toyyibPay.findForUser(actor, paymentId);
    if (payment.providerBillCode) {
      const verified = await this.handleToyyibPayCallback({ order_id: payment.id });
      if (verified.status === 'PAID' || verified.status === 'FAILED') return verified;
    }
    const cancelled = await this.toyyibPay.cancel(payment.id, (cancelledPayment) => this.releaseCreditHold(cancelledPayment));
    return { status: cancelled ? 'CANCELLED' : payment.status, paymentId: payment.id };
  }

  async billing(actor: AuthenticatedUser) {
    return this.prisma.membershipBillingRecord.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCreditSummary(actor: AuthenticatedUser) {
    const wallet = await this.getWallet(actor);
    const paid = remainingPaidCredits(wallet);
    return {
      userId: wallet.userId,
      monthlyAllowance: wallet.monthlyAllowance,
      purchasedCredits: paid.purchased,
      bonusCredits: paid.bonus,
      usedCredits: wallet.usedCredits,
      availableBalance: wallet.availableBalance,
      // Compatibility aliases for existing clients; wallet fields above are authoritative.
      remainingCredits: wallet.availableBalance,
      usedThisMonth: wallet.usedCredits,
      // Purchased + bonus credits still on hand (they never expire), and what is left of
      // the free allowance for this cycle (expires at resetDate, spent first).
      additionalCredits: paid.total,
      allowanceRemaining: Math.max(0, wallet.availableBalance - paid.total),
      totalPoolCredits: wallet.monthlyAllowance + paid.total,
      resetDate: wallet.resetDate,
      userTier: wallet.subscriptionPlan,
    };
  }

  async getCreditUsage(actor: AuthenticatedUser) {
    return this.prisma.aiCreditTransaction.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  private assertSimulatedPaymentAllowed() {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SIMULATED_PAYMENTS !== 'true') {
      throw new BadRequestException('Simulated payments are disabled. Pay with ToyyibPay (paymentMethod "TOYYIBPAY").');
    }
  }

  async getTransactions(actor: AuthenticatedUser) {
    const [billing, credits, promotions, payments] = await Promise.all([
      this.prisma.membershipBillingRecord.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiCreditTransaction.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.promotionPayment.findMany({ where: { userId: actor.userId }, include: { campaign: { include: { project: { select: { projectName: true } } } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.paymentTransaction.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: 'desc' } }),
    ]);
    // A settled ToyyibPay payment already appears as its billing record / credit top-up,
    // so it only contributes gateway references. Unsettled ones (initiated, pending,
    // failed) get their own rows so every checkout attempt is visible.
    const gateway = (payment: (typeof payments)[number]) => ({ paymentId: payment.id, gatewayBillCode: payment.providerBillCode, gatewayTransactionId: payment.providerTransactionId, failureReason: payment.failureReason });
    const paymentById = new Map(payments.map((payment) => [payment.id, payment]));
    const paymentByInvoice = new Map(payments.flatMap((payment) => { const invoice = (payment.metadata as Record<string, unknown> | null)?.invoiceNumber; return typeof invoice === 'string' ? [[invoice, payment] as const] : []; }));
    return [
      ...billing.map((item) => { const payment = paymentByInvoice.get(item.invoiceNumber); return { id: item.id, type: 'MEMBERSHIP', description: `${item.planId} membership`, status: item.status, amountMYR: Number(item.amountMYR), amountUSD: Number(item.amountUSD), credits: 0, method: item.paymentMethod, invoiceNumber: item.invoiceNumber, createdAt: item.createdAt, receiptAvailable: true, ...(payment ? gateway(payment) : {}) }; }),
      ...credits.map((item) => { const payment = item.reference?.startsWith('TOYYIBPAY-') ? paymentById.get(item.reference.slice('TOYYIBPAY-'.length)) : undefined; const description = item.type === 'TOP_UP' ? 'AI credit top-up' : item.type === 'REDEMPTION' ? `AI credits applied to ${planOf(item.targetEntity || '').name} (worth RM ${Number(item.amountMYR || 0).toFixed(2)})` : item.type === 'REFUND' ? 'AI credits returned (membership payment not completed)' : item.type === 'EXPIRY' ? 'Unused free monthly AI credits expired' : `AI usage: ${item.operationKey || 'AI operation'}`; return { id: item.id, type: item.type === 'TOP_UP' ? 'AI_CREDIT_TOP_UP' : 'AI_CREDIT_USAGE', description, status: item.type === 'REFUND' ? 'REFUNDED' : item.type === 'EXPIRY' ? 'EXPIRED' : 'PAID', amountMYR: item.type === 'TOP_UP' ? Number(item.amountMYR || 0) : 0, amountUSD: 0, credits: item.credits, method: item.paymentMethod || 'Platform credits', invoiceNumber: item.reference, createdAt: item.createdAt, receiptAvailable: item.type === 'TOP_UP', ...(payment ? gateway(payment) : {}) }; }),
      ...payments.filter((payment) => payment.status !== 'PAID').map((payment) => { const metadata = (payment.metadata || {}) as Record<string, unknown>; const isMembership = payment.productType === 'MEMBERSHIP'; return { id: payment.id, type: isMembership ? 'MEMBERSHIP' : 'AI_CREDIT_TOP_UP', description: isMembership ? `${planOf(payment.productId).name} (${String(metadata.billingInterval || 'monthly')})${Number(metadata.creditsApplied || 0) ? ` • ${Number(metadata.creditsApplied)} AI credits applied` : ''}` : 'AI credit top-up', fpxFeeMYR: Number(metadata.fpxFeeMYR || 0) || undefined, status: payment.status, amountMYR: Number(payment.amountMYR), amountUSD: 0, credits: isMembership ? 0 : Number(metadata.credits || 0) + Number(metadata.bonusCredits || 0), method: 'ToyyibPay', invoiceNumber: payment.providerBillCode, createdAt: payment.createdAt, receiptAvailable: false, ...gateway(payment) }; }),
      ...promotions.map((item) => ({ id: item.id, type: 'PROJECT_PROMOTION', description: `${item.campaign.packageName} • ${item.campaign.project.projectName}`, status: item.status, amountMYR: Number(item.amountMYR), amountUSD: 0, credits: item.creditsCost ? -item.creditsCost : 0, method: item.method, invoiceNumber: `HOW-PROMO-${item.id.slice(-10).toUpperCase()}`, createdAt: item.createdAt, receiptAvailable: item.status === 'PAID', projectId: item.campaign.projectId, campaignId: item.campaignId })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getTransactionReceipt(actor: AuthenticatedUser, id: string) {
    const transactions = await this.getTransactions(actor);
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction || !transaction.receiptAvailable) throw new BadRequestException('Receipt is not available for this transaction.');
    const receiptNumber = transaction.invoiceNumber || `HOW-TXN-${id.slice(-10).toUpperCase()}`;
    return { receiptNumber, content: ['WEALTH POOLING PAYMENT RECEIPT', `Receipt: ${receiptNumber}`, `Description: ${transaction.description}`, `Amount: MYR ${transaction.amountMYR.toFixed(2)}`, `Payment method: ${transaction.method}`, `Status: ${transaction.status}`, `Date: ${formatLocalDateTime(transaction.createdAt, actor.countryNodeId)}`, '', 'This receipt is system-generated and does not constitute investment advice.'].join('\n') };
  }

  /**
   * Checks plan entitlement and balance without charging, so callers can bill
   * only after the AI work succeeds. consumeCredits re-checks atomically.
   */
  async assertCanConsume(actor: AuthenticatedUser, operationKey: string) {
    const pricing = await this.getPricing(operationKey);
    const wallet = await this.getWallet(actor);
    const plan = PLANS.find((candidate) => candidate.tier === wallet.subscriptionPlan) || PLANS[0];
    if (!plan.aiCapabilities.includes(operationKey as (typeof AI_CAPABILITIES)[number])) throw new BadRequestException('This AI capability is not included in the current subscription plan. Please upgrade plan or purchase credits.');
    if (wallet.availableBalance < pricing.creditsRequired) throw new BadRequestException('Insufficient AI Credits. Please upgrade plan or purchase credits.');
    return { pricing, wallet };
  }

  /** With `client`, charges inside the caller's transaction and leaves the audit entry to the caller (recordCreditAudit). */
  async consumeCredits(actor: AuthenticatedUser, operationKey: string, targetEntity?: string, client?: Prisma.TransactionClient) {
    const { pricing, wallet } = await this.assertCanConsume(actor, operationKey);
    const cost = pricing.creditsRequired;
    const charge = async (tx: Prisma.TransactionClient) => {
      // Lock the wallet so the free → bonus → purchased split is computed on current balances.
      await tx.$queryRaw`SELECT id FROM "AiCreditWallet" WHERE id = ${wallet.id} FOR UPDATE`;
      const before = await tx.aiCreditWallet.findUniqueOrThrow({ where: { id: wallet.id } });
      if (before.availableBalance < cost) throw new BadRequestException('Insufficient AI Credits. Please upgrade plan or purchase credits.');
      const spend = allocateConsumption(before, cost);
      const current = await tx.aiCreditWallet.update({ where: { id: wallet.id }, data: { availableBalance: { decrement: cost }, usedCredits: { increment: cost }, bonusCredits: spend.bonusCredits, purchasedCredits: spend.purchasedCredits } });
      const subscription = await tx.membershipSubscription.findUniqueOrThrow({ where: { userId: actor.userId } });
      await tx.membershipSubscription.update({ where: { id: subscription.id }, data: { aiCreditsRemaining: current.availableBalance } });
      const legacy = await tx.aiCreditTransaction.create({ data: { userId: actor.userId, subscriptionId: subscription.id, type: 'CONSUMPTION', operationKey, targetEntity, credits: -cost, balanceBefore: current.availableBalance + cost, balanceAfter: current.availableBalance } });
      const usage = await tx.aiUsageTransaction.create({ data: { userId: actor.userId, organisationId: actor.organisationId, featureType: pricing.featureType, operationName: pricing.operationName, creditsConsumed: cost, projectId: targetEntity?.startsWith('PROJ-') ? targetEntity : null, status: 'COMPLETED' } });
      return { ...legacy, usageTransactionId: usage.id, operationName: pricing.operationName, cost };
    };
    if (client) return charge(client);
    const result = await this.prisma.$transaction(charge);
    await this.recordCreditAudit(actor, operationKey, result, targetEntity);
    return result;
  }

  recordCreditAudit(actor: AuthenticatedUser, operationKey: string, result: { usageTransactionId: string; operationName: string; cost: number }, targetEntity?: string) {
    return this.audit.recordActor(actor, { action: 'ai.credits.consume', resourceType: 'AiUsageTransaction', resourceId: result.usageTransactionId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { operationKey, operationName: result.operationName, cost: result.cost, targetEntity } });
  }

  async topUpCredits(actor: AuthenticatedUser, packageId: string, paymentMethod: string) {
    const pkg = CREDIT_PACKAGES.find((candidate) => candidate.id === packageId);
    if (!pkg) throw new BadRequestException('Unknown AI credit package');
    if (paymentMethod.toUpperCase() === 'TOYYIBPAY') {
      return this.toyyibPay.createBill(actor, { productType: 'AI_CREDIT_TOP_UP', productId: pkg.id, description: `AI Credits ${pkg.credits + pkg.bonusCredits}`, amountMYR: pkg.priceMYR, metadata: { packageId: pkg.id, credits: pkg.credits, bonusCredits: pkg.bonusCredits } });
    }
    this.assertSimulatedPaymentAllowed();
    const subscription = await this.getCurrent(actor);
    const wallet = await this.getWallet(actor);
    const credits = pkg.credits + pkg.bonusCredits;
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.membershipSubscription.findUniqueOrThrow({ where: { id: subscription.id } });
      const updatedWallet = await tx.aiCreditWallet.update({ where: { id: wallet.id }, data: { purchasedCredits: { increment: pkg.credits }, bonusCredits: { increment: pkg.bonusCredits }, availableBalance: { increment: credits } } });
      const updated = await tx.membershipSubscription.update({ where: { id: subscription.id }, data: { aiCreditsRemaining: updatedWallet.availableBalance } });
      return tx.aiCreditTransaction.create({ data: { userId: actor.userId, subscriptionId: subscription.id, type: 'TOP_UP', credits, balanceBefore: current.aiCreditsRemaining, balanceAfter: updated.aiCreditsRemaining, amountMYR: new Prisma.Decimal(pkg.priceMYR), paymentMethod, reference: `AI-TOPUP-${Date.now()}` } });
    });
    await this.audit.recordActor(actor, { action: 'ai.credits.top_up', resourceType: 'AiCreditTransaction', resourceId: result.id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { packageId, credits, paymentMethod } });
    return { transaction: result, balance: await this.getCreditSummary(actor) };
  }

  async handleToyyibPayCallback(input: Record<string, unknown>) {
    const result = await this.toyyibPay.handleCallback(input, (tx, payment) => this.fulfilToyyibPayPayment(tx, payment), (payment) => this.releaseCreditHold(payment));
    return result;
  }

  async reconcileOpenPayments(actor: AuthenticatedUser, limit = 100) {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 500);
    const payments = await this.prisma.paymentTransaction.findMany({ where: { ...tenantScopeFilter(actor), provider: 'TOYYIBPAY', status: { in: ['INITIATED', 'PENDING'] }, createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } }, orderBy: { createdAt: 'asc' }, take: safeLimit });
    const results: Array<{ paymentId: string; status: string; error?: string }> = [];
    for (const payment of payments) {
      try {
        const result = await this.handleToyyibPayCallback({ order_id: payment.id });
        results.push({ paymentId: payment.id, status: result.status });
      } catch (error) {
        results.push({ paymentId: payment.id, status: 'ERROR', error: error instanceof Error ? error.message : String(error) });
      }
    }
    await this.audit.recordActor(actor, { action: 'payment.toyyibpay.reconciliation_run', resourceType: 'PaymentTransaction', resourceId: actor.organisationId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { inspected: payments.length, results } });
    return { inspected: payments.length, results };
  }

  // Called from the return page so payment completes even when ToyyibPay's server
  // callback cannot reach this API (e.g. local development without a tunnel).
  async verifyToyyibPayPayment(actor: AuthenticatedUser, paymentId: string) {
    const payment = await this.toyyibPay.findForUser(actor, paymentId);
    const result = await this.handleToyyibPayCallback({ order_id: payment.id });
    return { ...result, productType: payment.productType };
  }

  async settleVerifiedRefund(actor: AuthenticatedUser, paymentId: string, amount: number, reason: string) {
    const payment = await this.toyyibPay.findForSettlement(actor, paymentId);
    if (payment.status !== 'PAID') throw new BadRequestException('Only a PAID payment can be refunded.');
    const refunded = await this.prisma.refund.aggregate({ _sum: { amount: true }, where: { paymentTransactionId: payment.id, status: 'POSTED' } });
    if (Number(refunded._sum.amount || 0) + amount > Number(payment.amountMYR)) throw new BadRequestException('Refund amount exceeds the paid amount.');
    const gateway = await this.ledger.ensureAccount(actor, { accountCode: `SYSTEM-TOYYIBPAY-CASH-${payment.currency}`, accountType: 'ASSET', ownerType: 'SYSTEM', ownerId: 'TOYYIBPAY', organisationId: payment.organisationId, countryNodeId: payment.countryNodeId, currency: payment.currency });
    const refundExpense = await this.ledger.ensureAccount(actor, { accountCode: `ORG-${payment.organisationId}-REFUND-EXPENSE-${payment.currency}`, accountType: 'EXPENSE', ownerType: 'ORGANISATION', ownerId: payment.organisationId, organisationId: payment.organisationId, countryNodeId: payment.countryNodeId, currency: payment.currency });
    return this.prisma.$transaction(async (tx) => {
      const refund = await this.ledger.recordRefundInTransaction(tx, actor, { paymentTransactionId: payment.id, userId: payment.userId, organisationId: payment.organisationId, countryNodeId: payment.countryNodeId, amount, currency: payment.currency, reason, posting: { transactionType: 'REFUND', referenceType: 'PaymentTransaction', referenceId: payment.id, currency: payment.currency, description: `Verified ToyyibPay refund for ${payment.id}`, idempotencyKey: `refund:${payment.id}:${amount.toFixed(2)}`, entries: [{ accountId: refundExpense.id, direction: 'DEBIT', amount, description: 'Refund expense' }, { accountId: gateway.id, direction: 'CREDIT', amount, description: 'Cash returned through ToyyibPay' }] } });
      await tx.paymentTransaction.update({ where: { id: payment.id }, data: { status: 'REFUNDED', failureReason: reason } });
      await this.audit.recordActor(actor, { action: 'payment.toyyibpay.refund_settled', resourceType: 'Refund', resourceId: refund.id, organisationId: payment.organisationId, countryNodeId: payment.countryNodeId, metadata: { paymentId: payment.id, amount, reason, providerBillCode: payment.providerBillCode } }, tx);
      return refund;
    });
  }

  private async fulfilToyyibPayPayment(tx: Prisma.TransactionClient, payment: PaymentTransaction) {
    const metadata = (payment.metadata || {}) as Record<string, unknown>;
    const settlementActor: AuthenticatedUser = { userId: payment.userId, idpSubjectId: payment.userId, email: `${payment.userId}@internal`, name: 'Payment Settlement', role: 'Guest', countryNodeId: payment.countryNodeId, organisationId: payment.organisationId, assignedRoles: ['Guest'] };
    if (payment.productType !== 'ZAKAT_PAYMENT') {
      const gateway = await this.ledger.ensureAccountInTransaction(tx, settlementActor, { accountCode: `SYSTEM-TOYYIBPAY-CASH-${payment.currency}`, accountType: 'ASSET', ownerType: 'SYSTEM', ownerId: 'TOYYIBPAY', organisationId: payment.organisationId, countryNodeId: payment.countryNodeId, currency: payment.currency });
      const revenue = await this.ledger.ensureAccountInTransaction(tx, settlementActor, { accountCode: `ORG-${payment.organisationId}-PAYMENT-REVENUE-${payment.currency}`, accountType: 'REVENUE', ownerType: 'ORGANISATION', ownerId: payment.organisationId, organisationId: payment.organisationId, countryNodeId: payment.countryNodeId, currency: payment.currency });
      await this.ledger.postInTransaction(tx, settlementActor, { transactionType: 'PAYMENT_RECEIPT', referenceType: 'PaymentTransaction', referenceId: payment.id, currency: payment.currency, description: `ToyyibPay receipt for ${payment.productType}`, idempotencyKey: `payment-receipt:${payment.id}`, entries: [{ accountId: gateway.id, direction: 'DEBIT', amount: Number(payment.amountMYR), description: 'ToyyibPay cash received' }, { accountId: revenue.id, direction: 'CREDIT', amount: Number(payment.amountMYR), description: 'Platform payment revenue' }] });
    }
    if (payment.productType === 'AI_CREDIT_TOP_UP') {
      const pkg = CREDIT_PACKAGES.find((candidate) => candidate.id === payment.productId);
      if (!pkg) throw new BadRequestException('Credit package for payment was not found.');
      const subscription = await tx.membershipSubscription.findUniqueOrThrow({ where: { userId: payment.userId } });
      const wallet = await tx.aiCreditWallet.findUniqueOrThrow({ where: { userId_organisationId: { userId: payment.userId, organisationId: payment.organisationId } } });
      const credits = pkg.credits + pkg.bonusCredits;
      const updatedWallet = await tx.aiCreditWallet.update({ where: { id: wallet.id }, data: { purchasedCredits: { increment: pkg.credits }, bonusCredits: { increment: pkg.bonusCredits }, availableBalance: { increment: credits } } });
      await tx.membershipSubscription.update({ where: { id: subscription.id }, data: { aiCreditsRemaining: updatedWallet.availableBalance } });
      await tx.aiCreditTransaction.create({ data: { userId: payment.userId, subscriptionId: subscription.id, type: 'TOP_UP', credits, balanceBefore: updatedWallet.availableBalance - credits, balanceAfter: updatedWallet.availableBalance, amountMYR: payment.amountMYR, paymentMethod: 'ToyyibPay', reference: `TOYYIBPAY-${payment.id}` } });
    } else if (payment.productType === 'MEMBERSHIP') {
      const plan = PLANS.find((candidate) => candidate.id === payment.productId);
      const interval = metadata.billingInterval === 'annual' ? 'annual' : 'monthly';
      if (!plan) throw new BadRequestException('Membership plan for payment was not found.');
      const creditsApplied = Number(metadata.creditsApplied || 0);
      // A bill paid after it was cancelled had its credit hold returned; take the credits
      // again if the member still has them. The cash was received either way, so activate regardless.
      if (creditsApplied && (payment.status === 'CANCELLED' || payment.status === 'FAILED')) {
        await this.redeemCredits(tx, payment.userId, payment.organisationId, creditsApplied, Number(metadata.creditValueMYR || 0), `TOYYIBPAY-${payment.id}`, plan.id).catch(() => undefined);
      }
      const planPriceMYR = Number(metadata.planPriceMYR || payment.amountMYR);
      await this.activatePlan(tx, payment.userId, payment.organisationId, plan, interval, { invoiceNumber: String(metadata.invoiceNumber || `HOW-INV-${payment.id}`), amountMYR: planPriceMYR, amountUSD: Number(metadata.amountUSD || 0), paymentMethod: creditsApplied ? `ToyyibPay + ${creditsApplied} AI credits` : 'ToyyibPay' });
    } else if (payment.productType === 'ZAKAT_PAYMENT') {
      const gatewayAccountId = String(metadata.gatewayAccountId || '');
      const zakatAccountId = String(metadata.zakatAccountId || '');
      const calculationId = String(metadata.calculationId || payment.productId);
      if (!gatewayAccountId || !zakatAccountId) throw new BadRequestException('Zakat payment accounts are not configured.');
      await this.ledger.recordZakatPaymentInTransaction(tx, settlementActor, { calculationId, payerUserId: payment.userId, organisationId: payment.organisationId, countryNodeId: payment.countryNodeId, amount: Number(payment.amountMYR), currency: payment.currency, posting: { transactionType: 'ZAKAT_PAYMENT', referenceType: 'PaymentTransaction', referenceId: payment.id, currency: payment.currency, description: `Zakat payment for ${calculationId}`, idempotencyKey: `zakat-payment:${payment.id}`, entries: [{ accountId: gatewayAccountId, direction: 'DEBIT', amount: Number(payment.amountMYR), description: 'ToyyibPay cash received' }, { accountId: zakatAccountId, direction: 'CREDIT', amount: Number(payment.amountMYR), description: 'Zakat payable recognized' }] } });
    }
    await this.audit.record({ userId: payment.userId, action: 'payment.toyyibpay.settled', resourceType: 'PaymentTransaction', resourceId: payment.id, organisationId: payment.organisationId, countryNodeId: payment.countryNodeId, metadata: { productType: payment.productType, productId: payment.productId } }, tx);
    await tx.paymentTransaction.update({ where: { id: payment.id }, data: { metadata: { ...metadata, fulfilled: true, fulfilledAt: new Date().toISOString() } } });
  }

  async getAdminCreditAnalytics(actor: AuthenticatedUser) {
    const scopedUserIds = actor.role === 'Super Admin'
      ? undefined
      : (await this.prisma.userRoleAssignment.findMany({ where: { ...tenantScopeFilter(actor), isActive: true }, select: { userId: true }, distinct: ['userId'] })).map((assignment) => assignment.userId);
    const transactionScope = scopedUserIds ? { userId: { in: scopedUserIds } } : {};
    const transactions = await this.prisma.aiCreditTransaction.findMany({ where: transactionScope, orderBy: { createdAt: 'desc' }, take: 500 });
    const consumption = transactions.filter((item) => item.type === 'CONSUMPTION');
    const topUps = transactions.filter((item) => item.type === 'TOP_UP');
    const operationNames: Record<string, string> = { SIMPLE_QUERY: 'Simple AI Query', PROJECT_SUMMARY: 'Project Summary', INVESTMENT_ANALYSIS: 'Investment Analysis', RISK_ANALYSIS: 'Risk Analysis', CONTRACT_ANALYSIS: 'Contract Analysis', DUE_DILIGENCE: 'Due Diligence', FULL_PROJECT_INTELLIGENCE: 'Full Project Intelligence', PROJECT_PROMOTION: 'Project Promotion' };
    const grouped = consumption.reduce<Record<string, { count: number; credits: number }>>((acc, item) => { const key = item.operationKey || 'SIMPLE_QUERY'; acc[key] ||= { count: 0, credits: 0 }; acc[key].count += 1; acc[key].credits += Math.abs(item.credits); return acc; }, {});
    const totalBurned = consumption.reduce((sum, item) => sum + Math.abs(item.credits), 0);
    const operationDistribution = Object.entries(grouped).map(([key, data]) => ({ key, name: operationNames[key] || key, count: data.count, creditsBurned: data.credits, percentage: Math.round((data.credits / (totalBurned || 1)) * 100), color: '#8B5CF6' }));
    const dayMap = new Map<string, { creditsBurned: number; queriesCount: number }>();
    consumption.forEach((item) => { const date = item.createdAt.toISOString().slice(0, 10); const current = dayMap.get(date) || { creditsBurned: 0, queriesCount: 0 }; current.creditsBurned += Math.abs(item.credits); current.queriesCount += 1; dayMap.set(date, current); });
    return { summary: { totalPlatformCreditsBurned: totalBurned, totalAdditionalCreditsPurchased: topUps.reduce((sum, item) => sum + item.credits, 0), totalRevenueMYR: topUps.reduce((sum, item) => sum + Number(item.amountMYR || 0), 0), totalRevenueUSD: 0, activeAIUsersCount: new Set(consumption.map((item) => item.userId)).size, avgCreditsPerUser: Math.round(totalBurned / Math.max(1, new Set(consumption.map((item) => item.userId)).size)), mostPopularOperation: operationDistribution.sort((a, b) => b.creditsBurned - a.creditsBurned)[0]?.name || 'No usage yet', operationDistribution, tierDistribution: [], dailyConsumptionTrend: Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([date, data]) => ({ date, ...data })) }, transactions };
  }
}
