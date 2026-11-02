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
