import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class ContractAdvisorDto {
  @IsString()
  projectId!: string;

  @IsString()
  @MinLength(1)
  proposedShariahContract!: string;

  @IsOptional()
  @IsString()
  context?: string;
}

export class ContractDraftDto {
  @IsString()
  @MinLength(1)
  projectId!: string;

  @IsOptional()
  @IsIn(['Ijarah', 'Musharakah', 'Mudarabah', 'Wakalah', 'Sukuk'])
  contractType?: string;
}

export class ShariahAnalyzeDto {
  @IsString()
  @MinLength(1)
  proposedContract!: string;

  @IsString()
  @MinLength(1)
  terms!: string;

  @IsString()
  projectId!: string;
}

export class DueDiligenceDto {
  @IsString()
  @MinLength(1)
  subjectType!: string;

  @IsString()
  @MinLength(1)
  subjectId!: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class ProjectDueDiligenceDto {
  @IsString()
  @MinLength(1)
  projectId!: string;
}

export class AiDecisionDto {
  @IsIn(['ACCEPTED', 'MODIFIED', 'OVERRIDDEN', 'REJECTED'])
  decision!: 'ACCEPTED' | 'MODIFIED' | 'OVERRIDDEN' | 'REJECTED';

  @IsString()
  @MinLength(1)
  justification!: string;
}

export class RagDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  projectId?: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  sourceType!: string;

  @IsOptional() @IsString() documentCategory?: string;
  @IsOptional() @IsString() contractType?: string;
  @IsOptional() @IsString() authority?: string;
  @IsOptional() @IsString() jurisdiction?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsIn(['DRAFT', 'REVIEWED', 'APPROVED']) approvalStatus?: 'DRAFT' | 'REVIEWED' | 'APPROVED';

  @IsString()
  @MinLength(1)
  content!: string;
}

export class RagSearchDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @MinLength(1)
  query!: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  embedding?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional() @IsString() documentCategory?: string;
  @IsOptional() @IsString() contractType?: string;
  @IsOptional() @IsString() authority?: string;
  @IsOptional() @IsString() jurisdiction?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsIn(['DRAFT', 'REVIEWED', 'APPROVED']) approvalStatus?: 'DRAFT' | 'REVIEWED' | 'APPROVED';
}

export class ContractRetrievalDto {
  @IsString() @MinLength(1) contractType!: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() jurisdiction?: string;
  @IsOptional() @IsString() purpose?: string;
}

export class ShariahValidationDto extends ContractRetrievalDto {
  @IsOptional() context?: Record<string, unknown>;
}
