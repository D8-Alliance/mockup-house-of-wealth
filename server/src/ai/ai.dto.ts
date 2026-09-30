import { IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MinLength, ValidateIf } from 'class-validator';
import { RAG_REVIEW_DECISIONS, RAG_SCOPES, RagReviewDecision, RagScope } from './rag-scope';
import { CITATION_REVIEW_STATUSES, CitationReviewStatus, GROUNDING_STATUSES } from './citation-audit';

export class ChatDto {
  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  // Adds that project's approved documents to the retrieval scope (access is checked).
  @IsOptional()
  @IsString()
  projectId?: string;
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
  // GLOBAL = all D-8 country nodes, COUNTRY = one country node, PROJECT = one project. Defaults to PROJECT with a projectId, else COUNTRY.
  @IsOptional() @IsIn(RAG_SCOPES) scope?: RagScope;

  // COUNTRY scope only; defaults to the actor's country node.
  @IsOptional() @IsString() countryNodeId?: string;

  // Date from which the standard or regulation applies (ISO 8601).
  @IsOptional() @IsDateString() effectiveFrom?: string;

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
}

export class CitationAuditQueryDto {
  @IsOptional() @IsString() documentId?: string;
  @IsOptional() @IsIn(RAG_SCOPES) scope?: string;
  @IsOptional() @IsString() countryNodeId?: string;
  @IsOptional() @IsIn(GROUNDING_STATUSES) groundingStatus?: string;
  @IsOptional() @IsIn(['true', 'false']) quoteVerified?: 'true' | 'false';
  @IsOptional() @IsIn(CITATION_REVIEW_STATUSES) reviewStatus?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}

export class CitationReviewDto {
  @IsIn(CITATION_REVIEW_STATUSES) status!: CitationReviewStatus;
  @IsOptional() @IsString() comment?: string;
}

export class RagSupersedeDto {
  // Replacement document id, or null to restore the document as current.
  @ValidateIf((_object, value) => value !== null) @IsString() supersededById!: string | null;
}

export class RagReviewDto {
  @IsIn(RAG_REVIEW_DECISIONS) decision!: RagReviewDecision;
  @IsOptional() @IsString() comment?: string;
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
