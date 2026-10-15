import { IsIn, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { POOL_AKAD_TYPES, PoolAkadType } from './akad-terms';

export class CreatePoolDto {
  @IsString() projectId!: string;
  @IsString() @MaxLength(160) poolName!: string;
  @IsString() @Length(3, 3) currency!: string;
  /** Free-text description of the structure; defaults to the akad name. */
  @IsOptional() @IsString() @MaxLength(120) investmentStructure?: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) indicativeExpectedReturn!: number;
  @IsString() organisationId!: string;
  @IsString() countryNodeId!: string;
  @IsIn(POOL_AKAD_TYPES) akadType!: PoolAkadType;
  @IsNumber({ maxDecimalPlaces: 2 }) investorProfitSharePct!: number;
}

export class UpdatePoolStatusDto {
  @IsIn(['OPEN', 'PAUSED', 'FULL', 'CLOSED']) status!: 'OPEN' | 'PAUSED' | 'FULL' | 'CLOSED';
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class SetAkadTermsDto {
  @IsIn(POOL_AKAD_TYPES) akadType!: PoolAkadType;
  @IsNumber({ maxDecimalPlaces: 2 }) investorProfitSharePct!: number;
}
