import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { YEAR_BASES, YearBasis, ZAKAT_CATEGORIES, ZakatCategory } from './zakat-rules';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ZakatItemDto {
  @IsIn(ZAKAT_CATEGORIES) category!: ZakatCategory;
  @IsString() @MaxLength(120) label!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) amount!: number;
  @IsOptional() @IsBoolean() haulMet?: boolean;
}

export class CalculateZakatDto {
  @IsString() authorityCode!: string;
  @IsOptional() @Matches(DATE, { message: 'asOfDate must be YYYY-MM-DD.' }) asOfDate?: string;
  @IsIn(YEAR_BASES) yearBasis!: YearBasis;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ZakatItemDto) items!: ZakatItemDto[];
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) debts?: number;
  /**
   * How to count this user's platform investments: MUSTAGHALLAT counts profit received
   * (as approved for ASB in 2025); CAPITAL counts capital held a full haul plus profit
   * received (zakat saham method); NONE leaves them out.
   */
  @IsOptional() @IsIn(['NONE', 'MUSTAGHALLAT', 'CAPITAL']) platformInvestments?: 'NONE' | 'MUSTAGHALLAT' | 'CAPITAL';
  /** Used only when the authority has no nisab recorded for the date. */
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) nisabOverride?: number;
}

export class AddNisabRateDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) amount!: number;
  @IsString() @Length(3, 3) currency!: string;
  @Matches(DATE) effectiveFrom!: string;
  @Matches(DATE) effectiveTo!: string;
  /** Where the value was published, e.g. the authority's announcement. */
  @IsString() @MaxLength(300) source!: string;
}

export class ZakatPreferenceDto {
  @IsBoolean() enabled!: boolean;
}
