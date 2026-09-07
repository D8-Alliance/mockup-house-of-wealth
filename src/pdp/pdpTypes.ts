import { UserRole } from '../rbac/types';

export type PDPType = 'Individual' | 'Company' | 'Organisation' | 'Institution';

export type PDPApplicationStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ADDITIONAL_INFORMATION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'SUSPENDED';

export type KYBVerificationStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'CORRECTION_REQUIRED'
  | 'REJECTED';

export interface PDPAuthorisedRepresentative {
  id: string;
  fullName: string;
  nationality: string;
  idPassportNumber: string;
  position: string;
  email: string;
  mobile: string;
  supportingDocName?: string;
  supportingDocUrl?: string;
}

export interface BeneficialOwner {
  id: string;
  fullName: string;
  nationality: string;
  idNumber: string;
  ownershipPercentage: number;
  isDirector: boolean;
  isAuthorisedSignatory: boolean;
  pepStatus: boolean;
}

export interface PDPDocument {
  id: string;
  documentType: string;
  title: string;
  fileSize: string;
  uploadedAt: string;
  fileUrl: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CORRECTION_REQUESTED';
  rejectionReason?: string;
  required: boolean;
}

export interface BankSettlementInfo {
  bankName: string;
  accountHolderName: string;
  accountNumber: string; // masked in UI (e.g. ****-****-8821)
  rawAccountNumber?: string;
  swiftBicCode: string;
  currency: string;
  country: string;
  settlementMethod: 'Corporate FPX' | 'RTGS / Central Wire' | 'D-8 Cross-Border Clearing' | 'Digital Treasury Escrow';
}

export interface ComplianceDeclaration {
  amlCftDeclaration: boolean;
  sourceOfFundsDeclaration: boolean;
  beneficialOwnershipAccurate: boolean;
  sanctionsNonMatchDeclared: boolean;
  regulatoryComplianceAgreed: boolean;
  shariahComplianceAttested: boolean;
  termsAndConditionsAccepted: boolean;
  privacyConsentGranted: boolean;
  declaredAt?: string;
  declaredByIp?: string;
}

export interface PDPStatusHistoryEntry {
  id: string;
  timestamp: string;
  previousStatus: PDPApplicationStatus;
  newStatus: PDPApplicationStatus;
  changedByUserId: string;
  changedByRole: UserRole;
  reason: string;
  comment?: string;
}

export interface PDPApplication {
  id: string;
  applicationNumber: string; // e.g. PDP-APP-2026-001
  userId: string;
  userEmail: string;
  userMobile: string;
  countryCode: string; // e.g. MYS, IDN, TUR, NGA, MYS-P2, EGY, BGD, IRN
  countryName: string;
  preferredLanguage: string;
  
  // Entity Profile
  pdpType: PDPType;
  organisationName: string;
  tradingName: string;
  registrationNumber: string;
  countryOfRegistration: string;
  registeredAddress: string;
  businessAddress: string;
  contactPhone: string;
  website: string;
  businessCategory: string;
  dateOfIncorporation: string;
  taxIdentificationNumber: string;

  // Key Individuals
  representative: PDPAuthorisedRepresentative;
  beneficialOwners: BeneficialOwner[];

  // Verification & KYB
  kybStatus: KYBVerificationStatus;
  documents: PDPDocument[];
  bankInfo: BankSettlementInfo;
  compliance: ComplianceDeclaration;

  // Lifecycle & Governance
  status: PDPApplicationStatus;
  statusHistory: PDPStatusHistoryEntry[];
  reviewerComments?: string;
  additionalInfoRequestNote?: string;
  rejectionReason?: string;
  
  // Operational Metrics (once ACTIVE)
  activePoolsCount: number;
  totalRaisedMYR: number;
  totalDistributedMYR: number;
  pendingSettlementMYR: number;

  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  activatedAt?: string;
}

export interface PDPCountryConfig {
  countryCode: string;
  countryName: string;
  flagUrl: string;
  primaryCurrency: string;
  supportedCurrencies: string[];
  supportedLanguages: string[];
  enabledPdpTypes: PDPType[];
  regulatoryAuthority: string;
  requiredDocuments: {
    docType: string;
    label: string;
    description: string;
    applicableTypes: PDPType[];
    mandatory: boolean;
  }[];
  approvalWorkflow: 'Single-Sign' | 'Dual-Key (Compliance + Country Admin)' | 'Multi-Sig Enterprise';
  defaultSettlementMethod: string;
  isEnabled: boolean;
}
