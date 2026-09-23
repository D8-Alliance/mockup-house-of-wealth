export type MembershipTier = 'FREE' | 'PLUS' | 'PROFESSIONAL' | 'ENTERPRISE';

export type UserSegment = 
  | 'Retail Investor'
  | 'HNWI Investor'
  | 'Professional Investor'
  | 'Family Office'
  | 'Corporate Investor'
  | 'Institutional Investor'
  | 'Delivery Partner / Project Sponsor'
  | 'Professional Service Provider'
  | 'Organisation'
  | 'Enterprise';

export type BillingInterval = 'monthly' | 'annual';

export interface MembershipPlan {
  id: string;
  tier: MembershipTier;
  name: string;
  badge?: string;
  monthlyPriceMYR: number;
  annualPriceMYR: number;
  monthlyPriceUSD: number;
  annualPriceUSD: number;
  aiCreditsMonthly: number;
  description: string;
  featureAccess: string[];
  projectAccess: string;
  reportsAccess: string;
  analyticsAccess: string;
  alertsAccess: string;
  organizationFeatures: string;
  apiAccess: string;
  supportLevel: string;
  recommendedFor: UserSegment[];
  isPopular?: boolean;
  isCustomPricing?: boolean;
}

export interface UserMembership {
  userId: string;
  planId: string;
  tier: MembershipTier;
  billingInterval: BillingInterval;
  status: 'Active' | 'Trialing' | 'Past Due' | 'Cancelled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  paymentMethodSummary: string;
  aiCreditsRemaining: number;
  aiCreditsTotal: number;
}

export type PDPPlanTier = 'FREE_PDP' | 'PRO_PDP' | 'ENTERPRISE_PDP';

export interface PDPSubscription {
  orgId: string;
  planId: string;
  tier: PDPPlanTier;
  status: 'Active' | 'Trialing' | 'Past Due' | 'Cancelled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  activeProjectsCount: number;
  featuredUsedThisMonth: number;
  aiCreditsRemaining: number;
  paymentMethod: string;
}

export interface PDPPlan {
  id: string;
  tier: PDPPlanTier;
  name: string;
  priceMYR: number;
  priceUSD: number;
  billingInterval: 'monthly' | 'annual';
  activeProjectLimit: number;
  listingAllowanceMonthly: number;
  aiCreditsMonthly: number;
  featuredAllowanceMonthly: number;
  reportAllowanceMonthly: number;
  supportLevel: string;
  features: string[];
}

export interface ProjectPromotionPackage {
  id: string;
  title: string;
  durationDays: number;
  priceMYR: number;
  priceUSD: number;
  creditsCost: number;
  badgeText: 'Featured' | 'Sponsored' | 'Promoted';
  placement: string;
  description: string;
}

export interface HoWCreditBalance {
  userId: string;
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  monthlyAllowance: number;
  purchasedCredits: number;
  resetDate: string;
}

export interface FeatureUsageStats {
  aiAssistantQueriesUsed: number;
  aiAssistantQueriesLimit: number;
  aiDueDiligenceScansUsed: number;
  aiDueDiligenceScansLimit: number;
  aiContractScansUsed: number;
  aiContractScansLimit: number;
  premiumReportsUnlocked: number;
  premiumReportsLimit: number;
  syndicateAllocationsUsed: number;
  syndicateAllocationsLimit: number;
}

export interface FeatureMatrixItem {
  id: string;
  category: 'Core Access' | 'AI Intelligence' | 'Risk & Due Diligence' | 'Ecosystem & Governance';
  name: string;
  description: string;
  free: string | boolean;
  plus: string | boolean;
  professional: string | boolean;
  enterprise: string | boolean;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  isDebit: boolean;
  type: 'ALLOWANCE_GRANT' | 'PURCHASE' | 'AI_ADVISORY' | 'REPORT_UNLOCK' | 'DEEP_DILIGENCE' | 'LISTING_PROMOTION';
  description: string;
  timestamp: string;
  balanceAfter: number;
}

export interface PremiumReportItem {
  id: string;
  title: string;
  category: 'AI Project Intelligence' | 'AI Risk Analysis' | 'Financial Analysis' | 'Due Diligence Summary' | 'Portfolio Intelligence' | 'Market Intelligence';
  targetEntity: string;
  summary: string;
  requiredTier: MembershipTier;
  creditsToUnlock: number;
  isUnlocked: boolean;
  rating: string;
  shariahAuditStatus: string;
  publishedDate: string;
  executiveSummary: string;
  riskMetrics: { label: string; score: number; verdict: string }[];
  financialForecast: { year: string; projection: string; confidence: string }[];
  shariahConsiderations: string[];
  recommendations: string[];
}

export interface BillingRecord {
  id: string;
  userId: string;
  invoiceNumber: string;
  date: string;
  description: string;
  amountMYR: number;
  amountUSD: number;
  stream: 'Membership' | 'AI Credits' | 'PDP Subscription' | 'Featured Listing' | 'Premium Report' | 'Enterprise Service';
  status: 'Paid' | 'Pending' | 'Refunded';
  paymentMethod: string;
}

export interface RevenueMetric {
  totalRevenueUSD: number;
  mrrUSD: number;
  arrUSD: number;
  totalPaidMembers: number;
  membershipRevenueUSD: number;
  aiRevenueUSD: number;
  pdpRevenueUSD: number;
  listingRevenueUSD: number;
  advertisingRevenueUSD: number;
  premiumReportRevenueUSD: number;
  enterpriseRevenueUSD: number;
  monthlyTrend: {
    month: string;
    membership: number;
    aiCredits: number;
    pdp: number;
    promotions: number;
    reports: number;
    total: number;
  }[];
}

export interface FutureRevenueItem {
  id: string;
  name: string;
  category: 'Transaction Fee' | 'Success Fee' | 'Investment Facilitation' | 'Digital Asset / Token' | 'Secondary Market Fee';
  description: string;
  regulatoryStatus: 'FUTURE / REGULATORY REVIEW REQUIRED';
  projectedTimeline: string;
  targetJurisdictions: string[];
}
