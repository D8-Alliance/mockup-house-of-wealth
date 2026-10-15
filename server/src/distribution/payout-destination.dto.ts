import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Currencies of the D-8 member states, plus USD. */
export const PAYOUT_CURRENCIES = ['MYR', 'IDR', 'TRY', 'BDT', 'EGP', 'NGN', 'PKR', 'IRR', 'USD'] as const;

export class CreatePayoutDestinationDto {
  @IsString() @MaxLength(40) provider!: string;
  @IsIn(['BANK_ACCOUNT', 'DUITNOW_PROXY']) destinationType!: string;
  @IsString() @MaxLength(240) reference!: string;
  @IsOptional() @IsString() @MaxLength(120) accountHolder?: string;
  @IsOptional() @IsIn(PAYOUT_CURRENCIES) currency?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
