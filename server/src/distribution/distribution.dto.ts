import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class DistributionAllocationDto {
  @IsString() beneficiaryUserId!: string;
  @IsString() destinationId!: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount?: number;
}

export class CreateDistributionDto {
  @IsString() projectId!: string;
  @IsOptional() @IsString() poolId?: string;
  @IsString() organisationId!: string;
  @IsString() countryNodeId!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) totalAmount!: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) grossRevenue?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) eligibleCosts?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) investorProfitSharePercent?: number;
  @IsString() @MaxLength(3) currency!: string;
  @IsString() @MaxLength(120) periodName!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => DistributionAllocationDto) allocations!: DistributionAllocationDto[];
}

export class DistributionDecisionDto {
  @IsOptional() @IsString() @MaxLength(500) comment?: string;
}

export class DistributionRejectionDto {
  @IsString() @MaxLength(500) comment!: string;
}

export class SubmitPayoutDto {
  @IsString() @MaxLength(120) providerReference!: string;
}

export class PayoutFailureDto {
  @IsString() @MaxLength(500) reason!: string;
}

/** A period whose result is recorded without a payout: a loss, or profit absorbed by earlier losses. */
export class RecordPeriodResultDto {
  @IsString() projectId!: string;
  @IsString() poolId!: string;
  @IsString() organisationId!: string;
  @IsString() countryNodeId!: string;
  @IsString() @MaxLength(3) currency!: string;
  @IsString() @MaxLength(120) periodName!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) grossRevenue!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) eligibleCosts!: number;
}
