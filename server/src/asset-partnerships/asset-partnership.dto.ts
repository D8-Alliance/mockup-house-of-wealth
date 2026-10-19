import 'reflect-metadata';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { ASSET_TYPES } from '../assets/asset.dto';
import { PAYOUT_CURRENCIES } from '../distribution/payout-destination.dto';

export const PARTNERSHIP_AKADS = ['IJARAH', 'MUSHARAKAH'] as const;
export const PREFERRED_AKADS = ['IJARAH', 'MUSHARAKAH', 'EITHER'] as const;
/** Ijarah rent: per month, or one amount for the whole period. */
export const RENT_FREQUENCIES = ['MONTHLY', 'WHOLE_PERIOD'] as const;
/** Day-to-day upkeep (fuel, operator, routine servicing). Major maintenance and takaful stay with the owner in an Ijarah. */
export const UPKEEP_PARTIES = ['OWNER', 'LESSEE'] as const;
export const RESPONSES = ['ACCEPT', 'DECLINE', 'COUNTER'] as const;
export const REVIEW_DECISIONS = ['APPROVE', 'REJECT'] as const;
export const REVIEW_TRACKS = ['LEGAL', 'SHARIAH'] as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Whether a verified asset is offered to delivery partners, and on what basis. */
export class AssetListingDto {
  @IsBoolean() offered!: boolean;
  @IsOptional() @IsIn(PREFERRED_AKADS) preferredAkad?: (typeof PREFERRED_AKADS)[number];
  @IsOptional() @IsDateString() availableFrom?: string;
  @IsOptional() @IsDateString() availableUntil?: string;
  /** e.g. "RM 9,000 a month with operator" or "30% profit share". Shown to delivery partners. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300) indicativeTerms?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) note?: string;
}

export class CreateAssetNeedDto {
  @IsString() projectId!: string;
  @IsIn(ASSET_TYPES) assetType!: (typeof ASSET_TYPES)[number];
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) description?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000) quantity!: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300) location?: string;
  @IsOptional() @IsIn(PREFERRED_AKADS) preferredAkad?: (typeof PREFERRED_AKADS)[number];
}

export class UpdateNeedStatusDto {
  @IsIn(['OPEN', 'CLOSED']) status!: 'OPEN' | 'CLOSED';
}

/** The commercial terms of the akad. Ijarah fields for a lease, Musharakah fields for a partnership. */
export class EngagementTermsDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1e11) rentAmount?: number;
  @IsOptional() @IsIn(RENT_FREQUENCIES) rentFrequency?: (typeof RENT_FREQUENCIES)[number];
  @IsOptional() @IsIn(UPKEEP_PARTIES) upkeepBy?: (typeof UPKEEP_PARTIES)[number];
  /** The asset's agreed value as the owner's capital contribution. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1e12) contributionValue?: number;
  /** The owner's share of the venture's profit, in percent. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) @Max(99.99) profitSharePct?: number;
  @IsOptional() @IsIn(PAYOUT_CURRENCIES) currency?: string;
}

export class CreateEngagementDto {
  @IsString() assetId!: string;
  /** An asset owner's offer answers a need; a delivery partner's request names its project. */
  @IsOptional() @IsString() needId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsIn(PARTNERSHIP_AKADS) akad!: (typeof PARTNERSHIP_AKADS)[number];
  @ValidateNested() @Type(() => EngagementTermsDto) terms!: EngagementTermsDto;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) message?: string;
}

export class RespondEngagementDto {
  @IsIn(RESPONSES) action!: (typeof RESPONSES)[number];
  /** A counter-offer replaces the akad, terms and dates. */
  @IsOptional() @IsIn(PARTNERSHIP_AKADS) akad?: (typeof PARTNERSHIP_AKADS)[number];
  @IsOptional() @ValidateNested() @Type(() => EngagementTermsDto) terms?: EngagementTermsDto;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) note?: string;
}

export class WithdrawEngagementDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) note?: string;
}

export class ReviewEngagementDto {
  @IsIn(REVIEW_DECISIONS) decision!: (typeof REVIEW_DECISIONS)[number];
  /** Needed only by a Super Admin, who may sign either track (never both on one engagement). */
  @IsOptional() @IsIn(REVIEW_TRACKS) track?: (typeof REVIEW_TRACKS)[number];
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2000) note!: string;
}
