import React, { useState } from 'react';
import { Lock, RefreshCw, UserCheck } from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';
import { ROLE_DEFINITIONS } from '../../rbac/roleDefinitions';
import { useRoleAvailability } from '../../rbac/roleAvailability';
import { UserRole } from '../../rbac/types';

const CATEGORIES = ['System Executive', 'Operational Management', 'Governance & Risk', 'Participant & User'] as const;

/** The roles shown in the demo: investor, delivery partner (PDP), country admin and super admin. */
const DEMO_SET: UserRole[] = ['Super Admin', 'Country Admin', 'Project Sponsor', 'Retail Investor'];

export const RoleAvailabilityPanel: React.FC = () => {
  const { currentRole } = useRBAC();
  const { entries, loading, setRoleEnabled } = useRoleAvailability();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const canEdit = currentRole === 'Super Admin';

  const run = async (label: string, changes: { role: UserRole; enabled: boolean }[]) => {
    setBusy(label);
    setError('');
    try {
      // One at a time, so each update builds on the previous one.
      for (const change of changes) await setRoleEnabled(change.role, change.enabled);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update role availability.');
    } finally {
      setBusy('');
    }
  };

  const applyPreset = (label: string, wanted: (role: UserRole) => boolean) => {
    const changes = (entries ?? [])
      .filter(entry => !entry.locked && entry.enabled !== wanted(entry.role as UserRole))
      .map(entry => ({ role: entry.role as UserRole, enabled: wanted(entry.role as UserRole) }));
    void run(label, changes);
  };

  const enabledCount = entries?.filter(entry => entry.enabled && entry.role !== 'Guest').length ?? 0;
  const totalCount = entries?.filter(entry => entry.role !== 'Guest').length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Server-authoritative controls</span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Role Availability</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            A disabled role disappears from sign-in, sign-up and role assignment, and users holding it cannot sign in with it.
            Their assignments are kept, so enabling the role again restores access. Super Admin and Guest are always on.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            {enabledCount} of {totalCount} roles enabled
          </span>
          {canEdit && (
            <>
              <button type="button" disabled={!!busy || loading} onClick={() => applyPreset('demo', role => DEMO_SET.includes(role))} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 cursor-pointer">
                {busy === 'demo' ? 'Applying...' : 'Demo set (4 roles)'}
              </button>
              <button type="button" disabled={!!busy || loading} onClick={() => applyPreset('all', () => true)} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer">
                {busy === 'all' ? 'Applying...' : 'Enable all'}
              </button>
            </>
          )}
        </div>
      </div>

      {!canEdit && <p className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">Only a Super Admin can change role availability.</p>}
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">{error}</p>}
      {loading && <p className="text-xs text-slate-500 flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading roles...</p>}

      {!loading && CATEGORIES.map(category => {
        const roles = (entries ?? []).filter(entry => ROLE_DEFINITIONS[entry.role as UserRole]?.category === category && entry.role !== 'Guest');
        if (!roles.length) return null;
        return (
          <section key={category} className="space-y-2">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {roles.map(entry => {
                const role = entry.role as UserRole;
                const disabled = !canEdit || entry.locked || !!busy;
                return (
                  <div key={role} className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${entry.enabled ? 'border-emerald-500/30 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50'}`}>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold flex items-center gap-1.5 ${entry.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                        {role}
                        {entry.locked && <Lock className="w-3 h-3 text-slate-400" aria-label="Always enabled" />}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{ROLE_DEFINITIONS[role]?.title}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={entry.enabled}
                      aria-label={`${entry.enabled ? 'Disable' : 'Enable'} ${role}`}
                      disabled={disabled}
                      onClick={() => void run(role, [{ role, enabled: !entry.enabled }])}
                      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${entry.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${entry.enabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
