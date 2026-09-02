export type PoolStatus = 
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'OPEN'
  | 'FULLY_FUNDED'
  | 'FUNDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export interface PoolApprovals {
  shariahApproval: boolean;
  shariahApprovedBy?: string;
  shariahApprovedAt?: string;
  complianceApproval: boolean;
  complianceApprovedBy?: string;
  complianceApprovedAt?: string;
  riskApproval: boolean;
  riskApprovedBy?: string;
  riskApprovedAt?: string;
  authorisedApproval: boolean;
  authorisedApprovedBy?: string;
  authorisedApprovedAt?: string;
}

export interface WealthPool {
  poolId: string;
  poolCode: string;
  poolName: string;
  projectId: string;
  projectName: string;
  organisationId: string;
  organisationName: string;
  countryNodeId: string;
  poolType: 'SME / Trade' | 'Agriculture' | 'Property / Logistics' | 'Green Sukuk' | 'Waqf / Social Impact' | 'Agri-Tech';
  investmentStructure: 'Mudarabah' | 'Musharakah' | 'Wakalah' | 'Ijarah' | 'Murabahah' | 'Qard Hasan';
  targetAmount: number;
  minimumAmount: number;
  maximumAmount: number;
  amountRaised: number;
  minimumInvestment: number;
  maximumInvestment: number;
  currency: string;
  durationMonths: number;
  indicativeExpectedReturn: number; // e.g., 8.5 (%)
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  openingDate: string;
  closingDate: string;
  status: PoolStatus;
  investorCount: number;
  feesDescription: string;
  distributionFrequency: 'Monthly' | 'Quarterly' | 'Semi-Annually' | 'Annually' | 'At Maturity';
  riskDisclosure: string;
  approvals: PoolApprovals;
  createdAt: string;
  updatedAt: string;
}
