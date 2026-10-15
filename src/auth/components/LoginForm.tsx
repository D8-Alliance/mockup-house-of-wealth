import React, { useEffect } from 'react';
import { Mail, ArrowRight, ChevronDown, ShieldCheck } from 'lucide-react';
import { UserRole } from '../../rbac/types';
import { AuthMode } from '../types/authTypes';
import { ROLE_DEFINITIONS } from '../../rbac/roleDefinitions';
import { SINGLE_ROLE_MODE, SINGLE_TEST_ROLE } from '../../rbac/runtimeConfig';

interface LoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  loading: boolean;
  onLoginSubmit: (e: React.FormEvent) => void;
  availableRoles?: UserRole[];
  authMode?: AuthMode;
}

/**
 * PRODUCTION signs in through the identity provider (Keycloak), which asks for the email,
 * password and one-time code itself; the user's roles come from the server. So this form only
 * offers the button. Demo and pre-production use personas, which have no password.
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  setEmail,
  rememberMe,
  setRememberMe,
  selectedRole,
  setSelectedRole,
  loading,
  onLoginSubmit,
  availableRoles,
  authMode = 'DEMO'
}) => {
  const isProduction = authMode === 'PRODUCTION';
  const rolesList = SINGLE_ROLE_MODE
    ? [SINGLE_TEST_ROLE]
    : (availableRoles || (Object.keys(ROLE_DEFINITIONS) as UserRole[]));

  // Personas sign in by their own email; start with the selected persona's, never a fixed account.
  useEffect(() => {
    if (!isProduction && !email) {
      const demo = ROLE_DEFINITIONS[selectedRole]?.demoUser;
      if (demo) setEmail(demo.email);
    }
  }, [isProduction]);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    const demo = ROLE_DEFINITIONS[role]?.demoUser;
    if (demo && !isProduction) setEmail(demo.email);
  };

  const submitButton = (label: string) => (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Opening secure sign-in...</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );

  if (isProduction) {
    return (
      <form onSubmit={onLoginSubmit} className="space-y-4">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            You will be taken to the secure D-8 sign-in page to enter your email, password and, for staff roles, a one-time code. Your access is set by your organisation's administrator.
          </p>
        </div>
        {submitButton('Continue to secure sign-in')}
      </form>
    );
  }

  return (
    <form onSubmit={onLoginSubmit} className="space-y-4">
      {/* Role / Persona Selection */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>Select Persona / Role:</span>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-extrabold">
            {`${rolesList.length} Personas`}
          </span>
        </label>
        <div className="relative">
          <select
            value={selectedRole}
            onChange={(e) => handleRoleSelect(e.target.value as UserRole)}
            className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
          >
            {rolesList.map((r) => (
              <option key={r} value={r}>
                {r} {ROLE_DEFINITIONS[r]?.category ? `(${ROLE_DEFINITIONS[r].category})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Email / Username Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Email
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@organization.com"
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Demo personas sign in without a password. Real accounts use the secure sign-in page.</p>
      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
          />
          <span>Remember my session (30 days)</span>
        </label>
      </div>

      {submitButton('Sign In & Access Dashboard')}
    </form>
  );
};
