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

export interface TenantScope {
  userId: string;
  organisationId: string;
  countryNodeId: string;
}

export function scopeOf(actor: AuthenticatedUser): TenantScope {
  return { userId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId };
}
