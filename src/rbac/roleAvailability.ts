import { useEffect, useMemo, useState } from 'react';
import { apiClient, RoleAvailabilityEntry } from '../services/apiClient';
import { IS_STATIC_DEMO, STATIC_DEMO_ROLES } from '../services/apiFetch';
import { ROLE_DEFINITIONS } from './roleDefinitions';
import { UserRole } from './types';

const ALL_ROLES = Object.keys(ROLE_DEFINITIONS) as UserRole[];
const LOCKED_ROLES: UserRole[] = ['Super Admin', 'Guest'];

const entriesFor = (isEnabled: (role: UserRole) => boolean): RoleAvailabilityEntry[] =>
  ALL_ROLES.map(role => ({ role, enabled: LOCKED_ROLES.includes(role) || isEnabled(role), locked: LOCKED_ROLES.includes(role) }));

let cache: Promise<RoleAvailabilityEntry[]> | null = null;
const listeners = new Set<(entries: RoleAvailabilityEntry[]) => void>();

/**
 * Roles switched on for the whole platform. The backend is authoritative (it refuses sign-in,
 * assignment and sign-up for disabled roles); screens use this list only to hide them.
 * A static demo build has no backend, so its recorded personas are the enabled roles.
 */
export function loadRoleAvailability(): Promise<RoleAvailabilityEntry[]> {
  if (IS_STATIC_DEMO) return Promise.resolve(entriesFor(role => STATIC_DEMO_ROLES.includes(role)));
  // If the backend cannot be reached, hide nothing; the backend still enforces the switches.
  cache ??= apiClient.getRoleAvailability().catch(() => { cache = null; return entriesFor(() => true); });
  return cache;
}

export function useRoleAvailability() {
  const [entries, setEntries] = useState<RoleAvailabilityEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    void loadRoleAvailability().then(loaded => { if (active) setEntries(loaded); });
    listeners.add(setEntries);
    return () => { active = false; listeners.delete(setEntries); };
  }, []);

  const enabled = useMemo(() => new Set(entries ? entries.filter(entry => entry.enabled).map(entry => entry.role) : ALL_ROLES), [entries]);

  /** Super Admin only (the backend refuses anyone else). Updates every screen that uses this hook; call one at a time. */
  const setRoleEnabled = async (role: UserRole, value: boolean) => {
    const updated = await apiClient.updateRoleAvailability(role, value);
    const next = (await loadRoleAvailability()).map(entry => entry.role === updated.role ? updated : entry);
    cache = Promise.resolve(next);
    listeners.forEach(listener => listener(next));
  };

  return {
    entries,
    loading: entries === null,
    isRoleEnabled: (role: UserRole) => enabled.has(role),
    filterEnabled: <T extends string>(roles: readonly T[]) => roles.filter(role => enabled.has(role as UserRole)),
    setRoleEnabled,
  };
}
