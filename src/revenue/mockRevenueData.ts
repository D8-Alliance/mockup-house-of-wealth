import { 
  UserMembership, 
  HoWCreditBalance, 
  CreditTransaction, 
  PremiumReportItem, 
  BillingRecord, 
  RevenueMetric 
} from './revenueTypes';

export const INITIAL_USER_MEMBERSHIP: UserMembership = {
  userId: 'USR-8821',
  planId: 'plan_plus',
  tier: 'PLUS',
  billingInterval: 'monthly',
  status: 'Active',
  currentPeriodStart: '2026-08-01',
  currentPeriodEnd: '2026-09-15',
  autoRenew: true,
  paymentMethodSummary: 'Visa ending in 4242 (Simulated)',
  aiCreditsRemaining: 72,
  aiCreditsTotal: 100
};

export const INITIAL_CREDIT_BALANCE: HoWCreditBalance = {
  userId: 'USR-8821',
  totalCredits: 100,
  usedCredits: 28,
  availableCredits: 72,
  monthlyAllowance: 100,
  purchasedCredits: 0,
  resetDate: '2026-09-15'
};

export const INITIAL_CREDIT_TRANSACTIONS: CreditTransaction[] = [
  {
    id: 'CTX-109',
    userId: 'USR-8821',
    amount: 10,
    isDebit: true,
    type: 'DEEP_DILIGENCE',
    description: 'AI Deep Due Diligence on FELDA Agribusiness Palm Oil Yields',
    timestamp: '2026-08-12 14:32',
    balanceAfter: 72
  },
  {
    id: 'CTX-108',
    userId: 'USR-8821',
    amount: 5,
    isDebit: true,
    type: 'AI_ADVISORY',
    description: 'AAOIFI Shariah Clause Screen on Mudarabah Agreement #441',
    timestamp: '2026-08-10 09:15',
    balanceAfter: 82
  },
  {
    id: 'CTX-107',
    userId: 'USR-8821',
    amount: 13,
    isDebit: true,
    type: 'REPORT_UNLOCK',
    description: 'Unlocked "D-8 Halal Logistics & Cross-Border Sukuk Intelligence"',
    timestamp: '2026-08-05 16:45',
    balanceAfter: 87
  },
  {
    id: 'CTX-106',
    userId: 'USR-8821',
    amount: 100,
    isDebit: false,
    type: 'ALLOWANCE_GRANT',
    description: 'Monthly HoW Plus Plan AI Allowance Granted',
    timestamp: '2026-08-01 00:00',
    balanceAfter: 100
  }
];

export const INITIAL_PREMIUM_REPORTS: PremiumReportItem[] = [
  {
    id: 'REP-01',
    title: 'FELDA Smart Agri-Estate Tokenization Feasibility & Yield Analysis',
    category: 'AI Project Intelligence',
    targetEntity: 'FELDA Technoplant Sdn Bhd (Malaysia)',
    summary: 'Comprehensive AI intelligence report analyzing 5,000 hectares automated palm oil replanting yields, Sukuk Ijarah cashflow structure, and 14.8% projected return.',
    requiredTier: 'PLUS',
    creditsToUnlock: 15,
    isUnlocked: true,
    rating: 'A+ High Confidence',
    shariahAuditStatus: 'Certified by IsDB & SC Shariah Board',
    publishedDate: '2026-08-08',
    executiveSummary: 'The project presents strong fundamentals backed by sovereign land titles and long-term off-take agreements with major D-8 refiners. Debt-to-equity ratio is well within AAOIFI threshold (18% vs 33% max limit).',
    riskMetrics: [
      { label: 'Commodity Price Volatility', score: 28, verdict: 'Low Exposure' },
      { label: 'Weather & Climate Factor', score: 35, verdict: 'Mitigated via Takaful' },
      { label: 'Counterparty Offtake Risk', score: 12, verdict: 'Sovereign Guarantee' },
      { label: 'Shariah Compliance Score', score: 98, verdict: 'Pristine AAOIFI FAS 33' }
    ],
    financialForecast: [
      { year: '2026', projection: 'RM 14.2M Net Operating Income', confidence: '96%' },
      { year: '2027', projection: 'RM 18.5M Net Operating Income', confidence: '92%' },
      { year: '2028', projection: 'RM 22.1M Full Production Peak', confidence: '89%' }
    ],
    shariahConsiderations: [
      'Structured purely under Ijarah Muntahia Bittamleek with structural insurance borne by lessor.',
      'Strict prohibition of conventional interest compounding on late payment penalty; charity purification fund pre-allocated.'
    ],
    recommendations: [
      'Recommended for balanced growth portfolios seeking high dividend yield.',
      'Optimal ticket allocation: 5% - 15% of private Islamic wealth bucket.'
    ]
  },
  {
    id: 'REP-02',
    title: 'D-8 Cross-Border Sovereign Sukuk & Currency Spread Risk Matrix',
    category: 'Market Intelligence',
    targetEntity: 'D-8 Multi-Jurisdiction Sovereign Basket (MYR, TRY, IDR, EGP, MYR)',
    summary: 'Macro intelligence evaluating currency volatility, hedging strategies using Islamic FX Wa’ad, and optimal diversification ratios.',
    requiredTier: 'PROFESSIONAL',
    creditsToUnlock: 30,
    isUnlocked: false,
    rating: 'Institutional Grade',
    shariahAuditStatus: 'AAOIFI Standard 30 Mapped',
    publishedDate: '2026-08-11',
    executiveSummary: 'Cross-border liquidity pooling across D-8 hubs requires active FX Wa’ad forward contracts to insulate local investors against Turkish Lira and Egyptian Pound swings while tapping USD/MYR liquidity.',
    riskMetrics: [
      { label: 'Currency Devaluation Risk', score: 62, verdict: 'Moderate - Requires Waad Hedging' },
      { label: 'Regulatory Transfer Risk', score: 22, verdict: 'Low (D-8 Bilateral Clearance)' },
      { label: 'Liquidity Depth', score: 85, verdict: 'Very High ($4.2B D-8 Interbank)' }
    ],
    financialForecast: [
      { year: 'Q3 2026', projection: 'Blended Yield: 8.9% p.a. in USD Equivalent', confidence: '94%' },
      { year: 'Q4 2026', projection: 'Blended Yield: 9.4% p.a. in USD Equivalent', confidence: '91%' }
    ],
    shariahConsiderations: [
      'Unilateral binding promise (Wa’ad) utilized for currency risk mitigation in strict compliance with AAOIFI FAS 28.'
    ],
    recommendations: [
      'Recommended for Family Offices and Institutional Treasuries managing multi-currency cash reserves.'
    ]
  },
  {
    id: 'REP-03',
    title: 'Green Halal Cold Chain Logistics Corridor Due Diligence',
    category: 'Due Diligence Summary',
    targetEntity: 'Trans-ASEAN Halal Port Authority & Risda Agri-Hub',
    summary: 'Engineering, IoT temperature monitoring, and revenue-sharing audit for cold-chain facilities connecting Port Klang to Tanjung Priok.',
    requiredTier: 'PLUS',
    creditsToUnlock: 20,
    isUnlocked: false,
    rating: 'AA Investment Grade',
    shariahAuditStatus: 'Shariah Audited (Jakim & MUI Mapped)',
    publishedDate: '2026-08-01',
    executiveSummary: 'High asset-backing with cold storage real estate, solar rooftop generation, and guaranteed throughput contracts from maritime exporters.',
    riskMetrics: [
      { label: 'Asset Depreciation Risk', score: 18, verdict: 'Protected by Long Usufruct' },
      { label: 'Energy Cost Shock', score: 15, verdict: 'Off-grid Solar Hedged' },
      { label: 'Regulatory Halal Integrity', score: 99, verdict: '100% End-to-End Tracking' }
    ],
    financialForecast: [
      { year: '2026', projection: 'USD 3.8M EBITDA', confidence: '95%' },
      { year: '2027', projection: 'USD 5.2M EBITDA', confidence: '90%' }
    ],
    shariahConsiderations: [
      'Musharakah joint-venture with capital preservation provisions excluded as per Shariah jurisprudence.'
    ],
    recommendations: [
      'Suitable for ESG Islamic funds and infrastructure syndicates.'
    ]
  }
];

