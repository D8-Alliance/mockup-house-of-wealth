import { useEffect, useMemo, useState } from 'react';
import { apiClient, RoleAvailabilityEntry } from '../services/apiClient';
import { IS_STATIC_DEMO, RECORDED_DEMO_ROLES, STATIC_DEMO_ROLES } from '../services/apiFetch';
import { ROLE_DEFINITIONS } from './roleDefinitions';
import { UserRole } from './types';

const ALL_ROLES = Object.keys(ROLE_DEFINITIONS) as UserRole[];
const LOCKED_ROLES: UserRole[] = ['Super Admin', 'Guest'];

const entriesFor = (isEnabled: (role: UserRole) => boolean): RoleAvailabilityEntry[] =>
  ALL_ROLES.map(role => ({ role, enabled: LOCKED_ROLES.includes(role) || isEnabled(role), locked: LOCKED_ROLES.includes(role) }));

/**
 * Static demo builds have no backend, so the Super Admin's switches are kept in this browser only.
 * Only personas with recorded screens can be switched on; the others would have no data to show.
 */
// Versioned: a change to the agreed demo set resets choices saved under an older default.
const DEMO_STORAGE_KEY = 'how-demo-enabled-roles-v2';

function readDemoEnabledRoles(): UserRole[] {
  try {
    const stored = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || 'null');
    if (Array.isArray(stored)) return stored.filter((role): role is UserRole => RECORDED_DEMO_ROLES.includes(role));
  } catch {
    // Storage blocked or unreadable: use the default demo set.
  }
  return STATIC_DEMO_ROLES;
}

function demoEntries(): RoleAvailabilityEntry[] {
  const enabled = readDemoEnabledRoles();
  return ALL_ROLES.map(role => {
    if (LOCKED_ROLES.includes(role)) return { role, enabled: true, locked: true };
    if (!RECORDED_DEMO_ROLES.includes(role)) return { role, enabled: false, locked: true, note: 'No recorded demo screens' };
    return { role, enabled: enabled.includes(role), locked: false };
  });
}

function saveDemoRole(role: UserRole, value: boolean): RoleAvailabilityEntry {
  if (!RECORDED_DEMO_ROLES.includes(role)) throw new Error(`"${role}" has no recorded demo screens, so it cannot be switched on in this demo.`);
  const next = new Set(readDemoEnabledRoles());
  if (value) next.add(role); else next.delete(role);
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    throw new Error('This browser does not allow saving demo settings.');
  }
  return { role, enabled: value, locked: false };
}

let cache: Promise<RoleAvailabilityEntry[]> | null = null;
const listeners = new Set<(entries: RoleAvailabilityEntry[]) => void>();

/**
 * Roles switched on for the whole platform. The backend is authoritative (it refuses sign-in,
 * assignment and sign-up for disabled roles); screens use this list only to hide them.
 */
export function loadRoleAvailability(): Promise<RoleAvailabilityEntry[]> {
  if (IS_STATIC_DEMO) return Promise.resolve(demoEntries());
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
    const updated = IS_STATIC_DEMO ? saveDemoRole(role, value) : await apiClient.updateRoleAvailability(role, value);
    const next = (await loadRoleAvailability()).map(entry => entry.role === updated.role ? { ...entry, ...updated } : entry);
    if (!IS_STATIC_DEMO) cache = Promise.resolve(next);
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
