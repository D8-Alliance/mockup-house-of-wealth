export type RiskCategory = 
  | 'Financial'
  | 'Market'
  | 'Operational'
  | 'Legal'
  | 'Regulatory'
  | 'Liquidity'
  | 'Fraud'
  | 'Shariah'
  | 'Execution'
  | 'Reputation';

export type RiskLikelihood = 'Low' | 'Medium' | 'High';
export type RiskImpact = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskItemStatus = 'Open' | 'Mitigated' | 'Accepted' | 'Closed';

export interface ProjectRiskItem {
  id: string;
  category: RiskCategory;
  riskTitle: string;
  description: string;
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  riskScore: number; // e.g. 1-25 or 1-15 scale
  mitigationStrategy: string;
  owner: string;
  status: RiskItemStatus;
}

export interface RiskAssessmentReport {
  id: string;
  projectId: string;
  organisationId: string;
  countryNodeId: string;
  overallRiskRating: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Critical Risk';
  riskOfficerId: string;
  riskOfficerName: string;
  risks: ProjectRiskItem[];
  riskApprovalStatus: 'PENDING' | 'APPROVED' | 'CONDITIONAL' | 'REJECTED';
  approvalComments?: string;
  evaluatedAt: string;
}
