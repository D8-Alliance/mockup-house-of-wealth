import { 
  Pool, 
  ProfitDistributionRecord, 
  CapitalCall, 
  ExitRequest, 
  SecondaryMarketOrder,
  PoolAnalytics 
} from './PoolingTypes';

export const INITIAL_POOLS: Pool[] = [
  {
    id: 'POOL-101',
    name: 'Malaysia SME Halal Export Supply Chain Pool',
    category: 'SME / Trade',
    sponsorName: 'FELDA Global Ventures',
    targetAmount: 5000000,
    raisedAmount: 4250000,
    minInvestment: 500,
    status: 'Open',
    contractType: 'Mudarabah',
    expectedYieldPercent: 8.5,
    durationMonths: 24,
    country: 'Malaysia',
    countryCode: 'MY',
    investorsCount: 248,
    riskRating: 'A+',
    shariahAdvisor: 'Prof. Dr. Ashraf Hashim',
    startDate: '2026-01-15',
    maturityDate: '2028-01-15',
    description: 'Direct financing pool for certified SME Halal food processing exporters with guaranteed purchase contracts.',
    autoReinvestEligible: true,
    assetCollateralValue: 6800000
  },
  {
    id: 'POOL-102',
    name: 'Indonesia Smart Micro-Hydro Irrigation Waqf Pool',
    category: 'Waqf / Social Impact',
    sponsorName: 'Masjid Agung Central Waqf',
    targetAmount: 3000000,
    raisedAmount: 3000000,
    minInvestment: 100,
    status: 'Funded',
    contractType: 'Waqf',
    expectedYieldPercent: 6.2,
    durationMonths: 36,
    country: 'Indonesia',
    countryCode: 'ID',
    investorsCount: 412,
    riskRating: 'A',
    shariahAdvisor: 'Dr. Oni Sahroni',
    startDate: '2025-06-01',
    maturityDate: '2028-06-01',
    description: 'Permanent Waqf liquidity pool for self-sustaining solar & hydro irrigation networks across West Java.',
    autoReinvestEligible: false,
    assetCollateralValue: 4500000
  },
  {
    id: 'POOL-103',
    name: 'Kuala Lumpur Port Green Logistics Hub Pool',
    category: 'Property / Logistics',
    sponsorName: 'Indus Industrial Realty',
    targetAmount: 15000000,
    raisedAmount: 11200000,
    minInvestment: 2500,
    status: 'Active',
    contractType: 'Musharakah',
    expectedYieldPercent: 9.8,
    durationMonths: 48,
    country: 'Malaysia',
    countryCode: 'PK',
    investorsCount: 180,
    riskRating: 'A+',
    shariahAdvisor: 'Dr. Imran Usmani Shariah Board',
    startDate: '2025-09-01',
    maturityDate: '2029-09-01',
    description: 'Co-ownership equity pool in automated cold-storage warehouse serving regional pharmaceutical and agritech supply lines.',
    autoReinvestEligible: true,
    assetCollateralValue: 21000000
  },
  {
    id: 'POOL-104',
    name: 'Nigeria Solar Clean Energy Green Sukuk Pool',
    category: 'Green Sukuk',
    sponsorName: 'Lagos Clean Power Corp',
    targetAmount: 4000000,
    raisedAmount: 1450000,
    minInvestment: 1000,
    status: 'Open',
    contractType: 'Wakalah',
    expectedYieldPercent: 11.2,
    durationMonths: 36,
    country: 'Nigeria',
    countryCode: 'NG',
    investorsCount: 94,
    riskRating: 'B+',
    shariahAdvisor: 'Sheikh Dr. Ahmed Lemu',
    startDate: '2026-03-01',
    maturityDate: '2029-03-01',
    description: 'Agency-based Wakalah pool financing off-grid mini solar grids for rural agro-processing communities.',
    autoReinvestEligible: true,
    assetCollateralValue: 5200000
  },
  {
    id: 'POOL-105',
    name: 'Istanbul DeepTech Startup Accelerator Pool',
    category: 'Technology Accelerator',
    sponsorName: 'Bosphorus Venture Capital',
    targetAmount: 2500000,
    raisedAmount: 2500000,
    minInvestment: 5000,
    status: 'Execution',
    contractType: 'Mudarabah',
    expectedYieldPercent: 14.5,
    durationMonths: 60,
    country: 'Turkey',
    countryCode: 'TR',
    investorsCount: 68,
    riskRating: 'B',
    shariahAdvisor: 'Prof. Dr. Hayrettin Karaman',
    startDate: '2025-01-10',
    maturityDate: '2030-01-10',
    description: 'Venture profit-sharing pool investing in AI & Fintech startups with global Shariah certification.',
    autoReinvestEligible: false,
    assetCollateralValue: 3100000
  }
];

