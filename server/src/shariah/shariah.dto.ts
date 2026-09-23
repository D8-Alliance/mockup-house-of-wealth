import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateShariahReviewDto {
  @IsString()
  @MaxLength(64)
  projectId!: string;

  @IsString()
  @MaxLength(64)
  organisationId!: string;

  @IsString()
  @MaxLength(64)
  countryNodeId!: string;

  @IsString()
  @MaxLength(64)
  proposedContract!: string;
}

export class CreateShariahDecisionDto {
  @IsIn(['ACCEPTED', 'MODIFIED', 'OVERRIDDEN', 'REJECTED'])
  decision!: 'ACCEPTED' | 'MODIFIED' | 'OVERRIDDEN' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  justification?: string;
}
