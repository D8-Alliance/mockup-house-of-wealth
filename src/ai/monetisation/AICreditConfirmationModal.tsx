import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Coins, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  CheckCircle2,
  Info,
  Layers,
  Scale
} from 'lucide-react';
import { AIOperationKey, AIOperationConfig } from './aiMonetisationTypes';
import { aiMonetisationService } from './aiMonetisationService';
import { apiClient, BackendCreditSummary } from '../../services/apiClient';
import { 
  AI_INFORMATIONAL_DISCLAIMER, 
  AI_NON_ADVICE_DISCLAIMER 
} from './aiCreditPricingConfig';

interface AICreditConfirmationModalProps {
  operationKey: AIOperationKey;
  userId?: string;
  targetEntity?: string;
  onClose: () => void;
  onConfirm: () => void;
  onOpenTopUpModal?: () => void;
  onOpenMembershipModal?: () => void;
}

export const AICreditConfirmationModal: React.FC<AICreditConfirmationModalProps> = ({
  operationKey,
  userId = 'USR-8821',
  targetEntity = 'Selected Asset Pool',
  onClose,
  onConfirm,
  onOpenTopUpModal,
  onOpenMembershipModal
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [creditBreakdown, setCreditBreakdown] = useState<BackendCreditSummary | null>(null);

  const op: AIOperationConfig = aiMonetisationService.getOperationConfig(operationKey);
  const balanceCheck = { remaining: creditBreakdown?.remainingCredits ?? 0, allowed: (creditBreakdown?.remainingCredits ?? 0) >= op.creditCost, shortfall: Math.max(0, op.creditCost - (creditBreakdown?.remainingCredits ?? 0)) };

  React.useEffect(() => { apiClient.getMembershipCreditSummary().then(setCreditBreakdown).catch(() => undefined); }, []);

  const handleExecute = async () => {
    setIsProcessing(true);
    try { await apiClient.consumeMembershipCredits(operationKey, targetEntity); setIsSuccess(true); setTimeout(onConfirm, 600); } finally { setIsProcessing(false); }
  };

  const projectedBalance = balanceCheck.remaining - op.creditCost;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-[2px] rounded-full border border-purple-500/20">
                {op.category} Operation
              </span>
              {op.badge && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-[2px] rounded">
                  {op.badge}
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              Confirm AI Credit Consumption
            </h2>
          </div>
        </div>

        {/* Operation Summary Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white">
              {op.name}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {op.description}
            </p>
            {targetEntity && (
              <div className="mt-2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg inline-block">
                Target: {targetEntity}
              </div>
            )}
          </div>

          {/* Credit Cost Matrix */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-center">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">Credit Cost</span>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">
                {op.creditCost} Credits
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">Current Balance</span>
              <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                {balanceCheck.remaining}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">Remaining After</span>
              <span className={`text-sm font-black font-mono ${
                projectedBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}>
                {projectedBalance >= 0 ? projectedBalance : 'Shortfall'}
              </span>
            </div>
          </div>
        </div>

        {/* Insufficient balance warning OR Disclaimers */}
        {!balanceCheck.allowed ? (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs text-rose-800 dark:text-rose-300">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Insufficient AI Credit Balance</span>
            </div>
            <p className="text-[11px]">
              You require <strong>{balanceCheck.shortfall} additional credits</strong> to run this {op.name}.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {onOpenTopUpModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTopUpModal();
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  Buy AI Credits
                </button>
              )}
              {onOpenMembershipModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMembershipModal();
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Upgrade Tier
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Disclaimers as explicitly mandated by user */
          <div className="p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-[11px] text-amber-900 dark:text-amber-300">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Decision Support & Compliance Notice</span>
            </div>
            <p className="text-[10.5px] leading-relaxed">
              • {AI_INFORMATIONAL_DISCLAIMER}
            </p>
            <p className="text-[10.5px] leading-relaxed">
              • {AI_NON_ADVICE_DISCLAIMER}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {balanceCheck.allowed && (
            <button
              type="button"
              onClick={handleExecute}
              disabled={isProcessing || isSuccess}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Consuming {op.creditCost} Credits...</span>
              ) : isSuccess ? (
                <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Confirmed</span>
              ) : (
                <>
                  <span>Confirm & Run ({op.creditCost} Cr)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
