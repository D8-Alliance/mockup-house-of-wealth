/**
 * Grounded answers for the AI assistant: RAG results are labelled [S1]..[Sn]
 * for the model, and the model's answer is validated against those sources
 * before it is shown or stored. Citations are never trusted as written by the
 * model: unknown labels are dropped, quotes are checked against the source
 * text, and uncited statements lower the grounding status and confidence.
 */
import type { RagSearchResult } from './ai.service';

export interface LabelledSource {
  label: string;
  result: RagSearchResult;
}

export interface ModelChatOutput {
  answer: string;
  citations: Array<{ source: string; quote?: string }>;
  confidence?: { level?: string; scorePercent?: number };
  limitations?: string[];
}

export type GroundingStatus = 'GROUNDED' | 'PARTIALLY_GROUNDED' | 'UNSUPPORTED' | 'NO_SOURCES';

export interface GroundedCitation {
  marker: number;
  label: string;
  quote: string | null;
  quoteVerified: boolean;
  source: RagSearchResult;
}

export interface GroundedAnswer {
  answer: string;
  citations: GroundedCitation[];
  groundingStatus: GroundingStatus;
  unsupportedSentences: string[];
  droppedLabels: string[];
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; scorePercent: number; disclaimer: string };
  limitations: string[];
}

const CONFIDENCE_CAP: Record<GroundingStatus, number> = { GROUNDED: 85, PARTIALLY_GROUNDED: 50, UNSUPPORTED: 15, NO_SOURCES: 10 };
const DISCLAIMER = 'Confidence reflects how well the answer is supported by approved knowledge-base sources. It is not a Shariah ruling, legal, financial, or investment advice.';

/** Sentences that need no citation: disclaimers and "not covered" statements. */
const NON_FACTUAL = /(human review|qualified (shariah|legal|financial)|not (a|an) (shariah ruling|fatwa|legal|financial|investment)|does not (contain|cover)|not covered|no (relevant )?information|tidak (dijumpai|terdapat|meliputi)|semakan manusia)/i;

export function labelSources(results: RagSearchResult[]): LabelledSource[] {
  return results.map((result, index) => ({ label: `S${index + 1}`, result }));
}

