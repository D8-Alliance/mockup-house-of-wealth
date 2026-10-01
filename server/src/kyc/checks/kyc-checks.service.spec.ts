import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma.service';
import { assertRoutingUsable, CheckRouting, loadCheckRouting } from './check-routing';
import { CheckOutcome, KycCheckProvider, KycCheckType } from './check-types';
import { KycChecksService } from './kyc-checks.service';
import { HttpVendorProvider } from './providers/http-vendor.provider';
import { InternalRulesProvider } from './providers/internal-rules.provider';
import { MockKycProvider } from './providers/mock.provider';
import { namesMatch, recommend } from './recommendation';

jest.mock('../../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../../audit/audit.service', () => ({ AuditService: class {} }));

// ---- Minimal in-memory stand-in for the Prisma calls KycChecksService makes ----

type Row = Record<string, any>;
const matches = (row: Row, where: Row = {}) => Object.entries(where).every(([key, value]) => {
  if (value && typeof value === 'object' && 'in' in value) return (value.in as unknown[]).includes(row[key]);
  return row[key] === value;
});

function createStore(application: Row) {
  const applications: Row[] = [application];
  const results: Row[] = [];
  let sequence = 0;
  const prisma = {
    kycApplication: {
      findUnique: async ({ where }: { where: Row }) => {
        const found = applications.find((row) => row.id === where.id);
        return found && { ...found, documents: [] };
      },
      findUniqueOrThrow: async ({ where }: { where: Row }) => ({ ...applications.find((row) => row.id === where.id)! }),
      update: async ({ where, data }: { where: Row; data: Row }) => Object.assign(applications.find((row) => row.id === where.id)!, data),
    },
    kycDocument: { findUnique: async () => null },
    kycCheckResult: {
      aggregate: async ({ where }: { where: Row }) => {
        const rounds = results.filter((row) => matches(row, where)).map((row) => row.round as number);
        return { _max: { round: rounds.length ? Math.max(...rounds) : null } };
      },
      create: async ({ data }: { data: Row }) => {
        if (data.externalRef && results.some((row) => row.provider === data.provider && row.externalRef === data.externalRef)) throw new Error('unique violation');
        const row = { id: `R${++sequence}`, agree: null, createdAt: new Date(Date.now() + sequence), ...data };
        results.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { provider_externalRef: Row } }) => results.find((row) => row.provider === where.provider_externalRef.provider && row.externalRef === where.provider_externalRef.externalRef) ?? null,
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const rows = results.filter((row) => matches(row, where));
        rows.forEach((row) => Object.assign(row, data));
        return { count: rows.length };
      },
      update: async ({ where, data }: { where: Row; data: Row }) => Object.assign(results.find((row) => row.id === where.id)!, data),
      findFirst: async ({ where }: { where: Row }) => results.filter((row) => matches(row, where)).sort((a, b) => b.createdAt - a.createdAt)[0] ?? null,
      findMany: async ({ where }: { where: Row }) => results.filter((row) => matches(row, where)),
    },
  };
  return { prisma, applications, results };
}

const baseApplication = () => ({
  id: 'KYC-1', userId: 'USR-1', organisationId: 'ORG-PUBLIC', countryNodeId: 'CN-MYS', status: 'SUBMITTED',
  fullName: 'Ali Bin Abu', dateOfBirth: new Date('1990-05-01'), nationality: 'Malaysian', idDocumentType: 'NATIONAL_ID',
  idDocumentNumber: '900501-14-5678', idDocumentExpiry: new Date('2031-01-01'), checkRecommendation: null, checkReasons: [],
});

/** Async vendor stand-in: returns PENDING with a fresh transaction id; webhooks carry { ref, status }. */
class AsyncVendor implements KycCheckProvider {
  readonly version = 'test';
  private counter = 0;
  constructor(readonly name: string) {}
  supports() { return true; }
  async run(): Promise<CheckOutcome> { return { status: 'PENDING', reasons: [], externalRef: `${this.name}-${++this.counter}` }; }
  async parseWebhook({ rawBody }: { rawBody: Buffer }) {
    const body = JSON.parse(rawBody.toString()) as { ref: string; status: 'PASS' | 'FAIL'; score?: number };
    return { externalRef: body.ref, outcome: { status: body.status, score: body.score, reasons: [] } };
  }
}

