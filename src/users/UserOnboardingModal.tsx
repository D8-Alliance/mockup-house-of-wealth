import React, { useState } from 'react';
import { UserCheck, X, Check, ShieldCheck, KeyRound } from 'lucide-react';
import { userService } from './userService';

interface UserOnboardingModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export const UserOnboardingModal: React.FC<UserOnboardingModalProps> = ({
  userId,
  isOpen,
  onClose,
  onCompleted
}) => {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen || !userId) return null;

  const handleFinish = () => {
    userService.completeOnboarding(userId);
    onCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Complete Onboarding</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Welcome to the Wealth Pooling Platform. Set your security credentials and activate Multi-Factor Authentication.
            </p>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Create Account Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!password || password !== confirmPassword}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold cursor-pointer"
            >
              Continue to MFA Setup
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-purple-600 mx-auto" />
              <h4 className="font-extrabold text-slate-900 dark:text-white">Authenticator Enforced</h4>
              <p className="text-slate-500 text-[11px]">Scan QR Code with Google Authenticator or YubiKey.</p>
              <div className="w-24 h-24 bg-white p-2 mx-auto rounded-xl shadow-inner border border-slate-200 flex items-center justify-center font-mono text-[9px] text-slate-800">
                [SIMULATED QR]
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Activate Account & Complete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
