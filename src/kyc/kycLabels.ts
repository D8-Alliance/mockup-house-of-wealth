import { KycApplication, KycDocumentType, KycIdDocumentType, KycLevel, KycStatus } from '../services/apiClient';

export const KYC_DOCUMENT_LABELS: Record<KycDocumentType, string> = {
  ID_FRONT: 'National ID (front)',
  ID_BACK: 'National ID (back)',
  PASSPORT: 'Passport photo page',
  SELFIE: 'Selfie holding your ID',
  PROOF_OF_ADDRESS: 'Proof of address (utility bill or bank statement, under 3 months old)',
};

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Awaiting review',
  RESUBMISSION_REQUIRED: 'Changes requested',
  APPROVED: 'Verified',
  REJECTED: 'Rejected',
};

export const KYC_STATUS_STYLES: Record<KycStatus, string> = {
  DRAFT: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  SUBMITTED: 'bg-purple-500/10 text-purple-600',
  RESUBMISSION_REQUIRED: 'bg-amber-500/10 text-amber-600',
  APPROVED: 'bg-emerald-500/10 text-emerald-600',
  REJECTED: 'bg-rose-500/10 text-rose-600',
};

export const KYC_LEVEL_LABELS: Record<KycLevel, string> = {
  LEVEL_1: 'Level 1',
  LEVEL_2: 'Level 2',
  LEVEL_3: 'Level 3',
};

export const KYC_ID_DOCUMENT_LABELS: Record<KycIdDocumentType, string> = {
  NATIONAL_ID: 'National ID card',
  PASSPORT: 'Passport',
};

// Mirrors requiredKycDocuments in server/src/kyc/kyc-workflow.ts.
export function requiredKycDocuments(idDocumentType: string): KycDocumentType[] {
  const identity: KycDocumentType[] = idDocumentType === 'PASSPORT' ? ['PASSPORT'] : ['ID_FRONT', 'ID_BACK'];
  return [...identity, 'SELFIE', 'PROOF_OF_ADDRESS'];
}

/** Profile badge text, derived only from the user's real KYC application. */
export function kycBadgeText(application: KycApplication | null | undefined): { text: string; verified: boolean } {
  if (!application) return { text: 'KYC not started', verified: false };
  if (application.status === 'APPROVED') return { text: `KYC ${application.kycLevel ? KYC_LEVEL_LABELS[application.kycLevel] : ''} Verified`.replace(/\s+/g, ' '), verified: true };
  return { text: `KYC: ${KYC_STATUS_LABELS[application.status]}`, verified: false };
}
