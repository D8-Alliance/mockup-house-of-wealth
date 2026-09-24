import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpgradeMembershipDto {
  @IsString()
  planId!: string;

  @IsIn(['monthly', 'annual'])
  billingInterval!: 'monthly' | 'annual';

  @IsString()
  paymentMethod!: string;
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
