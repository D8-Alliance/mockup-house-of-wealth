import { 
  PromotionCampaign, 
  PromotedProfessionalService, 
  SponsoredMarketplaceBanner 
} from './marketplaceMonetisationTypes';

export const INITIAL_PROMOTION_CAMPAIGNS: PromotionCampaign[] = [
  {
    id: 'CMP-2026-001',
    targetId: 'PROJ-FELDA-01',
    targetType: 'PROJECT',
    targetTitle: 'FELDA Smart Palm Oil Mill & Biogas Modernisation',
    targetOrg: 'FELDA Technoplant Sdn Bhd',
    packageId: 'pkg_featured_30d',
    packageName: 'Featured Project (30 Days)',
    badgeType: 'Featured',
    status: 'ACTIVE',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    promotionCostMYR: 299,
    promotionCostUSD: 72,
    paymentMethod: 'Corporate D-8 Wealth Wallet',
    paidByUserId: 'USR-8821',
    createdAt: '2026-07-31',
    metrics: {
      views: 3420,
      clicks: 412,
      ctr: 12.05,
      leads: 38,
      conversionRate: 9.22,
      estimatedCommitmentMYR: 1250000
    }
  },
  {
    id: 'CMP-2026-002',
    targetId: 'PROJ-RISDA-02',
    targetType: 'PROJECT',
    targetTitle: 'RISDA Smallholders Latex Central Processing Centre',
    targetOrg: 'RISDA Plantation Holdings',
    packageId: 'pkg_featured_7d',
    packageName: 'Featured Project (7 Days)',
    badgeType: 'Featured',
    status: 'ACTIVE',
    startDate: '2026-08-10',
    endDate: '2026-08-17',
    promotionCostMYR: 99,
    promotionCostUSD: 24,
    paymentMethod: 'Corporate FPX (Maybank Islamic)',
    paidByUserId: 'USR-8821',
    createdAt: '2026-08-09',
    metrics: {
      views: 1180,
      clicks: 145,
      ctr: 12.29,
      leads: 14,
      conversionRate: 9.65,
      estimatedCommitmentMYR: 450000
    }
  },
  {
    id: 'CMP-2026-003',
    targetId: 'PROJ-MARA-03',
    targetType: 'PROJECT',
    targetTitle: 'MARA Halal Food Processing Logistics Hub',
    targetOrg: 'MARA Corporation Berhad',
    packageId: 'pkg_sponsored_30d',
    packageName: 'Sponsored Project Spotlight (30 Days)',
    badgeType: 'Sponsored',
    status: 'ACTIVE',
    startDate: '2026-08-05',
    endDate: '2026-09-04',
    promotionCostMYR: 499,
    promotionCostUSD: 120,
    paymentMethod: 'Corporate Card',
    paidByUserId: 'USR-MARA-09',
    createdAt: '2026-08-04',
    metrics: {
      views: 5240,
      clicks: 680,
      ctr: 12.98,
      leads: 62,
      conversionRate: 9.12,
      estimatedCommitmentMYR: 2100000
    }
  },
  {
    id: 'CMP-2026-004',
    targetId: 'SRV-AMANIE-01',
    targetType: 'PROFESSIONAL_SERVICE',
    targetTitle: 'Amanie Shariah & Legal Advisors',
    targetOrg: 'Amanie Advisors Sdn Bhd',
    packageId: 'pkg_service_promo_30d',
    packageName: 'Professional Service Promotion (30 Days)',
    badgeType: 'Promoted',
    status: 'ACTIVE',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    promotionCostMYR: 199,
    promotionCostUSD: 48,
    paymentMethod: 'Direct Debit',
    paidByUserId: 'USR-AMANIE-01',
    createdAt: '2026-07-28',
    metrics: {
      views: 2840,
      clicks: 310,
      ctr: 10.92,
      leads: 29,
      conversionRate: 9.35,
      estimatedCommitmentMYR: 180000
    }
  },
  {
    id: 'CMP-2026-005',
    targetId: 'MKT-BANNER-01',
    targetType: 'SPONSORED_MARKETPLACE',
    targetTitle: 'National Cooperative Apex (ANGKASA) Sovereign Sponsor',
    targetOrg: 'ANGKASA Malaysia',
    packageId: 'pkg_marketplace_takeover',
    packageName: 'Sponsored Marketplace Takeover (30 Days)',
    badgeType: 'Sponsored',
    status: 'ACTIVE',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    promotionCostMYR: 999,
    promotionCostUSD: 240,
    paymentMethod: 'Sovereign Clearing Node',
    paidByUserId: 'USR-ANGKASA-01',
    createdAt: '2026-07-25',
    metrics: {
      views: 14850,
      clicks: 1620,
      ctr: 10.91,
      leads: 142,
      conversionRate: 8.76,
      estimatedCommitmentMYR: 5400000
    }
  },
  {
    id: 'CMP-2026-006',
    targetId: 'PROJ-FELCRA-04',
    targetType: 'PROJECT',
    targetTitle: 'FELCRA Sustainable Cocoa Cultivation & Processing',
    targetOrg: 'FELCRA Berhad',
    packageId: 'pkg_featured_7d',
    packageName: 'Featured Project (7 Days)',
    badgeType: 'Featured',
    status: 'EXPIRED',
    startDate: '2026-07-15',
    endDate: '2026-07-22',
    promotionCostMYR: 99,
    promotionCostUSD: 24,
    paymentMethod: 'Corporate FPX',
    paidByUserId: 'USR-8821',
    createdAt: '2026-07-14',
    metrics: {
      views: 1320,
      clicks: 154,
      ctr: 11.67,
      leads: 18,
      conversionRate: 11.68,
      estimatedCommitmentMYR: 380000
    }
  }
];

