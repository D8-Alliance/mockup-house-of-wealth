import { AuthenticatedUser } from '../auth/identity.service';

export interface AiProviderRequest {
  featureKey: string;
  action: string;
  prompt: string;
  context: Record<string, unknown>;
}

export interface AiProviderResponse {
  recommendation: Record<string, unknown>;
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; scorePercent: number; disclaimer: string };
  reasoningSummary: { positiveFactors: string[]; concerns: string[] };
  riskFlags: { title: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }[];
  dataSources: string[];
  limitations: string[];
  requiresHumanReview: boolean;
}

/** A labelled knowledge-base source given to the model for a grounded chat answer. */
export interface AiChatSource {
  label: string;
  title: string;
  scope: string;
  sourceType: string;
  pages: string | null;
  paragraphRefs: string[];
  effectiveFrom: string | null;
  text: string;
}

export interface AiChatRequest {
  question: string;
  sources: AiChatSource[];
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AiChatResponse {
  answer: string;
  citations: Array<{ source: string; quote?: string }>;
  confidence?: { level?: string; scorePercent?: number };
  limitations?: string[];
}

export interface TenantScope {
  userId: string;
  organisationId: string;
  countryNodeId: string;
}

export function scopeOf(actor: AuthenticatedUser): TenantScope {
  return { userId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId };
}
