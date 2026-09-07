import { 
  UserMembership, 
  HoWCreditBalance, 
  CreditTransaction, 
  PremiumReportItem, 
  BillingRecord, 
  RevenueMetric,
  MembershipPlan,
  PDPPlan,
  PDPSubscription,
  ProjectPromotionPackage,
  MembershipTier,
  BillingInterval,
  FeatureUsageStats
} from './revenueTypes';
import { 
  MEMBERSHIP_PLANS_CONFIG, 
  PDP_PLANS_CONFIG, 
  PROJECT_PROMOTION_PACKAGES 
} from './revenueConfig';
import { generateNumericId } from '../utils/id';
import { 
  INITIAL_USER_MEMBERSHIP, 
  INITIAL_CREDIT_BALANCE, 
  INITIAL_CREDIT_TRANSACTIONS, 
  INITIAL_PREMIUM_REPORTS, 
  INITIAL_BILLING_RECORDS, 
  INITIAL_REVENUE_METRICS 
} from './mockRevenueData';

class RevenueService {
  private plans: MembershipPlan[] = [...MEMBERSHIP_PLANS_CONFIG];
  private pdpPlans: PDPPlan[] = [...PDP_PLANS_CONFIG];
  private promoPackages: ProjectPromotionPackage[] = [...PROJECT_PROMOTION_PACKAGES];
  
  private pdpSubscriptions: Map<string, PDPSubscription> = new Map([
    ['ORG-FELDA-MY', {
      orgId: 'ORG-FELDA-MY',
      planId: 'pdp_pro',
      tier: 'PRO_PDP',
      status: 'Active',
      currentPeriodStart: '2026-08-01',
      currentPeriodEnd: '2026-09-01',
      activeProjectsCount: 3,
      featuredUsedThisMonth: 1,
      aiCreditsRemaining: 240,
      paymentMethod: 'Corporate Direct Debit (Maybank Islamic)'
    }]
  ]);
  
  private userMemberships: Map<string, UserMembership> = new Map([
    [INITIAL_USER_MEMBERSHIP.userId, { ...INITIAL_USER_MEMBERSHIP }]
  ]);
  
  private creditBalances: Map<string, HoWCreditBalance> = new Map([
    [INITIAL_CREDIT_BALANCE.userId, { ...INITIAL_CREDIT_BALANCE }]
  ]);
  
  private creditTransactions: CreditTransaction[] = [...INITIAL_CREDIT_TRANSACTIONS];
  private premiumReports: PremiumReportItem[] = [...INITIAL_PREMIUM_REPORTS];
  private billingRecords: BillingRecord[] = [...INITIAL_BILLING_RECORDS];
  private revenueMetrics: RevenueMetric = { ...INITIAL_REVENUE_METRICS };
  
  private listeners: Set<() => void> = new Set();

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public getPlans(): MembershipPlan[] {
    return this.plans;
  }

  public getPDPPlans(): PDPPlan[] {
    return this.pdpPlans;
  }

  public getPromotionPackages(): ProjectPromotionPackage[] {
    return this.promoPackages;
  }

  public getUserMembership(userId: string): UserMembership {
    if (!this.userMemberships.has(userId)) {
      const freePlan = this.plans.find(p => p.tier === 'FREE') || this.plans[0];
      const newMembership: UserMembership = {
        userId,
        planId: freePlan.id,
        tier: 'FREE',
        billingInterval: 'monthly',
        status: 'Active',
        currentPeriodStart: new Date().toISOString().slice(0, 10),
        currentPeriodEnd: '2026-12-31',
        autoRenew: false,
        paymentMethodSummary: 'None (Free Plan)',
        aiCreditsRemaining: 20,
        aiCreditsTotal: 20
      };
      this.userMemberships.set(userId, newMembership);
    }
    return this.userMemberships.get(userId)!;
  }

  public upgradeMembership(
    userId: string, 
    planId: string, 
    interval: BillingInterval, 
    paymentMethod: string = 'Simulated Payment Gateway'
  ): boolean {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) return false;