const normalise = (text: string) => text
  .toLowerCase()
  .replace(/[‘’`´]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ')
  .replace(/^[\s"'.,;:…-]+|[\s"'.,;:…-]+$/g, '')
  .trim();

/** A quote is verified when it appears verbatim (modulo whitespace/quotes) or 90% of its words appear in the source. */
export function quoteAppearsIn(quote: string, sourceText: string): boolean {
  const q = normalise(quote);
  if (q.length < 8) return false;
  const source = normalise(sourceText);
  if (source.includes(q)) return true;
  const words = q.split(' ').filter((word) => word.length >= 3);
  if (words.length < 6) return false;
  const sourceWords = new Set(source.split(/[^\p{L}\p{N}']+/u));
  return words.filter((word) => sourceWords.has(word.replace(/[^\p{L}\p{N}']/gu, ''))).length / words.length >= 0.9;
}

/** "[S1, S2]" / "[s3]" -> "[S1][S2]" / "[S3]"; markers after a full stop move before it. */
function normaliseMarkers(answer: string): string {
  return answer
    .replace(/\[\s*(s\d+(?:\s*[,;&]\s*s\d+)*)\s*\]/gi, (_match, group: string) => group.split(/[,;&]/).map((label) => `[${label.trim().toUpperCase()}]`).join(''))
    .replace(/([.!?])\s*((?:\[S\d+\])+)/g, ' $2$1');
}

export function groundAnswer(output: ModelChatOutput, sources: LabelledSource[]): GroundedAnswer {
  const byLabel = new Map(sources.map((source) => [source.label, source]));
  const droppedLabels = new Set<string>();

  let answer = normaliseMarkers(output.answer || '').replace(/\[(S\d+)\]/g, (marker, label: string) => {
    if (byLabel.has(label)) return marker;
    droppedLabels.add(label);
    return '';
  }).replace(/[ \t]+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();

  // Quotes offered by the model, verified against the labelled source text.
  const quotes = new Map<string, { quote: string; verified: boolean }>();
  for (const citation of output.citations || []) {
    const label = String(citation.source || '').trim().toUpperCase().replace(/^\[|\]$/g, '');
    if (!byLabel.has(label)) { if (label) droppedLabels.add(label); continue; }
    const quote = (citation.quote || '').trim();
    const verified = quote ? quoteAppearsIn(quote, byLabel.get(label)!.result.content) : false;
    const existing = quotes.get(label);
    if (!existing || (!existing.verified && verified)) quotes.set(label, { quote, verified });
  }

  // Display numbering: order of first appearance in the answer, then labels only cited in the list.
  const order: string[] = [];
  for (const match of answer.matchAll(/\[(S\d+)\]/g)) if (!order.includes(match[1])) order.push(match[1]);
  for (const label of quotes.keys()) if (!order.includes(label)) order.push(label);
  const markerOf = new Map(order.map((label, index) => [label, index + 1]));
  answer = answer.replace(/\[(S\d+)\]/g, (_marker, label: string) => `[${markerOf.get(label)}]`);

  const citations: GroundedCitation[] = order.map((label) => ({
    marker: markerOf.get(label)!,
    label,
    quote: quotes.get(label)?.quote || null,
    quoteVerified: quotes.get(label)?.verified ?? false,
    source: byLabel.get(label)!.result,
  }));

  const sentences = answer.split(/(?<=[.!?])\s+|\n+/).map((sentence) => sentence.trim()).filter(Boolean);
  const unsupportedSentences = sentences.filter((sentence) => {
    const text = sentence.replace(/\[\d+\]/g, '').trim();
    return !/\[\d+\]/.test(sentence) && text.length >= 40 && !NON_FACTUAL.test(text);
  });

  const groundingStatus: GroundingStatus = !sources.length ? 'NO_SOURCES'
    : !citations.length ? 'UNSUPPORTED'
    : !unsupportedSentences.length && citations.every((citation) => !citation.quote || citation.quoteVerified) ? 'GROUNDED'
    : 'PARTIALLY_GROUNDED';

  const cap = CONFIDENCE_CAP[groundingStatus];
  const modelScore = typeof output.confidence?.scorePercent === 'number' && Number.isFinite(output.confidence.scorePercent) ? output.confidence.scorePercent : cap;
  const scorePercent = Math.round(Math.max(0, Math.min(modelScore, cap)));
  const level = scorePercent >= 75 ? 'HIGH' : scorePercent >= 45 ? 'MEDIUM' : 'LOW';
  const limitations = [...(output.limitations || []).filter((item) => typeof item === 'string' && item.trim())];
  if (unsupportedSentences.length) limitations.push(`${unsupportedSentences.length} statement(s) are not supported by a cited source.`);
  if (citations.some((citation) => citation.quote && !citation.quoteVerified)) limitations.push('Some quoted passages could not be found verbatim in the cited source.');
  if (droppedLabels.size) limitations.push('References to non-existent sources were removed.');

  return { answer, citations, groundingStatus, unsupportedSentences, droppedLabels: [...droppedLabels], confidence: { level, scorePercent, disclaimer: DISCLAIMER }, limitations };
}

/** Returned without calling the model (and without charging credits) when retrieval finds nothing. */
export function noSourcesAnswer(): GroundedAnswer {
  return {
    answer: 'The approved knowledge base does not contain information relevant to this question, so I cannot give a sourced answer. Please rephrase the question, or ask a knowledge-base manager to add and approve a relevant reference.',
    citations: [],
    groundingStatus: 'NO_SOURCES',
    unsupportedSentences: [],
    droppedLabels: [],
    confidence: { level: 'LOW', scorePercent: 0, disclaimer: DISCLAIMER },
    limitations: ['No approved knowledge-base source matched the question.'],
  };
}
