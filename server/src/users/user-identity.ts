import { randomBytes } from 'node:crypto';

/** Master Architecture §6 identity types, plus the platform's own staff. */
export const USER_TYPES = ['INDIVIDUAL', 'INSTITUTION', 'BANK', 'GOVERNMENT_AGENCY', 'REGULATOR', 'PLATFORM_STAFF'] as const;
export type UserType = (typeof USER_TYPES)[number];

/** Roles held on behalf of an organisation: PDPs, asset owners, institutional investors and their admins. */
const INSTITUTION_ROLES: ReadonlySet<string> = new Set(['Project Sponsor', 'Project Manager', 'Asset Owner', 'Asset Manager', 'Institutional Investor', 'Corporate Investor', 'Family Office', 'Organization Admin']);
/** Roles a private person holds for themselves. */
const INDIVIDUAL_ROLES: ReadonlySet<string> = new Set(['Retail Investor', 'HNWI Investor', 'Guest']);

/** Staff outranks institution, which outranks individual. Same rule as the 20261015120000 migration. */
export function userTypeForRoles(roles: readonly string[]): UserType {
  if (roles.some((role) => !INSTITUTION_ROLES.has(role) && !INDIVIDUAL_ROLES.has(role))) return 'PLATFORM_STAFF';
  if (roles.some((role) => INSTITUTION_ROLES.has(role))) return 'INSTITUTION';
  return 'INDIVIDUAL';
}

// Crockford base32: no I, L, O or U, so an ID read aloud or typed is not misread.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomCode(length: number): string {
  return Array.from(randomBytes(length), (byte) => ALPHABET[byte % 32]).join('');
}

/** 'CN-MYS' -> 'MYS'. The country is part of the ID because an account never changes country. */
export function cellCode(countryNodeId: string): string {
  const code = countryNodeId.replace(/^CN-/, '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error(`Not a country node: ${countryNodeId}`);
  return code;
}

/** A record ID of the form PREFIX-MYS-7K4Q2M9X: the kind of record, its country and 8 random characters. */
export function newCountryScopedId(prefix: string, countryNodeId: string): string {
  return `${prefix}-${cellCode(countryNodeId)}-${randomCode(8)}`;
}

/** A new Member ID such as USR-MYS-7K4Q2M9X. Set once at registration and never changed. */
export function newUserId(countryNodeId: string): string {
  return newCountryScopedId('USR', countryNodeId);
}

/** The private organisation that holds an individual's own records, e.g. ORG-MYS-IND-7K4Q2M9X. */
export function personalOrganisationId(userId: string): string {
  const [, country, code] = userId.split('-');
  return `ORG-${country}-IND-${code}`;
}
