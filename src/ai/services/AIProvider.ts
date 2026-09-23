import { AIRequest, AIResponse, AIConfidenceLevel } from '../types/aiCoreTypes';

export interface AIProvider {
  providerName: string;
  generate(request: AIRequest): Promise<AIResponse>;
  analyze(request: AIRequest): Promise<AIResponse>;
  classify(request: AIRequest): Promise<AIResponse>;
  summarize(request: AIRequest): Promise<AIResponse>;
}

export class MockAIProvider implements AIProvider {
  public providerName = 'Mock AI Decision Engine (Internal Platform)';

  public async generate(request: AIRequest): Promise<AIResponse> {
    return this.buildMockResponse(request, 'Generated structured decision recommendation based on platform data.');
  }

  public async analyze(request: AIRequest): Promise<AIResponse> {
    return this.buildMockResponse(request, 'Analyzed underlying dataset and identified key factors and risk flags.');
  }

  public async classify(request: AIRequest): Promise<AIResponse> {
    return this.buildMockResponse(request, 'Classified contract structure and risk profile under Shariah rules.');
  }

  public async summarize(request: AIRequest): Promise<AIResponse> {
    return this.buildMockResponse(request, 'Summarized project documentation, legal commitments, and financial terms.');
  }

  private buildMockResponse(request: AIRequest, defaultText: string): AIResponse {
    const confidenceLevel: AIConfidenceLevel = 'HIGH';
    return {
      requestId: request.requestId,
      status: 'SUCCESS',
      recommendation: {
        title: `AI Analysis for ${request.module}`,
        summary: defaultText,
        actionRecommended: 'Requires authorised human review and signoff.'
      },
      confidence: {
        level: confidenceLevel,
        scorePercent: 92,
        disclaimer: 'AI confidence indicates model confidence in the generated analysis. It does not represent factual or regulatory certainty.'
      },
      reasoningSummary: {
        positiveFactors: [
          'Aligned with AAOIFI Shariah standards framework',
          'Data parameters fit benchmark historical returns',
          'Risk mitigation structures in place'
        ],
        concerns: [
          'Secondary market liquidity relies on local exchange volume',
          'Requires human Shariah committee validation'
        ]
      },
      riskFlags: [
        {
          title: 'Human Review Mandatory',
          description: 'AI output must be signed off by authorized personnel prior to execution.',
          severity: 'LOW'
        }
      ],
      dataSources: ['Wealth Pooling Internal Database', 'Shariah Governance Framework', 'Audit Trail'],
      limitations: ['Mock AI simulation model without live external financial market feeds.'],
      requiresHumanReview: true,
      generatedAt: new Date().toISOString()
    };
  }
}

export const defaultAIProvider = new MockAIProvider();
