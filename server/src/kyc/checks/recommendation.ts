import { CheckPipeline } from './check-routing';
import { CheckOutcome, ExtractedIdentity, KYC_CHECK_TYPES, KycCheckType } from './check-types';

export type CheckRecommendation = 'CLEAR' | 'ATTENTION' | 'ADVERSE' | 'PENDING';

export interface RecommendationPolicy {
  /** Minimum score for a clean pass; within reviewBand below it is ATTENTION, further below counts as a failure. */
  minScore: Partial<Record<KycCheckType, number>>;
  reviewBand: number;
}

export const DEFAULT_RECOMMENDATION_POLICY: RecommendationPolicy = {
  minScore: { DOCUMENT: 0.8, LIVENESS: 0.9, FACE_MATCH: 0.85 },
  reviewBand: 0.1,
};

export interface ApplicantClaims {
  fullName: string;
  idDocumentNumber: string;
  dateOfBirth: Date | null;
}

const NAME_STOPWORDS = new Set(['bin', 'binti', 'bt', 'bte', 'bn', 'al', 'el', 'ap', 'van', 'von', 'de']);

/**
 * Script-neutral name tokens: keeps letters and digits from every script
 * (Arabic, Persian, Bengali, Cyrillic, ...), strips diacritics, and folds the
 * Turkish dotted/dotless i so "Yılmaz" and "YILMAZ" match.
 */
export function nameTokens(name: string): string[] {
  const folded = name.replace(/[ıİ]/g, 'i').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  return (folded.match(/[\p{L}\p{N}]+/gu) ?? []).filter((token) => token.length > 1 && !NAME_STOPWORDS.has(token));
}

export function namesMatch(a: string, b: string, threshold = 0.75): boolean {
  const left = new Set(nameTokens(a));
  const right = new Set(nameTokens(b));
  if (!left.size || !right.size) return false;
  let common = 0;
  for (const token of left) if (right.has(token)) common += 1;
  return common / Math.max(left.size, right.size) >= threshold;
}

const normalizeId = (value: string) => value.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase();
const isoDate = (value: Date) => value.toISOString().slice(0, 10);

/**
 * Turns primary check results into one advisory recommendation for the
 * officer. Provider-independent: thresholds stay the same when providers change.
 */
export function recommend(
  pipeline: CheckPipeline,
  results: Partial<Record<KycCheckType, CheckOutcome>>,
  claims: ApplicantClaims,
  policy: RecommendationPolicy = DEFAULT_RECOMMENDATION_POLICY,
  now = new Date(),
): { recommendation: CheckRecommendation; reasons: string[] } {
  const reasons: string[] = [];
  let adverse = false;
  let pending = false;
  let attention = false;

  for (const check of KYC_CHECK_TYPES) {
    const route = pipeline[check];
    if (!route) continue;
    const result = results[check];
    if (!result || result.status === 'PENDING') {
      pending = true;
      reasons.push(`${check}: waiting for the provider`);
      continue;
    }
    const detail = result.reasons.join('; ');
    if (result.status === 'ERROR' || result.status === 'SKIPPED') {
      attention = true;
      reasons.push(`${check}: could not be run${detail ? ` (${detail})` : ''}`);
      continue;
    }
    if (result.status === 'FAIL') {
      if (route.required) adverse = true;
      else attention = true;
      reasons.push(`${check}: failed${detail ? ` (${detail})` : ''}`);
      continue;
    }
    if (result.status === 'REVIEW') {
      // The provider already asks for a human; a low score here (e.g. a blurry capture) is not escalated to ADVERSE.
      attention = true;
      reasons.push(`${check}: needs review${detail ? ` (${detail})` : ''}`);
      continue;
    }
    const min = policy.minScore[check];
    if (min === undefined) continue;
    if (result.score === undefined) {
      attention = true;
      reasons.push(`${check}: provider returned no score`);
    } else if (result.score < min - policy.reviewBand) {
      if (route.required) adverse = true;
      else attention = true;
      reasons.push(`${check}: score ${result.score.toFixed(2)} far below ${min}`);
    } else if (result.score < min) {
      attention = true;
      reasons.push(`${check}: score ${result.score.toFixed(2)} below ${min}`);
    }
  }

  // Cross-check what the applicant typed against what providers read from the document or registry.
  const sources: Array<[string, ExtractedIdentity | undefined]> = [['document', results.DOCUMENT?.identity], ['registry', results.REGISTRY?.identity]];
  for (const [label, identity] of sources) {
    if (!identity) continue;
    if (identity.fullName && claims.fullName && !namesMatch(claims.fullName, identity.fullName)) {
      attention = true;
      reasons.push(`Name does not match the ${label}`);
    }
    if (identity.idNumber && claims.idDocumentNumber && normalizeId(identity.idNumber) !== normalizeId(claims.idDocumentNumber)) {
      attention = true;
      reasons.push(`ID number does not match the ${label}`);
    }
    if (identity.dateOfBirth && claims.dateOfBirth && identity.dateOfBirth !== isoDate(claims.dateOfBirth)) {
      attention = true;
      reasons.push(`Date of birth does not match the ${label}`);
    }
    if (identity.documentExpiry && identity.documentExpiry < isoDate(now)) {
      adverse = true;
      reasons.push(`The ${label} shows an expired identity document (${identity.documentExpiry})`);
    }
  }

  const recommendation: CheckRecommendation = adverse ? 'ADVERSE' : pending ? 'PENDING' : attention ? 'ATTENTION' : 'CLEAR';
  return { recommendation, reasons };
}
