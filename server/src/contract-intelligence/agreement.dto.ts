import { IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
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
}

export class AgreementReviewDto {
  @IsIn(['LEGAL_REVIEW', 'SHARIAH_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'EXECUTION']) reviewStatus!: 'LEGAL_REVIEW' | 'SHARIAH_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'EXECUTION';
  @IsOptional() @IsString() note?: string;
}
