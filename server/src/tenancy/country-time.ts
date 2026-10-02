/**
 * Timestamps are stored in UTC. Anything shown to people (receipts, generated
 * text) is rendered in the country node's own time zone, e.g. Malaysia GMT+8.
 * Mirrors the timezone values of the country nodes (CountryNode.timezone).
 */
export const COUNTRY_TIMEZONES: Record<string, string> = {
  'CN-AZE': 'Asia/Baku',
  'CN-BGD': 'Asia/Dhaka',
  'CN-EGY': 'Africa/Cairo',
  'CN-IDN': 'Asia/Jakarta',
  'CN-IRN': 'Asia/Tehran',
  'CN-MYS': 'Asia/Kuala_Lumpur',
  'CN-NGA': 'Africa/Lagos',
  'CN-PAK': 'Asia/Karachi',
  'CN-TUR': 'Europe/Istanbul',
};

export const DEFAULT_TIMEZONE = 'Asia/Kuala_Lumpur';

export function timezoneFor(countryNodeId: string | undefined): string {
  return (countryNodeId && COUNTRY_TIMEZONES[countryNodeId]) || DEFAULT_TIMEZONE;
}

/** e.g. "2 Oct 2026, 9:15 am (GMT+8)". */
export function formatLocalDateTime(value: Date, countryNodeId?: string): string {
  const timeZone = timezoneFor(countryNodeId);
  const local = new Intl.DateTimeFormat('en-MY', { timeZone, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(value);
  const offset = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(value).find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
  return `${local} (${offset})`;
}
