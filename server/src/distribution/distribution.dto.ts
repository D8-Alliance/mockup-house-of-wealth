import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

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

/** A period's figures for the server to work out the shares, before anything is saved. */
export class DistributionPreviewDto {
  @IsString() poolId!: string;
  @IsString() @MaxLength(120) periodName!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) grossRevenue!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) eligibleCosts!: number;
}

/** Project income received into the trust account for a pool, as on the bank statement. */
export class PoolIncomeDto {
  @IsString() poolId!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1e12) amount!: number;
  @IsString() @MinLength(3) @MaxLength(120) reference!: string;
  @IsOptional() @IsDateString() receivedAt?: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

/** A bank statement exported as CSV, to pair its outgoing lines with payouts already sent. */
export class StatementMatchDto {
  @IsString() @MinLength(10) @MaxLength(95000, { message: 'The statement is too large. Export one month at a time (up to about 1,000 lines).' }) csv!: string;
  @IsString() @MaxLength(3) currency!: string;
}

/** The pairs the Settlement Officer ticked: each payout is confirmed as paid, with the statement line it matched. */
export class StatementSettleDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => StatementSettleItemDto) items!: StatementSettleItemDto[];
  @IsOptional() @IsString() @MaxLength(160) statementName?: string;
}

export class StatementSettleItemDto {
  @IsString() payoutId!: string;
  @IsNumber() @Min(1) line!: number;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
}
