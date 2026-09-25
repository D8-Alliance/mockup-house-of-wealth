import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { UpgradeMembershipDto } from './membership.dto';

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

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
      const wallet = await tx.aiCreditWallet.findUnique({ where: { userId_organisationId: { userId: actor.userId, organisationId: actor.organisationId } } });
      if (wallet) {
        await tx.aiCreditWallet.update({ where: { id: wallet.id }, data: { subscriptionPlan: plan.tier, monthlyAllowance: plan.aiCreditsMonthly, usedCredits: 0, availableBalance: plan.aiCreditsMonthly + wallet.purchasedCredits + wallet.bonusCredits, resetDate: periodEnd } });
      } else {
        await tx.aiCreditWallet.create({ data: { userId: actor.userId, organisationId: actor.organisationId, subscriptionPlan: plan.tier, monthlyAllowance: plan.aiCreditsMonthly, purchasedCredits: 0, bonusCredits: 0, usedCredits: 0, availableBalance: plan.aiCreditsMonthly, resetDate: periodEnd } });
      }
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

  async getCreditSummary(actor: AuthenticatedUser) {
    const wallet = await this.getWallet(actor);
    return {
      userId: wallet.userId,
      monthlyAllowance: wallet.monthlyAllowance,
      purchasedCredits: wallet.purchasedCredits,
      bonusCredits: wallet.bonusCredits,
      usedCredits: wallet.usedCredits,
      availableBalance: wallet.availableBalance,
      // Compatibility aliases for existing clients; wallet fields above are authoritative.
      remainingCredits: wallet.availableBalance,
      usedThisMonth: wallet.usedCredits,
      additionalCredits: wallet.purchasedCredits + wallet.bonusCredits,
      totalPoolCredits: wallet.monthlyAllowance + wallet.purchasedCredits + wallet.bonusCredits,
      resetDate: wallet.resetDate,
      userTier: wallet.subscriptionPlan,
    };
  }

  async getCreditUsage(actor: AuthenticatedUser) {
    return this.prisma.aiCreditTransaction.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async getTransactions(actor: AuthenticatedUser) {
    const [billing, credits, promotions] = await Promise.all([
      this.prisma.membershipBillingRecord.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiCreditTransaction.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.promotionPayment.findMany({ where: { userId: actor.userId }, include: { campaign: { include: { project: { select: { projectName: true } } } } }, orderBy: { createdAt: 'desc' } }),
    ]);
    return [
      ...billing.map((item) => ({ id: item.id, type: 'MEMBERSHIP', description: `${item.planId} membership`, status: item.status, amountMYR: Number(item.amountMYR), amountUSD: Number(item.amountUSD), credits: 0, method: item.paymentMethod, invoiceNumber: item.invoiceNumber, createdAt: item.createdAt, receiptAvailable: true })),
      ...credits.map((item) => ({ id: item.id, type: item.type === 'TOP_UP' ? 'AI_CREDIT_TOP_UP' : 'AI_CREDIT_USAGE', description: item.type === 'TOP_UP' ? 'AI credit top-up' : `AI usage: ${item.operationKey || 'AI operation'}`, status: 'PAID', amountMYR: Number(item.amountMYR || 0), amountUSD: 0, credits: item.credits, method: item.paymentMethod || 'Platform credits', invoiceNumber: item.reference, createdAt: item.createdAt, receiptAvailable: item.type === 'TOP_UP' })),
      ...promotions.map((item) => ({ id: item.id, type: 'PROJECT_PROMOTION', description: `${item.campaign.packageName} • ${item.campaign.project.projectName}`, status: item.status, amountMYR: Number(item.amountMYR), amountUSD: 0, credits: item.creditsCost ? -item.creditsCost : 0, method: item.method, invoiceNumber: `HOW-PROMO-${item.id.slice(-10).toUpperCase()}`, createdAt: item.createdAt, receiptAvailable: item.status === 'PAID', projectId: item.campaign.projectId, campaignId: item.campaignId })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getTransactionReceipt(actor: AuthenticatedUser, id: string) {
    const transactions = await this.getTransactions(actor);
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction || !transaction.receiptAvailable) throw new BadRequestException('Receipt is not available for this transaction.');
    const receiptNumber = transaction.invoiceNumber || `HOW-TXN-${id.slice(-10).toUpperCase()}`;
    return { receiptNumber, content: ['WEALTH POOLING PAYMENT RECEIPT', `Receipt: ${receiptNumber}`, `Description: ${transaction.description}`, `Amount: MYR ${transaction.amountMYR.toFixed(2)}`, `Payment method: ${transaction.method}`, `Status: ${transaction.status}`, `Date: ${transaction.createdAt.toISOString()}`, '', 'This receipt is system-generated and does not constitute investment advice.'].join('\n') };
  }

  async consumeCredits(actor: AuthenticatedUser, operationKey: string, targetEntity?: string) {
    const pricing = await this.getPricing(operationKey);
    const cost = pricing.creditsRequired;
    const wallet = await this.getWallet(actor);
    const plan = PLANS.find((candidate) => candidate.tier === wallet.subscriptionPlan) || PLANS[0];
    if (!plan.aiCapabilities.includes(operationKey as (typeof AI_CAPABILITIES)[number])) throw new BadRequestException('This AI capability is not included in the current subscription plan. Please upgrade plan or purchase credits.');
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.aiCreditWallet.updateMany({ where: { id: wallet.id, availableBalance: { gte: cost } }, data: { availableBalance: { decrement: cost }, usedCredits: { increment: cost } } });
      if (!updated.count) throw new BadRequestException('Insufficient AI Credits. Please upgrade plan or purchase credits.');
      const current = await tx.aiCreditWallet.findUniqueOrThrow({ where: { id: wallet.id } });
      const subscription = await tx.membershipSubscription.findUniqueOrThrow({ where: { userId: actor.userId } });
      await tx.membershipSubscription.update({ where: { id: subscription.id }, data: { aiCreditsRemaining: current.availableBalance } });
      const legacy = await tx.aiCreditTransaction.create({ data: { userId: actor.userId, subscriptionId: subscription.id, type: 'CONSUMPTION', operationKey, targetEntity, credits: -cost, balanceBefore: current.availableBalance + cost, balanceAfter: current.availableBalance } });
      const usage = await tx.aiUsageTransaction.create({ data: { userId: actor.userId, organisationId: actor.organisationId, featureType: pricing.featureType, operationName: pricing.operationName, creditsConsumed: cost, projectId: targetEntity?.startsWith('PROJ-') ? targetEntity : null, status: 'COMPLETED' } });
      return { ...legacy, usageTransactionId: usage.id, operationName: pricing.operationName };
    });
    await this.audit.recordActor(actor, { action: 'ai.credits.consume', resourceType: 'AiUsageTransaction', resourceId: result.usageTransactionId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { operationKey, operationName: pricing.operationName, cost, targetEntity } });
    return result;
  }

  async topUpCredits(actor: AuthenticatedUser, packageId: string, paymentMethod: string) {
    const pkg = CREDIT_PACKAGES.find((candidate) => candidate.id === packageId);
    if (!pkg) throw new BadRequestException('Unknown AI credit package');
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

  async getAdminCreditAnalytics() {
    const transactions = await this.prisma.aiCreditTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
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
