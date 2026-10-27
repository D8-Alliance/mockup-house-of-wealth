import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CAPITAL_SOURCES, COVER_TYPES } from './safeguard-rules';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Multipart fields arrive as text. */
const bool = ({ value }: { value: unknown }) => value === true || value === 'true';

export const SAFEGUARD_DECISIONS = ['VERIFY', 'REJECT'] as const;

export class CapitalPledgeDto {
  @IsIn(CAPITAL_SOURCES) source!: (typeof CAPITAL_SOURCES)[number];
  /** Who puts the money in, e.g. the sponsor organisation or the financing bank. */
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) partyName!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1e12) amount!: number;
}

export class SafeguardReviewDto {
  @IsIn(SAFEGUARD_DECISIONS) decision!: (typeof SAFEGUARD_DECISIONS)[number];
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2000) note!: string;
}

export class CapitalDepositDto {
  /** The bank's reference for the credit into the project account. */
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120) reference!: string;
}

export class TakafulPolicyDto {
  @IsIn(COVER_TYPES) coverType!: (typeof COVER_TYPES)[number];
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) assetId?: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) provider!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) policyNumber!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1e12) sumCovered!: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1e10) contribution?: number;
  @IsISO8601() startDate!: string;
  @IsISO8601() endDate!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(200) lossPayee!: string;
  @Transform(bool) @IsBoolean() conventional!: boolean;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) shariahApprovalNote?: string;
}

export class ProjectRiskFlagsDto {
  @IsBoolean() hasSiteWork!: boolean;
  @IsBoolean() hasWorkers!: boolean;
}
