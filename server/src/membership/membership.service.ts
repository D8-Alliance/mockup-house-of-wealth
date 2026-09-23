import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { UpgradeMembershipDto } from './membership.dto';

const PLANS = [
  { id: 'plan_free', tier: 'FREE', name: 'Wealth Pooling Free', monthlyPriceMYR: 0, annualPriceMYR: 0, monthlyPriceUSD: 0, annualPriceUSD: 0, aiCreditsMonthly: 20 },
  { id: 'plan_plus', tier: 'PLUS', name: 'Wealth Pooling Plus', monthlyPriceMYR: 39, annualPriceMYR: 390, monthlyPriceUSD: 9, annualPriceUSD: 90, aiCreditsMonthly: 100 },
  { id: 'plan_pro', tier: 'PROFESSIONAL', name: 'Wealth Pooling Professional', monthlyPriceMYR: 149, annualPriceMYR: 1490, monthlyPriceUSD: 35, annualPriceUSD: 350, aiCreditsMonthly: 400 },
  { id: 'plan_enterprise', tier: 'ENTERPRISE', name: 'Wealth Pooling Enterprise', monthlyPriceMYR: 999, annualPriceMYR: 9990, monthlyPriceUSD: 240, annualPriceUSD: 2400, aiCreditsMonthly: 2500 },
] as const;

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  getPlans() {
    return PLANS;
  }

  async getCurrent(actor: AuthenticatedUser) {
    const subscription = await this.prisma.membershipSubscription.findUnique({ where: { userId: actor.userId } });
    if (subscription) return subscription;

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

  async upgrade(actor: AuthenticatedUser, input: UpgradeMembershipDto) {
    const plan = PLANS.find((candidate) => candidate.id === input.planId);
    if (!plan) throw new BadRequestException('Unknown membership plan');

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + (input.billingInterval === 'monthly' ? 30 : 365));
    const amountMYR = input.billingInterval === 'monthly' ? plan.monthlyPriceMYR : plan.annualPriceMYR;
    const amountUSD = input.billingInterval === 'monthly' ? plan.monthlyPriceUSD : plan.annualPriceUSD;
    const invoiceNumber = `HOW-INV-${actor.userId.replace(/[^A-Za-z0-9]/g, '')}-${Date.now()}`;

    const subscription = await this.prisma.$transaction(async (tx) => {
      const result = await tx.membershipSubscription.upsert({
        where: { userId: actor.userId },
        update: {
          planId: plan.id,
          tier: plan.tier,
          billingInterval: input.billingInterval,
          status: 'Active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
          paymentMethodSummary: input.paymentMethod,
          aiCreditsRemaining: plan.aiCreditsMonthly,
          aiCreditsTotal: plan.aiCreditsMonthly,
        },
        create: {
          userId: actor.userId,
          planId: plan.id,
          tier: plan.tier,
          billingInterval: input.billingInterval,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
          paymentMethodSummary: input.paymentMethod,
          aiCreditsRemaining: plan.aiCreditsMonthly,
          aiCreditsTotal: plan.aiCreditsMonthly,
        },
      });

      await tx.membershipBillingRecord.create({
        data: {
          userId: actor.userId,
          invoiceNumber,
          planId: plan.id,
          billingInterval: input.billingInterval,
          amountMYR: new Prisma.Decimal(amountMYR),
          amountUSD: new Prisma.Decimal(amountUSD),
          status: 'Paid',
          paymentMethod: input.paymentMethod,
        },
      });
      return result;
    });

    await this.audit.recordActor(actor, {
      action: 'membership.upgrade',
      resourceType: 'MembershipSubscription',
      resourceId: subscription.id,
      countryNodeId: actor.countryNodeId,
      organisationId: actor.organisationId,
      metadata: { planId: plan.id, billingInterval: input.billingInterval, invoiceNumber },
    });

    return subscription;
  }

  async billing(actor: AuthenticatedUser) {
    return this.prisma.membershipBillingRecord.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
