import PDFDocument from 'pdfkit';
import { certificateFingerprint, createSelfSignedSeal, sealPdf, sha256Hex, verifySealedPdf } from './pdf-seal';

const makePdf = () => new Promise<Buffer>((resolve, reject) => {
  const document = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  document.on('data', (chunk) => chunks.push(chunk));
  document.on('end', () => resolve(Buffer.concat(chunks)));
  document.on('error', reject);
  document.text('Musharakah Agreement HOF-1. Owner 60% of profit.');
  document.end();
});

describe('platform seal on a PDF', () => {
  const seal = createSelfSignedSeal('Wealth Pooling test seal', 'test-pass');

  it('seals a PDF so the seal checks out, and names the certificate', async () => {
    const sealed = await sealPdf(await makePdf(), seal, { reason: 'Signed by both parties', location: 'Malaysia', contact: 'platform@example.test', signingTime: new Date('2026-10-22T08:00:00Z') });
    const check = verifySealedPdf(sealed);
    expect(check).toMatchObject({ sealed: true, digestMatches: true, signatureValid: true, signer: 'Wealth Pooling test seal' });
    expect(check.certificateSha256).toBe(certificateFingerprint(seal));
  }, 30000);

  it('detects a change to the sealed bytes, or bytes added after sealing', async () => {
    const sealed = await sealPdf(await makePdf(), seal, { reason: 'Signed', location: 'Malaysia', contact: 'x' });
    // One byte changed inside the sealed part (the page content is compressed, so not readable text).
    const changed = Buffer.from(sealed);
    changed[400] = changed[400] ^ 0xff;
    expect(sha256Hex(changed)).not.toBe(sha256Hex(sealed));
    expect(verifySealedPdf(changed).digestMatches).toBe(false);
    expect(verifySealedPdf(Buffer.concat([sealed, Buffer.from('\n% appended')])).reason).toContain('added after sealing');
    expect(verifySealedPdf(await makePdf()).sealed).toBe(false);
  }, 30000);
});
