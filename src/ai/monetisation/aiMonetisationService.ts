import { 
  AIOperationKey, 
  AIOperationConfig, 
  AICreditBalanceBreakdown, 
  AIUsageLogEntry, 
  AdminAIAnalyticsSummary,
  AICreditTopUpPackage
} from './aiMonetisationTypes';
import { 
  AI_OPERATIONS_PRICING_CONFIG, 
  AI_CREDIT_TOPUP_PACKAGES 
} from './aiCreditPricingConfig';
import { revenueService } from '../../revenue/revenueService';

class AIMonetisationService {
  private operations: AIOperationConfig[] = [...AI_OPERATIONS_PRICING_CONFIG];
  private topUpPackages: AICreditTopUpPackage[] = [...AI_CREDIT_TOPUP_PACKAGES];
  
  private usageLogs: AIUsageLogEntry[] = [
    {
      id: 'AILOG-901',
      userId: 'USR-8821',
      userName: 'Ahmad Farhan (HNWI Investor)',
      userTier: 'PLUS',
      operationKey: 'DUE_DILIGENCE',
      operationName: 'Due Diligence',
      category: 'Due Diligence',
      targetEntity: 'FELDA Smart Agri-Estate Expansion',
      creditCost: 30,
      timestamp: '2026-08-13 14:15',
      status: 'SUCCESS',
      balanceBefore: 102,
      balanceAfter: 72,
      tokensConsumedEstimate: 14200
    },
    {
      id: 'AILOG-902',
      userId: 'USR-8821',
      userName: 'Ahmad Farhan (HNWI Investor)',
      userTier: 'PLUS',
      operationKey: 'CONTRACT_ANALYSIS',
      operationName: 'Contract Analysis',
      category: 'Legal',
      targetEntity: 'Mudarabah Syndicate Tranche C-2',
      creditCost: 20,
      timestamp: '2026-08-12 11:30',
      status: 'SUCCESS',
      balanceBefore: 122,
      balanceAfter: 102,
      tokensConsumedEstimate: 9800
    },
    {
      id: 'AILOG-903',
      userId: 'USR-8821',
      userName: 'Ahmad Farhan (HNWI Investor)',
      userTier: 'PLUS',
      operationKey: 'RISK_ANALYSIS',
      operationName: 'Risk Analysis',
      category: 'Risk',
      targetEntity: 'Urban Waqf Commercial Tower #04',
      creditCost: 15,
      timestamp: '2026-08-11 16:45',
      status: 'SUCCESS',
      balanceBefore: 137,
      balanceAfter: 122,
      tokensConsumedEstimate: 7600
    },
    {
      id: 'AILOG-904',
      userId: 'USR-8821',
      userName: 'Ahmad Farhan (HNWI Investor)',
      userTier: 'PLUS',
      operationKey: 'PROJECT_SUMMARY',
      operationName: 'Project Summary',
      category: 'Project',
      targetEntity: 'Perak Solar Halal Cold-Chain',
      creditCost: 5,
      timestamp: '2026-08-10 09:20',
      status: 'SUCCESS',
      balanceBefore: 142,
      balanceAfter: 137,
      tokensConsumedEstimate: 2400
    },
    {
      id: 'AILOG-905',
      userId: 'USR-8821',
      userName: 'Ahmad Farhan (HNWI Investor)',
      userTier: 'PLUS',
      operationKey: 'SIMPLE_QUERY',
      operationName: 'Simple AI Query',
      category: 'Query',
      targetEntity: 'AAOIFI Standard 13 Mudarabah',
      creditCost: 1,
      timestamp: '2026-08-09 18:05',
      status: 'SUCCESS',
      balanceBefore: 143,
      balanceAfter: 142,
      tokensConsumedEstimate: 650
    },
    {
      id: 'AILOG-801',
      userId: 'USR-4011',
      userName: 'Tan Sri Zulkifli (Apex CIO)',
      userTier: 'PROFESSIONAL',
      operationKey: 'FULL_PROJECT_INTELLIGENCE',
      operationName: 'Full Project Intelligence',
      category: 'Intelligence',
      targetEntity: 'IsDB Cross-Border Sukuk Ijarah',
      creditCost: 50,
      timestamp: '2026-08-13 13:40',
      status: 'SUCCESS',
      balanceBefore: 380,
      balanceAfter: 330,
      tokensConsumedEstimate: 24500
    },
    {
      id: 'AILOG-802',
      userId: 'ORG-FELDA-MY',
      userName: 'FELDA Technoplant Sponsor Desk',
      userTier: 'PRO_PDP',
      operationKey: 'CONTRACT_ANALYSIS',
      operationName: 'Contract Analysis',
      category: 'Legal',
      targetEntity: 'Master Plantation Sukuk Prospectus',
      creditCost: 20,
      timestamp: '2026-08-13 10:10',
      status: 'SUCCESS',
      balanceBefore: 260,
      balanceAfter: 240,
      tokensConsumedEstimate: 9800
    }
  ];

