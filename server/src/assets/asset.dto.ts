import { Transform, Type } from 'class-transformer';
import { Equals, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PAYOUT_CURRENCIES } from '../distribution/payout-destination.dto';

export const ASSET_TYPES = ['LAND', 'BUILDING', 'MACHINERY', 'VEHICLE', 'EQUIPMENT', 'OTHER'] as const;
export const ASSET_INTENDED_USES = ['IJARAH', 'MUSHARAKAH', 'MURABAHAH', 'UNDECIDED'] as const;
export const ASSET_DOCUMENT_TYPES = ['OWNERSHIP', 'VALUATION', 'INSURANCE', 'PHOTO', 'OTHER'] as const;
export const ASSET_DECISIONS = ['VERIFIED', 'CHANGES_REQUESTED', 'REJECTED'] as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SaveAssetDto {
  @IsIn(ASSET_TYPES) assetType!: (typeof ASSET_TYPES)[number];
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(160) name!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) location?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) titleReference?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1e13) estimatedValue!: number;
  @IsIn(PAYOUT_CURRENCIES) currency!: string;
  @IsOptional() @IsDateString() valuationDate?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) valuerName?: string;
  @IsOptional() @IsBoolean() isEncumbered?: boolean;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) encumbranceNote?: string;
  @IsOptional() @IsIn(ASSET_INTENDED_USES) intendedUse?: (typeof ASSET_INTENDED_USES)[number];
}

/** What the owner confirms when submitting an asset for verification; every item must be true. */
export class SubmitAssetDto {
  @Equals(true, { message: 'Confirm that you or your organisation own this asset.' }) ownership!: boolean;
  @Equals(true, { message: 'Confirm that the asset is not used for activities that are not Shariah-compliant.' }) halalUse!: boolean;
  @Equals(true, { message: 'Confirm that the details and documents are true and complete.' }) accuracy!: boolean;
}

export class ReviewAssetDto {
  @IsIn(ASSET_DECISIONS) decision!: (typeof ASSET_DECISIONS)[number];
  @Transform(trim) @IsString() @MinLength(5, { message: 'Give a reason of at least 5 characters; the owner sees it.' }) @MaxLength(1000) note!: string;
}
