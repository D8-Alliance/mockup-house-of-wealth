export type DistributionStatus = 'Scheduled' | 'Processing' | 'Completed';

export interface DistributionRecord {
  id: string;
  poolId: string;
  poolName: string;
  projectId: string;
  organisationId: string;
  countryNodeId: string;
  distributionPeriod: string; // e.g. "Q3 2026 Profit Share"
  distributionDate: string;
  totalGrossProfit: number;
  mudaribSharePercent: number;
  netInvestorProfitPool: number;
  status: DistributionStatus;
  currency: string;
  disclaimer: string;
}

export interface InvestorPayoutAllocation {
  id: string;
  distributionId: string;
  investmentId: string;
  investorId: string;
  investorName: string;
  investedCapital: number;
  payoutProfitAmount: number;
  totalPayoutAmount: number;
  status: 'PENDING' | 'PAID';
}

export interface PoolExitEvent {
  id: string;
  poolId: string;
  poolName: string;
  projectId: string;
  organisationId: string;
  countryNodeId: string;
  maturityDate: string;
  totalTargetCapital: number;
  totalPrincipalReturned: number;
  totalProfitDistributedToDate: number;
  exitStatus: 'ACTIVE' | 'MATURITY_PENDING' | 'FINAL_SETTLEMENT' | 'CLOSED';
  settlementReference?: string;
  closedAt?: string;
}
