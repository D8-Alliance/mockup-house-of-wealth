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
import { apiErrorMessage, BackendMembershipStatus } from '../../services/apiClient';

interface UpgradeModalProps {
  plan: MembershipPlan;
  interval: BillingInterval;
  /** Supplies redeemable credits, credit value and the ToyyibPay fee; null while loading. */
  membershipStatus: BackendMembershipStatus | null;
  onClose: () => void;
  onConfirm: (planId: string, interval: BillingInterval, paymentMethod: string, creditsToApply?: number) => Promise<void>;
}

// Mirrors the backend split (splitMembershipPayment) so the summary matches what is charged.
function splitPayment(priceMYR: number, requested: number, available: number, rate: number, minimumCash: number) {
  let credits = Math.max(0, Math.min(Math.floor(requested || 0), available, Math.ceil(priceMYR / rate - 1e-9)));
  let cash = Math.round(Math.max(0, priceMYR - credits * rate) * 100) / 100;
  if (cash > 0 && cash < minimumCash) {
    credits = Math.max(0, Math.floor((priceMYR - minimumCash) / rate + 1e-9));
    cash = Math.round((priceMYR - credits * rate) * 100) / 100;
  }
  return { credits, creditValue: Math.round((priceMYR - cash) * 100) / 100, cash };
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  plan,
  interval: initialInterval,
  membershipStatus,
  onClose,
  onConfirm
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Summary & Features, 2: Interval & Pricing, 3: Mock Checkout & Confirm
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(initialInterval);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'wallet' | 'fpx' | 'isdb'>('fpx');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const priceMYR = billingInterval === 'monthly' ? plan.monthlyPriceMYR : plan.annualPriceMYR;
  const priceUSD = billingInterval === 'monthly' ? plan.monthlyPriceUSD : plan.annualPriceUSD;
  const isCustom = plan.isCustomPricing;

  const availableCredits = membershipStatus?.redeemableCredits ?? 0;
  const creditRate = membershipStatus?.creditValueMYR ?? 0.2;
  const fpxFee = membershipStatus?.fpxFeeMYR ?? 1;
  const [useCredits, setUseCredits] = useState(false);
  const [creditsRequested, setCreditsRequested] = useState(0);
  const maxUsefulCredits = Math.min(availableCredits, Math.ceil(priceMYR / creditRate - 1e-9));
  const split = splitPayment(priceMYR, useCredits ? creditsRequested : 0, availableCredits, creditRate, membershipStatus?.toyyibPayMinimumMYR ?? 1);
  const fullyCoveredByCredits = useCredits && split.credits > 0 && split.cash === 0;
  const feeApplies = selectedMethod === 'fpx' && !fullyCoveredByCredits && split.cash > 0;
  const totalCharged = Math.round((split.cash + (feeApplies ? fpxFee : 0)) * 100) / 100;
  const toggleCredits = (enabled: boolean) => {
    setUseCredits(enabled);
    if (enabled && !creditsRequested) setCreditsRequested(maxUsefulCredits);
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError('');
    if (fullyCoveredByCredits || selectedMethod === 'fpx') {
      // ToyyibPay redirects the browser to the bill page; a credits-only payment activates immediately.
      try {
        await onConfirm(plan.id, billingInterval, fullyCoveredByCredits ? 'AI_CREDITS' : 'TOYYIBPAY', split.credits);
      } catch (cause) {
        setError(apiErrorMessage(cause, 'Unable to start ToyyibPay checkout.'));
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        let methodTitle = 'Simulated Card (•••• 4242)';
        if (selectedMethod === 'wallet') methodTitle = 'D-8 Wealth E-Wallet';
        if (selectedMethod === 'isdb') methodTitle = 'IsDB Interbank Clearing Protocol';
        onConfirm(plan.id, billingInterval, methodTitle, split.credits).catch((cause) => {
          setIsSuccess(false);
          setError(apiErrorMessage(cause, 'Unable to activate the plan.'));
        });
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

            {!isCustom && availableCredits > 0 && (
              <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/60 dark:bg-purple-950/20 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={useCredits} onChange={(event) => toggleCredits(event.target.checked)} className="mt-0.5 accent-purple-600" />
                  <span>
                    <span className="block text-xs font-black text-slate-900 dark:text-white">Use my purchased AI credits</span>
                    <span className="block text-[11px] text-slate-500">{availableCredits.toLocaleString()} credits available · 1 credit = RM {creditRate.toFixed(2)}. Monthly allowance credits cannot be used.</span>
                  </span>
                </label>
                {useCredits && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={maxUsefulCredits}
                      value={creditsRequested}
                      onChange={(event) => setCreditsRequested(Math.max(0, Math.min(maxUsefulCredits, Math.floor(Number(event.target.value) || 0))))}
                      className="w-28 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                    />
                    <button type="button" onClick={() => setCreditsRequested(maxUsefulCredits)} className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer">Max</button>
                    <span className="text-[11px] text-purple-700 dark:text-purple-300 font-bold">−RM {split.creditValue.toFixed(2)} ({split.credits} credits)</span>
                  </div>
                )}
                {useCredits && split.credits < Math.min(creditsRequested, maxUsefulCredits) && (
                  <p className="text-[10px] text-slate-500">Adjusted to {split.credits} credits so the remaining RM {split.cash.toFixed(2)} meets ToyyibPay's RM 1 minimum.</p>
                )}
              </div>
            )}

            {/* Payment Instruments */}
            {!fullyCoveredByCredits && <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'card', name: 'Credit / Debit Card', desc: 'Visa / Mastercard Mock', icon: <CreditCard className="w-4 h-4 text-emerald-500" /> },
                { id: 'wallet', name: 'D-8 Wealth Wallet', desc: 'Internal Token Balance', icon: <Wallet className="w-4 h-4 text-amber-500" /> },
                { id: 'fpx', name: 'FPX / Card (ToyyibPay)', desc: 'Real payment via ToyyibPay', icon: <Building2 className="w-4 h-4 text-blue-500" /> },
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
            </div>}

            {!isCustom && (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Plan price</span><span className="font-mono">RM {priceMYR.toFixed(2)}</span></div>
                {split.credits > 0 && <div className="flex justify-between text-purple-700 dark:text-purple-300"><span>AI credits applied ({split.credits})</span><span className="font-mono">−RM {split.creditValue.toFixed(2)}</span></div>}
                {feeApplies && <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>FPX fee (charged by ToyyibPay)</span><span className="font-mono">RM {fpxFee.toFixed(2)}</span></div>}
                <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white"><span>{fullyCoveredByCredits ? 'Paid with AI credits' : 'Total to pay'}</span><span className="font-mono">RM {totalCharged.toFixed(2)}</span></div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              {fullyCoveredByCredits
                ? <span><strong>AI credits:</strong> The plan activates immediately and {split.credits} purchased credits are deducted.</span>
                : selectedMethod === 'fpx'
                  ? <span><strong>ToyyibPay:</strong> You will be redirected to ToyyibPay. The plan activates after the payment is confirmed.{split.credits > 0 ? ' Your credits are held now and returned if the payment fails or is cancelled.' : ''}</span>
                  : <span><strong>Sandbox Mock Payment:</strong> No real bank card will be charged. Instantly activates the selected plan.</span>}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => void handleCheckout()}
                disabled={isProcessing || isSuccess}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>{fullyCoveredByCredits ? 'Activating...' : selectedMethod === 'fpx' ? 'Redirecting to ToyyibPay...' : 'Authorizing Sandbox...'}</span>
                ) : isSuccess ? (
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Activated!</span>
                ) : (
                  <span>{fullyCoveredByCredits ? `Pay with ${split.credits} AI credits` : selectedMethod === 'fpx' ? `Pay RM ${totalCharged.toFixed(2)} with ToyyibPay` : 'Confirm & Activate'}</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
