import React, { useState } from 'react';
import { 
  X, 
  Coins, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  History, 
  Plus, 
  Sparkles 
} from 'lucide-react';
import { HoWCreditBalance, CreditTransaction } from '../../revenue/revenueTypes';
import { CREDIT_TOPUP_PACKAGES } from '../../revenue/revenueConfig';

interface CreditBalanceModalProps {
  creditBalance: HoWCreditBalance;
  transactions: CreditTransaction[];
  onClose: () => void;
  onTopUp: (credits: number, priceMYR: number, priceUSD: number, paymentMethod: string) => void;
}

export const CreditBalanceModal: React.FC<CreditBalanceModalProps> = ({
  creditBalance,
  transactions,
  onClose,
  onTopUp
}) => {
  const [selectedPack, setSelectedPack] = useState(CREDIT_TOPUP_PACKAGES[1]);
  const [activeTab, setActiveTab] = useState<'topup' | 'history'>('topup');
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePurchase = () => {
    setIsSuccess(true);
    setTimeout(() => {
      onTopUp(
        selectedPack.credits + selectedPack.bonusCredits, 
        selectedPack.priceMYR, 
        selectedPack.priceUSD, 
        'D-8 Wealth Wallet'
      );
      setIsSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Wealth Pooling AI Utility Credits
            </h2>
            <p className="text-xs text-slate-500">
              Platform computational utility units for AI advisory, due diligence & report unlocking.
            </p>
          </div>
        </div>

        {/* Current Balance Display */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-500/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
              Available Credit Balance
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">
              {creditBalance.availableCredits} <span className="text-xs font-normal text-slate-400">Credits</span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-0.5">
            <div>Monthly Grant: <strong>{creditBalance.monthlyAllowance}</strong></div>
            <div>Used This Cycle: <strong>{creditBalance.usedCredits}</strong></div>
          </div>
        </div>

        {/* Legal & Regulatory Compliance Disclaimer */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Platform Utility Credit Disclaimer</span>
          </div>
          <p className="leading-relaxed">
              Wealth Pooling Credits are platform utility/usage credits only. They are <strong>NOT</strong> cryptocurrency, securities, investment products, shares, guaranteed returns, or tradable investment assets. They expire or refresh per your monthly plan rules.
          </p>
        </div>

        {/* Sub-tabs: Top Up vs History */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('topup')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'topup'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Top Up Packages
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Credit History ({transactions.length})</span>
          </button>
        </div>

        {/* Top Up Tab */}
        {activeTab === 'topup' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {CREDIT_TOPUP_PACKAGES.map(pack => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPack(pack)}
                  className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer relative ${
                    selectedPack.id === pack.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-[2px] rounded-full text-[9px] font-black uppercase bg-amber-500 text-white shadow">
                      Best Value
                    </span>
                  )}
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {pack.credits}
                  </div>
                  {pack.bonusCredits > 0 && (
                    <div className="text-[10px] text-emerald-600 font-bold">
                      +{pack.bonusCredits} Bonus
                    </div>
                  )}
                  <div className="text-xs font-extrabold text-slate-500 mt-2">
                    RM {pack.priceMYR}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    ≈ ${pack.priceUSD} USD
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handlePurchase}
              disabled={isSuccess}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSuccess ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Credits Added Successfully!
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Top Up {selectedPack.credits + selectedPack.bonusCredits} Credits for RM {selectedPack.priceMYR}
                </span>
              )}
            </button>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {transactions.map(tx => (
              <div key={tx.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{tx.description}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{tx.timestamp} • {tx.type}</div>
                </div>
                <div className={`font-mono font-black ${tx.isDebit ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {tx.isDebit ? `-${tx.amount}` : `+${tx.amount}`}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
