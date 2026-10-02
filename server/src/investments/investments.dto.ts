import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
