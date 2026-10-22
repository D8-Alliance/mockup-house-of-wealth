import { randomBytes } from 'node:crypto';
import forge from 'node-forge';

const { asn1 } = forge;
const SHA256_OID = '2.16.840.1.101.3.4.2.1';
const TSTINFO_OID = '1.2.840.113549.1.9.16.1.4';

/** A time-stamp authority's signed statement that a document hash existed at `genTime` (RFC 3161). */
export interface TimestampResult { token: string; genTime: Date; serial: string; authority: string }

export const DEFAULT_TSA_URL = 'http://timestamp.digicert.com';

/** A DER TimeStampReq for a SHA-256 hash, asking the authority to include its certificate. */
export function buildTimestampRequest(sha256Hex: string, nonce: Buffer = randomBytes(8)): Buffer {
  const nonceBytes = (nonce[0] & 0x80 ? '\x00' : '') + nonce.toString('binary');
  const request = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, asn1.integerToDer(1).getBytes()),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, asn1.oidToDer(SHA256_OID).getBytes()),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ''),
      ]),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, forge.util.hexToBytes(sha256Hex)),
    ]),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, nonceBytes),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BOOLEAN, false, String.fromCharCode(0xff)),
  ]);
  return Buffer.from(asn1.toDer(request).getBytes(), 'binary');
}

/**
 * Reads a TimeStampResp: the authority granted it, and its TSTInfo stamps exactly our hash. Returns the
 * token (base64 DER, kept as evidence and checkable with `openssl ts -verify`), the time and the serial.
 */
export function parseTimestampResponse(der: Buffer, sha256Hex: string, authority: string): TimestampResult {
  const response = asn1.fromDer(der.toString('binary'));
  const [statusInfo, token] = response.value as forge.asn1.Asn1[];
  const status = asn1.derToInteger((statusInfo.value as forge.asn1.Asn1[])[0].value as string);
  if (status !== 0 && status !== 1) throw new Error(`The time-stamp authority refused the request (status ${status}).`);
  if (!token) throw new Error('The time-stamp authority sent no token.');
  const { imprintHex, genTime, serial } = readToken(token);
  if (imprintHex !== sha256Hex.toLowerCase()) throw new Error('The time-stamp is for a different document.');
  return { token: Buffer.from(asn1.toDer(token).getBytes(), 'binary').toString('base64'), genTime, serial, authority };
}

/** What a stored token stamps: the hash, the time and the serial. */
export function readStoredToken(tokenBase64: string) {
  return readToken(asn1.fromDer(Buffer.from(tokenBase64, 'base64').toString('binary')));
}

function readToken(token: forge.asn1.Asn1): { imprintHex: string; genTime: Date; serial: string } {
  const signedData = ((token.value as forge.asn1.Asn1[])[1].value as forge.asn1.Asn1[])[0];
  const encapsulated = (signedData.value as forge.asn1.Asn1[])[2];
  const contentType = asn1.derToOid((encapsulated.value as forge.asn1.Asn1[])[0].value as string);
  if (contentType !== TSTINFO_OID) throw new Error('The token does not hold a time-stamp.');
  const octets = ((encapsulated.value as forge.asn1.Asn1[])[1].value as forge.asn1.Asn1[])[0];
  const raw = Array.isArray(octets.value) ? (octets.value as forge.asn1.Asn1[]).map((part) => part.value as string).join('') : octets.value as string;
  const info = asn1.fromDer(raw).value as forge.asn1.Asn1[];
  const imprint = info[2].value as forge.asn1.Asn1[];
  return { imprintHex: forge.util.bytesToHex(imprint[1].value as string), genTime: asn1.generalizedTimeToDate(info[4].value as string), serial: forge.util.bytesToHex(info[3].value as string) };
}

/** Asks a time-stamp authority to stamp a SHA-256 hash. */
export async function requestTimestamp(sha256Hex: string, url = process.env.SIGNING_TSA_URL || DEFAULT_TSA_URL, fetchImpl: typeof fetch = fetch): Promise<TimestampResult> {
  const response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/timestamp-query' }, body: buildTimestampRequest(sha256Hex), signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`The time-stamp authority answered ${response.status}.`);
  return parseTimestampResponse(Buffer.from(await response.arrayBuffer()), sha256Hex, url);
}
