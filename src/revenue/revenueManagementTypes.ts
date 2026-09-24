export type RevenueCategory = 
  | 'Membership'
  | 'AI Credits'
  | 'PDP Subscription'
  | 'Featured Listing'
  | 'Premium Report'
  | 'Marketplace Advertising'
  | 'Enterprise Node';

export type PaymentGateway = 
  | 'Corporate FPX (Maybank Islamic)'
  | 'D-8 Wealth Wallet'
  | 'Corporate Card'
  | 'Direct Debit'
  | 'Sovereign Clearing Node'
  | 'Bank Transfer (IsDB RTGS)';

export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue' | 'Refunded';

export type SubscriptionStatusType = 'Active' | 'Trialing' | 'Past Due' | 'Cancelled' | 'Expired';

export interface RevenueTransactionItem {
  id: string;
  invoiceId: string;
  date: string;
  customerName: string;
  customerOrg: string;
  customerEmail: string;
  country: string;
  userType: 'Retail Investor' | 'HNWI Investor' | 'Institutional Investor' | 'Delivery Partner / Project Sponsor' | 'Enterprise Member' | 'Shariah Scholar / Firm';
  category: RevenueCategory;
  description: string;
  amountMYR: number;
  amountUSD: number;
  paymentGateway: PaymentGateway;
  status: InvoiceStatus;
  membershipTier?: 'Free' | 'Plus' | 'Professional' | 'Enterprise' | 'None';
  pdpTier?: 'Free PDP' | 'Pro PDP' | 'Enterprise PDP' | 'None';
  tokensQuantity?: number;
  promotionBadge?: 'Featured' | 'Sponsored' | 'Promoted' | 'None';
  taxMYR: number;
  netMYR: number;
}

export interface RevenueBillingRecord {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  customerName: string;
  customerOrg: string;
  customerEmail: string;
  country: string;
  billingInterval: 'Monthly' | 'Annual' | 'One-Time';
  category: RevenueCategory;
  lineItems: {
    description: string;
    quantity: number;
    unitPriceMYR: number;
    totalMYR: number;
  }[];
  subtotalMYR: number;
  taxMYR: number;
  totalMYR: number;
  totalUSD: number;
  status: InvoiceStatus;
  paymentMethod: string;
  notes?: string;
}

export interface SubscriptionRecord {
  id: string;
  subscriberName: string;
  subscriberOrg: string;
  country: string;
  userType: string;
  type: 'Membership' | 'PDP Plan' | 'Enterprise Node';
  planName: string;
  tier: string;
  monthlyAmountMYR: number;
  monthlyAmountUSD: number;
  billingCycle: 'Monthly' | 'Annual';
  startDate: string;
  nextBillingDate: string;
  autoRenew: boolean;
  status: SubscriptionStatusType;
  healthScore: 'Good' | 'At Risk' | 'Churning';
}

export interface AICreditSaleRecord {
  id: string;
  date: string;
  customerName: string;
  customerOrg: string;
  country: string;
  packageTitle: string;
  tokenCount: number;
  priceMYR: number;
  priceUSD: number;
  paymentMethod: string;
  usagePurpose: string;
  consumedSoFar: number;
}

export interface PromotionSaleRecord {
  id: string;
  date: string;
  targetTitle: string;
  sponsorOrg: string;
  country: string;
  packageType: 'Featured 7D' | 'Featured 30D' | 'Sponsored 30D' | 'Sponsored Takeover' | 'Promoted Practice';
  durationDays: number;
  priceMYR: number;
  priceUSD: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PAUSED';
  views: number;
  clicks: number;
  leads: number;
}

export interface RevenueFilterState {
  dateRange: '7D' | '30D' | '90D' | '1Y' | 'ALL';
  country: string;
  organisation: string;
  revenueType: string;
  membershipTier: string;
  userType: string;
  searchQuery: string;
}

export interface RevenueSummaryMetrics {
  totalRevenueUSD: number;
  totalRevenueMYR: number;
  mrrUSD: number;
  mrrMYR: number;
  arrUSD: number;
  arrMYR: number;
  totalPaidMembers: number;
  membershipRevenueUSD: number;
  aiRevenueUSD: number;
  pdpRevenueUSD: number;
  featuredListingRevenueUSD: number;
  premiumReportRevenueUSD: number;
  advertisingRevenueUSD: number;
  enterpriseRevenueUSD: number;
  revenueGrowthPct: number;
  conversionRatePct: number;
}
