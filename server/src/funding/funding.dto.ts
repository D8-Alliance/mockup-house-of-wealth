import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestTrancheDto {
  /** The tranche (project milestone) to release. */
  @IsString()
  milestoneId!: string;
}

export class RejectFundingRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
