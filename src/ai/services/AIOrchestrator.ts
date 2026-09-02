import { AIRequest, AIResponse } from '../types/aiCoreTypes';
import { defaultAIProvider } from './AIProvider';
import { aiGovernanceService } from './AIGovernanceService';
import { aiAuditLogger } from './AIAuditLogger';

class AIOrchestratorService {
  public async executeAIRequest<T = any>(request: AIRequest): Promise<AIResponse<T>> {
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
      return disabledResponse;
    }

    // Call provider
    const rawResponse = await defaultAIProvider.analyze(request);

    // Record AI Audit Event
    aiAuditLogger.logEvent({
      aiRequestId: request.requestId,
      userId: request.userId,
      organisationId: request.organisationId,
      countryNodeId: request.countryNodeId,
      role: request.role,
      aiFeature: request.module,
      inputContextSummary: `${request.action} on ${JSON.stringify(request.context || {}).slice(0, 100)}`,
      outputSummary: String(rawResponse.recommendation?.title || 'AI Recommendation generated'),
      recommendation: String(rawResponse.recommendation?.summary || 'Analysis complete'),
      confidenceLevel: rawResponse.confidence.level,
      riskFlagsCount: rawResponse.riskFlags.length,
      humanDecision: 'PENDING'
    });

    return rawResponse;
  }
}

export const aiOrchestrator = new AIOrchestratorService();
