import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AuditQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 50;
  @IsOptional() @IsString() @MaxLength(120) action?: string;
  @IsOptional() @IsString() @MaxLength(120) resourceType?: string;
  @IsOptional() @IsString() @MaxLength(120) userId?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}
