import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreatePayoutDestinationDto {
  @IsString() @MaxLength(40) provider!: string;
  @IsIn(['BANK_ACCOUNT', 'DUITNOW_PROXY']) destinationType!: string;
  @IsString() @MaxLength(240) reference!: string;
}
