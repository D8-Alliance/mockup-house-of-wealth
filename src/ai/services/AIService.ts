import { AIRequest, AIResponse } from '../types/aiCoreTypes';
import { aiOrchestrator } from './AIOrchestrator';

export class AIService {
  public static async analyzeContract(project: any, user: any): Promise<AIResponse> {
    const req: AIRequest = {
      requestId: `AI-REQ-${Date.now()}`,
      userId: user.id,
      organisationId: user.organization || 'ORG-MYS',
      countryNodeId: user.countryCode || 'CN-MYS',
      role: user.role,
      module: 'contract_advisor',
      action: 'RECOMMEND_CONTRACT',
      context: { projectId: project?.projectId, contract: project?.proposedShariahContract },
      timestamp: new Date().toISOString()
    };

    const response = await aiOrchestrator.executeAIRequest(req);
    return {
      ...response,
      recommendation: {
        primaryStructure: 'Musharakah (Joint Venture Capital)',
        secondaryStructure: 'Mudarabah (Capital Provider & Managing Partner)',
        rationale: 'Project involves direct equity risk-sharing and capital addition. Joint capital participation aligns with AAOIFI Standard No. 12.',
        keyConsiderations: [
          'Ownership arrangement and asset co-ownership rights require explicit drafting',
          'Profit distribution ratio agreed upfront at 80% Investor / 20% Sponsor',
          'Capital loss allocation strictly pro-rata to capital contribution'
        ],
        disclaimer: 'Potentially suitable structure — requires Shariah review.'
      },
      reasoningSummary: {
        positiveFactors: [
          'Direct asset backing provides clear tangible security',
          'Sponsor contribution of $2M USD demonstrates skin in the game',
          'Project cashflows support scheduled quarterly profit distribution'
        ],
        concerns: [
          'Asset ownership co-title mechanism in Malaysia jurisdiction requires legal confirmation',
          'Profit sharing formula must be documented pre-execution'
        ]
      }
    };
  }

  public static async generateContractDraft(params: any, user: any): Promise<AIResponse> {
    const req: AIRequest = {
      requestId: `AI-REQ-${Date.now()}`,
      userId: user.id,
      organisationId: user.organization || 'ORG-MYS',
      countryNodeId: user.countryCode || 'CN-MYS',
      role: user.role,
      module: 'contract_draft',
      action: 'GENERATE_DRAFT_TERMS',
      context: params,
      timestamp: new Date().toISOString()
    };

    const res = await aiOrchestrator.executeAIRequest(req);
    return {
      ...res,
      recommendation: {
        title: `DRAFT SHARIAH AGREEMENT (${params.contractType || 'MUDARABAH'})`,
        watermark: 'AI-GENERATED DRAFT • NOT FINAL LEGAL DOCUMENT • NOT FINAL SHARIAH APPROVAL',
        draftText: `THIS MUDARABAH INVESTMENT AGREEMENT is entered into as of ${new Date().toISOString().split('T')[0]} between:
1. CAPITAL PROVIDERS (Rabb-ul-Mal)
2. MANAGING PARTNER (Mudarib: ${params.sponsorName || 'FELDA Holdings Berhad'})

RECITALS & SHARIAH TERMS:
1. Capital Amount: $${(params.capital || 8000000).toLocaleString()} USD.
2. Purpose: Deployment in Halal ${params.sector || 'Agriculture'} Expansion Project.
3. Profit Sharing Ratio: 80% Rabb-ul-Mal / 20% Mudarib.
4. Loss Allocation: Losses borne solely by Rabb-ul-Mal pro-rata, except in cases of proven Mudarib negligence or misconduct.
5. Management Fee: 1.5% p.a. Mudarib fee deducted from realized revenues.
6. Governing Law & Shariah Oversight: D-8 Shariah Advisory Council & Local Courts.`
      }
    };
  }

  public static async matchInvestmentPools(investorProfile: any, pools: any[], user: any): Promise<AIResponse> {
    const req: AIRequest = {
      requestId: `AI-REQ-${Date.now()}`,
      userId: user.id,
      organisationId: user.organization || 'ORG-MYS',
      countryNodeId: user.countryCode || 'CN-MYS',
      role: user.role,
      module: 'investment_advisor',
      action: 'MATCH_POOLS',
      context: { profile: investorProfile },
      timestamp: new Date().toISOString()
    };

    const res = await aiOrchestrator.executeAIRequest(req);
    const matches = pools.slice(0, 3).map((p, idx) => ({
      poolId: p.poolId,
      poolName: p.poolName,
      matchScorePercent: 92 - idx * 7,
      breakdown: {
        riskAlignment: 90 - idx * 5,
        durationAlignment: 88,
        sectorAlignment: 95,
        countryAlignment: 100,
        liquidityAlignment: 75
      },
      indicativeReturn: `${p.indicativeExpectedReturn}% p.a.`,
      contract: p.investmentStructure,
      reasonsForMatch: [
        `Risk profile (${investorProfile.riskProfile || 'Moderate'}) matches pool underlying risk score.`,
        `5-year investment duration aligns with investor horizon preference.`,
        `Asset backing under ${p.investmentStructure} structure satisfies Shariah criteria.`
      ],
      potentialConcerns: [
        '5-year lock-in with quarterly secondary liquidity windows',
        'Yield depends on seasonal agricultural harvest cycles'
      ]
    }));

    return {
      ...res,
      recommendation: {
        summary: '3 Wealth Pools appear potentially aligned with your stated preferences.',
        disclaimer: 'AI-generated suitability indication. Does not constitute regulated financial advice.',
        matches
      }
    };
  }

  public static async analyzeProject(project: any, user: any): Promise<AIResponse> {
    const req: AIRequest = {
      requestId: `AI-REQ-${Date.now()}`,
      userId: user.id,
      organisationId: user.organization || 'ORG-MYS',
      countryNodeId: user.countryCode || 'CN-MYS',
      role: user.role,
      module: 'project_analyzer',
      action: 'ANALYZE_PROJECT',
      context: { projectId: project?.projectId },
      timestamp: new Date().toISOString()
    };

    const res = await aiOrchestrator.executeAIRequest(req);
    return {
      ...res,
      recommendation: {
        projectHealthScore: 78,
        projectedNPV: '$3,450,000 USD',
        projectedIRR: '11.8% p.a.',
        dscrRatio: 1.65,
        fundingReadiness: 'High Readiness',
        strengths: [
          'Strong projected operating cashflows ($2.1M p.a.)',
          'Established PDP track record with 15+ years regional operational history',
          'High demand for sustainable palm oil & agricultural export'
        ],
        weaknesses: [
          'Sponsor equity contribution (20%) is lower than institutional benchmark (25%)',
          'Off-take contract renewal required in Year 3'
        ],
        missingInformation: [
          'Independent asset appraisal report for land parcel Jengka-04'
        ],
        suggestedImprovements: [
          'Attach third-party environmental & RSPO sustainability certification'
        ]
      }
    };
  }
}
