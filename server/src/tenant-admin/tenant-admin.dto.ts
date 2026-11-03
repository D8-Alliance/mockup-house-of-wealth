import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ENTITY_TYPES } from '../organisation-kyb/organisation-group';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export const TENANT_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

export class CreateOrganisationDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) name!: string;
  /** Super Admin chooses; a Country Admin always creates in their own country. */
  @IsOptional() @IsString() countryNodeId?: string;
  @IsOptional() @IsIn(ENTITY_TYPES) entityType?: (typeof ENTITY_TYPES)[number];
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) registrationNumber?: string;
}

export class SetStatusDto {
  @IsIn(TENANT_STATUSES) status!: (typeof TENANT_STATUSES)[number];
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class CreateCountryNodeDto {
  /** CN- followed by the ISO 3166 alpha-3 code, e.g. CN-MYS. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)) @Matches(/^CN-[A-Z]{3}$/, { message: 'The code is CN- followed by the three-letter country code, e.g. CN-MYS.' }) code!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)) @Matches(/^[A-Z]{3}$/, { message: 'The currency is a three-letter code, e.g. MYR.' }) currency!: string;
  /** IANA time zone, e.g. Asia/Kuala_Lumpur. */
  @Transform(trim) @Matches(/^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){1,2}$/, { message: 'Use an IANA time zone such as Asia/Kuala_Lumpur.' }) timezone!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(200) regulatoryProfile!: string;
}

export class MoveUserDto {
  @IsString() organisationId!: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}