class FixedProvider implements KycCheckProvider {
  readonly version = 'test';
  calls = 0;
  constructor(readonly name: string, private readonly outcome: () => Promise<CheckOutcome>) {}
  supports() { return true; }
  async run() { this.calls += 1; return this.outcome(); }
}

const webhook = (body: object) => ({ rawBody: Buffer.from(JSON.stringify(body)), headers: {} });
const audit = { record: jest.fn().mockResolvedValue(undefined) };
const routing = (check: KycCheckType, route: Record<string, unknown>): CheckRouting => ({ defaults: { [check]: { required: true, ...route } }, countries: {} });

function setup(providers: KycCheckProvider[], checkRouting: CheckRouting) {
  const store = createStore(baseApplication());
  const service = new KycChecksService(store.prisma as unknown as PrismaService, audit as unknown as AuditService, providers, checkRouting);
  return { ...store, service };
}

describe('KycChecksService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('never changes the application status, only the advisory recommendation', async () => {
    const { service, applications } = setup([new FixedProvider('p', async () => ({ status: 'FAIL', reasons: ['bad'] }))], routing('DOCUMENT', { primary: 'p' }));
    await service.run('KYC-1', { reason: 'SUBMITTED' });
    expect(applications[0].status).toBe('SUBMITTED');
    expect(applications[0].checkRecommendation).toBe('ADVERSE');
  });

  it('falls back when the primary errors, and records why', async () => {
    const broken = new FixedProvider('broken', async () => { throw new Error('connection refused'); });
    const backup = new FixedProvider('backup', async () => ({ status: 'PASS', score: 0.95, reasons: [] }));
    const { service, results } = setup([broken, backup], routing('DOCUMENT', { primary: 'broken', fallback: ['backup'] }));
    await service.run('KYC-1', { reason: 'SUBMITTED' });
    expect(results).toEqual([expect.objectContaining({ provider: 'backup', status: 'PASS', shadow: false })]);
  });

  it('aborts a provider call that exceeds its timeout', async () => {
    let aborted = false;
    const slow: KycCheckProvider = { name: 'slow', version: 't', supports: () => true, run: (_check, { signal }) => new Promise((resolve) => { signal.addEventListener('abort', () => { aborted = true; resolve({ status: 'PASS', reasons: [] }); }); }) };
    const { service, results } = setup([slow], routing('DOCUMENT', { primary: 'slow', timeoutMs: 20 }));
    await service.run('KYC-1', { reason: 'SUBMITTED' });
    expect(aborted).toBe(true);
    expect(results[0]).toEqual(expect.objectContaining({ provider: 'none', status: 'ERROR' }));
  });

  it('treats PENDING without a transaction id as an error', async () => {
    const { service, results } = setup([new FixedProvider('p', async () => ({ status: 'PENDING', reasons: [] }))], routing('DOCUMENT', { primary: 'p' }));
    await service.run('KYC-1', { reason: 'SUBMITTED' });
    expect(results[0].status).toBe('ERROR');
  });

  describe('webhooks', () => {
    it('applies a result only to the exact pending transaction', async () => {
      const { service, applications } = setup([new AsyncVendor('v')], routing('DOCUMENT', { primary: 'v' }));
      await service.run('KYC-1', { reason: 'SUBMITTED' });
      expect(applications[0].checkRecommendation).toBe('PENDING');
      await expect(service.applyWebhook('v', webhook({ ref: 'v-OLD', status: 'PASS', score: 0.99 }))).rejects.toBeInstanceOf(NotFoundException);
      expect(applications[0].checkRecommendation).toBe('PENDING');
      await expect(service.applyWebhook('v', webhook({ ref: 'v-1', status: 'PASS', score: 0.99 }))).resolves.toEqual({ applied: true });
      expect(applications[0].checkRecommendation).toBe('CLEAR');
    });

    it('ignores a replayed webhook once the check is final', async () => {
      const { service, results } = setup([new AsyncVendor('v')], routing('DOCUMENT', { primary: 'v' }));
      await service.run('KYC-1', { reason: 'SUBMITTED' });
      await service.applyWebhook('v', webhook({ ref: 'v-1', status: 'FAIL' }));
      await expect(service.applyWebhook('v', webhook({ ref: 'v-1', status: 'PASS', score: 0.99 }))).resolves.toEqual({ applied: false });
      expect(results[0].status).toBe('FAIL');
    });

    it('does not let a webhook for an old round change the current recommendation', async () => {
      const { service, applications } = setup([new AsyncVendor('v')], routing('DOCUMENT', { primary: 'v' }));
      await service.run('KYC-1', { reason: 'SUBMITTED' });
      await service.run('KYC-1', { reason: 'OFFICER_RERUN' });
      await service.applyWebhook('v', webhook({ ref: 'v-1', status: 'PASS', score: 0.99 }));
      expect(applications[0].checkRecommendation).toBe('PENDING');
    });
  });

  describe('shadow mode', () => {
    it('compares an async shadow only once its real verdict arrives', async () => {
      const primary = new FixedProvider('primary', async () => ({ status: 'PASS', score: 0.95, reasons: [] }));
      const { service, results, applications } = setup([primary, new AsyncVendor('shadow')], routing('DOCUMENT', { primary: 'primary', shadow: ['shadow'] }));
      await service.run('KYC-1', { reason: 'SUBMITTED' });
      const shadowRow = () => results.find((row) => row.shadow);
      expect(shadowRow()).toEqual(expect.objectContaining({ status: 'PENDING', agree: null }));
      await service.applyWebhook('shadow', webhook({ ref: 'shadow-1', status: 'PASS', score: 0.9 }));
      expect(shadowRow()!.agree).toBe(true);
      expect(applications[0].checkRecommendation).toBe('CLEAR');
    });

    it('records disagreement without affecting the recommendation', async () => {
      const primary = new FixedProvider('primary', async () => ({ status: 'PASS', score: 0.95, reasons: [] }));
      const shadow = new FixedProvider('shadow', async () => ({ status: 'FAIL', reasons: ['spoof'] }));
      const { service, results, applications } = setup([primary, shadow], routing('DOCUMENT', { primary: 'primary', shadow: ['shadow'] }));
      await service.run('KYC-1', { reason: 'SUBMITTED' });
      expect(results.find((row) => row.shadow)!.agree).toBe(false);
      expect(applications[0].checkRecommendation).toBe('CLEAR');
    });
  });
});

