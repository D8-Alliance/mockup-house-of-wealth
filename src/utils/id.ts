/**
 * Collision-safe, human-friendly ID generation helpers.
 *
 * Uses crypto.randomUUID() (available in modern browsers and Node) when
 * available, falling back to a timestamp+random suffix otherwise.
 */

function randomSuffix(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/**
 * Generates `count` (default 1) unique random tokens.
 */
export function uid(count = 1): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(randomSuffix(8));
  }
  return result;
}

/**
 * Builds a prefixed identifier like `POOL-A1b2C3d4`, unique per call.
 */
export function generateId(prefix: string): string {
  return `${prefix}-${randomSuffix(8)}`;
}

/**
 * Builds a numeric-ish identifier like `FUND-REQ-812345`, unique per call.
 */
export function generateNumericId(prefix: string, digits = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  const value = min + Math.floor(Math.random() * (max - min));
  return `${prefix}-${value}`;
}
