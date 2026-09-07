import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SavePdpApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsString()
  @MaxLength(10)
  countryCode!: string;

  @IsString()
  @MaxLength(120)
  countryName!: string;

  @IsString()
  @MaxLength(30)
  pdpType!: string;

  @IsString()
  @MaxLength(240)
  organisationName!: string;

  @IsString()
  @MaxLength(320)
  userEmail!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
