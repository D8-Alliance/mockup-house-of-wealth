import { createHash } from 'node:crypto';

/** JSON with keys in a fixed order and empty fields left out, so the same content always hashes the same. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** Fingerprint of one history entry; the same value is written to the append-only audit log. */
export const entryHash = (entry: unknown) => sha256(canonical(entry));

/** Fingerprint of the terms on the table; a party accepts exactly the terms it was shown. */
export function termsHash(deal: { akad: string; terms: unknown; startDate: Date | string; endDate: Date | string }): string {
  const day = (value: Date | string) => (value instanceof Date ? value.toISOString() : new Date(value).toISOString()).slice(0, 10);
  return sha256(canonical({ akad: deal.akad, terms: deal.terms, startDate: day(deal.startDate), endDate: day(deal.endDate) }));
}

/** VERIFIED: the entry is in the audit log as it is now. LEGACY: written before entries were fingerprinted. MISMATCH: changed since. */
export type EntryVerification = 'VERIFIED' | 'LEGACY' | 'MISMATCH';

/** Checks each history entry against the fingerprints in the audit log. */
export function verifyEntries(entries: Array<{ at: string }>, audit: Array<{ createdAt: Date; metadata: unknown }>): Array<{ hash: string; verification: EntryVerification }> {
  const hashed = audit
    .map((event) => ({ at: event.createdAt, hash: (event.metadata as { entryHash?: string } | null)?.entryHash }))
    .filter((event): event is { at: Date; hash: string } => typeof event.hash === 'string');
  const known = new Set(hashed.map((event) => event.hash));
  const firstHashed = hashed.reduce<Date | null>((first, event) => (!first || event.at < first ? event.at : first), null);
  return entries.map((entry) => {
    const hash = entryHash(entry);
    // An entry is written a moment before its audit event, so allow a minute either way.
    const verification: EntryVerification = known.has(hash) ? 'VERIFIED' : !firstHashed || new Date(entry.at).getTime() < firstHashed.getTime() - 60_000 ? 'LEGACY' : 'MISMATCH';
    return { hash, verification };
  });
}

/** One fingerprint for the whole record, printed on the PDF. */
export const recordFingerprint = (hashes: string[]) => sha256(hashes.join(':'));
