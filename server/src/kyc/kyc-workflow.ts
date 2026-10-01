import { UserRole } from '../policy/permissions';

export const KYC_STATUSES = ['DRAFT', 'SUBMITTED', 'RESUBMISSION_REQUIRED', 'APPROVED', 'REJECTED'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const KYC_DOCUMENT_TYPES = ['ID_FRONT', 'ID_BACK', 'PASSPORT', 'SELFIE', 'PROOF_OF_ADDRESS'] as const;
export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

export const KYC_ID_DOCUMENT_TYPES = ['NATIONAL_ID', 'PASSPORT'] as const;
export type KycIdDocumentType = (typeof KYC_ID_DOCUMENT_TYPES)[number];

export const KYC_LEVELS = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as const;
export type KycLevel = (typeof KYC_LEVELS)[number];

export const KYC_DECISIONS = ['APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'] as const;
export type KycDecision = (typeof KYC_DECISIONS)[number];

export const KYC_REVIEWER_ROLES: UserRole[] = ['Super Admin', 'Country Admin', 'KYC Officer', 'Compliance Officer'];

// Statuses in which the applicant may still edit details and documents.
export const KYC_EDITABLE_STATUSES: KycStatus[] = ['DRAFT', 'RESUBMISSION_REQUIRED'];
// Statuses that count as "open" (mirrors the partial unique index in the migration).
export const KYC_OPEN_STATUSES: KycStatus[] = ['DRAFT', 'SUBMITTED', 'RESUBMISSION_REQUIRED'];

export const KYC_MIN_AGE_YEARS = 18;
// Rejected applications allowed per user before they must contact support.
export const KYC_MAX_REJECTED_APPLICATIONS = 3;

export interface KycApplicantDetails {
  fullName: string;
  dateOfBirth: Date | null;
  nationality: string;
  idDocumentType: string;
  idDocumentNumber: string;
  idDocumentExpiry: Date | null;
  residentialAddress: string;
}

/** Documents required before submission; depends on which identity document the applicant uses. */
export function requiredKycDocuments(idDocumentType: string): KycDocumentType[] {
  const identity: KycDocumentType[] = idDocumentType === 'PASSPORT' ? ['PASSPORT'] : ['ID_FRONT', 'ID_BACK'];
  return [...identity, 'SELFIE', 'PROOF_OF_ADDRESS'];
}

function ageInYears(dateOfBirth: Date, now: Date): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const beforeBirthday = now.getUTCMonth() < dateOfBirth.getUTCMonth()
    || (now.getUTCMonth() === dateOfBirth.getUTCMonth() && now.getUTCDate() < dateOfBirth.getUTCDate());
  return beforeBirthday ? age - 1 : age;
}

/** Everything still missing before the application can be submitted; empty when ready. */
export function kycSubmissionGaps(details: KycApplicantDetails, uploadedTypes: string[], now = new Date()): string[] {
  const gaps: string[] = [];
  if (!details.fullName.trim()) gaps.push('Full name');
  if (!details.dateOfBirth) gaps.push('Date of birth');
  else if (ageInYears(details.dateOfBirth, now) < KYC_MIN_AGE_YEARS) gaps.push(`Applicant must be at least ${KYC_MIN_AGE_YEARS} years old`);
  if (!details.nationality.trim()) gaps.push('Nationality');
  if (!(KYC_ID_DOCUMENT_TYPES as readonly string[]).includes(details.idDocumentType)) gaps.push('Identity document type');
  if (!details.idDocumentNumber.trim()) gaps.push('Identity document number');
  if (!details.idDocumentExpiry) gaps.push('Identity document expiry date');
  else if (details.idDocumentExpiry.getTime() < now.getTime()) gaps.push('Identity document has expired');
  if (!details.residentialAddress.trim()) gaps.push('Residential address');
  for (const type of requiredKycDocuments(details.idDocumentType)) {
    if (!uploadedTypes.includes(type)) gaps.push(`Document: ${type}`);
  }
  return gaps;
}

/** Shows only the last four characters of an identity number, for list views. */
export function maskIdNumber(value: string): string {
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}
