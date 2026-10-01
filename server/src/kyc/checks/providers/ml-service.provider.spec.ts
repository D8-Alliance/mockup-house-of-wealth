import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { recommend } from '../recommendation';
import { fixMykadCentury, MlServiceProvider } from './ml-service.provider';

const jpeg = (label: string) => ({ mimeType: 'image/jpeg', content: Buffer.from(`jpeg:${label}`) });

function context(overrides: Record<string, unknown> = {}, documents: Record<string, { mimeType: string; content: Buffer }> = { ID_FRONT: jpeg('front'), ID_BACK: jpeg('back'), SELFIE: jpeg('selfie') }) {
  return {
    subject: {
      applicationId: 'KYC-1', userId: 'U1', countryNodeId: 'CN-MYS', fullName: 'Ali Bin Abu', dateOfBirth: new Date('1990-05-01'), nationality: 'Malaysian',
      idDocumentType: 'NATIONAL_ID', idDocumentNumber: '900501-14-5678', idDocumentExpiry: null, documentTypes: Object.keys(documents),
      loadDocument: async (type: string) => documents[type] ?? null,
      ...overrides,
    },
    previous: {},
    signal: new AbortController().signal,
  };
}

describe('MlServiceProvider', () => {
  let mediaDir: string;
  let provider: MlServiceProvider;
  let fetchMock: jest.SpyInstance;
  let seenFiles: Record<string, string>;

  const respond = (body: unknown, status = 200) => {
    fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      // Capture what the ML service would read from the shared directory during the call.
      const request = JSON.parse(String(init.body)) as Record<string, { key: string } | undefined>;
      seenFiles = {};
      for (const [field, ref] of Object.entries(request)) {
        if (ref && typeof ref === 'object' && 'key' in ref) seenFiles[field] = readFileSync(path.join(mediaDir, ref.key), 'utf8');
      }
      return new Response(JSON.stringify(body), { status });
    });
  };

  beforeEach(async () => {
    mediaDir = await mkdtemp(path.join(tmpdir(), 'kyc-ml-'));
    provider = new MlServiceProvider({ baseUrl: 'http://ml.test/', mediaDir });
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  it('sends the documents through the shared directory and removes them afterwards', async () => {
    respond({ fields: { fullName: 'ALI BIN ABU', idNumber: '900501-14-5678', dateOfBirth: '1990-05-01' }, confidence: 0.93, tamperDetected: false, issues: [] });
    const outcome = await provider.run('DOCUMENT', context());
    expect(fetchMock).toHaveBeenCalledWith('http://ml.test/v1/document', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual(expect.objectContaining({ country: 'MY', documentType: 'MYKAD' }));
    expect(seenFiles).toEqual({ front: 'jpeg:front', back: 'jpeg:back' });
    expect(readdirSync(mediaDir)).toEqual([]);
    expect(outcome).toEqual(expect.objectContaining({ status: 'PASS', score: 0.93, identity: expect.objectContaining({ fullName: 'ALI BIN ABU' }) }));
    expect(outcome.reasons[0]).toMatch(/authenticity is not verified/);
  });

  it('skips document types the service has no parser for, instead of scoring them 0', async () => {
    const passport = await provider.run('DOCUMENT', context({ idDocumentType: 'PASSPORT' }));
    const turkishId = await provider.run('DOCUMENT', context({ countryNodeId: 'CN-TUR' }));
    expect(passport.status).toBe('SKIPPED');
    expect(turkishId.status).toBe('SKIPPED');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('turns a blurry, low-confidence read into REVIEW, which the recommendation keeps at ATTENTION', async () => {
    respond({ fields: { fullName: 'ALI BIN ABU', idNumber: '900501-14-5678' }, confidence: 0.41, tamperDetected: false, issues: ['Imej kabur'] });
    const outcome = await provider.run('DOCUMENT', context());
    expect(outcome.status).toBe('REVIEW');
    const { recommendation } = recommend({ DOCUMENT: { primary: 'inhouse-ml', required: true } }, { DOCUMENT: outcome }, { fullName: 'Ali Bin Abu', idDocumentNumber: '900501-14-5678', dateOfBirth: new Date('1990-05-01') });
    expect(recommendation).toBe('ATTENTION');
  });

  it('asks for review when a face is missing, and reports a clean comparison as PASS with its score', async () => {
    respond({ similarity: 0, faceFound: { document: true, selfie: false }, issues: [] });
    await expect(provider.run('FACE_MATCH', context())).resolves.toEqual(expect.objectContaining({ status: 'REVIEW', reasons: [expect.stringMatching(/No face detected in the selfie/)] }));
    respond({ similarity: 0.42, faceFound: { document: true, selfie: true }, issues: [] });
    const outcome = await provider.run('FACE_MATCH', context());
    expect(seenFiles).toEqual({ document: 'jpeg:front', selfie: 'jpeg:selfie' });
    expect(outcome).toEqual(expect.objectContaining({ status: 'PASS', score: 0.42 }));
    // A clearly different face is left to the shared thresholds, which call it adverse.
    expect(recommend({ FACE_MATCH: { primary: 'inhouse-ml', required: true } }, { FACE_MATCH: outcome }, { fullName: '', idDocumentNumber: '', dateOfBirth: null }).recommendation).toBe('ADVERSE');
  });

  it('does not send PDFs, which the service cannot decode', async () => {
    const outcome = await provider.run('DOCUMENT', context({}, { ID_FRONT: { mimeType: 'application/pdf', content: Buffer.from('%PDF') } }));
    expect(outcome.status).toBe('REVIEW');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readdirSync(mediaDir)).toEqual([]);
  });

  it('throws on an HTTP error so the orchestrator can fall back, and still cleans up', async () => {
    respond({ detail: 'Model belum dipasang' }, 503);
    await expect(provider.run('FACE_MATCH', context())).rejects.toThrow(/HTTP 503/);
    expect(readdirSync(mediaDir)).toEqual([]);
    expect(existsSync(mediaDir)).toBe(true);
  });

  it('does not offer liveness, which needs video frames', () => {
    expect(provider.supports('LIVENESS', 'CN-MYS')).toBe(false);
    expect(provider.supports('DOCUMENT', 'CN-XYZ')).toBe(false);
  });
});

describe('fixMykadCentury', () => {
  it('trusts the stated century when only the century differs', () => {
    expect(fixMykadCentury('2025-03-04', new Date('1925-03-04'))).toBe('1925-03-04');
    expect(fixMykadCentury('1990-05-01', new Date('1990-05-01'))).toBe('1990-05-01');
    expect(fixMykadCentury('1991-05-01', new Date('1990-05-01'))).toBe('1991-05-01');
  });
});
