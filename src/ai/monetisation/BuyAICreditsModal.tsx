import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Coins, 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  Gift
} from 'lucide-react';
import { AICreditTopUpPackage } from './aiMonetisationTypes';
import { aiMonetisationService } from './aiMonetisationService';
import { apiClient, apiErrorMessage } from '../../services/apiClient';
import { TOYYIBPAY_FPX_FEE_MYR } from '../../revenue/revenueConfig';

interface BuyAICreditsModalProps {
  userId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BuyAICreditsModal: React.FC<BuyAICreditsModalProps> = ({
  userId = 'USR-8821',
  onClose,
  onSuccess
}) => {
  const packages = aiMonetisationService.getTopUpPackages();
  const [selectedPkgId, setSelectedPkgId] = useState<string>(packages[1]?.id || packages[0].id);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'FPX' | 'CRYPTO'>('FPX');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState('');

  const selectedPkg = packages.find(p => p.id === selectedPkgId) || packages[0];
  const totalCredits = selectedPkg.credits + selectedPkg.bonusCredits;
  const fpxFee = paymentMethod === 'FPX' ? TOYYIBPAY_FPX_FEE_MYR : 0;
  const totalCharged = selectedPkg.priceMYR + fpxFee;

  const handlePurchase = async () => {
    setIsProcessing(true);
    setError('');
    try {
      // FPX is a real ToyyibPay checkout; card and USDT remain simulated.
      const methodLabel = paymentMethod === 'FPX'
        ? 'TOYYIBPAY'
        : paymentMethod === 'CARD'
        ? 'Visa ending in 4242 (Simulated)'
        : 'USDT (TRC-20 Escrow)';

      const payment = await apiClient.topUpMembershipCredits(selectedPkg.id, methodLabel);
      if (payment.paymentUrl) {
        window.location.assign(payment.paymentUrl);
        return;
      }
      setIsDone(true);
      // Let every balance view (not only this modal's opener) re-read the balance.
      window.dispatchEvent(new Event('ai-credits-changed'));
      setTimeout(() => { if (onSuccess) onSuccess(); onClose(); }, 1200);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Unable to complete the credit purchase.'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-[2px] rounded-full border border-amber-500/20">
                On-Demand Top-Up
              </span>
              <span className="text-[10px] text-slate-400">Never Expire</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              Buy Additional AI Credits
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Purchased AI credits sit in your <strong>Additional Credits</strong> balance and rollover indefinitely without monthly expiry.
        </p>

        {/* Package Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {packages.map(pkg => {
            const isSelected = selectedPkgId === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPkgId(pkg.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 shadow-md scale-[1.01]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/50'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2.5 right-3 bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                )}
                {pkg.badge && !pkg.popular && (
                  <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                    {pkg.badge}
                  </span>
                )}

                <div>
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {pkg.name}
                    </h3>
                  </div>

                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {pkg.credits}
                    </span>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      Credits
                    </span>
                    {pkg.bonusCredits > 0 && (
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Gift className="w-3 h-3" /> +{pkg.bonusCredits}
                      </span>
                    )}
                  </div>

                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {pkg.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                      RM {pkg.priceMYR}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">/ ${pkg.priceUSD}</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Options */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Select Payment Method</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Simulated Gateway
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'FPX', label: 'FPX / Card (ToyyibPay)', icon: <Zap className="w-3.5 h-3.5" /> },
              { id: 'CARD', label: 'Card (Simulated)', icon: <CreditCard className="w-3.5 h-3.5" /> },
              { id: 'CRYPTO', label: 'USDT Escrow', icon: <Coins className="w-3.5 h-3.5" /> }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id as any)}
                className={`p-2 rounded-xl text-center text-[10px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  paymentMethod === m.id
                    ? 'border-purple-600 bg-purple-100/50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Total Summary */}
        <div className="flex items-center justify-between text-xs px-1">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Total Credits to Add:</span>
            <strong className="text-purple-600 dark:text-purple-400 ml-1 font-mono text-sm">
              +{totalCredits} Credits
            </strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Charge Amount:</span>
            <strong className="text-slate-900 dark:text-white ml-1 font-mono text-sm">
              RM {selectedPkg.priceMYR} (USD ${selectedPkg.priceUSD})
            </strong>
            {fpxFee > 0 && (
              <span className="block text-right text-[10px] text-slate-500 dark:text-slate-400">+ RM {fpxFee.toFixed(2)} FPX fee (charged by ToyyibPay) = <strong className="text-slate-900 dark:text-white">RM {totalCharged.toFixed(2)}</strong></span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePurchase}
            disabled={isProcessing || isDone}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <span>{paymentMethod === 'FPX' ? 'Redirecting to ToyyibPay...' : 'Processing Payment...'}</span>
            ) : isDone ? (
              <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Credits Added!</span>
            ) : (
              <>
                <span>Confirm Purchase (RM {totalCharged.toFixed(2)})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
