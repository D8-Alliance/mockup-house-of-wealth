/** Entity types an organisation declares in KYB. */
export const ENTITY_TYPES = ['GLC', 'COMPANY', 'INSTITUTION', 'INDIVIDUAL'] as const;

/** A group name compared without case, spacing or a trailing "Group" / "Berhad" / "Bhd". */
export function normaliseGroupName(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\b(group|berhad|bhd|sdn)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Related party: two different organisations that declared the same corporate group,
 * e.g. FELDA Ventures investing in a FELDA Plantation pool. No group on either side is never a match.
 */
export function isRelatedParty(a: { id: string; groupName: string | null } | null, b: { id: string; groupName: string | null } | null): boolean {
  if (!a || !b || a.id === b.id) return false;
  const left = normaliseGroupName(a.groupName);
  return left !== '' && left === normaliseGroupName(b.groupName);
}

/** A corporate group kept by the administrators: its official name and the other ways people write it. */
export interface KnownGroup { name: string; aliases: readonly string[] }

/**
 * The official group name for what an organisation typed, when it matches a known group's name or one of its
 * other spellings (compared as normaliseGroupName does); null when it matches none, so the typed name is kept
 * and the KYB reviewer sees it is not on the list.
 */
export function officialGroupName(typed: string | null | undefined, groups: readonly KnownGroup[]): string | null {
  const wanted = normaliseGroupName(typed);
  if (!wanted) return null;
  const group = groups.find((item) => [item.name, ...item.aliases].some((spelling) => normaliseGroupName(spelling) === wanted));
  return group?.name ?? null;
}
