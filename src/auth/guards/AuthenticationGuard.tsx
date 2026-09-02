import React, { ReactNode } from 'react';
import { useRBAC } from '../../rbac/RBACContext';
import { Lock, LogIn } from 'lucide-react';

interface AuthenticationGuardProps {
  children: ReactNode;
}

export const AuthenticationGuard: React.FC<AuthenticationGuardProps> = ({ children }) => {
  const { isAuthenticated, setShowLoginModal } = useRBAC();

  if (!isAuthenticated) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-amber-500/20 mb-2">
          HTTP 401 Authentication Required
        </span>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Authentication Required</h2>
        <p className="text-xs text-slate-500 max-w-md mt-2 mb-6">
          You must sign in to House of Wealth Enterprise Identity Gateway to view protected financial data and role dashboards.
        </p>
        <button
          onClick={() => setShowLoginModal(true)}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all"
        >
          <LogIn className="w-4 h-4" />
          <span>Launch Gateway Sign In</span>
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
