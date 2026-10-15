import { PrismaService } from '../../prisma.service';
import { KYC_CHECK_TYPES, KycCheckProvider, KycCheckType } from './check-types';
import { DocumentContentProvider } from './providers/document-content.provider';
import { HttpVendorProvider } from './providers/http-vendor.provider';
import { LocalLivenessProvider } from './providers/liveness.provider';
import { InternalRulesProvider } from './providers/internal-rules.provider';
import { MockKycProvider } from './providers/mock.provider';
import { MlServiceProvider } from './providers/ml-service.provider';

const list = (value: string | undefined) => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

/** The only place check providers are registered. External ones activate when their env is complete. */
export function buildKycCheckProviders(prisma: PrismaService, env: NodeJS.ProcessEnv = process.env): KycCheckProvider[] {
  // DocumentContentProvider runs fully on this server (PDF text + bundled Tesseract OCR).
  const providers: KycCheckProvider[] = [new InternalRulesProvider(prisma), new DocumentContentProvider(), new LocalLivenessProvider(prisma), new MockKycProvider()];

  if (env.KYC_VENDOR_A_URL && env.KYC_VENDOR_A_KEY && env.KYC_VENDOR_A_WEBHOOK_SECRET) {
    const checks = list(env.KYC_VENDOR_A_CHECKS || 'DOCUMENT,LIVENESS,FACE_MATCH,AML_SCREENING');
    const invalid = checks.filter((check) => !(KYC_CHECK_TYPES as readonly string[]).includes(check));
    if (invalid.length) throw new Error(`KYC_VENDOR_A_CHECKS has unknown check type(s): ${invalid.join(', ')}`);
    providers.push(new HttpVendorProvider({
      name: 'vendor-a',
      baseUrl: env.KYC_VENDOR_A_URL,
      apiKey: env.KYC_VENDOR_A_KEY,
      webhookSecret: env.KYC_VENDOR_A_WEBHOOK_SECRET,
      callbackUrl: `${env.PUBLIC_API_BASE_URL ?? ''}/kyc/webhooks/vendor-a`,
      checks: checks as KycCheckType[],
      countryNodeIds: list(env.KYC_VENDOR_A_COUNTRIES || 'CN-MYS'),
    }));
  }
  // In-house ML service (OCR + face match). KYC_ML_MEDIA_DIR must be the service's MEDIA_ROOT (shared volume).
  if (env.KYC_ML_URL && env.KYC_ML_MEDIA_DIR) providers.push(new MlServiceProvider({ baseUrl: env.KYC_ML_URL, mediaDir: env.KYC_ML_MEDIA_DIR }));
  return providers;
}
