import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpgradeMembershipDto {
  @IsString()
  planId!: string;

  @IsIn(['monthly', 'annual'])
  billingInterval!: 'monthly' | 'annual';

  @IsString()
  paymentMethod!: string;

  // Purchased AI credits to put towards the plan price.
  @IsOptional()
  @IsInt()
  @Min(0)
  creditsToApply?: number;
}

export class ConsumeCreditsDto {
  @IsString()
  operationKey!: string;

  @IsOptional()
  @IsString()
  targetEntity?: string;
}

export class TopUpCreditsDto {
  @IsString()
  packageId!: string;

  @IsString()
  paymentMethod!: string;
}

export class ReconcilePaymentsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
