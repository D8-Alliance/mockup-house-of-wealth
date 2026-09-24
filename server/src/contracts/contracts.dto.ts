import { IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateContractDto {
  @IsString() @MaxLength(64) contractNumber!: string;
  @IsString() @MaxLength(64) contractType!: string;
  @IsString() organisationId!: string;
  @IsString() countryNodeId!: string;
}

export class CreateVersionDto {
  @IsObject() content!: Record<string, unknown>;
}

export class CreatePartyDto {
  @IsString() @MaxLength(64) partyType!: string;
  @IsString() @MaxLength(240) displayName!: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() organisationId?: string;
}

export class DecideApprovalDto {
  @IsString() status!: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsString() @MaxLength(1000) decisionNote?: string;
}

export class CreateApprovalDto {
  @IsString() versionId!: string;
  @IsString() approverId!: string;
}

export class TransitionContractDto {
  @IsString() status!: string;
}
