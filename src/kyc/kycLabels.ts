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

// Mirrors NATIONAL_ID_EXPIRY_RULES / idDocumentHasExpiry in server/src/kyc/kyc-workflow.ts.
const NATIONAL_ID_EXPIRY_RULES: Record<string, { expires: boolean; permanentFromAge?: number; card: string }> = {
  'CN-AZE': { expires: true, permanentFromAge: 55, card: 'Şəxsiyyət vəsiqəsi' },
  'CN-BGD': { expires: true, card: 'Smart NID card' },
  'CN-EGY': { expires: true, card: 'National ID card' },
  'CN-IDN': { expires: false, card: 'e-KTP' },
  'CN-IRN': { expires: true, card: 'National Smart Card' },
  'CN-MYS': { expires: false, card: 'MyKad' },
  'CN-NGA': { expires: false, card: 'National e-ID card' },
  'CN-PAK': { expires: true, permanentFromAge: 60, card: 'CNIC' },
  'CN-TUR': { expires: true, card: 'T.C. Kimlik Kartı' },
};

function ageInYears(dateOfBirth: string, now: Date): number {
  const birth = new Date(dateOfBirth);
  const age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  return beforeBirthday ? age - 1 : age;
}

/** Why no expiry date is needed, or null when the form must ask for one. */
export function noExpiryReason(countryNodeId: string | undefined, idDocumentType: string, dateOfBirth?: string, now = new Date()): string | null {
  if (idDocumentType !== 'NATIONAL_ID') return null;
  const rule = countryNodeId ? NATIONAL_ID_EXPIRY_RULES[countryNodeId] : undefined;
  if (!rule) return null;
  if (!rule.expires) return `Not needed: the ${rule.card} has no expiry date`;
  if (rule.permanentFromAge && dateOfBirth && ageInYears(dateOfBirth, now) >= rule.permanentFromAge) return `Not needed: the ${rule.card} is permanent from age ${rule.permanentFromAge}`;
  return null;
}

export function idDocumentHasExpiry(countryNodeId: string | undefined, idDocumentType: string, dateOfBirth?: string): boolean {
  return noExpiryReason(countryNodeId, idDocumentType, dateOfBirth) === null;
}

/** Profile badge text, derived only from the user's real KYC application. */
export function kycBadgeText(application: KycApplication | null | undefined): { text: string; verified: boolean } {
  if (!application) return { text: 'KYC not started', verified: false };
  if (application.status === 'APPROVED') return { text: `KYC ${application.kycLevel ? KYC_LEVEL_LABELS[application.kycLevel] : ''} Verified`.replace(/\s+/g, ' '), verified: true };
  return { text: `KYC: ${KYC_STATUS_LABELS[application.status]}`, verified: false };
}
