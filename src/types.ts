export type LanguageCode = 'en' | 'bn' | 'ar' | 'tr' | 'fa' | 'ms' | 'ha' | 'id' | 'ur' | 'fr';

export type NavTab = 
  | 'dashboard'
  | 'ai-engine'
  | 'admin-center'
  | 'sponsor-portal'
  | 'marketplace'
  | 'pooling'
  | 'investments'
  | 'assets'
  | 'contracts'
  | 'wallet'
  | 'financials'
  | 'beneficiaries'
  | 'documents'
  | 'ledger'
  | 'profile'
  | 'membership'
  | 'billing-transactions';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
    role: string;
    organization?: string;
    organizationName?: string;
    organisationId?: string;
    countryNodeId?: string;
  bio?: string;
  country: string;
  countryCode: string;
  verified: boolean;
  avatarUrl: string;
  joinedDate?: string;
  kycLevel?: string;
  preferredCurrency?: string;
  autoZakatPercent?: number;
  twoFactorEnabled?: boolean;
  notifyEmail?: boolean;
  notifyPush?: boolean;
  notifySMS?: boolean;
  timezone?: string;
}

export interface PaymentAccount {
  id: string;
  type: 'Bank Account' | 'E-Wallet';
  accountName: string;
  institutionName: string;
  accountNumber: string;
  swiftBic?: string;
  currency: string;
  isDefault: boolean;
  status: 'Verified' | 'Pending Verification';
  isShariahApproved: boolean;
}

export interface BeneficiaryItem {
  id: string;
  name: string;
  relation: 'Spouse' | 'Child' | 'Parent' | 'Sibling' | 'Waqf Foundation' | 'Zakat Institution' | 'Other';
  allocationPercent: number;
  distributionType: 'Profit Share' | 'Estate / Wasiyyah' | 'Zakat & Sadaqah' | 'All Proceeds';
  email?: string;
  phone?: string;
  identityNumber?: string;
  payoutMethod: string;
  isPrimary: boolean;
}

export type AssetType = 'Real Estate' | 'Commodities' | 'Financial Inst.' | 'Private Equity' | 'Machinery' | 'IP & Knowledge';
export type AssetStatus = 'Active' | 'Pending' | 'Locked';

