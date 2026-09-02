import { PromotionPackage } from './marketplaceMonetisationTypes';
export { 
  INITIAL_PROMOTION_CAMPAIGNS, 
  INITIAL_PROMOTED_SERVICES, 
  INITIAL_SPONSORED_MARKETPLACE_BANNER 
} from './marketplaceMockData';

export const PROMOTION_DISCLAIMER_TEXT = 
  "Commercial Placement Notice: 'Featured', 'Sponsored', and 'Promoted' designations indicate paid promotional placement. House of Wealth does not endorse, guarantee returns, or designate any project as recommended, safest, or highest-return. All investments carry risk and require independent due diligence.";

export const INITIAL_PROMOTION_PACKAGES: PromotionPackage[] = [
  {
    id: 'pkg_free_listing',
    title: 'Free Project Listing',
    targetType: 'PROJECT',
    badgeType: 'Promoted',
    durationDays: 0,
    priceMYR: 0,
    priceUSD: 0,
    creditsCost: 0,
    placement: 'Standard Organic Catalog & Category Search',
    description: 'Standard organic listing displayed across relevant category filters and search listings with zero upfront cost.',
    features: [
      'Standard project detail page (PDP)',
      'Basic milestone & escrow tracker',
      'Community investor inquiry box',
      'Organic search indexing'
    ],
    isActive: true
  },
  {
    id: 'pkg_featured_7d',
    title: 'Featured Project (7 Days)',
    targetType: 'PROJECT',
    badgeType: 'Featured',
    durationDays: 7,
    priceMYR: 99,
    priceUSD: 24,
    creditsCost: 50,
    placement: 'Top Discovery Shelf, Category Spotlight & Badge',
    description: 'Pinned placement in top discovery shelf with prominent "Featured" badge and category spotlight for 7 days.',
    features: [
      'Top 3 discovery carousel placement',
      'Gold "Featured" badge on PDP & cards',
      'Priority inclusion in category filters',
      'Weekly performance analytics digest'
    ],
    isActive: true
  },
  {
    id: 'pkg_featured_30d',
    title: 'Featured Project (30 Days)',
    targetType: 'PROJECT',
    badgeType: 'Featured',
    durationDays: 30,
    priceMYR: 299,
    priceUSD: 72,
    creditsCost: 150,
    placement: 'Month-long High-Impact Discovery Shelf & Category Header',
    description: 'Sustained 30-day top visibility across the Marketplace with featured badge, 3.8x average investor discovery uplift.',
    features: [
      '30 days top carousel priority ranking',
      'Gold "Featured" badge on PDP & cards',
      'Dedicated section in investor email digest',
      'Real-time lead alerts & CRM tracking'
    ],
    isActive: true
  },
  {
    id: 'pkg_sponsored_30d',
    title: 'Sponsored Project Spotlight (30 Days)',
    targetType: 'PROJECT',
    badgeType: 'Sponsored',
    durationDays: 30,
    priceMYR: 499,
    priceUSD: 120,
    creditsCost: 250,
    placement: 'Prime Hero Spotlight Banner & D-8 Sovereign Digest',
    description: 'Maximum prominence with exclusive "Sponsored" badging, hero spotlight banner, and cross-border investor broadcast.',
    features: [
      'Prominent Hero Header Banner placement',
      'Blue "Sponsored" badge on PDP & listings',
      'Dedicated feature in D-8 Investor Bulletin',
      'Full investor demographic telemetry'
    ],
    isActive: true
  },
  {
    id: 'pkg_service_promo_30d',
    title: 'Professional Service Promotion (30 Days)',
    targetType: 'PROFESSIONAL_SERVICE',
    badgeType: 'Promoted',
    durationDays: 30,
    priceMYR: 199,
    priceUSD: 48,
    creditsCost: 100,
    placement: 'Shariah Advisory & Professional Services Hub',
    description: 'Promote your Shariah advisory, legal audit, or asset valuation practice directly to active project sponsors and wealth managers.',
    features: [
      'Highlighted placement in Advisory Directory',
      'Purple "Promoted Service" badge',
      'Direct RFP and client lead inquiry form',
      'Verified credential badge display'
    ],
    isActive: true
  },
  {
    id: 'pkg_marketplace_takeover',
    title: 'Sponsored Marketplace Takeover (30 Days)',
    targetType: 'SPONSORED_MARKETPLACE',
    badgeType: 'Sponsored',
    durationDays: 30,
    priceMYR: 999,
    priceUSD: 240,
    creditsCost: 500,
    placement: 'Global Marketplace Master Header & D-8 Hub Hero Banner',
    description: 'Sovereign apex or GLC branded header on the House of Wealth Marketplace homepage connecting institutional capital.',
    features: [
      'Marketplace top header banner takeover',
      'Custom sponsor branding & landing page link',
      'Featured cooperative/node ecosystem showcase',
      'Institutional lead routing dashboard'
    ],
    isActive: true
  }
];
