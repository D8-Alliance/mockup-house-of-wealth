import 'reflect-metadata';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, Equals, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { PAYOUT_CURRENCIES } from '../distribution/payout-destination.dto';

export const AREA_UNITS = ['SQFT', 'SQM'] as const;
export const UNIT_STATUSES = ['LISTED', 'WITHDRAWN'] as const;
export const LEASE_RESPONSES = ['ACCEPT', 'DECLINE', 'COUNTER'] as const;
export const LEASE_REVIEW_DECISIONS = ['APPROVE', 'REJECT', 'REQUEST_CHANGES'] as const;
export const LEASE_REVIEW_TRACKS = ['LEGAL', 'SHARIAH'] as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** A unit of a verified asset the owner lists for companies to rent directly. */
export class LeasableUnitDto {
  @IsString() assetId!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) label!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(1e8) floorArea?: number;
  @IsOptional() @IsIn(AREA_UNITS) floorAreaUnit?: (typeof AREA_UNITS)[number];
  @Type(() => Number) @IsNumber() @Min(1) @Max(1e10) monthlyRent!: number;
  @IsIn(PAYOUT_CURRENCIES) currency!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(12) depositMonths?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(360) minTermMonths?: number;
  @IsOptional() @IsDateString() availableFrom?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) permittedUse?: string;
}

export class UpdateLeasableUnitDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) label?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(1e8) floorArea?: number;
  @IsOptional() @IsIn(AREA_UNITS) floorAreaUnit?: (typeof AREA_UNITS)[number];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(1e10) monthlyRent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(12) depositMonths?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(360) minTermMonths?: number;
  @IsOptional() @IsDateString() availableFrom?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) permittedUse?: string;
  @IsOptional() @IsIn(UNIT_STATUSES) status?: (typeof UNIT_STATUSES)[number];
}

/** A company asks to rent a listed unit. */
export class CreateLeaseDto {
  @IsString() unitId!: string;
  @IsDateString() startDate!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(360) termMonths!: number;
  /** The rent the tenant offers; the asking rent when left out. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(1e10) monthlyRent?: number;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(300) intendedUse!: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(300) tenantActivity!: string;
  /** The tenant declares its use of the space and its business are Shariah-compliant. */
  @Equals(true, { message: 'Confirm that your business and your use of the space are Shariah-compliant.' }) shariahDeclaration!: boolean;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) message?: string;
}

export class RespondLeaseDto {
  @IsIn(LEASE_RESPONSES) action!: (typeof LEASE_RESPONSES)[number];
  /** A counter-offer changes any of these. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(1e10) monthlyRent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1e11) depositAmount?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(360) termMonths?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) note?: string;
  /** ACCEPT: the party confirms it accepts these terms on behalf of its organisation. */
  @IsOptional() @IsBoolean() confirmed?: boolean;
}

export class LeaseNoteDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) note?: string;
}

export class ReviewLeaseDto {
  @IsIn(LEASE_REVIEW_DECISIONS) decision!: (typeof LEASE_REVIEW_DECISIONS)[number];
  /** Needed only by a Super Admin, who may sign either track (never both on one lease). */
  @IsOptional() @IsIn(LEASE_REVIEW_TRACKS) track?: (typeof LEASE_REVIEW_TRACKS)[number];
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2000) note!: string;
}

export class RecordRentPaymentDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120) reference!: string;
  @IsOptional() @IsDateString() paidAt?: string;
}

/** The tenant's security deposit as it reached the owner's bank account. */
export class RecordDepositDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120) reference!: string;
  @IsOptional() @IsDateString() receivedAt?: string;
}

export class DepositDeductionDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(300) reason!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1e11) amount!: number;
}

/** The deposit refunded after the lease, less only unpaid rent and repairs beyond fair wear and tear, each with its reason. */
export class ReturnDepositDto {
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => DepositDeductionDto) deductions!: DepositDeductionDto[];
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120) reference!: string;
  @IsOptional() @IsDateString() paidAt?: string;
}

export class EndLeaseDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2000) note!: string;
}
