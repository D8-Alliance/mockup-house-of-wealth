export type AIOperationKey = 
  | 'SIMPLE_QUERY'
  | 'PROJECT_SUMMARY'
  | 'INVESTMENT_ANALYSIS'
  | 'RISK_ANALYSIS'
  | 'CONTRACT_ANALYSIS'
  | 'DUE_DILIGENCE'
  | 'FULL_PROJECT_INTELLIGENCE';

export interface AIOperationConfig {
  key: AIOperationKey;
  name: string;
  category: 'Query' | 'Project' | 'Investment' | 'Risk' | 'Legal' | 'Due Diligence' | 'Intelligence';
  creditCost: number;
  description: string;
  detailedScope: string;
  avgExecutionTimeSec: number;
  isPremium: boolean;
  badge?: string;
}

export interface AICreditBalanceBreakdown {
  userId: string;
  availableBalance: number;
  usedCredits: number;
  remainingCredits: number;
  usedThisMonth: number;
  monthlyAllowance: number;
  additionalCredits: number;
  totalPoolCredits: number;
  resetDate: string;
  userTier: string;
}

export interface AIUsageLogEntry {
  id: string;
  userId: string;
  userName: string;
  userTier: string;
  operationKey: AIOperationKey;
  operationName: string;
  category: string;
  targetEntity?: string;
  creditCost: number;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  balanceBefore: number;
  balanceAfter: number;
  tokensConsumedEstimate: number;
}

export interface AICreditTopUpPackage {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceMYR: number;
  priceUSD: number;
  popular: boolean;
  badge?: string;
  description: string;
}

export interface AdminAIAnalyticsSummary {
  totalPlatformCreditsBurned: number;
  totalAdditionalCreditsPurchased: number;
  totalRevenueMYR: number;
  totalRevenueUSD: number;
  activeAIUsersCount: number;
  avgCreditsPerUser: number;
  mostPopularOperation: string;
  operationDistribution: {
    key: AIOperationKey;
    name: string;
    count: number;
    creditsBurned: number;
    percentage: number;
    color: string;
  }[];
  tierDistribution: {
    tier: string;
    usersCount: number;
    creditsBurned: number;
    percentage: number;
    color: string;
  }[];
  dailyConsumptionTrend: {
    date: string;
    creditsBurned: number;
    queriesCount: number;
  }[];
}
