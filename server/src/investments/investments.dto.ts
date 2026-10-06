import { Equals, IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateInvestmentOrderDto {
  @IsString()
  poolId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsString()
  @MaxLength(100)
  idempotencyKey!: string;

  /** The akad terms version the investor read (GET /pools/:id/akad-terms). */
  @IsString()
  akadTermsId!: string;

  /** Qabul: explicit acceptance of those terms. */
  @IsBoolean()
  @Equals(true, { message: 'The akad terms must be accepted to invest.' })
  acceptAkad!: boolean;
}

export class CancelInvestmentOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}

export class InvestmentOrderStatusDto {
  @IsIn(['PENDING', 'SETTLED', 'CANCELLED'])
  status!: string;
}
