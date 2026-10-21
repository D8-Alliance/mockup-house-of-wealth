import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** The details a sponsor can correct while the project is a draft. */
export class UpdateProjectDetailsDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) projectName?: string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(5000) description?: string;
  @IsOptional() @IsString() @MaxLength(120) sector?: string;
  @IsOptional() @IsString() @MaxLength(120) sponsorEntityType?: string;
  @IsOptional() @IsString() @MaxLength(120) proposedShariahContract?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1e13) totalProjectCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1e13) fundingRequired?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1e13) sponsorContribution?: number;
}
