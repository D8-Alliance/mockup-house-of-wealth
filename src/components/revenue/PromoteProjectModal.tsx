import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Coins, 
  CreditCard, 
  ShieldAlert, 
  Info,
  ArrowRight
} from 'lucide-react';
import { PROMOTION_DISCLAIMER_TEXT } from '../../revenue/marketplaceMonetisationConfig';
import { PromotionPackage } from '../../revenue/marketplaceMonetisationTypes';
import { marketplaceMonetisationService } from '../../revenue/marketplaceMonetisationService';
import { apiClient } from '../../services/apiClient';

interface PromoteProjectModalProps {
  projectId: string;
  projectTitle: string;
  orgName: string;
  availableCredits?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PromoteProjectModal: React.FC<PromoteProjectModalProps> = ({
  projectId,
  projectTitle,
  orgName,
  availableCredits = 0,
  onClose,
  onSuccess
}) => {
  const packages = marketplaceMonetisationService.getActivePackages().filter(p => p.targetType === 'PROJECT');
  const [selectedPkg, setSelectedPkg] = useState<PromotionPackage>(packages[1] || packages[0]);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<'RM' | 'CREDITS'>('RM');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promotionError, setPromotionError] = useState('');

  const calculateEndDate = () => {
    if (selectedPkg.durationDays === 0) return 'Continuous';
    const d = new Date(startDate);
    d.setDate(d.getDate() + selectedPkg.durationDays);
    return d.toISOString().slice(0, 10);
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPromotionError('');
    try {
      const result = await apiClient.createProjectPromotion(projectId, {
        packageId: selectedPkg.id,
        startDate,
        paymentMethod: payMethod,
      });
      if (result.status === 'PENDING_PAYMENT') {
        setPromotionError('Payment is pending. The promotion will activate after payment confirmation.');
        return;
      }
    } catch (error) {
      setPromotionError(error instanceof Error ? error.message : 'Unable to activate promotion.');
      return;
    } finally {
      setIsSubmitting(false);
    }
    setIsSubmitted(true);
    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Marketplace Monetisation
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{projectId}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            Promote Project Campaign
          </h2>
          <p className="text-xs text-slate-500 truncate">
            Target: <strong>{projectTitle}</strong> • {orgName}
          </p>
        </div>

        {/* Promotion Package Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Select Promotion Tier:
          </label>

          <div className="space-y-2.5">
            {packages.map(pkg => {
              const isSelected = selectedPkg.id === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {pkg.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                          pkg.badgeType === 'Featured'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : pkg.badgeType === 'Sponsored'
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {pkg.badgeType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{pkg.placement}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-amber-600 dark:text-amber-400">
                        {pkg.priceMYR === 0 ? 'Free' : `RM ${pkg.priceMYR}`}
                      </div>
                      {pkg.creditsCost > 0 && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          or {pkg.creditsCost} Credits
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {pkg.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Campaign Start Date:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Campaign End Date:
            </label>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs">
              {calculateEndDate()} ({selectedPkg.durationDays > 0 ? `${selectedPkg.durationDays} Days` : 'Organic'})
            </div>
          </div>
        </div>

        {/* Payment Method Option */}
        {selectedPkg.priceMYR > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Payment Method:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayMethod('RM')}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  payMethod === 'RM'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>D-8 Wallet / Card (RM {selectedPkg.priceMYR})</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPayMethod('CREDITS')}
                disabled={availableCredits < selectedPkg.creditsCost}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  payMethod === 'CREDITS'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  <span>Wealth Pooling Credits ({selectedPkg.creditsCost} Cr)</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {promotionError && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{promotionError}</div>}

        {/* Mandatory Regulatory Disclosure */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[10.5px] text-amber-900 dark:text-amber-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Advertising Transparency & Compliance Disclosure</span>
          </div>
          <p className="leading-relaxed">
            {PROMOTION_DISCLAIMER_TEXT}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePromote}
            disabled={isSubmitted || isSubmitting}
            className="w-2/3 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Processing...</span>
            ) : isSubmitted ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-slate-950" /> Promotion Activated!
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>Activate Promotion ({selectedPkg.priceMYR === 0 ? 'Free' : `RM ${selectedPkg.priceMYR}`})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
