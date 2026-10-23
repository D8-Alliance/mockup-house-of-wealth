import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/** SSM documents: company profile (e-Info), directors (Section 58 / Form 49), shareholders (Section 51 / Form 24). */
export const KYB_DOCUMENT_TYPES = ['SSM_PROFILE', 'DIRECTORS', 'SHAREHOLDERS', 'BOARD_RESOLUTION', 'OTHER'] as const;
export const KYB_DECISIONS = ['APPROVE', 'REQUEST_CHANGES', 'REJECT'] as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class OrganisationDetailsDto {
  /** e.g. "201901012345 (1234567-A)". */
  @Transform(trim) @IsString() @MinLength(6) @MaxLength(60) registrationNumber!: string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(400) registeredAddress!: string;
}

export class OrganisationKybReviewDto {
  @IsIn(KYB_DECISIONS) decision!: (typeof KYB_DECISIONS)[number];
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2000) note!: string;
}
