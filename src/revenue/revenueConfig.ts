import { 
  MembershipPlan, 
  PDPPlan, 
  ProjectPromotionPackage, 
  FutureRevenueItem 
} from './revenueTypes';

export const MEMBERSHIP_PLANS_CONFIG: MembershipPlan[] = [
  {
    id: 'plan_free',
    tier: 'FREE',
    name: 'Wealth Pooling Free',
    badge: 'Standard Access',
    monthlyPriceMYR: 0,
    annualPriceMYR: 0,
    monthlyPriceUSD: 0,
    annualPriceUSD: 0,
    aiCreditsMonthly: 20,
    description: 'Essential access for individual investors exploring Islamic wealth pooling and Shariah marketplaces.',
    featureAccess: [
      'Access to Public Wealth Pools & Listings',
      'Basic Islamic Portfolio Tracking',
      'AAOIFI Standard Zakat Calculator',
      'Basic AI Wealth Advisor (20 queries/mo)',
      'Single User Workspace'
    ],
    projectAccess: 'Standard public project catalog',
    reportsAccess: 'Basic executive summaries only',
    analyticsAccess: 'Standard YTD and ROI summaries',
    alertsAccess: 'Email notifications for active investments',
    organizationFeatures: 'Individual profile only',
    apiAccess: 'No API access',
    supportLevel: 'Community & Help Center',
    recommendedFor: ['Retail Investor'],
    isPopular: false
  },
  {
    id: 'plan_plus',
    tier: 'PLUS',
    name: 'Wealth Pooling Plus',
    badge: 'Popular for Active Investors',
    monthlyPriceMYR: 39,
    annualPriceMYR: 390,
    monthlyPriceUSD: 9,
    annualPriceUSD: 90,
    aiCreditsMonthly: 100,
    description: 'Elevated intelligence with expanded AI credits, due diligence summaries, and priority allocations.',
    featureAccess: [
      'Everything in Free',
      '100 Wealth Pooling AI Credits per month',
      'AI Contract Clause Screener & Analysis',
      'Full Project Due Diligence Summaries',
      'Priority Wealth Pool Allocation Alerts',
      'Multi-currency Portfolio Optimization (D-8 Currencies)',
      'Exportable PDF & Tax Reports'
    ],
    projectAccess: 'Early-bird access (24h prior to public open)',
    reportsAccess: 'Full access to standard AI Due Diligence reports',
    analyticsAccess: 'Advanced risk decomposition & ESG-Shariah ratings',
    alertsAccess: 'Real-time Push, SMS & WhatsApp Alerts',
    organizationFeatures: 'Up to 2 linked family accounts',
    apiAccess: 'Read-only portfolio sync webhook',
    supportLevel: 'Standard Email & In-App Support (< 24h SLA)',
    recommendedFor: ['Retail Investor', 'HNWI Investor'],
    isPopular: true
  },
  {
    id: 'plan_pro',
    tier: 'PROFESSIONAL',
    name: 'Wealth Pooling Professional',
    badge: 'For Wealth Managers & Family Offices',
    monthlyPriceMYR: 149,
    annualPriceMYR: 1490,
    monthlyPriceUSD: 35,
    annualPriceUSD: 350,
    aiCreditsMonthly: 400,
    description: 'Institutional-grade Islamic wealth tools, full AI risk matrices, customizable fatwa checks, and multi-entity pooling.',
    featureAccess: [
      'Everything in Plus',
      '400 Wealth Pooling AI Credits per month',
      'Deep AI Due Diligence & Swot Feasibility Scans',
      'Custom Shariah Fatwa Mapping & Governance Verification',
      'Institutional Deal Room & Syndicate Allocations',
      'Real-time Fraud, AML & Counterparty Risk Matrix',
      'Cross-Border Currency Hedging & Clearing Insights',
      'Dedicated Account Officer'
    ],
    projectAccess: 'Priority Syndicate & Pre-IPO / Tokenized Sukuk tranches',
    reportsAccess: 'Unlimited AI Risk, Feasibility & Regulatory reports',
    analyticsAccess: 'Full multi-factor Islamic macroeconomic modeling',
    alertsAccess: 'Instant high-priority signals & AML watchlist flags',
    organizationFeatures: 'Up to 5 team / family office seats',
    apiAccess: 'Full REST API (1,000 requests/day)',
    supportLevel: 'Priority SLA (< 4h) + Dedicated RM',
    recommendedFor: ['Professional Investor', 'Family Office', 'Corporate Investor', 'HNWI Investor'],
    isPopular: false
  },
  {
    id: 'plan_enterprise',
    tier: 'ENTERPRISE',
    name: 'Wealth Pooling Enterprise',
    badge: 'Institutional & Sovereign Nodes',
    monthlyPriceMYR: 999,
    annualPriceMYR: 9990,
    monthlyPriceUSD: 240,
    annualPriceUSD: 2400,
    aiCreditsMonthly: 2500,
    description: 'Bespoke infrastructure for institutional asset managers, sovereign wealth funds, and national cooperative apexes.',
    featureAccess: [
      'Everything in Professional',
      '2,500+ Wealth Pooling AI Credits with custom LLM fine-tuning',
      'Multi-Country Node White-Labeling & Governance Matrix',
      'Custom AAOIFI & Local Central Bank Regulatory Modules',
      'Unlimited Team & Institutional Seats with Custom RBAC',
      'IsDB & Central Bank Settlement Protocol Interfacing',
      'Dedicated Shariah Scholar Board Consultation Hours',
      'Custom SLA & 24/7 Phone / Escalation Desk'
    ],
    projectAccess: 'Direct Origination & Sovereign Sukuk Structuring',
    reportsAccess: 'Custom On-Demand Audited Intelligence Packages',
    analyticsAccess: 'Enterprise Data Lake & Cross-Border Sovereign Flow Analytics',
    alertsAccess: 'Real-time Webhook, SIEM & Regulatory Feeds',
    organizationFeatures: 'Unlimited enterprise entities & subsidiary hierarchies',
    apiAccess: 'Unlimited High-Throughput Dedicated API Endpoint',
    supportLevel: '24/7 Dedicated Technical & Shariah Account Team',
    recommendedFor: ['Institutional Investor', 'Corporate Investor', 'Organisation', 'Enterprise'],
    isPopular: false,
    isCustomPricing: true
  }
];

