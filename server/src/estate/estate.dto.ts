import { IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { DISTRIBUTION_TYPES, RELATIONS } from './estate-rules';

export class SaveBeneficiaryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsIn(RELATIONS as unknown as string[])
  relation!: string;

  @IsIn(DISTRIBUTION_TYPES as unknown as string[])
  distributionType!: string;

  /** Left out for a faraid heir. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationPercent?: number;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  /** National ID or passport number. Left out on an edit to keep the one stored. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  identityNumber?: string;

  @IsString()
  @MaxLength(80)
  payoutMethod!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  /** Hibah Amanah: the donor confirms the offer (ijab) is voluntary and made of sound mind. */
  @IsOptional()
  @IsBoolean()
  ijabConfirmed?: boolean;
}
