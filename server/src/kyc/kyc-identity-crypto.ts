import { ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';
import { normalizeIdNumber } from './kyc-workflow';

/**
 * The KYC identity document number is kept encrypted (AES-256-GCM with its own key, KYC_DATA_ENCRYPTION_KEY,
 * the same scheme as payout account and beneficiary ID numbers). Beside it:
 *  - a keyed hash (HMAC-SHA256) of the normalised number, so "already verified for another account" and the
 *    duplicate check still work without decrypting every row;
 *  - the last four characters, for masked display and the estate death-report lookup.
 * Values written before encryption (no "enc:v1:" prefix) are read as they are, until
 * scripts/encrypt-kyc-identity.ts converts them.
 */
const PREFIX = 'enc:v1:';

function secret(): string | null {
  const key = process.env.KYC_DATA_ENCRYPTION_KEY?.trim();
  if (key) return key;
  if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('KYC data encryption is not configured (KYC_DATA_ENCRYPTION_KEY).');
  return null;
}

/** Development without a key stores the number as before; production refuses to run without one. */
export function sealIdNumber(plain: string): string {
  const key = secret();
  if (!plain || !key) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(key).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${PREFIX}${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

/** The number as entered; a value without the prefix was stored before encryption and is returned unchanged. */
export function revealIdNumber(stored: string | null | undefined): string {
  if (!stored || !stored.startsWith(PREFIX)) return stored ?? '';
  const key = secret();
  if (!key) throw new ServiceUnavailableException('KYC data is encrypted but KYC_DATA_ENCRYPTION_KEY is not set.');
  const [iv, tag, body] = stored.slice(PREFIX.length).split('.');
  const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(key).digest(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
}

export const isSealed = (stored: string | null | undefined) => Boolean(stored?.startsWith(PREFIX));

/** Keyed hash of the normalised number (spaces and dashes ignored, upper case); null for an empty number. */
export function idNumberHash(plain: string): string | null {
  const normalised = normalizeIdNumber(plain);
  if (!normalised) return null;
  return createHmac('sha256', secret() ?? 'kyc-development-only').update(normalised).digest('hex');
}

/** The last four characters of the normalised number, for masked display and lookups. */
export function idNumberLast4(plain: string): string | null {
  const normalised = normalizeIdNumber(plain);
  return normalised ? normalised.slice(-4) : null;
}

/** The three columns to write for a number the applicant entered. */
export function protectIdNumber(plain: string) {
  const value = plain.trim();
  return { idDocumentNumber: sealIdNumber(value), idDocumentNumberHash: idNumberHash(value), idDocumentNumberLast4: idNumberLast4(value) };
}
