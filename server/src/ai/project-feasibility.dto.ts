import { IsIn, IsOptional, IsString } from 'class-validator';

export const FEASIBILITY_REVIEW_STAGES = ['DRAFT', 'FINANCE_REVIEW', 'RISK_REVIEW', 'COMPLIANCE_REVIEW', 'SHARIAH_REVIEW', 'INVESTMENT_COMMITTEE_REVIEW', 'FINAL_DECISION'] as const;
export type FeasibilityReviewStage = typeof FEASIBILITY_REVIEW_STAGES[number];
export const FEASIBILITY_REVIEW_DECISIONS = ['ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED', 'REQUEST_CHANGES'] as const;
export type FeasibilityReviewDecision = typeof FEASIBILITY_REVIEW_DECISIONS[number];

export class FeasibilityReviewDto {
  @IsIn(FEASIBILITY_REVIEW_STAGES) reviewStage!: FeasibilityReviewStage;
  @IsIn(FEASIBILITY_REVIEW_DECISIONS) decision!: FeasibilityReviewDecision;
  @IsString() comment!: string;
}
