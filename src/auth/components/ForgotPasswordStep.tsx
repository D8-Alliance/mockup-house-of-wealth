import React from 'react';

interface ForgotPasswordStepProps {
  email: string;
  setEmail: (email: string) => void;
  loading: boolean;
  onSubmitForgot: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const ForgotPasswordStep: React.FC<ForgotPasswordStepProps> = ({
  email,
  setEmail,
  loading,
  onSubmitForgot,
  onCancel
}) => {
  return (
    <form onSubmit={onSubmitForgot} className="space-y-4">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Enter your registered corporate email address. A cryptographic password reset link will be dispatched.
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Registered Corporate Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md disabled:opacity-50"
        >
          {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
        </button>
      </div>
    </form>
  );
};
