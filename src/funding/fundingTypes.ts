export type FundingStatus = 'PENDING' | 'APPROVED' | 'DISBURSED' | 'REJECTED';

export interface FundingRequest {
  id: string;
  projectId: string;
  projectName: string;
  poolId: string;
  poolName: string;
  organisationId: string;
  countryNodeId: string;
  requestedAmount: number;
  purpose: string;
  milestoneReference?: string;
  status: FundingStatus;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  disbursedAt?: string;
}

export interface Disbursement {
  id: string;
  fundingRequestId: string;
  projectId: string;
  trancheNumber: number;
  amount: number;
  currency: string;
  escrowAccountRef: string;
  disbursedBy: string;
  disbursedAt: string;
  notes?: string;
}
