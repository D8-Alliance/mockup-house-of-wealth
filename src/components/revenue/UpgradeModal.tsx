import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  CreditCard, 
  Building2, 
  Wallet, 
  ShieldCheck, 
  Lock,
  ArrowRight,
  Zap,
  Check
} from 'lucide-react';
import { MembershipPlan, BillingInterval } from '../../revenue/revenueTypes';

interface UpgradeModalProps {
  plan: MembershipPlan;
  interval: BillingInterval;
  onClose: () => void;
  onConfirm: (planId: string, interval: BillingInterval, paymentMethod: string) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  plan,
  interval: initialInterval,
  onClose,
  onConfirm
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Summary & Features, 2: Interval & Pricing, 3: Mock Checkout & Confirm
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(initialInterval);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'wallet' | 'fpx' | 'isdb'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const priceMYR = billingInterval === 'monthly' ? plan.monthlyPriceMYR : plan.annualPriceMYR;
  const priceUSD = billingInterval === 'monthly' ? plan.monthlyPriceUSD : plan.annualPriceUSD;
  const isCustom = plan.isCustomPricing;

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        let methodTitle = 'Simulated Card (•••• 4242)';
        if (selectedMethod === 'wallet') methodTitle = 'D-8 Wealth E-Wallet';
        if (selectedMethod === 'fpx') methodTitle = 'Islamic Direct Debit (FPX/Bank Transfer)';
        if (selectedMethod === 'isdb') methodTitle = 'IsDB Interbank Clearing Protocol';
        onConfirm(plan.id, billingInterval, methodTitle);
      }, 900);
    }, 1200);
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

        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
            <span className={step === 1 ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}>Plan Summary</span>
            <span className="text-slate-300 mx-1">›</span>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
            <span className={step === 2 ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}>Pricing</span>
            <span className="text-slate-300 mx-1">›</span>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
            <span className={step === 3 ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}>Checkout</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            Mock Upgrade Flow
          </span>
        </div>

        {/* Step 1: Summary & Feature Comparison */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {plan.name} Overview
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {plan.description}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Monthly AI Utility Allowance</span>
                <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                  {plan.aiCreditsMonthly} Credits / mo
                </span>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Key Entitlements:</div>
                {plan.featureAccess.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300 text-xs">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Pricing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pricing & Interval Selection */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Select Billing Interval
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Choose between monthly flexibility or annual savings.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  billingInterval === 'monthly'
                    ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-slate-500">Monthly Plan</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {isCustom ? 'Custom' : `RM ${plan.monthlyPriceMYR}`}
                </div>
                <div className="text-[10px] text-slate-400">Billed every month</div>
              </button>

              <button
                type="button"
                onClick={() => setBillingInterval('annual')}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                  billingInterval === 'annual'
                    ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-600 text-white">
                  Save 17%
                </span>
                <div className="text-xs font-bold text-slate-500">Annual Plan</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {isCustom ? 'Custom' : `RM ${Math.round(plan.annualPriceMYR / 12)}/mo`}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {isCustom ? 'Custom SLA' : `RM ${plan.annualPriceMYR} billed yearly`}
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Proceed to Mock Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Simulated Checkout & Confirmation */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Simulated Settlement
              </h2>
              <p className="text-xs text-slate-500">
                Review subscription terms and select mock payment method.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex justify-between items-center">
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm">{plan.name}</h4>
                <span className="text-xs text-slate-500 capitalize">{billingInterval} Billing ({plan.aiCreditsMonthly} AI Credits/mo)</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {isCustom ? 'Custom' : `RM ${priceMYR}`}
                </div>
                {!isCustom && <div className="text-[11px] text-slate-400 font-mono">≈ ${priceUSD} USD</div>}
              </div>
            </div>

            {/* Payment Instruments */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'card', name: 'Credit / Debit Card', desc: 'Visa / Mastercard Mock', icon: <CreditCard className="w-4 h-4 text-emerald-500" /> },
                { id: 'wallet', name: 'D-8 Wealth Wallet', desc: 'Internal Token Balance', icon: <Wallet className="w-4 h-4 text-amber-500" /> },
                { id: 'fpx', name: 'Islamic Bank FPX', desc: 'Maybank, BIMB, Muamalat', icon: <Building2 className="w-4 h-4 text-blue-500" /> },
                { id: 'isdb', name: 'IsDB Protocol', desc: 'Sovereign Clearing Desk', icon: <ShieldCheck className="w-4 h-4 text-purple-500" /> }
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id as any)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer space-y-1 ${
                    selectedMethod === method.id
                      ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {method.icon}
                    {selectedMethod === method.id && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{method.name}</div>
                  <div className="text-[10px] text-slate-400">{method.desc}</div>
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span><strong>Sandbox Mock Payment:</strong> No real bank card will be charged. Instantly activates the selected plan.</span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleCheckout}
                disabled={isProcessing || isSuccess}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Authorizing Sandbox...</span>
                ) : isSuccess ? (
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Activated!</span>
                ) : (
                  <span>Confirm & Activate</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