export const INITIAL_BILLING_RECORDS: BillingRecord[] = [
  {
    id: 'INV-2026-081',
    userId: 'USR-8821',
    invoiceNumber: 'HOW-INV-8821-08',
    date: '2026-08-01',
    description: 'HoW Plus Membership (Monthly Subscription)',
    amountMYR: 39,
    amountUSD: 9,
    stream: 'Membership',
    status: 'Paid',
    paymentMethod: 'Simulated Card •••• 4242'
  },
  {
    id: 'INV-2026-071',
    userId: 'USR-8821',
    invoiceNumber: 'HOW-INV-8821-07',
    date: '2026-07-01',
    description: 'HoW Plus Membership (Monthly Subscription)',
    amountMYR: 39,
    amountUSD: 9,
    stream: 'Membership',
    status: 'Paid',
    paymentMethod: 'Simulated Card •••• 4242'
  },
  {
    id: 'INV-2026-065',
    userId: 'USR-8821',
    invoiceNumber: 'HOW-INV-8821-06',
    date: '2026-06-15',
    description: 'HoW AI Credits Top-up (250 Credits Pack)',
    amountMYR: 99,
    amountUSD: 24,
    stream: 'AI Credits',
    status: 'Paid',
    paymentMethod: 'D-8 Wealth Wallet'
  }
];

export const INITIAL_REVENUE_METRICS: RevenueMetric = {
  totalRevenueUSD: 248920,
  mrrUSD: 38450,
  arrUSD: 461400,
  totalPaidMembers: 1420,
  membershipRevenueUSD: 118200,
  aiRevenueUSD: 42150,
  pdpRevenueUSD: 36800,
  listingRevenueUSD: 24500,
  advertisingRevenueUSD: 14870,
  premiumReportRevenueUSD: 8900,
  enterpriseRevenueUSD: 3500,
  monthlyTrend: [
    { month: 'Mar 26', membership: 14200, aiCredits: 3800, pdp: 4200, promotions: 2100, reports: 950, total: 25250 },
    { month: 'Apr 26', membership: 18500, aiCredits: 5200, pdp: 5600, promotions: 3400, reports: 1200, total: 33900 },
    { month: 'May 26', membership: 22800, aiCredits: 6900, pdp: 6800, promotions: 4200, reports: 1550, total: 42250 },
    { month: 'Jun 26', membership: 27400, aiCredits: 8400, pdp: 8100, promotions: 5300, reports: 1890, total: 51090 },
    { month: 'Jul 26', membership: 32600, aiCredits: 9800, pdp: 9500, promotions: 6100, reports: 2200, total: 60200 },
    { month: 'Aug 26', membership: 38450, aiCredits: 11200, pdp: 11400, promotions: 7200, reports: 2600, total: 70850 }
  ]
};
