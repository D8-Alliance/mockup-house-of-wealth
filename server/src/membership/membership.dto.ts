import { IsIn, IsString } from 'class-validator';

export class UpgradeMembershipDto {
  @IsString()
  planId!: string;

  @IsIn(['monthly', 'annual'])
  billingInterval!: 'monthly' | 'annual';

  @IsString()
  paymentMethod!: string;
}
