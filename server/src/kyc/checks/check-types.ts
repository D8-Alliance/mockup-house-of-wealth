/**
 * Contract for automated KYC checks. Every provider (internal rules, a
 * commercial eKYC vendor, a government registry) implements KycCheckProvider
 * and returns results in this shape, so providers can be swapped through
 * routing configuration alone. Results are advisory: a KYC officer still
 * makes every decision (see KycService.review).
 */

export const KYC_CHECK_TYPES = [
  'DOCUMENT_CONSISTENCY', // internal: expiry, age, national ID format vs date of birth
  'DUPLICATE_IDENTITY', // internal: same ID number used by another user
  'DOCUMENT_CONTENT', // local OCR: text read from the uploaded documents vs what the applicant entered
  'DOCUMENT', // provider: OCR + authenticity of the identity document
  'LIVENESS', // provider: real person, not a photo, screen or deepfake
  'FACE_MATCH', // provider: selfie matches the document photo
  'REGISTRY', // provider: government identity registry
  'AML_SCREENING', // provider: sanctions and PEP lists
] as const;
export type KycCheckType = (typeof KYC_CHECK_TYPES)[number];

export const KYC_CHECK_STATUSES = ['PASS', 'FAIL', 'REVIEW', 'PENDING', 'ERROR', 'SKIPPED'] as const;
export type KycCheckStatus = (typeof KYC_CHECK_STATUSES)[number];
export const FINAL_CHECK_STATUSES: KycCheckStatus[] = ['PASS', 'FAIL', 'REVIEW', 'ERROR', 'SKIPPED'];

export interface ExtractedIdentity {
  fullName?: string;
  idNumber?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  nationality?: string;
  documentExpiry?: string; // YYYY-MM-DD
}

/** What a provider returns; the orchestrator adds provider name, version and latency. */
export interface CheckOutcome {
  status: KycCheckStatus;
  /** Normalised 0..1, 1 = most confident. */
  score?: number;
  reasons: string[];
  identity?: ExtractedIdentity;
  /** Provider transaction id. Required for PENDING outcomes, so the webhook can be matched exactly. */
  externalRef?: string;
  /** Full provider response; stored, never returned by the API. */
  raw?: unknown;
}

/** Read-only view of the application handed to providers. Documents are loaded lazily. */
export interface CheckSubject {
  applicationId: string;
  userId: string;
  countryNodeId: string;
  fullName: string;
  dateOfBirth: Date | null;
  nationality: string;
  idDocumentType: string;
  idDocumentNumber: string;
  idDocumentExpiry: Date | null;
  residentialAddress: string;
  documentTypes: string[];
  loadDocument(documentType: string): Promise<{ mimeType: string; content: Buffer } | null>;
}

export interface CheckContext {
  subject: CheckSubject;
  /** Final primary results from earlier checks in the same round. */
  previous: Partial<Record<KycCheckType, CheckOutcome>>;
  /** Aborted on timeout; providers should pass it to fetch() so the call is really cancelled. */
  signal: AbortSignal;
}

export interface WebhookRequest {
  rawBody: Buffer;
  headers: Record<string, string | undefined>;
}

export interface WebhookResult {
  /** Must equal the externalRef the provider returned with the PENDING outcome. */
  externalRef: string;
  outcome: CheckOutcome;
}

export interface KycCheckProvider {
  readonly name: string;
  readonly version: string;
  /** Whether this provider may only run outside production (e.g. the mock). */
  readonly developmentOnly?: boolean;
  supports(check: KycCheckType, countryNodeId: string): boolean;
  run(check: KycCheckType, ctx: CheckContext): Promise<CheckOutcome>;
  /** Async providers: authenticate the request (signature + freshness) and parse it. Throw on a bad signature. */
  parseWebhook?(request: WebhookRequest): Promise<WebhookResult>;
}

export const KYC_CHECK_PROVIDERS = Symbol('KYC_CHECK_PROVIDERS');