  private listeners: Set<() => void> = new Set();

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public getAIOperations(): AIOperationConfig[] {
    return this.operations;
  }

  public getOperationConfig(key: AIOperationKey): AIOperationConfig {
    return this.operations.find(o => o.key === key) || this.operations[0];
  }

  public getTopUpPackages(): AICreditTopUpPackage[] {
    return this.topUpPackages;
  }

  public getCreditBalanceBreakdown(userId: string): AICreditBalanceBreakdown {
    const rawBalance = revenueService.getCreditBalance(userId);
    const membership = revenueService.getUserMembership(userId);
    
    // Calculate total used this month from logs
    const userLogs = this.usageLogs.filter(l => l.userId === userId && l.status === 'SUCCESS');
    const logsUsed = userLogs.reduce((sum, l) => sum + l.creditCost, 0);
    const usedThisMonth = Math.max(rawBalance.usedCredits, logsUsed);

    return {
      userId,
      remainingCredits: rawBalance.availableCredits,
      usedThisMonth,
      monthlyAllowance: rawBalance.monthlyAllowance,
      additionalCredits: rawBalance.purchasedCredits,
      totalPoolCredits: rawBalance.monthlyAllowance + rawBalance.purchasedCredits,
      resetDate: rawBalance.resetDate || '2026-09-15',
      userTier: membership.tier
    };
  }

  public canExecuteOperation(userId: string, key: AIOperationKey): {
    allowed: boolean;
    cost: number;
    remaining: number;
    shortfall: number;
  } {
    const op = this.getOperationConfig(key);
    const balance = this.getCreditBalanceBreakdown(userId);
    const allowed = balance.remainingCredits >= op.creditCost;
    const shortfall = allowed ? 0 : op.creditCost - balance.remainingCredits;

    return {
      allowed,
      cost: op.creditCost,
      remaining: balance.remainingCredits,
      shortfall
    };
  }

  public consumeCreditsForOperation(
    userId: string,
    key: AIOperationKey,
    meta?: { targetEntity?: string; userName?: string }
  ): { success: boolean; log: AIUsageLogEntry | null; newBalance: number } {
    const op = this.getOperationConfig(key);
    const currentBalance = this.getCreditBalanceBreakdown(userId);

    if (currentBalance.remainingCredits < op.creditCost) {
      return { success: false, log: null, newBalance: currentBalance.remainingCredits };
    }

    const deducted = revenueService.deductCredits(
      userId,
      op.creditCost,
      'AI_ADVISORY',
      `AI Monetisation: ${op.name}${meta?.targetEntity ? ` on ${meta.targetEntity}` : ''}`
    );

    if (!deducted) {
      return { success: false, log: null, newBalance: currentBalance.remainingCredits };
    }

    const newBalance = currentBalance.remainingCredits - op.creditCost;
    const logEntry: AIUsageLogEntry = {
      id: `AILOG-${Date.now().toString().slice(-4)}`,
      userId,
      userName: meta?.userName || 'Ahmad Farhan (Active Investor)',
      userTier: currentBalance.userTier,
      operationKey: key,
      operationName: op.name,
      category: op.category,
      targetEntity: meta?.targetEntity || 'Shariah Wealth Analysis',
      creditCost: op.creditCost,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'SUCCESS',
      balanceBefore: currentBalance.remainingCredits,
      balanceAfter: newBalance,
      tokensConsumedEstimate: op.creditCost * 480
    };

    this.usageLogs = [logEntry, ...this.usageLogs];
    this.notify();

    return { success: true, log: logEntry, newBalance };
  }

  public getUsageHistory(userId: string): AIUsageLogEntry[] {
    return this.usageLogs.filter(l => l.userId === userId);
  }

