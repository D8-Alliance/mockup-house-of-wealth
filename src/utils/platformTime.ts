import { authService } from '../auth/services/authService';

// Time zone of each D-8 country node. Mirrors COUNTRY_TIMEZONES in server/src/tenancy/country-time.ts.
const COUNTRY_TIMEZONES: Record<string, string> = {
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
const DEFAULT_TIMEZONE = 'Asia/Kuala_Lumpur';

/** The signed-in user's country-node time zone (Malaysia, GMT+8, before sign-in). */
export function platformTimeZone(): string {
  const countryNodeId = authService.getAuthState().session?.user.countryNodeId;
  return (countryNodeId && COUNTRY_TIMEZONES[countryNodeId]) || DEFAULT_TIMEZONE;
}

/** Today's date (YYYY-MM-DD) in the platform time zone; toISOString() would give the UTC date. */
export function todayInPlatformZone(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: platformTimeZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** e.g. "2 Oct 2026, 9:15 am" in the platform time zone. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-MY', { timeZone: platformTimeZone(), day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

let installed = false;

/**
 * Timestamps arrive from the API in UTC. Make every Date#toLocale*String call in
 * the app render in the platform time zone (e.g. Malaysia GMT+8) instead of the
 * device's, unless the caller passes its own timeZone. Number formatting is untouched.
 */
export function installPlatformTimeZone(): void {
  if (installed) return;
  installed = true;
  const methods = ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'] as const;
  for (const method of methods) {
    const original = Date.prototype[method];
    Object.defineProperty(Date.prototype, method, {
      configurable: true,
      writable: true,
      value(this: Date, locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
        return original.call(this, locales, options?.timeZone ? options : { ...options, timeZone: platformTimeZone() });
      },
    });
  }
}
