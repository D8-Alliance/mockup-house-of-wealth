import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import forge from 'node-forge';
import signpdf from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';

export const sha256Hex = (data: Buffer) => createHash('sha256').update(data).digest('hex');

/** The platform's sealing certificate as a PKCS#12 bundle. */
export interface SealCredentials { p12: Buffer; passphrase: string }

/**
 * A self-signed sealing certificate, for development and staging. Production uses a certificate from a
 * CA that Adobe trusts (SIGNING_P12_PATH or SIGNING_P12_BASE64), so readers see a valid seal.
 */
export function createSelfSignedSeal(commonName: string, passphrase: string, years = 5): SealCredentials {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = `01${forge.util.bytesToHex(forge.random.getBytesSync(8))}`;
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + years * 365 * 864e5);
  const subject = [{ name: 'commonName', value: commonName }, { name: 'organizationName', value: 'Wealth Pooling (self-signed, not for production)' }, { name: 'countryName', value: 'MY' }];
  cert.setSubject(subject);
  cert.setIssuer(subject);
  cert.setExtensions([{ name: 'basicConstraints', cA: false }, { name: 'keyUsage', digitalSignature: true, nonRepudiation: true }]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], passphrase, { algorithm: '3des' });
  return { p12: Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary'), passphrase };
}

/** The sealing certificate from the environment, or null when none is configured. */
export function sealFromEnvironment(): SealCredentials | null {
  const passphrase = process.env.SIGNING_P12_PASSPHRASE ?? '';
  if (process.env.SIGNING_P12_BASE64) return { p12: Buffer.from(process.env.SIGNING_P12_BASE64, 'base64'), passphrase };
  if (process.env.SIGNING_P12_PATH) return { p12: readFileSync(process.env.SIGNING_P12_PATH), passphrase };
  return null;
}

/** SHA-256 of the sealing certificate, to show which certificate sealed a document. */
export function certificateFingerprint(seal: SealCredentials): string {
  const asn1 = forge.asn1.fromDer(seal.p12.toString('binary'));
  const bundle = forge.pkcs12.pkcs12FromAsn1(asn1, seal.passphrase);
  const bag = bundle.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
  if (!bag?.cert) throw new Error('The sealing bundle has no certificate.');
  return sha256Hex(Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(bag.cert)).getBytes(), 'binary'));
}

/**
 * Seals a finished PDF with the platform's certificate (PAdES, adbe.pkcs7.detached): any change to the
 * file after sealing breaks the seal, and PDF readers show it.
 */
export async function sealPdf(pdf: Buffer, seal: SealCredentials, meta: { reason: string; location: string; contact: string; signingTime?: Date }): Promise<Buffer> {
  const withPlaceholder = plainAddPlaceholder({ pdfBuffer: pdf, reason: meta.reason, contactInfo: meta.contact, name: 'Wealth Pooling platform seal', location: meta.location, signingTime: meta.signingTime, signatureLength: 16384, appName: 'Wealth Pooling' });
  return signpdf.sign(withPlaceholder, new P12Signer(seal.p12, { passphrase: seal.passphrase }), meta.signingTime);
}

export interface SealVerification {
  sealed: boolean;
  /** The bytes the seal covers still hash to the digest inside the seal. */
  digestMatches: boolean;
  /** The seal's signature checks out with the certificate inside it. */
  signatureValid: boolean;
  signer: string | null;
  certificateSha256: string | null;
  reason?: string;
}

const MESSAGE_DIGEST_OID = forge.pki.oids.messageDigest;

/** Checks a sealed PDF: the covered bytes are unchanged, and the seal was made with the certificate it carries. */
export function verifySealedPdf(pdf: Buffer): SealVerification {
  const none = (reason: string): SealVerification => ({ sealed: false, digestMatches: false, signatureValid: false, signer: null, certificateSha256: null, reason });
  const text = pdf.toString('latin1');
  const ranges = [...text.matchAll(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g)];
  const last = ranges.at(-1);
  if (!last) return none('No seal found in the document.');
  const [a, b, c, d] = last.slice(1, 5).map(Number);
  if (a !== 0 || c + d !== pdf.length) return { ...none('The seal does not cover the whole document: something was added after sealing.'), sealed: true };
  const covered = Buffer.concat([pdf.subarray(a, a + b), pdf.subarray(c, c + d)]);
  const hex = pdf.subarray(a + b + 1, c - 1).toString('latin1').replace(/(00)+$/, '');
  try {
    const asn1 = forge.asn1.fromDer(forge.util.hexToBytes(hex), { strict: false } as unknown as boolean);
    const message = forge.pkcs7.messageFromAsn1(asn1) as unknown as { certificates: forge.pki.Certificate[]; rawCapture: { authenticatedAttributes?: forge.asn1.Asn1[]; signature: string } };
    const cert = message.certificates.at(0);
    const attributes = message.rawCapture.authenticatedAttributes ?? [];
    if (!cert || !attributes.length) return { ...none('The seal carries no certificate or signed attributes.'), sealed: true };
    const digestAttribute = attributes.find((attribute) => forge.asn1.derToOid((attribute.value as forge.asn1.Asn1[])[0].value as string) === MESSAGE_DIGEST_OID);
    const sealedDigest = digestAttribute ? forge.util.bytesToHex(((digestAttribute.value as forge.asn1.Asn1[])[1].value as forge.asn1.Asn1[])[0].value as string) : '';
    const digestMatches = sealedDigest === sha256Hex(covered);
    const signedSet = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, attributes);
    const md = forge.md.sha256.create();
    md.update(forge.asn1.toDer(signedSet).getBytes());
    const signatureValid = (cert.publicKey as forge.pki.rsa.PublicKey).verify(md.digest().getBytes(), message.rawCapture.signature);
    const signer = (cert.subject.getField('CN') as { value?: string } | null)?.value ?? null;
    return { sealed: true, digestMatches, signatureValid, signer, certificateSha256: sha256Hex(Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(), 'binary')) };
  } catch (error) {
    return { ...none(`The seal could not be read: ${error instanceof Error ? error.message : String(error)}`), sealed: true };
  }
}
