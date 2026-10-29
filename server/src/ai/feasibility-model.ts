import { AiProviderResponse } from './ai.types';

export interface FeasibilityModelInput {
  projectId: string;
  project: Record<string, unknown>;
  documents: Array<Record<string, unknown>>;
  financialAnalysis: Record<string, unknown>;
  riskAnalysis: Record<string, unknown>;
}

const FINANCIAL_FIGURES = ['npv', 'irr', 'dscr', 'roi', 'paybackPeriod', 'profitMargin', 'discountRate', 'financialFeasibility'];
const PROJECT_FIELDS = ['projectCode', 'projectName', 'sector', 'totalProjectCost', 'sponsorContribution', 'fundingRequired', 'proposedShariahContract', 'status'];

/** Long arrays and texts cut down, so the model reads the gist and answers in time. */
function trim(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.length > 240 ? `${value.slice(0, 240)}…` : value;
  if (Array.isArray(value)) return depth > 2 ? `${value.length} items` : value.slice(0, 6).map((item) => trim(item, depth + 1));
  if (value && typeof value === 'object') {
    if (depth > 2) return '…';
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, trim(item, depth + 1)]));
  }
  return value;
}

const pick = (source: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));

/**
 * What the model is given for a feasibility comment: the project's key fields, the document names, the figures the
 * platform calculated and a trimmed risk summary. Not the scenario tables or every milestone, which made the prompt
 * too long for a CPU model to answer within the request timeout. projectId stays at the top: runs are found by it.
 */
export function feasibilityModelContext(input: FeasibilityModelInput): Record<string, unknown> {
  const milestones = Array.isArray(input.project.milestones) ? input.project.milestones : [];
  return {
    projectId: input.projectId,
    project: { ...pick(input.project, PROJECT_FIELDS), milestoneCount: milestones.length },
    documents: input.documents.slice(0, 12).map((document) => document.fileName),
    documentCount: input.documents.length,
    financialFigures: pick(input.financialAnalysis, FINANCIAL_FIGURES),
    risk: trim(input.riskAnalysis),
  };
}

/**
 * The analysis when the model does not answer: the platform's own figures, with no AI commentary and nothing that
 * reads as advice. Reviewers then decide on the calculated figures and the evidence, as they must anyway.
 */
export function feasibilityFallback(input: FeasibilityModelInput): AiProviderResponse {
  const figures = pick(input.financialAnalysis, FINANCIAL_FIGURES);
  return {
    recommendation: {
      summary: 'AI commentary is not available for this run. The figures shown are calculated by the platform from the project data and the uploaded evidence; the reviewers decide on them.',
      status: 'Review Required',
      financialFigures: figures,
    },
    confidence: { level: 'LOW', scorePercent: 0, disclaimer: 'No AI commentary: the AI adviser did not answer in time. Figures are the platform\'s own calculations.' },
    reasoningSummary: { positiveFactors: [], concerns: ['The AI adviser did not answer in time, so this analysis has no AI commentary. Run it again later to add one.'] },
    riskFlags: [],
    dataSources: input.documents.map((document) => String(document.fileName ?? '')).filter(Boolean),
    limitations: ['No AI commentary for this run.', 'Every figure is calculated from the project fields and extracted document text, and must be checked by the reviewers.'],
    requiresHumanReview: true,
  };
}
