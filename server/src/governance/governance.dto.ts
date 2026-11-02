import { Transform, Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

export const RISK_CATEGORIES = ['OPERATIONAL', 'FINANCIAL', 'SHARIAH', 'LEGAL', 'TECHNOLOGY', 'REPUTATIONAL', 'OTHER'] as const;
export const RISK_STATUSES = ['OPEN', 'MITIGATING', 'CLOSED'] as const;
export const INCIDENT_CATEGORIES = ['SECURITY', 'OPERATIONAL', 'SHARIAH', 'COMPLIANCE', 'DATA_PROTECTION', 'OTHER'] as const;
export const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const INCIDENT_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const;
export const FATWA_STATUSES = ['ACTIVE', 'SUPERSEDED'] as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SaveRiskDto {
  /** Super Admin chooses the country; everyone else records in their own. */
  @IsOptional() @IsString() countryNodeId?: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsIn(RISK_CATEGORIES) category!: (typeof RISK_CATEGORIES)[number];
  @Type(() => Number) @IsInt() @Min(1) @Max(5) likelihood!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) impact!: number;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) ownerName!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) mitigation?: string;
  @IsOptional() @IsIn(RISK_STATUSES) status?: (typeof RISK_STATUSES)[number];
  @IsOptional() @IsDateString() reviewDue?: string;
}

export class CreateIncidentDto {
  @IsOptional() @IsString() countryNodeId?: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsIn(INCIDENT_CATEGORIES) category!: (typeof INCIDENT_CATEGORIES)[number];
  @IsIn(INCIDENT_SEVERITIES) severity!: (typeof INCIDENT_SEVERITIES)[number];
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(4000) description!: string;
  @IsDateString() occurredAt!: string;
}

export class UpdateIncidentDto {
  @IsIn(INCIDENT_STATUSES) status!: (typeof INCIDENT_STATUSES)[number];
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2000) note!: string;
}

export class SaveFatwaDto {
  /** Empty for a resolution that applies in every country (Super Admin only). */
  @IsOptional() @IsString() countryNodeId?: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) reference!: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) issuedBy!: string;
  @IsDateString() issuedOn!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) topic!: string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(4000) summary!: string;
  @IsOptional() @Transform(trim) @IsUrl({ require_protocol: true, protocols: ['https', 'http'] }) sourceUrl?: string;
  @IsOptional() @IsIn(FATWA_STATUSES) status?: (typeof FATWA_STATUSES)[number];
}
