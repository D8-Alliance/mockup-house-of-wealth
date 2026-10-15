import { platformTimeZone } from '../../utils/platformTime';

/** Formats an ISO date as e.g. "31 Oct 2026" in the platform time zone; "-" when missing or invalid. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-MY', { timeZone: platformTimeZone(), day: 'numeric', month: 'short', year: 'numeric' });
}
