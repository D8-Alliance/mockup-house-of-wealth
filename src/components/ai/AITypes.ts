export type AICenterTab = 
  | 'investor-advisor'
  | 'project-advisor'
  | 'contract-shariah'
  | 'pool-optimizer'
  | 'risk-valuation'
  | 'due-diligence-fraud'
  | 'assistant-reports';

export interface AIConfidenceData {
  score: number; // 0 - 100
  modelName: string;
  dataPointsEvaluated: number;
  factors: { factor: string; weightPercent: number; direction: 'Positive' | 'Negative' | 'Neutral' }[];
  auditHash: string;
}

export interface AIInvestorInputs {
  age: number;
  incomeUSD: number;
  riskProfile: 'Conservative' | 'Moderate' | 'Balanced' | 'Growth' | 'Aggressive';
  investmentGoal: 'Capital Preservation' | 'Wealth Accumulation' | 'Regular Income & Zakat Purified' | 'Aggressive Impact';
  timeHorizonYears: number;
  preferredCurrency: string;
}

export interface AIInvestorRecommendation {
  suitablePools: { id: string; name: string; matchPercent: number; yield: string; contract: string; risk: string }[];
  expectedROIPercent: number;
  overallRiskGrade: string;
  diversificationScore: number; // 0-100
  sectorAllocation: { sector: string; percent: number; color: string }[];
  explanation: string;
  confidence: AIConfidenceData;
}

export interface AIProjectSponsorInputs {
  projectTitle: string;
  sector: string;
  fundingTargetUSD: number;
  country: string;
  businessPlanFilename: string;
  projectedRevenueYear1: number;
  projectedCostYear1: number;
  collateralValueUSD: number;
}

export interface AIProjectAnalysisResult {
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  npvUSD: number;
  irrPercent: number;
  dscrRatio: number; // Debt Service Coverage Ratio
  fundingReadinessScore: number; // 0-100
  recommendedIslamicContract: 'Mudarabah' | 'Musharakah' | 'Wakalah' | 'Ijarah' | 'Istisna' | 'Murabaha';
  contractRationale: string;
  riskRating: string;
  confidence: AIConfidenceData;
}

export interface AIExecutiveSummaryReport {
  title: string;
  generatedDate: string;
  keyInsights: string[];
  overallShariahRating: string;
  portfolioHealthScore: number;
  auditTrailId: string;
}
