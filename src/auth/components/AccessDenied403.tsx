import React from 'react';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';
import { UserRole } from '../../rbac/types';

interface AccessDenied403Props {
  currentRole: UserRole;
  requiredRole?: string;
  onGoBack?: () => void;
}

export const AccessDenied403: React.FC<AccessDenied403Props> = ({
  currentRole,
  requiredRole,
  onGoBack
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 animate-fadeIn">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl border border-red-200 dark:border-red-900/50 shadow-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 bg-red-500/10 text-red-600 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-red-500/20">
            HTTP 403 Forbidden
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-3">Access Denied</h2>
          <p className="text-xs text-slate-500 mt-2">
            Your current role <strong className="text-slate-800 dark:text-slate-200 font-bold">"{currentRole}"</strong> does not possess the permissions required to view this module.
          </p>
          {requiredRole && (
            <p className="text-[11px] font-mono text-amber-600 dark:text-amber-400 mt-2 bg-amber-500/10 p-2 rounded-xl">
              Requires role / capability: {requiredRole}
            </p>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-left text-xs space-y-2 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Enforced Policy Checks:</span>
          </div>
          <ul className="list-disc list-inside text-slate-500 space-y-1 text-[11px]">
            <li>Enterprise Role-Based Access Control (RBAC)</li>
            <li>Multi-Tenant Isolation Constraints</li>
            <li>Cryptographic Access Audit Event Recorded</li>
          </ul>
        </div>

        {onGoBack && (
          <button
            onClick={onGoBack}
            className="w-full py-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Authorized Dashboard</span>
          </button>
        )}
      </div>
    </div>
  );
};
