import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFinancialAccountDto {
  @IsString() @MaxLength(40) accountCode!: string;
  @IsString() @MaxLength(40) accountType!: string;
  @IsString() @MaxLength(40) ownerType!: string;
  @IsString() ownerId!: string;
  @IsString() organisationId!: string;
  @IsString() countryNodeId!: string;
  @IsOptional() @IsString() @MaxLength(3) currency = 'MYR';
}

export class LedgerEntryDto {
  @IsString() accountId!: string;
  @IsIn(['DEBIT', 'CREDIT']) direction!: 'DEBIT' | 'CREDIT';
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsString() @MaxLength(240) description?: string;
}

export class TransferFinancialAccountDto {
  @IsString() sourceAccountId!: string;
  @IsString() destinationAccountId!: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsString() @MaxLength(240) description!: string;
  @IsString() @MaxLength(100) idempotencyKey!: string;
}
