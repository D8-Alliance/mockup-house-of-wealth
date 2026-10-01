import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { KYC_DECISIONS, KYC_ID_DOCUMENT_TYPES, KYC_LEVELS, KYC_STATUSES, KycDecision, KycIdDocumentType, KycLevel, KycStatus } from './kyc-workflow';

// Draft saves are partial; completeness is checked on submit (kycSubmissionGaps).
export class SaveKycDraftDto {
  @IsOptional() @IsString() @MaxLength(200) fullName?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(100) nationality?: string;
  @IsOptional() @IsIn(KYC_ID_DOCUMENT_TYPES) idDocumentType?: KycIdDocumentType;
  @IsOptional() @IsString() @MaxLength(50) idDocumentNumber?: string;
  @IsOptional() @IsDateString() idDocumentExpiry?: string;
  @IsOptional() @IsString() @MaxLength(500) residentialAddress?: string;
}

export class KycReviewDto {
  @IsIn(KYC_DECISIONS) decision!: KycDecision;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  comment!: string;

  // Required when approving; ignored otherwise.
  @ValidateIf((input: KycReviewDto) => input.decision === 'APPROVED')
  @IsIn(KYC_LEVELS)
  kycLevel?: KycLevel;
}

export class KycQueueQueryDto {
  @IsOptional() @IsIn(KYC_STATUSES.filter((status) => status !== 'DRAFT')) status?: Exclude<KycStatus, 'DRAFT'>;
}
