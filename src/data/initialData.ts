import { AssetItem, ContractItem, MarketplaceItem, LedgerTransaction, CodeReviewSection, PaymentAccount, BeneficiaryItem } from '../types';
import { INITIAL_ASSETS } from './assetsData';
import { INITIAL_CONTRACTS } from './contractsData';

export { INITIAL_ASSETS, INITIAL_CONTRACTS };

export const INITIAL_MARKETPLACE: MarketplaceItem[] = [
  {
    id: 'MKT-JKT-01',
    title: 'Jakarta Commercial Hub #4',
    category: 'Commercial Real Estate',
    location: 'South Jakarta, Indonesia',
    targetYield: '12.5%',
    minInvestment: 5000,
    minInvestmentDisplay: '$5,000',
    raisedAmount: 337500,
    targetAmount: 450000,
    targetAmountDisplay: '$450,000',
    progressPercent: 75,
    riskLevel: 'Low Risk',
    shariahVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80',
    description: 'Prime Grade-A commercial office space fully tenanted by top fintech and halal certification bodies in Jakarta.',
    organisationId: 'ORG-NUSA-DEV',
    countryNodeId: 'CN-IDN'
  },
  {
    id: 'MKT-IST-02',
    title: 'Istanbul Tech Park Expansion',
    category: 'Tech Infrastructure',
    location: 'Istanbul, Turkey',
    targetYield: '14.2%',
    minInvestment: 10000,
    minInvestmentDisplay: '$10,000',
    raisedAmount: 900000,
    targetAmount: 2000000,
    targetAmountDisplay: '$2,000,000',
    progressPercent: 45,
    riskLevel: 'Medium Risk',
    shariahVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    description: 'High-speed green data center and innovation incubator powered by 100% renewable geothermal energy.',
    organisationId: 'ORG-BORS-IST',
    countryNodeId: 'CN-TUR'
  },
  {
    id: 'MKT-KUL-03',
    title: 'Kuala Lumpur Halal Hub',
    category: 'Logistics',
    location: 'Selangor, Malaysia',
    targetYield: '9.8%',
    minInvestment: 2500,
    minInvestmentDisplay: '$2,500',
    raisedAmount: 1840000,
    targetAmount: 2000000,
    targetAmountDisplay: '$2,000,000',
    progressPercent: 92,
    riskLevel: 'Low Risk',
    shariahVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    description: 'Cold-chain storage warehouse near Port Klang catering to international certified halal food exporters.',
    organisationId: 'ORG-D8-GOV',
    countryNodeId: 'CN-MYS'
  },
  {
    id: 'MKT-CGP-05',
    title: 'Chittagong Textile Unit 2',
    category: 'Manufacturing',
    location: 'Chittagong, Bangladesh',
    targetYield: '16.5%',
    minInvestment: 500,
    minInvestmentDisplay: '$500',
    raisedAmount: 180000,
    targetAmount: 300000,
    targetAmountDisplay: '$300,000',
    progressPercent: 60,
    riskLevel: 'High Risk',
    shariahVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
    description: 'Eco-certified organic cotton spinning facility delivering ethical garments to international fair-trade markets.',
    organisationId: 'ORG-SILK-TEX',
    countryNodeId: 'CN-BGD'
  }
];

export const INITIAL_LEDGER: LedgerTransaction[] = [
  {
    id: 'TX-1001',
    hash: '0x4a82e9b2f1104a...e9b2',
    date: 'Aug 04, 2026',
    time: '14:30:05 UTC',
    type: 'Inflow',
    description: 'Deposit via Bank Transfer (Maybank Islamic)',
    amount: 1000,
    isPositive: true,
    balanceAfter: 45200,
    status: 'Completed',
    organisationId: 'ORG-D8-GOV',
    countryNodeId: 'CN-MYS'
  },
  {
    id: 'TX-1002',
    hash: '0x8b3122c19022e1...22c1',
    date: 'Aug 03, 2026',
    time: '09:15:22 UTC',
    type: 'Reinvestment',
    description: 'Mudarabah #402-MD monthly profit auto-compound',
    amount: 500,
    isPositive: true,
    balanceAfter: 44200,
    status: 'Completed',
    organisationId: 'ORG-BORS-IST',
    countryNodeId: 'CN-TUR'
  }
];

export const CODE_REVIEW_FINDINGS: CodeReviewSection[] = [
  {
    id: 'arch',
    title: 'Monorepo & Workspace Architecture',
    score: 95,
    status: 'Passed',
    summary: 'Modular structure with clean tenancy and role isolation.',
    strengths: ['Strict tenant isolation', '36 RBAC role definitions', 'Audit log trail'],
    findings: ['Indexed queries support multi-country node filtering'],
    recommendations: ['Enable strict null checks']
  }
];

export const INITIAL_PAYMENT_ACCOUNTS: PaymentAccount[] = [
  {
    id: 'ACC-MEEZAN-01',
    type: 'Bank Account',
    accountName: 'Ahmed Al-Mansoor',
    institutionName: 'Maybank Islamic Malaysia',
    accountNumber: 'PK36 MEZN 0001 0892 8374 8291',
    swiftBic: 'MEZNPKKAXXX',
    currency: 'USD',
    isDefault: true,
    status: 'Verified',
    isShariahApproved: true
  }
];

export const INITIAL_BENEFICIARIES: BeneficiaryItem[] = [
  {
    id: 'BEN-001',
    name: 'Fatima Al-Mansoor',
    relation: 'Spouse',
    allocationPercent: 40,
    distributionType: 'Profit Share',
    email: 'fatima.almansoor@example.org',
    phone: '+92 300 987 6543',
    identityNumber: '42101-1988123-1',
    payoutMethod: 'Bank Transfer (Maybank Islamic Malaysia)',
    isPrimary: true
  },
  {
    id: 'BEN-002',
    name: 'Tariq Bin Hassan',
    relation: 'Child',
    allocationPercent: 30,
    distributionType: 'Estate / Wasiyyah',
    email: 'tariq.hassan@example.org',
    phone: '+60 12 345 6789',
    identityNumber: '960412-14-5561',
    payoutMethod: 'Maybank Islamic Berhad (MYR Settlement)',
    isPrimary: false
  },
  {
    id: 'BEN-003',
    name: 'Maryam Binti Hassan',
    relation: 'Child',
    allocationPercent: 15,
    distributionType: 'Estate / Wasiyyah',
    email: 'maryam.hassan@example.org',
    phone: '+90 532 123 4567',
    identityNumber: 'TR-38910482910',
    payoutMethod: 'Kuveyt Türk Participation Bank (TRY)',
    isPrimary: false
  },
  {
    id: 'BEN-004',
    name: 'D-8 Global Waqf & Sadaqah Endowment Trust',
    relation: 'Waqf Foundation',
    allocationPercent: 15,
    distributionType: 'Zakat & Sadaqah',
    email: 'waqf-endowment@d8wealth.org',
    phone: '+92 21 555 0192',
    identityNumber: 'PK-WAQF-992019-ISB',
    payoutMethod: 'Meezan Bank Islamic Trust Escrow',
    isPrimary: false
  }
];