    const current = this.getUserMembership(userId);
    const amountMYR = interval === 'monthly' ? plan.monthlyPriceMYR : plan.annualPriceMYR;
    const amountUSD = interval === 'monthly' ? plan.monthlyPriceUSD : plan.annualPriceUSD;

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + (interval === 'monthly' ? 30 : 365));

    const updated: UserMembership = {
      ...current,
      planId: plan.id,
      tier: plan.tier,
      billingInterval: interval,
      status: 'Active',
      currentPeriodStart: new Date().toISOString().slice(0, 10),
      currentPeriodEnd: nextMonth.toISOString().slice(0, 10),
      autoRenew: true,
      paymentMethodSummary: paymentMethod,
      aiCreditsTotal: plan.aiCreditsMonthly,
      aiCreditsRemaining: plan.aiCreditsMonthly
    };

    this.userMemberships.set(userId, updated);

    // Update Credits balance
    const cb = this.getCreditBalance(userId);
    this.creditBalances.set(userId, {
      ...cb,
      totalCredits: plan.aiCreditsMonthly,
      availableCredits: plan.aiCreditsMonthly,
      monthlyAllowance: plan.aiCreditsMonthly,
      usedCredits: 0
    });

    // Record Billing Invoice
    const newInvoice: BillingRecord = {
      id: `INV-${generateNumericId('INV', 6)}`,
      userId,
      invoiceNumber: `HOW-INV-${userId.replace('USR-', '')}-${new Date().getMonth() + 1}`,
      date: new Date().toISOString().slice(0, 10),
      description: `${plan.name} (${interval === 'monthly' ? 'Monthly' : 'Annual'} Subscription)`,
      amountMYR,
      amountUSD,
      stream: 'Membership',
      status: 'Paid',
      paymentMethod
    };
    this.billingRecords = [newInvoice, ...this.billingRecords];

    this.notify();
    return true;
  }

  public downgradeMembership(userId: string): boolean {
    const freePlan = this.plans.find(p => p.tier === 'FREE') || this.plans[0];
    const current = this.getUserMembership(userId);
    
    const updated: UserMembership = {
      ...current,
      planId: freePlan.id,
      tier: 'FREE',
      billingInterval: 'monthly',
      status: 'Active',
      autoRenew: false,
      paymentMethodSummary: 'None (Free Plan)',
      aiCreditsTotal: freePlan.aiCreditsMonthly,
      aiCreditsRemaining: Math.min(current.aiCreditsRemaining, freePlan.aiCreditsMonthly)
    };
    this.userMemberships.set(userId, updated);
    
    const cb = this.getCreditBalance(userId);
    this.creditBalances.set(userId, {
      ...cb,
      monthlyAllowance: freePlan.aiCreditsMonthly,
      totalCredits: freePlan.aiCreditsMonthly,
      availableCredits: Math.min(cb.availableCredits, freePlan.aiCreditsMonthly)
    });
    
    this.notify();
    return true;
  }

  public cancelMembership(userId: string): boolean {
    const current = this.getUserMembership(userId);
    const updated: UserMembership = {
      ...current,
      autoRenew: false,
      status: 'Cancelled'
    };
    this.userMemberships.set(userId, updated);
    this.notify();
    return true;
  }

  public getFeatureUsage(userId: string): FeatureUsageStats {
    const membership = this.getUserMembership(userId);
    const plan = this.plans.find(p => p.id === membership.planId) || this.plans[0];
    
    const aiQueriesLimit = plan.aiCreditsMonthly;
    const ddScansLimit = membership.tier === 'FREE' ? 2 : (membership.tier === 'PLUS' ? 15 : 100);
    const contractLimit = membership.tier === 'FREE' ? 0 : (membership.tier === 'PLUS' ? 5 : 50);
    const reportsLimit = membership.tier === 'FREE' ? 0 : (membership.tier === 'PLUS' ? 3 : 25);
    const syndicateLimit = membership.tier === 'FREE' ? 1 : (membership.tier === 'PLUS' ? 5 : 20);

    return {
      aiAssistantQueriesUsed: Math.max(2, Math.floor(plan.aiCreditsMonthly * 0.35)),
      aiAssistantQueriesLimit: aiQueriesLimit,
      aiDueDiligenceScansUsed: membership.tier === 'FREE' ? 1 : (membership.tier === 'PLUS' ? 4 : 12),
      aiDueDiligenceScansLimit: ddScansLimit,
      aiContractScansUsed: membership.tier === 'FREE' ? 0 : (membership.tier === 'PLUS' ? 2 : 8),
      aiContractScansLimit: contractLimit,
      premiumReportsUnlocked: this.premiumReports.filter(r => r.isUnlocked).length,
      premiumReportsLimit: reportsLimit,
      syndicateAllocationsUsed: 1,
      syndicateAllocationsLimit: syndicateLimit
    };
  }

  public getCreditBalance(userId: string): HoWCreditBalance {
    if (!this.creditBalances.has(userId)) {
      this.creditBalances.set(userId, {
        userId,
        totalCredits: 20,
        usedCredits: 0,
        availableCredits: 20,
        monthlyAllowance: 20,
        purchasedCredits: 0,
        resetDate: '2026-09-30'
      });
    }
    return this.creditBalances.get(userId)!;
  }

  public topUpCredits(userId: string, credits: number, priceMYR: number, priceUSD: number, paymentMethod: string): boolean {
    const cb = this.getCreditBalance(userId);
    const updated: HoWCreditBalance = {
      ...cb,
      totalCredits: cb.totalCredits + credits,
      availableCredits: cb.availableCredits + credits,
      purchasedCredits: cb.purchasedCredits + credits
    };
    this.creditBalances.set(userId, updated);

    const tx: CreditTransaction = {
      id: `CTX-${generateNumericId('CTX', 5)}`,
      userId,
      amount: credits,
      isDebit: false,
      type: 'PURCHASE',
      description: `Purchased ${credits} HoW AI Utility Credits`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      balanceAfter: updated.availableCredits
    };
    this.creditTransactions = [tx, ...this.creditTransactions];

    const newInvoice: BillingRecord = {
      id: `INV-${generateNumericId('INV', 6)}`,
      userId,
      invoiceNumber: `HOW-INV-CREDIT-${generateNumericId('INV', 4)}`,
      date: new Date().toISOString().slice(0, 10),
      description: `HoW AI Credits Pack (${credits} Credits)`,
      amountMYR: priceMYR,
      amountUSD: priceUSD,
      stream: 'AI Credits',
      status: 'Paid',
      paymentMethod
    };
    this.billingRecords = [newInvoice, ...this.billingRecords];

    this.notify();
    return true;
  }

  public deductCredits(
    userId: string, 
    amount: number, 
    type: CreditTransaction['type'], 
    description: string
  ): boolean {
    const cb = this.getCreditBalance(userId);
    if (cb.availableCredits < amount) return false;

    const newBalance = cb.availableCredits - amount;
    this.creditBalances.set(userId, {
      ...cb,
      usedCredits: cb.usedCredits + amount,
      availableCredits: newBalance
    });

    const tx: CreditTransaction = {
      id: `CTX-${generateNumericId('CTX', 5)}`,
      userId,
      amount,
      isDebit: true,
      type,
      description,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      balanceAfter: newBalance
    };
    this.creditTransactions = [tx, ...this.creditTransactions];
    this.notify();
    return true;
  }

  public getCreditTransactions(userId: string): CreditTransaction[] {
    return this.creditTransactions.filter(t => t.userId === userId);
  }

  public getPremiumReports(): PremiumReportItem[] {
    return this.premiumReports;
  }

  public unlockPremiumReport(reportId: string, userId: string): boolean {
    const report = this.premiumReports.find(r => r.id === reportId);
    if (!report) return false;
    if (report.isUnlocked) return true;

    const success = this.deductCredits(
      userId, 
      report.creditsToUnlock, 
      'REPORT_UNLOCK', 
      `Unlocked Intelligence Report: ${report.title}`
    );

    if (success) {
      report.isUnlocked = true;
      this.notify();
      return true;
    }
    return false;
  }

  public getBillingRecords(userId: string): BillingRecord[] {
    return this.billingRecords.filter(b => b.userId === userId);
  }

  public getRevenueMetrics(): RevenueMetric {
    return this.revenueMetrics;
  }

  public getPDPSubscription(orgId: string): PDPSubscription {
    if (!this.pdpSubscriptions.has(orgId)) {
      this.pdpSubscriptions.set(orgId, {
        orgId,
        planId: 'pdp_free',
        tier: 'FREE_PDP',
        status: 'Active',
        currentPeriodStart: new Date().toISOString().slice(0, 10),
        currentPeriodEnd: '2026-12-31',
        activeProjectsCount: 1,
        featuredUsedThisMonth: 0,
        aiCreditsRemaining: 50,
        paymentMethod: 'Free PDP Tier'
      });
    }
    return this.pdpSubscriptions.get(orgId)!;
  }

  public upgradePDPSubscription(orgId: string, planId: string, paymentMethod: string = 'Corporate Bank Transfer'): boolean {
    const plan = this.pdpPlans.find(p => p.id === planId);
    if (!plan) return false;

    const current = this.getPDPSubscription(orgId);
    const updated: PDPSubscription = {
      ...current,
      planId: plan.id,
      tier: plan.tier,
      paymentMethod,
      aiCreditsRemaining: plan.aiCreditsMonthly
    };
    this.pdpSubscriptions.set(orgId, updated);

    // Record invoice
    const newInvoice: BillingRecord = {
      id: `INV-PDP-${generateNumericId('PDP', 5)}`,
      userId: orgId,
      invoiceNumber: `HOW-PDP-${generateNumericId('PDP', 4)}`,
      date: new Date().toISOString().slice(0, 10),
      description: `${plan.name} Monthly Subscription`,
      amountMYR: plan.priceMYR,
      amountUSD: plan.priceUSD,
      stream: 'PDP Subscription',
      status: 'Paid',
      paymentMethod
    };
    this.billingRecords = [newInvoice, ...this.billingRecords];
    this.notify();
    return true;
  }

  public promoteProject(
    projectId: string, 
    projectTitle: string, 
    packageId: string, 
    useCredits: boolean = false, 
    userId: string = 'USR-8821'
  ): boolean {
    const pkg = this.promoPackages.find(p => p.id === packageId);
    if (!pkg) return false;

    if (useCredits && pkg.creditsCost > 0) {
      const success = this.deductCredits(
        userId, 
        pkg.creditsCost, 
        'LISTING_PROMOTION', 
        `Promoted Project: ${projectTitle} (${pkg.title})`
      );
      if (!success) return false;
    } else if (pkg.priceMYR > 0) {
      const newInvoice: BillingRecord = {
        id: `INV-PRM-${generateNumericId('PRM', 5)}`,
        userId,
        invoiceNumber: `HOW-PRM-${generateNumericId('PRM', 4)}`,
        date: new Date().toISOString().slice(0, 10),
        description: `Marketplace Listing Boost: ${projectTitle} (${pkg.title})`,
        amountMYR: pkg.priceMYR,
        amountUSD: pkg.priceUSD,
        stream: 'Featured Listing',
        status: 'Paid',
        paymentMethod: 'D-8 Wealth Wallet'
      };
      this.billingRecords = [newInvoice, ...this.billingRecords];
    }

    this.notify();
    return true;
  }

  public updatePlanPrice(planId: string, monthlyMYR: number, annualMYR: number): void {
    const plan = this.plans.find(p => p.id === planId);
    if (plan) {
      plan.monthlyPriceMYR = monthlyMYR;
      plan.annualPriceMYR = annualMYR;
      plan.monthlyPriceUSD = Math.round(monthlyMYR / 4.2);
      plan.annualPriceUSD = Math.round(annualMYR / 4.2);
      this.notify();
    }
  }
}

export const revenueService = new RevenueService();
