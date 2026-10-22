/**
 * Creates the platform's self-signed sealing certificate for staging, as a PKCS#12 file:
 *
 *   SIGNING_P12_PASSPHRASE='<choose one>' npx tsx scripts/generate-signing-cert.ts /opt/how/secrets/signing-seal.p12
 *
 * Then set SIGNING_P12_PATH (and the same SIGNING_P12_PASSPHRASE) in server/.env. Never commit the file.
 * Production uses a certificate from a CA that Adobe trusts instead, so readers show the seal as valid.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { certificateFingerprint, createSelfSignedSeal } from '../src/contract-intelligence/signing/pdf-seal';

const path = process.argv[2];
if (!path) throw new Error('Give the file to write, e.g. /opt/how/secrets/signing-seal.p12');
if (existsSync(path)) throw new Error(`${path} already exists; documents sealed with it verify against it. Remove it yourself only if you mean to replace it.`);
const passphrase = process.env.SIGNING_P12_PASSPHRASE ?? '';
if (passphrase.length < 12) throw new Error('Set SIGNING_P12_PASSPHRASE (12 characters or more) first.');
const seal = createSelfSignedSeal('Wealth Pooling platform seal (self-signed)', passphrase);
writeFileSync(path, seal.p12, { mode: 0o600 });
console.log(`Sealing certificate written to ${path}`);
console.log(`Certificate SHA-256: ${certificateFingerprint(seal)}`);
