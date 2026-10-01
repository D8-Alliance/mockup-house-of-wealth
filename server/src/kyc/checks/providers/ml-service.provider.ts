import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CheckContext, CheckOutcome, ExtractedIdentity, KycCheckProvider, KycCheckType } from '../check-types';

/**
 * Adapter for the in-house eKYC ML service (ekyc/ml-service: FastAPI with
 * RapidOCR, OpenCV YuNet/SFace). The service reads images by storage key
 * from MEDIA_ROOT, so each call writes the document to a directory shared
 * with the service (KYC_ML_MEDIA_DIR = the service's MEDIA_ROOT, with
 * MEDIA_BACKEND=local) and deletes it afterwards.
 *
 * Mapping rules, so capture problems never look like fraud:
 * - A document type the service cannot parse is SKIPPED, not scored 0.
 * - Unreadable fields, poor image quality, a missing face or several faces are
 *   REVIEW (ask the officer / applicant to recapture), not FAIL.
 * - DOCUMENT PASS means "readable and consistent": the service does not
 *   detect forgery (its tamperDetected is always false).
 * LIVENESS is not offered: the service needs video frames and this KYC flow
 * captures a single selfie.
 */

export interface MlServiceConfig {
  baseUrl: string;
  /** Directory shared with the ML service's MEDIA_ROOT. */
  mediaDir: string;
}

// Document types the ML service has parsers for (app/document/parsers.py PARSERS).
const PARSER_BY_COUNTRY: Record<string, string> = { 'CN-MYS': 'MYKAD', 'CN-IDN': 'KTP', 'CN-PAK': 'CNIC' };
const ISO2: Record<string, string> = { 'CN-MYS': 'MY', 'CN-IDN': 'ID', 'CN-PAK': 'PK', 'CN-BGD': 'BD', 'CN-TUR': 'TR', 'CN-NGA': 'NG', 'CN-EGY': 'EG', 'CN-AZE': 'AZ', 'CN-IRN': 'IR' };
const IMAGE_EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png' };
// Quality issues the service reports that mean "recapture", as opposed to a possible spoof.
const SCREEN_ISSUE = /skrin/i;

interface DocumentResponse {
  fields: { fullName?: string; idNumber?: string; dateOfBirth?: string; nationality?: string };
  confidence: number;
  tamperDetected: boolean;
  issues?: string[];
}

interface FaceMatchResponse {
  similarity: number;
  faceFound: { document: boolean; selfie: boolean };
  issues?: string[];
}

/**
 * The service guesses the MyKad century from the current year, so someone
 * born in 1925 reads as 2025. When only the century differs from the date of
 * birth the applicant gave, trust the applicant's century.
 */
export function fixMykadCentury(extracted: string | undefined, claimed: Date | null): string | undefined {
  if (!extracted || !claimed) return extracted;
  const stated = claimed.toISOString().slice(0, 10);
  return extracted.slice(2) === stated.slice(2) && extracted !== stated ? stated : extracted;
}

export class MlServiceProvider implements KycCheckProvider {
  readonly name = 'inhouse-ml';
  readonly version = 'ml-service-0.1';

  constructor(private readonly config: MlServiceConfig) {}

  supports(check: KycCheckType, countryNodeId: string): boolean {
    return (check === 'DOCUMENT' || check === 'FACE_MATCH') && countryNodeId in ISO2;
  }

  async run(check: KycCheckType, ctx: CheckContext): Promise<CheckOutcome> {
    return check === 'DOCUMENT' ? this.document(ctx) : this.faceMatch(ctx);
  }