describe('check routing', () => {
  it('rejects unknown fields, so a typo cannot silently weaken a check', () => {
    expect(() => loadCheckRouting(JSON.stringify({ defaults: { DOCUMENT: { primary: 'mock', requried: true } } }))).toThrow(/unknown field/);
  });

  it('requires an explicit required flag and known check types and country ids', () => {
    expect(() => loadCheckRouting(JSON.stringify({ defaults: { DOCUMENT: { primary: 'mock' } } }))).toThrow(/required/);
    expect(() => loadCheckRouting(JSON.stringify({ defaults: { SELFIE: { primary: 'mock', required: true } } }))).toThrow(/unknown check type/);
    expect(() => loadCheckRouting(JSON.stringify({ countries: { MY: {} } }))).toThrow(/country node id/);
  });

  it('refuses development-only providers in production and unregistered providers anywhere', () => {
    const config = loadCheckRouting(JSON.stringify({ defaults: { AML_SCREENING: { primary: 'mock', required: true } } }));
    expect(() => assertRoutingUsable(config, [new MockKycProvider()], true)).toThrow(/development-only/);
    expect(() => assertRoutingUsable(config, [new MockKycProvider()], false)).not.toThrow();
    expect(() => assertRoutingUsable(config, [], false)).toThrow(/unregistered/);
  });
});