export const INITIAL_PROMOTED_SERVICES: PromotedProfessionalService[] = [
  {
    id: 'SRV-AMANIE-01',
    companyName: 'Amanie Advisors & Shariah Partners',
    category: 'Shariah Advisory',
    badgeType: 'Promoted',
    headline: 'Global Shariah Advisory & AAOIFI Standard Structuring',
    description: 'Accredited Shariah advisory firm providing end-to-end Fatwa certification, Sukuk asset screening, and governance oversight across ASEAN and South Asia.',
    location: 'Kuala Lumpur & Kuala Lumpur',
    verifiedCredentials: ['AAOIFI Fellow', 'SC Malaysia Registered', 'Bank Negara Shariah Committee Member'],
    rating: 4.9,
    reviewCount: 42,
    activeCampaignId: 'CMP-2026-004',
    contactEmail: 'advisory@amanieadvisors.com',
    views: 2840,
    inquiries: 29
  },
  {
    id: 'SRV-ZULRAFIQUE-02',
    companyName: 'Zul Rafique & Islamic Finance Legal Group',
    category: 'Legal & Structuring',
    badgeType: 'Sponsored',
    headline: 'Islamic Finance & Cross-Border Mudarabah Contract Drafting',
    description: 'Premier Islamic finance legal practice specializing in Mudarabah, Musharakah, and Ijarah syndication agreements with D-8 multijurisdictional enforceability.',
    location: 'Kuala Lumpur, Malaysia',
    verifiedCredentials: ['Bar Council Malaysia', 'IFSB Legal Working Group', 'Legal500 Tier 1'],
    rating: 4.8,
    reviewCount: 36,
    activeCampaignId: 'CMP-2026-007',
    contactEmail: 'islamicfinance@zulrafique.com.my',
    views: 1980,
    inquiries: 21
  },
  {
    id: 'SRV-RAHIMCO-03',
    companyName: 'Rahim & Co International Asset Valuers',
    category: 'Asset Valuation',
    badgeType: 'Featured',
    headline: 'Independent Plantation & Commercial Asset Valuation',
    description: 'Chartered valuation surveyors providing RICS and BOVAEP compliant tangible asset appraisal for Islamic securitization and capital pooling.',
    location: 'Selangor, Malaysia & Jakarta',
    verifiedCredentials: ['RICS Certified', 'BOVAEP Registered', 'MISM Fellow'],
    rating: 4.9,
    reviewCount: 28,
    activeCampaignId: 'CMP-2026-008',
    contactEmail: 'valuations@rahim-co.com',
    views: 1650,
    inquiries: 19
  }
];

export const INITIAL_SPONSORED_MARKETPLACE_BANNER: SponsoredMarketplaceBanner = {
  id: 'MKT-BANNER-01',
  sponsorName: 'National Cooperative Movement of Malaysia (ANGKASA)',
  sponsorLogoText: 'ANGKASA APEX',
  title: 'D-8 Cooperative & Sovereign Capital Syndicate',
  subtitle: 'Powering high-impact agricultural industrialization, green energy transition, and SME wealth pooling across 8 member nations with zero Riba.',
  ctaText: 'Explore Cooperative Pools',
  targetLinkCategory: 'Agriculture',
  activeCampaignId: 'CMP-2026-005',
  status: 'ACTIVE',
  startDate: '2026-08-01',
  endDate: '2026-08-31'
};
