/**
 * Business activities the platform's assets, partnerships and leases may not serve, in one place for the asset
 * document checks, the partnership review checks and the lease checks. Each country node may add its own words
 * (CountryNode.prohibitedActivityTerms, set in Admin Center › Country Nodes). A match is a flag for the Shariah
 * reviewer, not a decision: "non-alcoholic" or "Islamic bank" also match.
 */
export const PROHIBITED_ACTIVITY_CATEGORIES: ReadonlyArray<{ label: string; terms: readonly string[] }> = [
  { label: 'alcohol', terms: ['alcohol', 'liquor', 'beer', 'wine', 'brewery', 'bar', 'pub', 'arak', 'minuman keras'] },
  { label: 'gambling', terms: ['gambling', 'casino', 'gaming', 'betting', 'lottery', 'judi', 'loteri', 'nombor ekor'] },
  { label: 'conventional finance (riba)', terms: ['conventional bank', 'conventional insurance', 'insurance company', 'interest-based', 'interest based', 'riba', 'moneylender', 'moneylending', 'pawnshop', 'pawn shop', 'ah long', 'loan shark', 'pajak gadai', 'pinjaman wang'] },
  { label: 'pork', terms: ['pork', 'swine', 'babi', 'non-halal'] },
  { label: 'adult entertainment', terms: ['nightclub', 'night club', 'karaoke', 'massage parlour', 'massage parlor', 'adult entertainment', 'kelab malam', 'disco'] },
  { label: 'tobacco', terms: ['tobacco', 'cigarette', 'vape', 'rokok', 'tembakau'] },
];

/** A word or phrase as a whole-word pattern; spaces and hyphens inside it match either. */
function termPattern(term: string): RegExp {
  const body = term.trim().split(/[\s-]+/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s-]?');
  return new RegExp(`(^|[^\\p{L}\\p{N}])(${body})(?=$|[^\\p{L}\\p{N}])`, 'iu');
}

const CATEGORY_PATTERNS = PROHIBITED_ACTIVITY_CATEGORIES.map((category) => ({ label: category.label, patterns: category.terms.map(termPattern) }));

/** Cleans a country's extra words: trimmed, lower case, no blanks or repeats, at most 100 of 60 characters each. */
export function normaliseCountryTerms(terms: readonly string[]): string[] {
  return [...new Set(terms.map((term) => term.trim().toLowerCase()).filter((term) => term.length >= 2 && term.length <= 60))].slice(0, 100);
}

/** The categories (and country words) the text suggests, for the reviewer to confirm. Empty when nothing matches. */
export function prohibitedActivities(text: string, countryTerms: readonly string[] = []): string[] {
  const found = CATEGORY_PATTERNS.filter((category) => category.patterns.some((pattern) => pattern.test(text))).map((category) => category.label);
  const extra = normaliseCountryTerms(countryTerms).filter((term) => termPattern(term).test(text) && !found.includes(term));
  return [...found, ...extra];
}

/** The first prohibited word as written in the text, to quote back to the reviewer; null when none. */
export function firstProhibitedTerm(text: string, countryTerms: readonly string[] = []): string | null {
  for (const pattern of [...CATEGORY_PATTERNS.flatMap((category) => category.patterns), ...normaliseCountryTerms(countryTerms).map(termPattern)]) {
    const match = text.match(pattern);
    if (match) return match[2];
  }
  return null;
}
