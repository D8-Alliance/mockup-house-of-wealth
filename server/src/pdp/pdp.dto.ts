import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SavePdpApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  countryCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  countryName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  pdpType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  organisationName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  userEmail!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class KybReviewDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  justification!: string;
}
