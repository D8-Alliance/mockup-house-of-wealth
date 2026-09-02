export type ComplianceStatus = 'PENDING' | 'IN_REVIEW' | 'PASSED' | 'CONDITIONAL' | 'FAILED';

export interface ComplianceCheckItem {
  id: string;
  category: 
    | 'KYC Verification'
    | 'KYB Corporate Screening'
    | 'AML/CFT Screening'
    | 'Sanction List Verification'
    | 'PEP Screening'
    | 'Ultimate Beneficial Ownership'
    | 'Source of Funds Verification'
    | 'Regulatory Licenses';
  status: 'PASSED' | 'WARNING' | 'FAILED' | 'PENDING';
  findings: string;
}

export interface ComplianceReview {
  id: string;
  projectId: string;
  organisationId: string;
  countryNodeId: string;
  complianceOfficerId: string;
  complianceOfficerName: string;
  status: ComplianceStatus;
  checklist: ComplianceCheckItem[];
  reviewerComments: string;
  reviewedAt: string;
}
