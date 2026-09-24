export type OrganisationType =
  | 'Government'
  | 'Government-Linked Company'
  | 'Corporation'
  | 'Project Sponsor / Delivery Partner'
  | 'Financial Institution'
  | 'Investment Fund'
  | 'Family Office'
  | 'Cooperative'
  | 'NGO / Social Organisation'
  | 'Islamic Institution'
  | 'Asset Owner'
  | 'Asset Manager'
  | 'Investment Manager'
  | 'Other';

export type OrganisationStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'REJECTED' | 'DEACTIVATED';
export type OrganisationVerificationStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface OrganisationDocument {
  id: string;
  title: string;
  documentType: 'Certificate of Incorporation' | 'Tax Certificate' | 'Shariah Approval' | 'Regulatory License' | 'Financial Statement' | 'Other';
  fileUrl: string;
  submittedAt: string;
  status: 'Approved' | 'Pending Review' | 'Rejected';
}

export interface OrganisationReviewComment {
  id: string;
  reviewerId: string;
  reviewerName: string;
  timestamp: string;
  comment: string;
  actionTaken: 'Submitted' | 'Approved' | 'Rejected' | 'Requested Info';
}

export interface Organisation {
  organisationId: string;
  legalName: string;
  displayName: string;
  registrationNumber: string;
  organisationType: OrganisationType;
  countryNodeId: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  logoUrl?: string;
  industry: string;
  description: string;
  status: OrganisationStatus;
  verificationStatus: OrganisationVerificationStatus;
  activeUsersCount: number;
  activeProjectsCount: number;
  activeAssetsCount: number;
  activePoolsCount: number;
  documents: OrganisationDocument[];
  reviewComments: OrganisationReviewComment[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface OrganisationOnboardingPayload {
  legalName: string;
  displayName: string;
  registrationNumber: string;
  organisationType: OrganisationType;
  countryNodeId: string;
  industry: string;
  description: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  logoUrl?: string;
  contactPersonName: string;
  contactPersonTitle: string;
  documents: Omit<OrganisationDocument, 'id' | 'submittedAt' | 'status'>[];
}