describe('recommendation', () => {
  it('matches names across scripts and Turkish i', () => {
    expect(namesMatch('Ahmet Yılmaz', 'AHMET YILMAZ')).toBe(true);
    expect(namesMatch('محمد علي', 'محمد علي')).toBe(true);
    expect(namesMatch('Siti binti Ahmad', 'SITI AHMAD')).toBe(true);
    expect(namesMatch('Ali Abu', 'Hassan Omar')).toBe(false);
  });

  it('flags an expired document read by a provider as adverse', () => {
    const result = recommend({ DOCUMENT: { primary: 'p', required: true } }, { DOCUMENT: { status: 'PASS', score: 0.95, reasons: [], identity: { documentExpiry: '2026-01-01' } } }, { fullName: 'Ali', idDocumentNumber: '', dateOfBirth: null }, undefined, new Date('2026-10-01'));
    expect(result.recommendation).toBe('ADVERSE');
  });
});

describe('InternalRulesProvider', () => {
  const now = new Date('2026-10-01T00:00:00Z');
  const subject = (overrides: Record<string, unknown> = {}) => ({ ...baseApplication(), applicationId: 'KYC-1', documentTypes: [], loadDocument: async () => null, ...overrides });
  const run = (provider: InternalRulesProvider, check: KycCheckType, overrides?: Record<string, unknown>) => provider.run(check, { subject: subject(overrides) as never, previous: {}, signal: new AbortController().signal });

  it('checks expiry and that the MyKad number encodes the stated date of birth', async () => {
    const provider = new InternalRulesProvider({} as PrismaService, () => now);
    await expect(run(provider, 'DOCUMENT_CONSISTENCY')).resolves.toEqual({ status: 'PASS', reasons: [] });
    await expect(run(provider, 'DOCUMENT_CONSISTENCY', { idDocumentExpiry: new Date('2026-09-01') })).resolves.toEqual(expect.objectContaining({ status: 'FAIL' }));
    await expect(run(provider, 'DOCUMENT_CONSISTENCY', { idDocumentNumber: '910501-14-5678' })).resolves.toEqual(expect.objectContaining({ status: 'REVIEW', reasons: ['Date of birth does not match the MyKad number'] }));
    // Born 1925: the old two-digit-year guess would have read this as 2025.
    await expect(run(provider, 'DOCUMENT_CONSISTENCY', { dateOfBirth: new Date('1925-03-04'), idDocumentNumber: '250304-14-5678' })).resolves.toEqual({ status: 'PASS', reasons: [] });
  });

  it('fails when the ID number is already verified for another user', async () => {
    const queryRaw = jest.fn().mockResolvedValueOnce([{ status: 'APPROVED' }]).mockResolvedValueOnce([]);
    const provider = new InternalRulesProvider({ $queryRaw: queryRaw } as unknown as PrismaService, () => now);
    await expect(run(provider, 'DUPLICATE_IDENTITY')).resolves.toEqual({ status: 'FAIL', reasons: ['This ID number is already verified for another user'] });
  });
});

describe('HttpVendorProvider webhook authentication', () => {
  const nowMs = Date.parse('2026-10-01T00:00:00Z');
  const provider = new HttpVendorProvider({ name: 'vendor-a', baseUrl: 'https://vendor.test', apiKey: 'k', webhookSecret: 'secret', callbackUrl: '', checks: ['DOCUMENT'], countryNodeIds: ['CN-MYS'] }, () => nowMs);
  const body = Buffer.from(JSON.stringify({ id: 'tx-1', status: 'approved', score: 0.9 }));
  const sign = (timestamp: number) => createHmac('sha256', 'secret').update(`${timestamp}.`).update(body).digest('hex');

  it('accepts a fresh, correctly signed request', async () => {
    const timestamp = nowMs / 1000;
    await expect(provider.parseWebhook({ rawBody: body, headers: { 'x-timestamp': String(timestamp), 'x-signature': sign(timestamp) } })).resolves.toEqual(expect.objectContaining({ externalRef: 'tx-1' }));
  });

  it('refuses a stale (replayed) or forged request', async () => {
    const stale = nowMs / 1000 - 3600;
    await expect(provider.parseWebhook({ rawBody: body, headers: { 'x-timestamp': String(stale), 'x-signature': sign(stale) } })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(provider.parseWebhook({ rawBody: body, headers: { 'x-timestamp': String(nowMs / 1000), 'x-signature': 'f'.repeat(64) } })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
