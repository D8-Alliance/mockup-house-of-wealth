import React from 'react';
import { Clock, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

interface SessionExpiryModalProps {
  isOpen: boolean;
  timeRemainingSeconds: number;
  onContinueSession: () => void;
  onLogout: () => void;
}

export const SessionExpiryModal: React.FC<SessionExpiryModalProps> = ({
  isOpen,
  timeRemainingSeconds,
  onContinueSession,
  onLogout
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-2xl p-6 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Clock className="w-7 h-7" />
        </div>

        <div>
          <span className="px-3 py-1 bg-amber-500/10 text-amber-600 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-amber-500/20">
            Session Security Timeout Notice
          </span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
            Your Session Is About To Expire
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Due to security inactivity policy, your active token will expire in{' '}
            <strong className="text-amber-600 dark:text-amber-400 font-mono font-bold text-sm">
              {timeRemainingSeconds}s
            </strong>.
          </p>
        </div>

        <div className="p-3 bg-amber-500/5 dark:bg-amber-900/10 rounded-xl text-left text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Click Continue to renew your secure cryptographic session token.</span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onLogout}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Now</span>
          </button>
          <button
            onClick={onContinueSession}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Continue Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
