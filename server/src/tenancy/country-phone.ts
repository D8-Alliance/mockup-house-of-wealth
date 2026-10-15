import { BadRequestException } from '@nestjs/common';

/** International dialling codes of the D-8 country nodes. Mirrors src/countryNodes/countryPhone.ts. */
export const COUNTRY_DIAL_CODES: Record<string, string> = {
  'CN-AZE': '+994',
  'CN-BGD': '+880',
  'CN-EGY': '+20',
  'CN-IDN': '+62',
  'CN-IRN': '+98',
  'CN-MYS': '+60',
  'CN-NGA': '+234',
  'CN-PAK': '+92',
  'CN-TUR': '+90',
};

/**
 * Normalises a phone number to E.164 (e.g. "+60123456789"). A number written
 * in local form ("012-345 6789") gets the dialling code of the user's country
 * node, so the same person is not stored in two formats.
 */
export function normalizePhone(input: string, countryNodeId: string): string {
  const compact = input.trim().replace(/[\s\-().]/g, '');
  if (!compact) throw new BadRequestException('Phone number is empty.');
  let e164: string;
  if (compact.startsWith('+')) e164 = compact;
  else if (compact.startsWith('00')) e164 = `+${compact.slice(2)}`;
  else {
    const dialCode = COUNTRY_DIAL_CODES[countryNodeId];
    if (!dialCode) throw new BadRequestException('Enter the phone number with its country code, e.g. +60 12 345 6789.');
    e164 = `${dialCode}${compact.replace(/^0+/, '')}`;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) throw new BadRequestException('Enter a valid phone number, e.g. +60 12 345 6789.');
  return e164;
}

/** Local format for gateways that expect it: Malaysian numbers as 0XXXXXXXXX, others as plain digits. */
export function localPhoneDigits(e164: string): string {
  return e164.startsWith('+60') ? `0${e164.slice(3)}` : e164.replace(/^\+/, '');
}
