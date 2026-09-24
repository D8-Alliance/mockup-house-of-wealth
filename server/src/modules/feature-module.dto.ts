import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateFeatureModuleDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(['ACTIVE', 'MANUAL_REVIEW', 'DISABLED'])
  mode?: 'ACTIVE' | 'MANUAL_REVIEW' | 'DISABLED';
}
