import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export const FEASIBILITY_REVIEW_STAGES = ['DRAFT', 'FINANCE_REVIEW', 'RISK_REVIEW', 'COMPLIANCE_REVIEW', 'SHARIAH_REVIEW', 'INVESTMENT_COMMITTEE_REVIEW', 'FINAL_DECISION'] as const;
export type FeasibilityReviewStage = typeof FEASIBILITY_REVIEW_STAGES[number];
/** Who decides each stage; the Country Admin stands in for a missing officer. */
export const FEASIBILITY_REVIEWER_ROLES: Record<FeasibilityReviewStage, readonly string[]> = {
  DRAFT: ['Project Sponsor', 'Project Manager', 'Country Admin', 'Organization Admin'],
  FINANCE_REVIEW: ['Finance Officer', 'Country Admin'],
  RISK_REVIEW: ['Risk Officer', 'Country Admin'],
  COMPLIANCE_REVIEW: ['Compliance Officer', 'Country Admin'],
  SHARIAH_REVIEW: ['Shariah Reviewer', 'Shariah Advisor', 'Country Admin'],
  INVESTMENT_COMMITTEE_REVIEW: ['Shariah Committee'],
  FINAL_DECISION: ['Shariah Committee'],
};
export const FEASIBILITY_REVIEW_DECISIONS = ['ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED', 'REQUEST_CHANGES'] as const;
export type FeasibilityReviewDecision = typeof FEASIBILITY_REVIEW_DECISIONS[number];

export class FeasibilityReviewDto {
  @IsIn(FEASIBILITY_REVIEW_STAGES) reviewStage!: FeasibilityReviewStage;
  @IsIn(FEASIBILITY_REVIEW_DECISIONS) decision!: FeasibilityReviewDecision;
  @IsString() comment!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) supportingEvidence?: string[];
}
