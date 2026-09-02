import { AIOperationConfig, AICreditTopUpPackage } from './aiMonetisationTypes';

export const AI_INFORMATIONAL_DISCLAIMER = 
  'AI-generated analysis is for informational and decision-support purposes only.';

export const AI_NON_ADVICE_DISCLAIMER = 
  'AI output does not constitute financial, investment, legal or Shariah advice.';

export const AI_OPERATIONS_PRICING_CONFIG: AIOperationConfig[] = [
  {
    key: 'SIMPLE_QUERY',
    name: 'Simple AI Query',
    category: 'Query',
    creditCost: 1,
    description: 'Direct conversational Q&A on Shariah terms, pool matching concepts, and platform navigation.',
    detailedScope: 'Single-turn prompt context lookup with low latency response.',
    avgExecutionTimeSec: 1.2,
    isPremium: false,
    badge: 'Standard'
  },
  {
    key: 'PROJECT_SUMMARY',
    name: 'Project Summary',
    category: 'Project',
    creditCost: 5,
    description: 'High-level synthesis of capital campaign objectives, timeline, sponsor background, and Shariah contract type.',
    detailedScope: 'Synthesizes project prospectus, financials overview, and sponsor track record into an executive brief.',
    avgExecutionTimeSec: 2.5,
    isPremium: false,
    badge: 'Popular'
  },
  {
    key: 'INVESTMENT_ANALYSIS',
    name: 'Investment Analysis',
    category: 'Investment',
    creditCost: 10,
    description: 'Multi-variable ROI forecast, IRR sensitivity table, cashflow yield projection, and benchmark comparison.',
    detailedScope: 'Runs discounted cashflow (DCF), debt service coverage ratio (DSCR), and dividend payout simulations.',
    avgExecutionTimeSec: 3.8,
    isPremium: true,
    badge: 'Analytics'
  },
  {
    key: 'RISK_ANALYSIS',
    name: 'Risk Analysis',
    category: 'Risk',
    creditCost: 15,
    description: 'Multi-factor risk decomposition covering market volatility, counterparty exposure, liquidity, and climate factors.',
    detailedScope: 'Generates risk scores across 6 distinct vectors with automated early-warning alerts and mitigation plans.',
    avgExecutionTimeSec: 4.2,
    isPremium: true,
    badge: 'Advanced Risk'
  },
  {
    key: 'CONTRACT_ANALYSIS',
    name: 'Contract Analysis',
    category: 'Legal',
    creditCost: 20,
    description: 'Deep NLP scan of Islamic legal clauses (Mudarabah, Musharakah, Ijarah, Wakalah) against AAOIFI standards.',
    detailedScope: 'Identifies non-compliant penalty clauses, Gharar (excessive ambiguity), and Riba ambiguities with redline diff.',
    avgExecutionTimeSec: 5.5,
    isPremium: true,
    badge: 'Legal & Shariah'
  },
  {
    key: 'DUE_DILIGENCE',
    name: 'Due Diligence',
    category: 'Due Diligence',
    creditCost: 30,
    description: 'Comprehensive anomaly scan, corporate registry verification (KYB/PEP/Sanctions), and document completeness check.',
    detailedScope: 'Cross-verifies land titles, audited financial statements, tax filings, and sponsor background against registries.',
    avgExecutionTimeSec: 6.8,
    isPremium: true,
    badge: 'Deep Scan'
  },
  {
    key: 'FULL_PROJECT_INTELLIGENCE',
    name: 'Full Project Intelligence',
    category: 'Intelligence',
    creditCost: 50,
    description: 'Complete 360° institutional dossier combining investment modeling, contract redline, due diligence, and risk stress tests.',
    detailedScope: 'Full dossier compilation ready for syndicate investment committees, boards of trustees, and family office CIOs.',
    avgExecutionTimeSec: 9.5,
    isPremium: true,
    badge: 'Apex Suite'
  }
];

export const AI_CREDIT_TOPUP_PACKAGES: AICreditTopUpPackage[] = [
  {
    id: 'topup_50',
    name: 'Starter AI Pack',
    credits: 50,
    bonusCredits: 0,
    priceMYR: 25,
    priceUSD: 6,
    popular: false,
    description: 'Ideal for occasional project screening and simple AI queries.'
  },
  {
    id: 'topup_250',
    name: 'Investor Pro Pack',
    credits: 250,
    bonusCredits: 25,
    priceMYR: 99,
    priceUSD: 24,
    popular: true,
    badge: '+10% Free Bonus',
    description: 'Great for active investors running contract redlines and due diligence scans.'
  },
  {
    id: 'topup_1000',
    name: 'Institutional Syndicate Pack',
    credits: 1000,
    bonusCredits: 150,
    priceMYR: 349,
    priceUSD: 85,
    popular: false,
    badge: '+15% Free Bonus',
    description: 'Designed for syndicates, cooperatives, and family offices managing multiple pools.'
  },
  {
    id: 'topup_3000',
    name: 'Apex Sovereign Pack',
    credits: 3000,
    bonusCredits: 600,
    priceMYR: 899,
    priceUSD: 220,
    popular: false,
    badge: '+20% Free Bonus',
    description: 'Maximum power for large asset managers, enterprise sponsors, and government apexes.'
  }
];
