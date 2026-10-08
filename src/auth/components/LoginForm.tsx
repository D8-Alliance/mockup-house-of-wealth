import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ChevronDown } from 'lucide-react';
import { UserRole } from '../../rbac/types';
import { AuthMode } from '../types/authTypes';
import { ROLE_DEFINITIONS } from '../../rbac/roleDefinitions';
import { SINGLE_ROLE_MODE, SINGLE_TEST_ROLE } from '../../rbac/runtimeConfig';

interface LoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  loading: boolean;
  onLoginSubmit: (e: React.FormEvent) => void;
  onForgotPasswordClick: () => void;
  availableRoles?: UserRole[];
  authMode?: AuthMode;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  selectedRole,
  setSelectedRole,
  loading,
  onLoginSubmit,
  onForgotPasswordClick,
  availableRoles,
  authMode = 'DEMO'
}) => {
  const rolesList = SINGLE_ROLE_MODE
    ? [SINGLE_TEST_ROLE]
    : (availableRoles || (Object.keys(ROLE_DEFINITIONS) as UserRole[]));

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    const demo = ROLE_DEFINITIONS[role]?.demoUser;
    if (demo && authMode === 'DEMO') {
      setEmail(demo.email);
    }
  };

  return (
    <form onSubmit={onLoginSubmit} className="space-y-4">
      {/* Role / Persona Selection */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>{authMode === 'DEMO' ? 'Select Persona / Role:' : 'Select Target Role:'}</span>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-extrabold">
            {authMode === 'DEMO' ? `${rolesList.length} Personas` : 'Assigned Roles'}
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
          Corporate Email / Username
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
      </div>

      {/* Password Input */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Password
          </label>
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter password"
            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
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

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Authenticating Gateway...</span>
          </>
        ) : (
          <>
            <span>Sign In & Access Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
