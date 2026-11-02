import { EXPIRY_REMINDER_DAYS } from '../capital-takaful/safeguard-rules';

/**
 * Expiry dates an owner enters on a registered asset, and the reminder due for each: 30, 14 and 7
 * days before (the same schedule as takaful cover), and once when it has lapsed. Which reminders were
 * already sent is the outbox's job (its dedupe key includes the date and the threshold).
 */
const EXPIRY_FIELDS: Array<{ field: string; label: string; applies?: (details: Record<string, unknown>) => boolean }> = [
  { field: 'roadTaxExpiry', label: 'Road tax' },
  { field: 'insuranceExpiry', label: 'Insurance or takaful' },
  { field: 'inspectionExpiry', label: 'PUSPAKOM inspection' },
  { field: 'doshCertificateExpiry', label: 'JKKP certificate', applies: (details) => details.requiresDoshCertificate === true },
  { field: 'leaseExpiry', label: 'Lease', applies: (details) => details.tenure === 'LEASEHOLD' },
];

export interface AssetExpiryDue {
  field: string;
  label: string;
  /** The expiry date as the owner entered it (YYYY-MM-DD). */
  date: string;
  /** 30, 14 or 7 days before, or 0 once it has lapsed. */
  threshold: number;
  daysLeft: number;
}

const DAY_MS = 86_400_000;

export function assetExpiriesDue(details: unknown, now: Date): AssetExpiryDue[] {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return [];
  const values = details as Record<string, unknown>;
  const due: AssetExpiryDue[] = [];
  for (const { field, label, applies } of EXPIRY_FIELDS) {
    const raw = values[field];
    if (typeof raw !== 'string' || !raw || (applies && !applies(values))) continue;
    const date = new Date(`${raw.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) continue;
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
    // The nearest threshold reached: an asset found at 10 days left gets the 14-day reminder, not the 30-day one.
    const threshold = daysLeft <= 0 ? 0 : [...EXPIRY_REMINDER_DAYS].reverse().find((days) => daysLeft <= days);
    if (threshold === undefined) continue;
    due.push({ field, label, date: raw.slice(0, 10), threshold, daysLeft });
  }
  return due;
}