  public getAllPlatformUsageLogs(): AIUsageLogEntry[] {
    return this.usageLogs;
  }

  public buyAdditionalCredits(
    userId: string, 
    packageId: string, 
    paymentMethod: string = 'Simulated Card Payment'
  ): boolean {
    const pkg = this.topUpPackages.find(p => p.id === packageId);
    if (!pkg) return false;

    const totalCreditsGained = pkg.credits + pkg.bonusCredits;
    const success = revenueService.topUpCredits(
      userId,
      totalCreditsGained,
      pkg.priceMYR,
      pkg.priceUSD,
      paymentMethod
    );

    if (success) {
      this.notify();
      return true;
    }
    return false;
  }

  public getAdminAnalyticsSummary(): AdminAIAnalyticsSummary {
    const totalPlatformCreditsBurned = this.usageLogs.reduce((acc, l) => acc + l.creditCost, 0) + 1420;
    const totalAdditionalCreditsPurchased = 4850;
    const totalRevenueMYR = 3490;
    const totalRevenueUSD = 820;

    const counts: Record<AIOperationKey, { count: number; credits: number }> = {
      SIMPLE_QUERY: { count: 42, credits: 42 },
      PROJECT_SUMMARY: { count: 35, credits: 175 },
      INVESTMENT_ANALYSIS: { count: 28, credits: 280 },
      RISK_ANALYSIS: { count: 22, credits: 330 },
      CONTRACT_ANALYSIS: { count: 18, credits: 360 },
      DUE_DILIGENCE: { count: 12, credits: 360 },
      FULL_PROJECT_INTELLIGENCE: { count: 6, credits: 300 }
    };

    this.usageLogs.forEach(l => {
      if (counts[l.operationKey]) {
        counts[l.operationKey].count += 1;
        counts[l.operationKey].credits += l.creditCost;
      }
    });

    const colors: Record<AIOperationKey, string> = {
      SIMPLE_QUERY: '#10B981',
      PROJECT_SUMMARY: '#06B6D4',
      INVESTMENT_ANALYSIS: '#3B82F6',
      RISK_ANALYSIS: '#F59E0B',
      CONTRACT_ANALYSIS: '#8B5CF6',
      DUE_DILIGENCE: '#EC4899',
      FULL_PROJECT_INTELLIGENCE: '#EF4444'
    };

    const totalBurnedAll = Object.values(counts).reduce((acc, c) => acc + c.credits, 0);

    const operationDistribution = this.operations.map(op => {
      const data = counts[op.key] || { count: 0, credits: 0 };
      return {
        key: op.key,
        name: op.name,
        count: data.count,
        creditsBurned: data.credits,
        percentage: Math.round((data.credits / (totalBurnedAll || 1)) * 100),
        color: colors[op.key] || '#64748B'
      };
    });

    return {
      totalPlatformCreditsBurned,
      totalAdditionalCreditsPurchased,
      totalRevenueMYR,
      totalRevenueUSD,
      activeAIUsersCount: 148,
      avgCreditsPerUser: 24,
      mostPopularOperation: 'Contract Analysis (20 Credits)',
      operationDistribution,
      tierDistribution: [
        { tier: 'HoW Free', usersCount: 84, creditsBurned: 740, percentage: 28, color: '#94A3B8' },
        { tier: 'HoW Plus', usersCount: 42, creditsBurned: 1120, percentage: 42, color: '#10B981' },
        { tier: 'HoW Professional', usersCount: 16, creditsBurned: 620, percentage: 23, color: '#3B82F6' },
        { tier: 'PDP Enterprise', usersCount: 6, creditsBurned: 180, percentage: 7, color: '#8B5CF6' }
      ],
      dailyConsumptionTrend: [
        { date: '08 Aug', creditsBurned: 140, queriesCount: 22 },
        { date: '09 Aug', creditsBurned: 195, queriesCount: 31 },
        { date: '10 Aug', creditsBurned: 260, queriesCount: 38 },
        { date: '11 Aug', creditsBurned: 310, queriesCount: 45 },
        { date: '12 Aug', creditsBurned: 420, queriesCount: 52 },
        { date: '13 Aug', creditsBurned: 480, queriesCount: 64 }
      ]
    };
  }
}

export const aiMonetisationService = new AIMonetisationService();
