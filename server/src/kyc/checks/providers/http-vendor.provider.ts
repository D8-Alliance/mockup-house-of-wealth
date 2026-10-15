import { UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { CheckContext, CheckOutcome, ExtractedIdentity, KycCheckProvider, KycCheckStatus, KycCheckType, WebhookRequest, WebhookResult } from '../check-types';

/**
 * TEMPLATE for a commercial eKYC vendor (sync response or async webhook).
 * Each vendor has its own API: copy this file, adapt the payload, STATUS_MAP
 * and signature scheme to the vendor's documentation, register it in
 * kyc-check-providers.ts, then point KYC_ROUTING_JSON at it.
 *
 * Webhooks must carry x-timestamp (unix seconds) and x-signature =
 * hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`)). Requests older than
 * WEBHOOK_TOLERANCE_SECONDS are refused, and KycChecksService only accepts a
 * webhook whose transaction id matches a PENDING check, once.
 */

export interface HttpVendorConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
  callbackUrl: string;
  checks: KycCheckType[];
  countryNodeIds: string[];
}

type VendorStatus = 'approved' | 'declined' | 'review' | 'processing' | 'error';

interface VendorResponse {
  id: string;
  status: VendorStatus;
  score?: number;
  extracted?: ExtractedIdentity;
  reasons?: string[];
}

const STATUS_MAP: Record<VendorStatus, KycCheckStatus> = { approved: 'PASS', declined: 'FAIL', review: 'REVIEW', processing: 'PENDING', error: 'ERROR' };
const WEBHOOK_TOLERANCE_SECONDS = 300;
// Documents each check sends to the vendor.
const CHECK_DOCUMENTS: Partial<Record<KycCheckType, string[]>> = {
  DOCUMENT: ['ID_FRONT', 'ID_BACK', 'PASSPORT'],
  LIVENESS: ['SELFIE'],
  FACE_MATCH: ['ID_FRONT', 'PASSPORT', 'SELFIE'],
};

export class HttpVendorProvider implements KycCheckProvider {
  readonly name: string;
  readonly version = 'vendor-api-v1';

  constructor(private readonly config: HttpVendorConfig, private readonly now: () => number = () => Date.now()) {
    this.name = config.name;
  }

  supports(check: KycCheckType, countryNodeId: string): boolean {
    return this.config.checks.includes(check) && this.config.countryNodeIds.includes(countryNodeId);
  }

  async run(check: KycCheckType, { subject, signal }: CheckContext): Promise<CheckOutcome> {
    const documents: Record<string, { mimeType: string; base64: string }> = {};
    for (const type of CHECK_DOCUMENTS[check] ?? []) {
      const document = await subject.loadDocument(type);
      if (document) documents[type] = { mimeType: document.mimeType, base64: document.content.toString('base64') };
    }
    const response = await fetch(`${this.config.baseUrl}/verifications`, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({
        check: check.toLowerCase(),
        country: subject.countryNodeId,
        subject: { fullName: subject.fullName, idNumber: subject.idDocumentNumber, dateOfBirth: subject.dateOfBirth?.toISOString().slice(0, 10), nationality: subject.nationality },
        documents,
        callbackUrl: this.config.callbackUrl,
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(this.config.baseUrl).host}`);
    return this.toOutcome((await response.json()) as VendorResponse);
  }

  async parseWebhook({ rawBody, headers }: WebhookRequest): Promise<WebhookResult> {
    const timestamp = headers['x-timestamp'];
    const signature = headers['x-signature'];
    if (!timestamp || !signature || !/^\d+$/.test(timestamp)) throw new UnauthorizedException('Missing webhook signature');
    if (Math.abs(this.now() / 1000 - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) throw new UnauthorizedException('Webhook timestamp outside the allowed window');
    const expected = Buffer.from(createHmac('sha256', this.config.webhookSecret).update(`${timestamp}.`).update(rawBody).digest('hex'));
    const given = Buffer.from(signature.toLowerCase());
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new UnauthorizedException('Invalid webhook signature');
    const body = JSON.parse(rawBody.toString('utf8')) as VendorResponse;
    if (!body.id) throw new UnauthorizedException('Webhook has no transaction id');
    return { externalRef: body.id, outcome: this.toOutcome(body) };
  }

  private toOutcome(response: VendorResponse): CheckOutcome {
    return {
      status: STATUS_MAP[response.status] ?? 'ERROR',
      score: response.score,
      identity: response.extracted,
      reasons: response.reasons ?? [],
      externalRef: response.id,
      raw: response,
    };
  }
}
