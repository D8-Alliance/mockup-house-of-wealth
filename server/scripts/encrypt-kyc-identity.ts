import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { isSealed, protectIdNumber, revealIdNumber } from '../src/kyc/kyc-identity-crypto';

/**
 * Encrypts the identity document numbers saved before KYC encryption, and fills their hash and last four
 * characters (src/kyc/kyc-identity-crypto.ts). Run once on each server after setting KYC_DATA_ENCRYPTION_KEY:
 *
 *   npx tsx scripts/encrypt-kyc-identity.ts            (shows what would change)
 *   npx tsx scripts/encrypt-kyc-identity.ts --confirm  (changes it)
 *
 * Safe to run again: rows already encrypted only get any missing hash or last four filled in.
 */
async function main() {
  if (!process.env.KYC_DATA_ENCRYPTION_KEY?.trim()) throw new Error('Set KYC_DATA_ENCRYPTION_KEY in server/.env first (e.g. openssl rand -base64 32). Keep it safe: without it the numbers cannot be read.');
  const confirm = process.argv.includes('--confirm');
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.kycApplication.findMany({ where: { idDocumentNumber: { not: '' }, OR: [{ idDocumentNumberHash: null }, { idDocumentNumberLast4: null }, { NOT: { idDocumentNumber: { startsWith: 'enc:v1:' } } }] }, select: { id: true, applicationNumber: true, idDocumentNumber: true } });
    console.log(`${rows.length} application(s) to convert.`);
    let changed = 0;
    for (const row of rows) {
      const plain = revealIdNumber(row.idDocumentNumber);
      const protectedValues = protectIdNumber(plain);
      // A number already encrypted keeps its ciphertext; only the helper columns are filled.
      const data = isSealed(row.idDocumentNumber) ? { idDocumentNumberHash: protectedValues.idDocumentNumberHash, idDocumentNumberLast4: protectedValues.idDocumentNumberLast4 } : protectedValues;
      if (!confirm) { console.log(`  would convert ${row.applicationNumber}`); continue; }
      await prisma.kycApplication.update({ where: { id: row.id }, data });
      changed += 1;
    }
    console.log(confirm ? `${changed} application(s) converted.` : 'Nothing changed. Run again with --confirm to convert.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
