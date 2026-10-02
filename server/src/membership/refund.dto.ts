import { IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class SettleRefundDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @IsString() @MaxLength(500) reason!: string;
}