export interface AssetItem {
  id: string;
  name: string;
  type: AssetType;
  location: string;
  value: number;
  valueDisplay: string;
  ytdReturn: string;
  status: AssetStatus;
  shariahStatus: 'Verified' | 'Pending Review';
  collateralPercent: number;
  liquidityPercent: number;
  imageUrl: string;
  imageUrls?: string[];
  description?: string;
  owner?: string;
  custodian?: string;
  organisationId?: string;
  countryNodeId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ContractType = 'Mudarabah' | 'Musharakah' | 'Ijarah' | 'Murabaha' | 'Wakalah';
export type ContractStatus = 'Active' | 'Pending' | 'Matured' | 'Draft';

export interface ContractItem {
  id: string;
  title: string;
  type: ContractType;
  counterparty: string;
  status: ContractStatus;
  maturityDate: string;
  value: number;
  valueDisplay: string;
  profitRatio: string;
  mySharePercent: number;
  managerSharePercent: number;
  nextDistributionDate: string;
  currentValue: number;
  totalInvested: number;
  ytdProfit: number;
  description?: string;
  organisationId?: string;
  countryNodeId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  shariahStatus?: string;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  category: string;
  location: string;
  targetYield: string;
  minInvestment: number;
  minInvestmentDisplay: string;
  raisedAmount: number;
  targetAmount: number;
  targetAmountDisplay: string;
  progressPercent: number;
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk';
  shariahVerified: boolean;
  imageUrl: string;
  description: string;
  organisationId?: string;
  countryNodeId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LedgerTransaction {
  id: string;
  hash: string;
  date: string;
  time: string;
  type: 'Inflow' | 'Outflow' | 'Profit Share' | 'Reinvestment';
  description: string;
  amount: number;
  isPositive: boolean;
  balanceAfter: number;
  status: 'Completed' | 'Pending';
  organisationId?: string;
  countryNodeId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CodeReviewSection {
  id: string;
  title: string;
  score: number;
  status: 'Passed' | 'Warning' | 'Optimization';
  summary: string;
  strengths: string[];
  findings: string[];
  recommendations: string[];
}

// AI Wealth Engine Types
export type AIMenuTab = 
  | 'advisor'
  | 'matching'
  | 'contracts'
  | 'duediligence'
  | 'risk'
  | 'optimizer'
  | 'fraud'
  | 'assistant';

export interface AIInvestorProfile {
  income: number;
  age: number;
  objective: 'Wealth Accumulation' | 'Capital Preservation' | 'Aggressive Growth' | 'Regular Income & Zakat Purified';
  experience: 'Beginner' | 'Intermediate' | 'Advanced' | 'Institutional';
  country: string;
  riskProfile: 'Conservative' | 'Moderate' | 'Balanced' | 'Growth' | 'Aggressive';
}

export interface AIPoolMatchResult {
  poolId: string;
  poolTitle: string;
  matchPercent: number;
  reasons: string[];
  risk: 'Low Risk' | 'Medium Risk' | 'High Risk';
  recommendation: string;
  contractType: string;
  expectedYield: string;
}

export interface AIContractAnalysis {
  contractId: string;
  recommendedType: 'Musharakah' | 'Mudarabah' | 'Wakalah' | 'Murabahah' | 'Ijarah' | 'Salam' | 'Istisna';
  reasonWhy: string;
  shariahComplianceScore: number;
  riskyClauses: { clause: string; severity: 'High' | 'Medium' | 'Low'; remedy: string }[];
  summary: string;
}

export interface AIDueDiligenceReport {
  title: string;
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  financialMetrics: { metric: string; val: string; status: 'Healthy' | 'Warning' | 'Critical' }[];
  marketFeasibilityScore: number;
  riskRating: string;
  managementEvaluation: string;
  finalRecommendation: 'APPROVED FOR TOKENIZATION' | 'CONDITIONAL APPROVAL' | 'REJECTED';
}

export interface AIRiskScoreDetail {
  businessRisk: number;
  countryRisk: number;
  marketRisk: number;
  financialRisk: number;
  esgRisk: number;
  shariahRisk: number;
  overallScore: number; // 0-100 (100 = safest)
  riskCategory: 'Low Risk (AA+)' | 'Moderate Risk (BBB)' | 'Elevated Risk (BB-)' | 'High Risk (CCC)';
}

export interface AIFraudAlert {
  id: string;
  category: 'AML Alert' | 'Duplicate Assets' | 'Fake Documents' | 'Abnormal Transactions';
  title: string;
  entity: string;
  severity: 'Critical' | 'Warning' | 'Info';
  timestamp: string;
  details: string;
  status: 'Investigating' | 'Flagged' | 'Resolved' | 'Whitelisted';
}

// Enterprise Governance & Administration Center Types
export type AdminModuleSection = 
  | 'sys_country'
  | 'sys_orgs'
  | 'sys_roles'
  | 'sys_permissions'
  | 'sys_workflow'
  | 'sys_approvalmatrix'
  | 'compliance_kyc'
  | 'compliance_kyb'
  | 'compliance_aml'
  | 'compliance_pep'
  | 'compliance_sanctions'
  | 'risk_register'
  | 'risk_incidents'
  | 'sys_auditlogs'
  | 'analytics_monitoring'
  | 'fin_fees'
  | 'fin_revenue'
  | 'fin_settlement'
  | 'sys_digitalsig'
  | 'sys_doc_templates'
  | 'shariah_templates'
  | 'shariah_governance'
  | 'shariah_fatwa'
  | 'dash_compliance'
  | 'dash_audit'
  | 'dash_finance'
  | 'dash_security'
  | 'sys_reports'
  | 'sys_currency'
  | 'sys_exchangerate'
  | 'sys_notifications'
  | 'shariah_approvals';

export interface WorkflowItem {
  id: string;
  title: string;
  module: string;
  initiator: string;
  currentStage: string;
  status: 'Pending Approval' | 'Approved' | 'Rejected' | 'In Review';
  slaHoursRemaining: number;
  approvalChain: { role: string; user?: string; status: 'Approved' | 'Pending' | 'Rejected'; date?: string }[];
  createdAt: string;
}

