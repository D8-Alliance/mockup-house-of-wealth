import { translateServerText } from './ms-text';

export type NotificationLanguage = 'ms' | 'en';

/** Countries where someone who never chose a language reads Malay. */
const MALAY_COUNTRIES = new Set(['CN-MYS']);

/**
 * The language of what leaves the platform (email, push, SMS): the one saved with the account, or, for someone who
 * never chose or has no account, the country's. The in-app record stays in English; the screens translate it.
 */
export function notificationLanguage(profile: unknown, countryNodeId: string | null | undefined): NotificationLanguage {
  const preferences = profile && typeof profile === 'object' ? (profile as { preferences?: { language?: unknown } }).preferences : undefined;
  const saved = preferences?.language;
  if (saved === 'ms' || saved === 'en') return saved;
  return countryNodeId && MALAY_COUNTRIES.has(countryNodeId) ? 'ms' : 'en';
}

/** The server's English text in this language; text with no Malay wording goes out as written. */
export const inLanguage = (text: string, language: NotificationLanguage) => (language === 'ms' ? translateServerText(text) : text);
