import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CalculateZakatDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  investedCapital!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  liquidCash!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debtsOwed!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  nisabThreshold?: number;
}
