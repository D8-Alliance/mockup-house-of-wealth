import { AIRequest, AIResponse } from '../types/aiCoreTypes';
import { defaultAIProvider } from './AIProvider';
import { aiGovernanceService } from './AIGovernanceService';
import { aiAuditLogger } from './AIAuditLogger';

class AIOrchestratorService {
  public async executeAIRequest<T = any>(
    request: AIRequest,
    responseBuilder?: (base: AIResponse) => AIResponse<T>
  ): Promise<AIResponse<T>> {
    const isEnabled = aiGovernanceService.isFeatureEnabled(request.module);

    if (!isEnabled) {
      const disabledResponse: AIResponse = {
        requestId: request.requestId,
        status: 'ERROR',
        recommendation: null,
        confidence: {
          level: 'LOW',
          scorePercent: 0,
          disclaimer: 'This AI feature is currently disabled by Platform Administration.'
        },
        reasoningSummary: {
          positiveFactors: [],
          concerns: ['Feature disabled in AI Governance settings.']
        },
        riskFlags: [
          {
            title: 'Feature Disabled',
            description: 'AI Module is disabled or under maintenance.',
            severity: 'HIGH'
          }
        ],
        dataSources: [],
        limitations: ['AI Module offline.'],
        requiresHumanReview: true,
        generatedAt: new Date().toISOString()
      };
      return disabledResponse as AIResponse<T>;
    }

    // Call provider
    const rawResponse = await defaultAIProvider.analyze(request);

    // Apply optional domain-specific response builder so the returned,
    // audit-logged content is exactly what callers consume.
    const finalResponse = responseBuilder ? responseBuilder(rawResponse) : (rawResponse as AIResponse<T>);

    // Record AI Audit Event
    aiAuditLogger.logEvent({
      aiRequestId: request.requestId,
      userId: request.userId,
      organisationId: request.organisationId,
      countryNodeId: request.countryNodeId,
      role: request.role,
      aiFeature: request.module,
      inputContextSummary: `${request.action} on ${JSON.stringify(request.context || {}).slice(0, 100)}`,
      outputSummary: String((finalResponse as any).recommendation?.title || 'AI Recommendation generated'),
      recommendation: String((finalResponse as any).recommendation?.summary || 'Analysis complete'),
      confidenceLevel: finalResponse.confidence.level,
      riskFlagsCount: finalResponse.riskFlags.length,
      humanDecision: 'PENDING'
    });

    return finalResponse;
  }
}

export const aiOrchestrator = new AIOrchestratorService();