  private async document(ctx: CheckContext): Promise<CheckOutcome> {
    const { subject } = ctx;
    const documentType = subject.idDocumentType === 'NATIONAL_ID' ? PARSER_BY_COUNTRY[subject.countryNodeId] : undefined;
    if (!documentType) {
      return { status: 'SKIPPED', reasons: [`The ML service cannot read ${subject.idDocumentType === 'PASSPORT' ? 'passports' : `national IDs from ${subject.countryNodeId}`}; review the document manually`] };
    }
    const frontType = 'ID_FRONT';
    return this.withMedia(ctx, [frontType, 'ID_BACK'], async (keys) => {
      if (!keys[frontType]) return { status: 'REVIEW', reasons: ['The front of the ID is not an image (JPG/PNG) the ML service can read'] };
      const response = await this.post<DocumentResponse>('/v1/document', { country: ISO2[subject.countryNodeId], documentType, front: keys[frontType], back: keys.ID_BACK }, ctx.signal);
      const identity: ExtractedIdentity = { ...response.fields, dateOfBirth: documentType === 'MYKAD' ? fixMykadCentury(response.fields.dateOfBirth, subject.dateOfBirth) : response.fields.dateOfBirth };
      const issues = response.issues ?? [];
      const reasons = [...issues];
      if (issues.some((issue) => SCREEN_ISSUE.test(issue))) reasons.push('Possible photo of a screen');
      const readable = Boolean(identity.fullName && identity.idNumber);
      if (!readable || issues.length) {
        return { status: 'REVIEW', score: response.confidence, identity, reasons: reasons.length ? reasons : ['Name or ID number could not be read'], raw: response };
      }
      return { status: 'PASS', score: response.confidence, identity, reasons: ['Readable and consistent; authenticity is not verified by this provider'], raw: response };
    });
  }

  private async faceMatch(ctx: CheckContext): Promise<CheckOutcome> {
    const photoType = ctx.subject.idDocumentType === 'PASSPORT' ? 'PASSPORT' : 'ID_FRONT';
    return this.withMedia(ctx, [photoType, 'SELFIE'], async (keys) => {
      if (!keys[photoType] || !keys.SELFIE) return { status: 'REVIEW', reasons: ['The ID photo or selfie is not an image (JPG/PNG) the ML service can read'] };
      const response = await this.post<FaceMatchResponse>('/v1/face-match', { document: keys[photoType], selfie: keys.SELFIE }, ctx.signal);
      const issues = response.issues ?? [];
      if (!response.faceFound.document || !response.faceFound.selfie) {
        const missing = [!response.faceFound.document && 'ID photo', !response.faceFound.selfie && 'selfie'].filter(Boolean).join(' and ');
        return { status: 'REVIEW', reasons: [`No face detected in the ${missing}; ask for a clearer capture`, ...issues], raw: response };
      }
      if (issues.length) return { status: 'REVIEW', score: response.similarity, reasons: issues, raw: response };
      // A clean comparison: the recommendation thresholds decide what the similarity means.
      return { status: 'PASS', score: response.similarity, reasons: [], raw: response };
    });
  }

  /** Writes the needed documents to the shared directory for one call, then removes them. */
  private async withMedia(ctx: CheckContext, documentTypes: string[], call: (keys: Record<string, { key: string; mime: string } | undefined>) => Promise<CheckOutcome>): Promise<CheckOutcome> {
    const folder = `kyc-${randomUUID()}`;
    const directory = path.join(this.config.mediaDir, folder);
    await mkdir(directory, { recursive: true });
    try {
      const keys: Record<string, { key: string; mime: string } | undefined> = {};
      for (const type of documentTypes) {
        const document = await ctx.subject.loadDocument(type);
        const extension = document && IMAGE_EXTENSIONS[document.mimeType];
        if (!document || !extension) continue;
        const fileName = `${type.toLowerCase()}.${extension}`;
        await writeFile(path.join(directory, fileName), document.content, { mode: 0o600 });
        keys[type] = { key: `${folder}/${fileName}`, mime: document.mimeType };
      }
      return await call(keys);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private async post<T>(route: string, body: unknown, signal: AbortSignal): Promise<T> {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}${route}`, { method: 'POST', signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    // 4xx/5xx (e.g. models not installed, unreadable media) surface as ERROR so a fallback provider can take over.
    if (!response.ok) throw new Error(`ML service ${route} returned HTTP ${response.status}`);
    return (await response.json()) as T;
  }
}