export const PDP_PLANS_CONFIG: PDPPlan[] = [
  {
    id: 'pdp_free',
    tier: 'FREE_PDP',
    name: 'PDP Standard',
    priceMYR: 0,
    priceUSD: 0,
    billingInterval: 'monthly',
    activeProjectLimit: 1,
    listingAllowanceMonthly: 1,
    aiCreditsMonthly: 50,
    featuredAllowanceMonthly: 0,
    reportAllowanceMonthly: 1,
    supportLevel: 'Standard Community Support',
    features: [
      '1 Active Capital Campaign',
      'Basic Investor Q&A Channel',
      'Standard Milestone Tracking & Escrow',
      '50 AI Assistance Credits/mo'
    ]
  },
  {
    id: 'pdp_pro',
    tier: 'PRO_PDP',
    name: 'PDP Professional Sponsor',
    priceMYR: 99,
    priceUSD: 24,
    billingInterval: 'monthly',
    activeProjectLimit: 5,
    listingAllowanceMonthly: 5,
    aiCreditsMonthly: 300,
    featuredAllowanceMonthly: 1,
    reportAllowanceMonthly: 5,
    supportLevel: 'Priority Sponsor Desk (< 12h)',
    features: [
      'Up to 5 Active Capital Campaigns',
      '1 Free Featured Project Promotion per quarter',
      'Automated Shariah Milestone Signoff Engine',
      'Investor Analytics & Lead Management CRM',
      '300 AI Credits for Prospectus Drafting'
    ]
  },
  {
    id: 'pdp_enterprise',
    tier: 'ENTERPRISE_PDP',
    name: 'PDP Apex & GLC Sponsor',
    priceMYR: 499,
    priceUSD: 120,
    billingInterval: 'monthly',
    activeProjectLimit: 50,
    listingAllowanceMonthly: 20,
    aiCreditsMonthly: 1500,
    featuredAllowanceMonthly: 4,
    reportAllowanceMonthly: 20,
    supportLevel: 'Dedicated Apex Account Manager',
    features: [
      'Unlimited / Up to 50 Active Capital Campaigns',
      'Cooperative / Plantation Multi-estate Hierarchy (FELDA, FELCRA, RISDA, MARA)',
      '4 Featured Promotion Slots per month',
      'Priority Shariah Scholar Board Vetting Queue',
      'Dedicated Custom Escrow & IsDB Clearing Gateway'
    ]
  }
];

