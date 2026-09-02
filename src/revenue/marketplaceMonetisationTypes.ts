export type PromotionBadgeType = 'Featured' | 'Sponsored' | 'Promoted';

export type PromotionTargetType = 'PROJECT' | 'PROFESSIONAL_SERVICE' | 'SPONSORED_MARKETPLACE';

export type PromotionCampaignStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'PAUSED';

export interface PromotionPackage {
  id: string;
  title: string;
  targetType: PromotionTargetType;
  badgeType: PromotionBadgeType;
  durationDays: number;
  priceMYR: number;
  priceUSD: number;
  creditsCost: number;
  placement: string;
  description: string;
  features: string[];
  isActive: boolean;
}

export interface PromotionPerformanceMetrics {
  views: number;
  clicks: number;
  ctr: number; // e.g. 4.2 (%)
  leads: number; // investor inquiries / expressions of interest
  conversionRate: number; // e.g. 1.8 (%)
  estimatedCommitmentMYR: number;
}

export interface PromotionCampaign {
  id: string;
  targetId: string;
  targetType: PromotionTargetType;
  targetTitle: string;
  targetOrg: string;
  packageId: string;
  packageName: string;
  badgeType: PromotionBadgeType;
  status: PromotionCampaignStatus;
  startDate: string;
  endDate: string;
  promotionCostMYR: number;
  promotionCostUSD: number;
  paymentMethod: string;
  paidByUserId: string;
  createdAt: string;
  metrics: PromotionPerformanceMetrics;
}

export interface PromotedProfessionalService {
  id: string;
  companyName: string;
  category: 'Shariah Advisory' | 'Legal & Structuring' | 'Asset Valuation' | 'ESG & Impact Audit' | 'Due Diligence';
  badgeType: PromotionBadgeType;
  headline: string;
  description: string;
  location: string;
  verifiedCredentials: string[];
  rating: number;
  reviewCount: number;
  activeCampaignId: string;
  contactEmail: string;
  views: number;
  inquiries: number;
}

export interface SponsoredMarketplaceBanner {
  id: string;
  sponsorName: string;
  sponsorLogoText: string;
  title: string;
  subtitle: string;
  ctaText: string;
  targetLinkCategory: string;
  activeCampaignId: string;
  status: PromotionCampaignStatus;
  startDate: string;
  endDate: string;
}

export interface PromotionAnalyticsSummary {
  totalActiveCampaigns: number;
  totalViews: number;
  totalClicks: number;
  totalLeads: number;
  avgCTR: number;
  totalRevenueMYR: number;
  dailyImpressionTrend: { date: string; views: number; clicks: number; leads: number }[];
  categoryBreakdown: { category: string; count: number; spendMYR: number }[];
}
