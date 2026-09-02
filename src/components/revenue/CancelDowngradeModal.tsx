import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { UserMembership } from '../../revenue/revenueTypes';

interface CancelDowngradeModalProps {
  membership: UserMembership;
  mode: 'downgrade' | 'cancel';
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelDowngradeModal: React.FC<CancelDowngradeModalProps> = ({
  membership,
  mode,
  onClose,
  onConfirm
}) => {
  const [reason, setReason] = useState<string>('Found all features I needed');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleAction = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCompleted(true);
      setTimeout(() => {
        onConfirm();
      }, 1000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {completed ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {mode === 'downgrade' ? 'Downgraded to HoW Free' : 'Subscription Cancelled'}
            </h3>
            <p className="text-xs text-slate-500">
              Your account has been updated. You will continue to retain open access to explore and invest in all Shariah asset pools.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {mode === 'downgrade' ? 'Switch to HoW Free Plan?' : 'Cancel Subscription Auto-Renewal?'}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'downgrade'
                  ? 'You will retain standard open marketplace access, but your monthly AI allowance will adjust to 20 credits and advanced risk matrices will be locked.'
                  : `Your ${membership.tier} subscription benefits will remain active until ${membership.currentPeriodEnd}. No further automated billing will occur.`}
              </p>
            </div>

            {/* Retained Benefits reminder */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-1.5 text-xs text-emerald-800 dark:text-emerald-300">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Investing remains 100% free and unrestricted</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Membership only unlocks AI analytics and research tools. You can always invest in verified pools without any paid subscription.
              </p>
            </div>

            {/* Optional Reason Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Reason for change (Optional):
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option>Found all features I needed for now</option>
                <option>Using AI tools less frequently</option>
                <option>Switching to a different plan interval</option>
                <option>Budget adjustment</option>
                <option>Other</option>
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Keep Current Plan
              </button>
              <button
                type="button"
                onClick={handleAction}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Updating...' : (mode === 'downgrade' ? 'Confirm Downgrade' : 'Confirm Cancellation')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
