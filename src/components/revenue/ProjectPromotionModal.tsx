import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Star, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  Coins, 
  CreditCard 
} from 'lucide-react';
import { ProjectPromotionPackage } from '../../revenue/revenueTypes';
import { PROJECT_PROMOTION_PACKAGES } from '../../revenue/revenueConfig';

interface ProjectPromotionModalProps {
  projectTitle: string;
  projectId: string;
  availableCredits: number;
  onClose: () => void;
  onConfirmPromotion: (packageId: string, method: 'cash' | 'credits') => void;
}

export const ProjectPromotionModal: React.FC<ProjectPromotionModalProps> = ({
  projectTitle,
  projectId,
  availableCredits,
  onClose,
  onConfirmPromotion
}) => {
  const [selectedPackage, setSelectedPackage] = useState<ProjectPromotionPackage>(PROJECT_PROMOTION_PACKAGES[1]);
  const [payWithCredits, setPayWithCredits] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePromote = () => {
    setIsSuccess(true);
    setTimeout(() => {
      onConfirmPromotion(selectedPackage.id, payWithCredits ? 'credits' : 'cash');
      setIsSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Marketplace Monetisation
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            Promote Capital Campaign
          </h2>
          <p className="text-xs text-slate-500 truncate">
            Target Project: <strong>{projectTitle}</strong> ({projectId})
          </p>
        </div>

        {/* Package Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Select Visibility Boost Package:
          </label>

          {PROJECT_PROMOTION_PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                selectedPackage.id === pkg.id
                  ? 'border-amber-500 bg-amber-500/5 dark:bg-amber-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {pkg.title}
                    </span>
                    <span className="px-2 py-0.2 rounded-md text-[9px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      {pkg.badgeText}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {pkg.placement}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-amber-600 dark:text-amber-400">
                    {pkg.priceMYR === 0 ? 'Free' : `RM ${pkg.priceMYR}`}
                  </div>
                  {pkg.creditsCost > 0 && (
                    <div className="text-[10px] text-slate-400">
                      or {pkg.creditsCost} HoW Credits
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {pkg.description}
              </p>
            </div>
          ))}
        </div>

        {/* Payment toggle */}
        {selectedPackage.creditsCost > 0 && (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Use HoW AI Credits ({availableCredits} available)</span>
            </div>
            <input
              type="checkbox"
              checked={payWithCredits}
              onChange={(e) => setPayWithCredits(e.target.checked)}
              disabled={availableCredits < selectedPackage.creditsCost}
              className="w-4 h-4 text-amber-500 rounded cursor-pointer"
            />
          </div>
        )}

        {/* Regulatory Disclosure */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Advertising Transparency Disclosure</span>
          </div>
          <p>
            "Featured", "Sponsored", or "Promoted" tags signify paid marketing placement. They do <strong>NOT</strong> imply credit rating endorsement or return guarantees.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-1/3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePromote}
            disabled={isSuccess}
            className="w-2/3 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSuccess ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Promotion Activated!
              </span>
            ) : (
              <span>
                {payWithCredits 
                  ? `Confirm Promotion (${selectedPackage.creditsCost} Credits)` 
                  : `Confirm Promotion (RM ${selectedPackage.priceMYR})`}
              </span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
