import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { UserRole } from '../../rbac/types';

interface MfaStepProps {
  otp: string[];
  setOtp: (otp: string[]) => void;
  selectedRole: UserRole;
  loading: boolean;
  onVerifyMfa: (e: React.FormEvent) => void;
  onBackToLogin: () => void;
}

export const MfaStep: React.FC<MfaStepProps> = ({
  otp,
  setOtp,
  selectedRole,
  loading,
  onVerifyMfa,
  onBackToLogin
}) => {
  const handleChangeDigit = (val: string, idx: number) => {
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
  };

  return (
    <form onSubmit={onVerifyMfa} className="space-y-5 text-center">
      <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl inline-flex items-center gap-2 text-xs font-bold">
        <ShieldCheck className="w-4 h-4" />
        <span>Cryptographic MFA Token Required</span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Enter the 6-digit authenticator code to finalize sign-in as{' '}
        <strong className="text-slate-900 dark:text-white">{selectedRole}</strong>.
      </p>

      <div className="flex justify-center gap-2">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChangeDigit(e.target.value, idx)}
            className="w-10 h-12 text-center text-lg font-black bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-white"
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {loading ? 'Verifying MFA Token...' : 'Verify MFA & Continue'}
      </button>

      <button
        type="button"
        onClick={onBackToLogin}
        className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
      >
        Back to Sign In
      </button>
    </form>
  );
};
