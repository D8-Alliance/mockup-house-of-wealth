// International dialling codes of the D-8 country nodes, with a local example number.
// Mirrors COUNTRY_DIAL_CODES in server/src/tenancy/country-phone.ts (the server normalises to E.164).
export const COUNTRY_PHONE: Record<string, { dialCode: string; example: string }> = {
  'CN-AZE': { dialCode: '+994', example: '+994 50 123 45 67' },
  'CN-BGD': { dialCode: '+880', example: '+880 1712 345678' },
  'CN-EGY': { dialCode: '+20', example: '+20 10 1234 5678' },
  'CN-IDN': { dialCode: '+62', example: '+62 812 3456 7890' },
  'CN-IRN': { dialCode: '+98', example: '+98 912 345 6789' },
  'CN-MYS': { dialCode: '+60', example: '+60 12 345 6789' },
  'CN-NGA': { dialCode: '+234', example: '+234 803 123 4567' },
  'CN-PAK': { dialCode: '+92', example: '+92 300 1234567' },
  'CN-TUR': { dialCode: '+90', example: '+90 532 123 45 67' },
};

const FALLBACK = COUNTRY_PHONE['CN-MYS'];

export function phoneFormatFor(countryNodeId: string | undefined): { dialCode: string; example: string } {
  return (countryNodeId && COUNTRY_PHONE[countryNodeId]) || FALLBACK;
}

/** "+60123456789" -> "+60 123456789" for display; leaves other values unchanged. */
export function displayPhone(e164: string | undefined, countryNodeId: string | undefined): string {
  if (!e164) return '';
  const { dialCode } = phoneFormatFor(countryNodeId);
  return e164.startsWith(dialCode) ? `${dialCode} ${e164.slice(dialCode.length)}` : e164;
}
