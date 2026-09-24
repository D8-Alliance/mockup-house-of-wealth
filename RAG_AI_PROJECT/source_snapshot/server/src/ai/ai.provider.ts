import { Injectable } from '@nestjs/common';
import { AiProviderRequest, AiProviderResponse } from './ai.types';

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  const item = asString(value);
  return item ? [item] : [];
}

function normaliseProviderResponse(value: JsonObject, request: AiProviderRequest): AiProviderResponse {
  const rawRecommendation = value.recommendation;
  const recommendation = asObject(rawRecommendation);
  const proposedContract = asString(request.context.proposedShariahContract) || 'Review Required';
  const reasoning = asObject(value.reasoningSummary);
  const rationale = asString(recommendation.rationale) || asString(recommendation.reason) || asString(value.reasoningSummary) || 'The model did not provide a structured rationale.';
  const confidence = asObject(value.confidence);
  const confidenceLevel = asString(value.confidence)?.toUpperCase() || asString(confidence.level)?.toUpperCase();
  const score = typeof confidence.scorePercent === 'number' ? Math.max(0, Math.min(100, confidence.scorePercent)) : 0;
  const riskFlags = Array.isArray(value.riskFlags)
    ? value.riskFlags.map((flag) => typeof flag === 'string'
      ? { title: flag, description: 'The model identified this item for human review.', severity: 'HIGH' as const }
      : { title: asString(asObject(flag).title) || 'Review Required', description: asString(asObject(flag).description) || 'Human review is required.', severity: (asString(asObject(flag).severity)?.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') || 'HIGH' })
    : [];

  return {
    recommendation: {
      ...recommendation,
      primaryStructure: asString(recommendation.primaryStructure) || asString(recommendation.recommendedStructure) || proposedContract,
      secondaryStructure: asString(recommendation.secondaryStructure) || 'Requires authorised comparative review.',
      rationale,
      keyConsiderations: asStringArray(recommendation.keyConsiderations).concat(riskFlags.map((flag) => flag.title)),
      disclaimer: asString(recommendation.disclaimer) || 'AI-generated advisory output. Authorised human review is mandatory.',
    },
    confidence: {
      level: confidenceLevel === 'HIGH' || confidenceLevel === 'MEDIUM' ? confidenceLevel : 'LOW',
      scorePercent: score,
      disclaimer: asString(confidence.disclaimer) || 'Confidence is indicative only and does not represent legal, financial, or Shariah certainty.',
    },
    reasoningSummary: {
      positiveFactors: asStringArray(reasoning.positiveFactors),
      concerns: asStringArray(reasoning.concerns).concat(typeof value.reasoningSummary === 'string' ? [value.reasoningSummary] : []),
    },
    riskFlags,
    dataSources: asStringArray(value.dataSources),
    limitations: asStringArray(value.limitations).length ? asStringArray(value.limitations) : ['Model output requires verification against authoritative project and Shariah sources.'],
    requiresHumanReview: true,
  };
}

export interface AiProvider {
  readonly providerName: string;
  readonly modelName: string;
  generate(request: AiProviderRequest): Promise<AiProviderResponse>;
}

@Injectable()
export class SandboxAiProvider implements AiProvider {
  readonly providerName = 'sandbox';
  readonly modelName = 'sandbox-contract-v1';

  async generate(request: AiProviderRequest): Promise<AiProviderResponse> {
    const contractType = String(request.context.contractType || 'Ijarah');
    const templateSections: Record<string, string[]> = {
      Ijarah: ['Transaction Overview', 'Parties and Roles', 'Underlying Asset and Lease', 'Rental and Payment Terms', 'Security and Covenants', 'Shariah Conditions', 'Conditions Precedent', 'Risks and Disclosures', 'Approvals and Signatures'],
      Musharakah: ['Transaction Overview', 'Capital Contributions', 'Ownership and Governance', 'Profit and Loss Allocation', 'Funding and Drawdown', 'Exit and Default', 'Shariah Conditions', 'Risks and Disclosures', 'Approvals and Signatures'],
      Mudarabah: ['Transaction Overview', 'Rabb-ul-Mal and Mudarib', 'Capital and Use of Proceeds', 'Profit Sharing and Loss Allocation', 'Management Duties', 'Default and Termination', 'Shariah Conditions', 'Risks and Disclosures', 'Approvals and Signatures'],
      Wakalah: ['Transaction Overview', 'Principal and Agent', 'Mandate and Investment Parameters', 'Agency Fee and Incentive', 'Reporting and Controls', 'Default and Termination', 'Shariah Conditions', 'Risks and Disclosures', 'Approvals and Signatures'],
      Sukuk: ['Transaction Overview', 'Issuer and Sukukholders', 'Sukuk Assets and Structure', 'Issue Size and Settlement', 'Periodic Distribution and Redemption', 'Security and Events of Default', 'Shariah Conditions', 'Risks and Disclosures', 'Approvals and Signatures'],
    };
    const sections = templateSections[contractType] || templateSections.Ijarah;
    const draftText = [
      'STRUCTURED TERM SHEET TEMPLATE',
      `Template: ${contractType} Term Sheet`,
      '',
      ...sections.flatMap((section, index) => [`${index + 1}. ${section}`, 'To be completed and verified by the sponsor, legal counsel, financial adviser and Shariah adviser.', '']),
      'IMPORTANT: This sandbox draft is synthetic and is not an offer, legal advice, investment advice, Shariah approval or evidence of project viability.',
    ].join('\n');
    return {
      recommendation: {
        title: `${contractType} Term Sheet (Draft)`,
        summary: 'Sandbox provider response. Connect a production model adapter before relying on this output.',
        primaryStructure: request.context.proposedShariahContract || request.context.contractType || undefined,
        watermark: request.featureKey === 'contract_draft'
          ? 'AI-GENERATED DRAFT • NOT FINAL LEGAL DOCUMENT • NOT FINAL SHARIAH APPROVAL'
          : undefined,
        draftText: request.featureKey === 'contract_draft'
          ? `${draftText}\nProject: ${String(request.context.projectName || 'UNSPECIFIED')}\nSponsor: ${String(request.context.sponsorName || 'UNSPECIFIED')}\nCapital: ${String(request.context.capital || 'UNSPECIFIED')} ${String(request.context.currency || 'UNSPECIFIED')}`
          : undefined,
      },
      confidence: {
        level: 'LOW',
        scorePercent: 0,
        disclaimer: 'Sandbox output is not legal, financial, Shariah, compliance, or investment advice.',
      },
      reasoningSummary: {
        positiveFactors: [],
        concerns: ['Production AI provider is not configured.', 'Human review is mandatory.'],
      },
      riskFlags: [{ title: 'Sandbox Provider', description: 'This result must not be used for execution or approval.', severity: 'HIGH' }],
      dataSources: [],
      limitations: ['Sandbox provider does not analyze source documents or external data.'],
      requiresHumanReview: true,
    };
  }
}

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly providerName = 'openai';
  readonly modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  async generate(request: AiProviderRequest): Promise<AiProviderResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

    const response = await fetch(process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelName,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
           { role: 'system', content: 'You are the Wealth Pooling decision-support AI. Return JSON only. Never claim final legal, financial, compliance, Shariah approval, project legitimacy, viability, or investment suitability. A proposed contract, sector, or funding amount is not evidence. If supplied evidence is missing or unverified, return Review Required, confidence LOW/0, critical risk flags, and specific evidence gaps. Only discuss a possible structure when supplied project documents and verified cashflow and asset-backing evidence support it. Every output requires authorised human review. Use only supplied context and state limitations. Return recommendation, confidence, reasoningSummary, riskFlags, dataSources, limitations, and requiresHumanReview.' },
          { role: 'user', content: JSON.stringify({ featureKey: request.featureKey, action: request.action, prompt: request.prompt, context: request.context }) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);
    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned an empty response');
    const parsed = JSON.parse(content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) as JsonObject;
    return normaliseProviderResponse(parsed, request);
  }
}
