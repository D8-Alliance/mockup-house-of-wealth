import React, { useState } from 'react';
import { Pool } from './PoolingTypes';
import { 
  X, 
  Coins, 
  ShieldCheck, 
  CheckCircle2, 
  TrendingUp, 
  HelpCircle,
  FileText,
  Lock,
  ArrowRight
} from 'lucide-react';

interface PoolInvestmentWizardModalProps {
  pool: Pool;
  onClose: () => void;
  onSuccess: (amount: number, autoReinvest: boolean) => void;
}

export const PoolInvestmentWizardModal: React.FC<PoolInvestmentWizardModalProps> = ({
  pool,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<number>(pool.minInvestment * 2);
  const [autoReinvest, setAutoReinvest] = useState<boolean>(pool.autoReinvestEligible);
  const [agreedShariah, setAgreedShariah] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const estimatedAnnualYield = (amount * pool.expectedYieldPercent) / 100;

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess(amount, autoReinvest);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Shariah Investment Wizard • Step {step} of 3
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
              {pool.name}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: Investment Amount & Projections */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
              <Coins className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-extrabold text-slate-900 dark:text-white block">Contract Structure: {pool.contractType}</span>
                <span className="text-slate-600 dark:text-slate-300">Target Yield: <strong className="text-emerald-600 dark:text-emerald-400">{pool.expectedYieldPercent}% p.a.</strong> • Term: {pool.durationMonths} Months</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                Enter Investment Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400 font-extrabold">$</span>
                <input
                  type="number"
                  min={pool.minInvestment}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(pool.minInvestment, Number(e.target.value)))}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Minimum investment: ${pool.minInvestment.toLocaleString()} USD
              </p>
            </div>

            {/* Return Calculation Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated Annual Return:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">+${estimatedAnnualYield.toLocaleString()} USD / year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Projected Maturity Payout:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">${(amount + (estimatedAnnualYield * (pool.durationMonths / 12))).toLocaleString()} USD</span>
              </div>
            </div>

            {pool.autoReinvestEligible && (
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReinvest}
                  onChange={(e) => setAutoReinvest(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Enable Auto-Reinvestment of Profits (Compounding Yield)
                </span>
              </label>
            )}

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Shariah Governance Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Shariah Fatwa & Contract Signing */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-extrabold">
                <ShieldCheck className="w-5 h-5" />
                <span>AAOIFI Shariah Fatwa Verification</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Advising Scholar: <strong>{pool.shariahAdvisor}</strong><br />
                Under this {pool.contractType} contract, capital is deployed directly into non-interest generating physical and operational assets with transparent profit-and-loss sharing ratios.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-extrabold text-slate-900 dark:text-white block">Contract Terms Summary</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Capital Allocated: ${amount.toLocaleString()} USD</li>
                <li>Mudarib Profit Share: 15% to Pool Manager / 85% to Investors</li>
                <li>Early Exit Fee: 1.0% via Secondary Liquidity Pool</li>
                <li>Zakat Status: Auto-calculated at 2.5% on annual net yield</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedShariah}
                onChange={(e) => setAgreedShariah(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                I accept the AAOIFI {pool.contractType} contract terms and authorize capital locking into Pool {pool.id}.
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl cursor-pointer"
              >
                Back
              </button>
              <button
                disabled={!agreedShariah}
                onClick={() => setStep(3)}
                className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Review Final Authorization</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Cryptographic Authorization & Completion */}
        {step === 3 && (
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Confirm Investment
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your investment of <strong>${amount.toLocaleString()} USD</strong> will be cryptographically bound to Pool #{pool.id}.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-xs text-left space-y-1 font-mono text-slate-600 dark:text-slate-300">
              <div>Pool: {pool.name}</div>
              <div>Amount: ${amount.toLocaleString()} USD</div>
              <div>Contract: {pool.contractType}</div>
              <div>Auto-Reinvest: {autoReinvest ? 'Enabled' : 'Disabled'}</div>
              <div>Node ID: D8-MY-NODE-01</div>
            </div>

            <button
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {isSubmitting ? (
                <span>Executing Cryptographic Lock...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Execute Investment</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