export const PROJECT_PROMOTION_PACKAGES: ProjectPromotionPackage[] = [
  {
    id: 'promo_standard',
    title: 'Standard Organic Placement',
    durationDays: 0,
    priceMYR: 0,
    priceUSD: 0,
    creditsCost: 0,
    badgeText: 'Promoted',
    placement: 'Regular Marketplace Search & Category Feed',
    description: 'Standard organic listing displayed across relevant category filters and search results.'
  },
  {
    id: 'promo_featured_7d',
    title: 'Featured Boost (7 Days)',
    durationDays: 7,
    priceMYR: 99,
    priceUSD: 24,
    creditsCost: 50,
    badgeText: 'Featured',
    placement: 'Top 3 Carousel on Marketplace & Category Banner',
    description: 'Pinned placement in top discovery shelf with prominent "Featured" badge and category spotlight for 7 days.'
  },
  {
    id: 'promo_featured_30d',
    title: 'High-Impact Sponsor Spotlight (30 Days)',
    durationDays: 30,
    priceMYR: 299,
    priceUSD: 70,
    creditsCost: 150,
    badgeText: 'Sponsored',
    placement: 'Prime Hero Carousel, Top Category Ranking & Weekly D-8 Investor Digest',
    description: 'Maximum visibility with sponsored spotlight tag, 30 days prominent placement, and inclusion in weekly investor newsletters.'
  }
];

export const CREDIT_TOPUP_PACKAGES = [
  { id: 'topup_50', credits: 50, priceMYR: 25, priceUSD: 6, bonusCredits: 0, popular: false },
  { id: 'topup_250', credits: 250, priceMYR: 99, priceUSD: 24, bonusCredits: 25, popular: true },
  { id: 'topup_1000', credits: 1000, priceMYR: 349, priceUSD: 85, bonusCredits: 150, popular: false }
];

export const FUTURE_REVENUE_CONFIG: FutureRevenueItem[] = [
  {
    id: 'fut_tx_fee',
    name: 'Pooling & Syndication Success Fee',
    category: 'Success Fee',
    description: '0.25% - 0.75% transaction fee applied upon successful closing and disbursement of capital pooling campaigns.',
    regulatoryStatus: 'FUTURE / REGULATORY REVIEW REQUIRED',
    projectedTimeline: 'Phase 2 (Post Sandbox Regulatory Clearance)',
    targetJurisdictions: ['Securities Commission Malaysia (SC)', 'OJK Indonesia', 'CMB Turkey', 'Securities Commission Malaysia']
  },
  {
    id: 'fut_token_fee',
    name: 'Digital Sukuk Asset Tokenization Protocol Fee',
    category: 'Digital Asset / Token',
    description: 'Smart contract minting and on-chain ledger registry fee per tokenized Sukuk tranche issuance.',
    regulatoryStatus: 'FUTURE / REGULATORY REVIEW REQUIRED',
    projectedTimeline: 'Phase 3 (Post DLT License Authorization)',
    targetJurisdictions: ['Securities Commission Malaysia Regulatory Sandbox', 'SC Digital Asset Guidelines', 'Bappebti Indonesia']
  },
  {
    id: 'fut_secondary_fee',
    name: 'Secondary Market Liquidity & Matching Spread',
    category: 'Secondary Market Fee',
    description: '0.15% fee on peer-to-peer liquidity transfers and secondary trading of fractionalized assets.',
    regulatoryStatus: 'FUTURE / REGULATORY REVIEW REQUIRED',
    projectedTimeline: 'Phase 3 (Exchange Operator License)',
    targetJurisdictions: ['Labuan FSA', 'Bursa Malaysia', 'Borsa Istanbul']
  }
];

// ToyyibPay charges its FPX fee to the payer (server sets billChargeToCustomer=0).
// Keep in sync with TOYYIBPAY_FPX_FEE_MYR in server/src/membership/membership.service.ts.
export const TOYYIBPAY_FPX_FEE_MYR = 1;
