import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { D8_JURISDICTIONS } from './jurisdiction-profiles';

export const AGREEMENT_TYPES = ['IJARAH', 'MUSHARAKAH', 'MUDARABAH', 'WAKALAH', 'SUKUK'] as const;
export type AgreementType = typeof AGREEMENT_TYPES[number];

export class AgreementWizardDto {
  @IsIn(AGREEMENT_TYPES) contractType!: AgreementType;
  @IsString() @MinLength(1) projectName!: string;
  @IsIn(D8_JURISDICTIONS) jurisdiction!: string;
  @IsObject() wizardData!: Record<string, unknown>;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() templateId?: string;
  /** Drafting the agreement of an approved asset partnership: one agreement per partnership, revised in place. */
  @IsOptional() @IsString() engagementId?: string;
}

export class AgreementPartyActionDto {
  @IsIn(['CONSENT', 'SIGN']) action!: 'CONSENT' | 'SIGN';
  /** SIGN: the signer's full name, typed as their electronic signature. */
  @IsOptional() @IsString() @MaxLength(200) signatureName?: string;
}

export class AgreementReviewDto {
  @IsIn(['LEGAL_REVIEW', 'SHARIAH_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'EXECUTION']) reviewStatus!: 'LEGAL_REVIEW' | 'SHARIAH_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'EXECUTION';
  @IsOptional() @IsString() note?: string;
  /** The AI gap scan whose draft note the reviewer used, so the record shows the note was AI-assisted. */
  @IsOptional() @IsString() @MaxLength(60) aiRunId?: string;
  /** Approving despite failed text checks, high gaps in the AI scan, or a note that reads as a refusal: why. */
  @IsOptional() @IsString() @MaxLength(1000) overrideReason?: string;
}
