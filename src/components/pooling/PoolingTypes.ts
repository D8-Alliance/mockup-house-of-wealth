export type PoolLifecycleStatus = 
  | 'Draft' 
  | 'Under Review' 
  | 'Approved' 
  | 'Open' 
  | 'Pending' 
  | 'Active' 
  | 'Funded' 
  | 'Execution' 
  | 'Profit Distribution' 
  | 'Closed' 
  | 'Archived';

export type ShariahContractType = 
  | 'Mudarabah' 
  | 'Musharakah' 
  | 'Wakalah' 
  | 'Waqf' 
  | 'Ijarah' 
  | 'Murabahah';

export type PoolCategory = 
  | 'SME / Trade' 
  | 'Agriculture' 
  | 'Property / Logistics' 
  | 'Green Sukuk' 
  | 'Tokenized RWA' 
  | 'Waqf / Social Impact' 
  | 'Technology Accelerator';

export interface PoolAnalytics {
  totalTarget: number;
  totalRaised: number;
  avgExpectedYield: number;
  activeInvestorsCount: number;
  totalProfitDistributed: number;
  shariahComplianceScore: number;
}

export interface Pool {
  id: string;
  name: string;
  category: PoolCategory;
  sponsorName: string;
  targetAmount: number;
  raisedAmount: number;
  minInvestment: number;
  status: PoolLifecycleStatus;
  contractType: ShariahContractType;
  expectedYieldPercent: number;
  durationMonths: number;
  country: string;
  countryCode: string;
  investorsCount: number;
  riskRating: 'A+' | 'A' | 'B+' | 'B';
  shariahAdvisor: string;
  startDate: string;
  maturityDate: string;
  description: string;
  autoReinvestEligible: boolean;
  assetCollateralValue: number;
}

export interface ProfitDistributionRecord {
  id: string;
  poolId: string;
  poolName: string;
  distributionDate: string;
  grossProfitAmount: number;
  mudaribSharePercent: number;
  investorPayoutAmount: number;
  status: 'Scheduled' | 'Processing' | 'Completed' | 'Audit Verified';
  txHash: string;
}

export interface CapitalCall {
  id: string;
  poolId: string;
  poolName: string;
  calledAmount: number;
  dueDate: string;
  status: 'Pending' | 'Paid' | 'Overdue';
  purpose: string;
}

export interface ExitRequest {
  id: string;
  poolId: string;
  poolName: string;
  investorId: string;
  investorName: string;
  tokenUnits: number;
  requestedAmount: number;
  discountPercent: number;
  requestDate: string;
  status: 'Open' | 'Matched' | 'Completed' | 'Rejected';
}

export interface SecondaryMarketOrder {
  id: string;
  poolId: string;
  poolName: string;
  sellerName: string;
  tokenUnits: number;
  unitPrice: number;
  totalPrice: number;
  yieldToMaturity: number;
  orderType: 'Sell' | 'Buy';
  status: 'Active' | 'Filled' | 'Cancelled';
}
