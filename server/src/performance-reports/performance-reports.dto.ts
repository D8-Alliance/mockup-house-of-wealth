import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SectorKpiDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @Transform(trim) @IsString() @MaxLength(30) unit!: string;
  @Type(() => Number) @IsNumber() actual!: number;
  @Type(() => Number) @IsNumber() target!: number;
}

/** The PDP's figures for one quarter; profit distributed is filled by the server from the distributions. */
export class SavePerformanceReportDto {
  @Type(() => Number) @IsNumber() @Min(0) revenueActual!: number;
  @Type(() => Number) @IsNumber() @Min(0) revenueProjected!: number;
  @Type(() => Number) @IsNumber() @Min(0) costActual!: number;
  @Type(() => Number) @IsNumber() @Min(0) costProjected!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(100) milestonesOnTimePct!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000) budgetUsedPct!: number;
  @Type(() => Number) @IsInt() @Min(0) shariahIncidents!: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(4000) auditFindings?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @ValidateNested({ each: true }) @Type(() => SectorKpiDto) sectorKpis?: SectorKpiDto[];
  @IsOptional() @Transform(trim) @IsString() @MaxLength(4000) commentary?: string;
}

export const REPORT_DECISIONS = ['VERIFY', 'RETURN'] as const;

export class ReviewPerformanceReportDto {
  @IsIn(REPORT_DECISIONS) decision!: (typeof REPORT_DECISIONS)[number];
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2000) note!: string;
}
