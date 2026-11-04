import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class EstateDecisionDto {
  @IsString() decision!: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2000) note!: string;
}

export class DeathDecisionDto extends EstateDecisionDto {
  @IsIn(['VERIFY', 'REJECT']) declare decision: 'VERIFY' | 'REJECT';
}

export class PlanDecisionDto extends EstateDecisionDto {
  @IsIn(['APPROVE', 'RETURN']) declare decision: 'APPROVE' | 'RETURN';
}

export class NoteDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2000) note!: string;
}

export class HeirConsentDto {
  @IsString() beneficiaryId!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) heirName!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) heirRelation!: string;
  @IsIn(['CONSENTED', 'REFUSED']) decision!: 'CONSENTED' | 'REFUSED';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) note?: string;
}

export class PlanRecipientDto {
  @IsString() userId!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) @Max(100) sharePct!: number;
}

export class PlanHoldingDto {
  @IsString() poolId!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => PlanRecipientDto) recipients!: PlanRecipientDto[];
}

export class SettlementPlanDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => PlanHoldingDto) holdings!: PlanHoldingDto[];
  @Transform(trim) @IsString() @MaxLength(4000) note!: string;
}
