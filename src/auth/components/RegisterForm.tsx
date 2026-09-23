import React, { useState } from 'react';
import { Building2, ChevronDown, Globe2, Mail, User as UserIcon, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { UserRole } from '../../rbac/types';
import { AuthMode } from '../types/authTypes';
import { ROLE_DEFINITIONS } from '../../rbac/roleDefinitions';
import { INITIAL_COUNTRY_NODES } from '../../countryNodes/mockCountryNodes';
import { authService } from '../../auth/services/authService';
import { RegisterCredentials } from '../../auth/types/authTypes';

interface RegisterFormProps {
  authMode?: AuthMode;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onError: (error: string) => void;
  onRegistered: (role: UserRole, email: string) => void;
  onLoginClick: () => void;
}

const REGISTRABLE_ROLES: UserRole[] = [
  'Retail Investor',
  'Institutional Investor',
  'Project Sponsor',
  'Asset Owner',
  'Pool Manager',
  'Finance Officer'
];

export const RegisterForm: React.FC<RegisterFormProps> = ({
  authMode = 'DEMO',
  loading,
  setLoading,
  onError,
  onRegistered,
  onLoginClick
}) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    organisation: '',
    password: '',
    confirm: ''
  });
  const [countryNodeId, setCountryNodeId] = useState<string>('CN-MYS');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Retail Investor');
  const [agree, setAgree] = useState(true);

  const countries = INITIAL_COUNTRY_NODES;
  const country = countries.find((c) => c.countryNodeId === countryNodeId) || countries[0];

  const inputCls =
    'w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.organisation || !form.password) {
      onError('Please complete all required fields.');
      return;
    }
    if (form.password.length < 8) {
      onError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirm) {
      onError('Passwords do not match.');
      return;
    }
    if (!agree) {
      onError('Please accept the Terms of Service and Shariah-compliant data policy.');
      return;
    }

    const credentials: RegisterCredentials = {
      name: form.name,
      email: form.email,
      password: form.password,
      organisation: form.organisation,
      countryNodeId: country.countryNodeId,
      countryName: `${country.countryName} Node`,
      selectedRole
    };

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const res = authService.register(credentials);
      if (res.success) {
        onRegistered(selectedRole, form.email);
      } else {
        onError(res.error || 'Registration failed. Please try again.');
      }
    }, 700);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</label>
        <div className="relative">
          <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="e.g. Amina Yusuf"
            className={inputCls}
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Corporate Email</label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            placeholder="name@organization.com"
            className={inputCls}
          />
        </div>
      </div>

      {/* Organisation */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Organisation</label>
        <div className="relative">
          <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={form.organisation}
            onChange={(e) => setForm({ ...form, organisation: e.target.value })}
            required
            placeholder="Company / Institution name"
            className={inputCls}
          />
        </div>
      </div>

      {/* Country Node */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Country Node</label>
        <div className="relative">
          <Globe2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <select
            value={countryNodeId}
            onChange={(e) => setCountryNodeId(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
          >
            {countries.map((c) => (
              <option key={c.countryNodeId} value={c.countryNodeId}>
                {c.flagUrl ? `${c.countryName} (${c.countryCode})` : c.countryName}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Create Password</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            placeholder="Min. 8 characters"
            className={inputCls}
          />
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Confirm Password</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
            placeholder="Re-enter password"
            className={inputCls}
          />
        </div>
      </div>

      {/* Role */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Access Level / Role</label>
        <div className="relative">
          <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
          >
            {REGISTRABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r} {ROLE_DEFINITIONS[r]?.category ? `(${ROLE_DEFINITIONS[r].category})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
        </div>
        <p className="text-[10px] text-slate-400">
          {authMode === 'DEMO'
            ? 'Demo Mode — your account is provisioned locally and signed in immediately.'
            : 'Production Mode — your application is routed to the backend onboarding pipeline.'}
        </p>
      </div>

      {/* Terms */}
      <label className="flex items-start gap-2 cursor-pointer text-[11px] font-semibold text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-0.5"
        />
        <span>
          I agree to the Terms of Service and the D-8 Shariah-compliant data & governance policy.
        </span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Creating Account...</span>
          </>
        ) : (
          <>
            <span>Register & Access Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <button type="button" onClick={onLoginClick} className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
          Sign In
        </button>
      </p>
    </form>
  );
};