export const INITIAL_DISTRIBUTIONS: ProfitDistributionRecord[] = [
  {
    id: 'DIST-901',
    poolId: 'POOL-101',
    poolName: 'Malaysia SME Halal Export Supply Chain Pool',
    distributionDate: '2026-07-30',
    grossProfitAmount: 180000,
    mudaribSharePercent: 20,
    investorPayoutAmount: 144000,
    status: 'Audit Verified',
    txHash: '0x8f2a...91b4'
  },
  {
    id: 'DIST-902',
    poolId: 'POOL-103',
    poolName: 'Kuala Lumpur Port Green Logistics Hub Pool',
    distributionDate: '2026-08-15',
    grossProfitAmount: 320000,
    mudaribSharePercent: 15,
    investorPayoutAmount: 272000,
    status: 'Scheduled',
    txHash: '0x3c7e...20d1'
  }
];

export const INITIAL_CAPITAL_CALLS: CapitalCall[] = [
  {
    id: 'CALL-401',
    poolId: 'POOL-103',
    poolName: 'Kuala Lumpur Port Green Logistics Hub Pool',
    calledAmount: 500000,
    dueDate: '2026-08-25',
    status: 'Pending',
    purpose: 'Solar roof installation expansion phase 2'
  }
];

export const INITIAL_EXIT_REQUESTS: ExitRequest[] = [
  {
    id: 'EXIT-101',
    poolId: 'POOL-101',
    poolName: 'Malaysia SME Halal Export Supply Chain Pool',
    investorId: 'USR-8821',
    investorName: 'Ahmed Al-Mansoor',
    tokenUnits: 50,
    requestedAmount: 25000,
    discountPercent: 1.5,
    requestDate: '2026-08-01',
    status: 'Open'
  }
];

export const INITIAL_SECONDARY_ORDERS: SecondaryMarketOrder[] = [
  {
    id: 'SEC-801',
    poolId: 'POOL-101',
    poolName: 'Malaysia SME Halal Export Supply Chain Pool',
    sellerName: 'Kuala Lumpur Institutional Fund',
    tokenUnits: 100,
    unitPrice: 500,
    totalPrice: 50000,
    yieldToMaturity: 8.8,
    orderType: 'Sell',
    status: 'Active'
  },
  {
    id: 'SEC-802',
    poolId: 'POOL-103',
    poolName: 'Kuala Lumpur Port Green Logistics Hub Pool',
    sellerName: 'Indus Family Office',
    tokenUnits: 200,
    unitPrice: 2500,
    totalPrice: 500000,
    yieldToMaturity: 10.1,
    orderType: 'Sell',
    status: 'Active'
  }
];

export const MOCK_POOL_ANALYTICS: PoolAnalytics = {
  totalTarget: 29500000,
  totalRaised: 22450000,
  avgExpectedYield: 9.8,
  activeInvestorsCount: 1002,
  totalProfitDistributed: 1840000,
  shariahComplianceScore: 100
};
