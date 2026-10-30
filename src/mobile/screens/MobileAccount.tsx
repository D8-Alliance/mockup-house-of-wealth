import React from 'react';
import { LogOut, Monitor } from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';

/** Who is signed in, a way to the full website, and signing out (which ends the Keycloak session too). */
export const MobileAccount: React.FC = () => {
  const { activeUser, currentRole, logoutUser } = useRBAC();
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black">Account</h1>
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1 text-sm">
        <p className="font-black">{activeUser.name}</p>
        <p className="text-xs text-slate-500">{activeUser.email}</p>
        <p className="text-xs text-slate-500">{currentRole}</p>
      </section>
      <a href="/" className="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-sm font-bold">
        <Monitor className="w-4 h-4" />Open the full website
      </a>
      <button type="button" onClick={logoutUser} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm font-bold text-rose-700 dark:text-rose-300">
        <LogOut className="w-4 h-4" />Sign out
      </button>
    </div>
  );
};
