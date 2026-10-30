import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SaveCollectionAccountDto {
  @IsString() @MinLength(2) @MaxLength(120) bankName!: string;
  @IsString() @MinLength(2) @MaxLength(160) accountName!: string;
  // Digits, with the spaces or dashes banks print them with.
  @IsString() @Matches(/^[0-9][0-9 -]{4,38}[0-9]$/, { message: 'Enter the account number as printed by the bank (digits, spaces or dashes).' }) accountNumber!: string;
  @IsOptional() @IsString() @Matches(/^$|^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, { message: 'A SWIFT code has 8 or 11 letters and digits, e.g. MBBEMYKL.' }) swiftCode?: string;
  @IsOptional() @IsString() @MaxLength(500) instructions?: string;
}
