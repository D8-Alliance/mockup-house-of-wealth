export type AIFeatureKey =
  | 'contract_advisor'
  | 'contract_draft'
  | 'contract_gap'
  | 'shariah_assistant'
  | 'investment_advisor'
  | 'pool_matching'
  | 'portfolio_analysis'
  | 'project_analyzer'
  | 'due_diligence_assistant'
  | 'document_analyzer'
  | 'risk_analyzer'
  | 'risk_early_warning'
  | 'scenario_engine'
  | 'pool_optimizer'
  | 'investor_discovery'
  | 'natural_language_assistant';

export interface ContractAdvisorProject {
  projectId: string;
  title: string;
  proposedShariahContract: string;
  fundingTarget: number;
  sector: string;
  /** Project lifecycle status; contract structuring is locked once the project is approved. */
  status?: string;
  organisationId?: string;
  countryNodeId?: string;
  currency?: string;
}

export interface ContractAdvisorRecommendation {
  primaryStructure: string;
  secondaryStructure: string;
  rationale: string;
  keyConsiderations: string[];
  disclaimer: string;
}

export interface ContractDraftParams {
  projectId: string;
  contractType?: string;
  templateKey?: 'ijarah' | 'musharakah' | 'mudarabah' | 'wakalah' | 'sukuk';
  capital?: number;
  sponsorName?: string;
  sector?: string;
  currency?: string;
}

export interface ContractDraftRecommendation {
  title: string;
  watermark: string;
  draftText: string;
}

export type AIFeatureStatus = 'ENABLED' | 'DISABLED' | 'UNDER_MAINTENANCE' | 'BETA';

export type AIConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type AISeverityLevel = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AIResponseStatus = 
  | 'LOADING' 
  | 'SUCCESS' 
  | 'LOW_CONFIDENCE' 
  | 'INSUFFICIENT_DATA' 
  | 'ERROR' 
  | 'REQUIRES_HUMAN_REVIEW';

export type AIHumanDecision = 'PENDING' | 'ACCEPTED' | 'MODIFIED' | 'OVERRIDDEN' | 'REJECTED';

export interface AIConfidenceInfo {
  level: AIConfidenceLevel;
  scorePercent: number; // 0 - 100
  disclaimer: string;
}

export interface AIRequest {
  requestId: string;
  userId: string;
  organisationId: string;
  countryNodeId: string;
  role: string;
  module: AIFeatureKey;
  action: string;
  context: Record<string, any>;
  input?: any;
  timestamp: string;
}

export interface AIResponse<T = any> {
  requestId: string;
  runId?: string;
  status: AIResponseStatus;
  recommendation: T;
  confidence: AIConfidenceInfo;
  reasoningSummary: {
    positiveFactors: string[];
    concerns: string[];
  };
  riskFlags: {
    title: string;
    description: string;
    severity: AISeverityLevel;
  }[];
  dataSources: string[];
  limitations: string[];
  requiresHumanReview: boolean;
  generatedAt: string;
}

export interface AIAuditEvent {
  aiRequestId: string;
  timestamp: string;
  userId: string;
  userName?: string;
  organisationId: string;
  countryNodeId: string;
  role: string;
  aiFeature: AIFeatureKey;
  inputContextSummary: string;
  outputSummary: string;
  recommendation: string;
  confidenceLevel: AIConfidenceLevel;
  riskFlagsCount: number;
  humanDecision: AIHumanDecision;
  overrideReason?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
}

export interface AIFeedbackItem {
  id: string;
  aiRequestId: string;
  userId: string;
  userRole: string;
  aiFeature: AIFeatureKey;
  rating: 'HELPFUL' | 'NOT_HELPFUL';
  reason?: 'Incorrect' | 'Incomplete' | 'Not Relevant' | 'Needs Human Review' | string;
  comments?: string;
  timestamp: string;
}

export interface AIFeatureGovernanceConfig {
  key: AIFeatureKey;
  name: string;
  description: string;
  ownerRole: string;
  status: AIFeatureStatus;
  riskLevel: AISeverityLevel;
  humanApprovalRequired: boolean;
  version: string;
  lastUpdated: string;
}
