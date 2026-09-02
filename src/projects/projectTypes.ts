export type ProjectStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'DUE_DILIGENCE'
  | 'SHARIAH_REVIEW'
  | 'COMPLIANCE_REVIEW'
  | 'RISK_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'POOLING'
  | 'FUNDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProjectSector = 
  | 'Agriculture & Plantation'
  | 'Green Energy & Solar'
  | 'Property & Urban Development'
  | 'SME & Trade Finance'
  | 'Agri-Tech & Logistics'
  | 'Social Waqf Housing';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Very High';

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  category: 
    | 'Business Plan'
    | 'Financial Statement'
    | 'Company Registration'
    | 'Ownership Document'
    | 'Asset Valuation'
    | 'Legal Agreement'
    | 'Project Proposal'
    | 'Risk Assessment'
    | 'Shariah Audit'
    | 'Other';
  version: string;
  fileSize: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  uploadedBy: string;
  uploadedAt: string;
  reviewer?: string;
  reviewComments?: string;
  fileUrl?: string;
}

export interface ProjectReviewComment {
  id: string;
  projectId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  stage: ProjectStatus;
  action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT' | 'COMMENT';
  comments: string;
  timestamp: string;
}

export interface Project {
  projectId: string;
  projectCode: string;
  projectName: string;
  description: string;
  organisationId: string;
  organisationName: string;
  countryNodeId: string;
  projectSponsorId: string;
  projectSponsorName: string;
  projectManagerId: string;
  projectManagerName: string;
  sector: ProjectSector;
  category: string;
  location: string;
  currency: string;
  
  // Financial & Funding
  totalProjectCost: number;
  sponsorContribution: number;
  fundingRequired: number;
  minimumFunding: number;
  maximumFunding: number;
  minimumInvestmentPerInvestor: number;
  maximumInvestmentPerInvestor: number;
  projectDurationMonths: number;
  indicativeExpectedReturn: number; // e.g. 8.5 (%)
  riskLevel: RiskLevel;
  
  // Dates
  projectStartDate: string;
  projectEndDate: string;
  
  // Model & Shariah details
  businessModelSummary: string;
  proposedShariahContract: 'Mudarabah' | 'Musharakah' | 'Wakalah' | 'Ijarah' | 'Murabahah' | 'Qard Hasan' | 'Other';
  revenueModel: string;
  
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  
  documents?: ProjectDocument[];
  reviewComments?: ProjectReviewComment[];
}
