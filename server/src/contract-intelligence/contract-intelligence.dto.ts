import { IsArray, IsInt, IsOptional, IsString, IsIn, Min, MinLength } from 'class-validator';

export class CreateContractTemplateDto {
  @IsString() @MinLength(1) contractType!: string;
  @IsString() @MinLength(1) templateName!: string;
  @IsString() @MinLength(1) jurisdiction!: string;
  @IsString() @MinLength(1) industry!: string;
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() approvalStatus?: string;
}

export class CreateContractClauseDto {
  @IsOptional() @IsString() templateId?: string;
  @IsString() @MinLength(1) contractType!: string;
  @IsOptional() @IsString() industry?: string;
  @IsString() @MinLength(1) clauseCategory!: string;
  @IsString() @MinLength(1) clauseTitle!: string;
  @IsString() @MinLength(1) clauseText!: string;
  @IsOptional() @IsString() shariahReference?: string;
  @IsString() @MinLength(1) jurisdiction!: string;
  @IsOptional() @IsString() riskLevel?: string;
  @IsOptional() @IsString() approvalStatus?: string;
}

export class CreateContractInputSchemaDto {
  @IsString() @MinLength(1) contractType!: string;
  @IsString() @MinLength(1) schemaName!: string;
  @IsArray() @IsString({ each: true }) requiredFields!: string[];
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() approvalStatus?: string;
}

export class CreateShariahRuleDto {
  @IsString() @MinLength(1) contractType!: string;
  @IsOptional() @IsString() jurisdiction?: string;
  @IsString() @MinLength(1) ruleName!: string;
  @IsString() @MinLength(1) description!: string;
  @IsOptional() @IsString() severity?: string;
  @IsString() @MinLength(1) validationLogic!: string;
  @IsOptional() @IsString() approvalStatus?: string;
}

export class CreateDocumentVersionDto {
  @IsOptional() @IsIn(['DRAFT', 'LEGAL_REVIEW', 'SHARIAH_REVIEW'])
  reviewStatus?: 'DRAFT' | 'LEGAL_REVIEW' | 'SHARIAH_REVIEW';
}
