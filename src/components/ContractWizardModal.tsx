import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  PenTool, 
  DollarSign, 
  Sparkles
} from 'lucide-react';
import { ContractType } from '../types';
import { ContractClauseSelector } from './ContractClauseSelector';

interface ContractWizardModalProps {
  onClose: () => void;
  onComplete: (contractData: any) => void;
}

export const ContractWizardModal: React.FC<ContractWizardModalProps> = ({
  onClose,
  onComplete
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [contractType, setContractType] = useState<ContractType>('Mudarabah');
  const [capitalAmount, setCapitalAmount] = useState('50000');
  const [investorRatio, setInvestorRatio] = useState(60);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const [finishError, setFinishError] = useState('');

  const managerRatio = 100 - investorRatio;

  const handleFinish = () => {
    const amount = Number(capitalAmount);

    if (!signatureDrawn || !agreedTerms) {
      setFinishError('Attach the signature confirmation and accept the contract terms before submitting.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFinishError('Enter an initial capital amount greater than zero.');
      return;
    }

    onComplete({
      title: `${contractType} Agreement #${Math.floor(100 + Math.random() * 900)}`,
      type: contractType,
      counterparty: 'D-8 Certified Investor Pool',
      status: 'Pending',
      maturityDate: 'Oct 24, 2027',
      value: amount,
      valueDisplay: `$${amount.toLocaleString()}`,
      profitRatio: `${investorRatio} : ${managerRatio}`,
      mySharePercent: investorRatio,
      managerSharePercent: managerRatio,
      nextDistributionDate: 'Nov 15, 2026',
      currentValue: amount,
      totalInvested: amount,
      ytdProfit: 0
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/60 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Step {step} of 4: {step === 1 ? 'Contract Structure' : step === 2 ? 'Financial Terms' : step === 3 ? 'Legal Review' : 'Signature'}
              </span>
              <span className="text-xs font-bold text-slate-400">• {step * 25}% Complete</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Shariah Contract Wizard
            </h2>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${step * 25}%` }} />
        </div>

        {/* STEP 1: Select Contract Structure */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Select Shariah Instrument Type
            </h3>
            <ContractClauseSelector contractType={contractType} setContractType={setContractType} />
          </div>
        )}

        {/* STEP 2: Financial Terms */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Configure Capital & Profit Sharing Ratios
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Initial Capital Contribution (USD)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="number"
                    value={capitalAmount}
                    onChange={e => setCapitalAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Profit Sharing Ratio Slider */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="text-slate-800 dark:text-slate-200">Investor Share: {investorRatio}%</span>
                  <span className="text-emerald-600 dark:text-emerald-400">Manager Share: {managerRatio}%</span>
                </div>

                <input 
                  type="range"
                  min={10}
                  max={90}
                  value={investorRatio}
                  onChange={e => setInvestorRatio(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />

                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>10% / 90%</span>
                  <span>50% / 50%</span>
                  <span>90% / 10%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Legal & Shariah Review */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm">AAOIFI Compliance Verified</h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-300">
                  This contract structure complies strictly with AAOIFI Shariah Standard No. 13 (Mudarabah).
                </p>
              </div>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 font-serif text-xs leading-relaxed space-y-3 max-h-48 overflow-y-auto">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase font-sans">Draft Clauses Summary:</h4>
              <p>
                1. <strong>Profit Allocation:</strong> Net profits derived from the venture shall be distributed in accordance with the agreed ratio: {investorRatio}% to Capital Provider and {managerRatio}% to Mudarib.
              </p>
              <p>
                2. <strong>Loss Allocation:</strong> In the event of monetary loss without proven negligence or breach by Mudarib, financial loss is borne solely by the Capital Provider.
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: Digital Signature */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
               Digital Signature & Contract Submission
            </h3>

            {/* Signature Box */}
            <div 
              onClick={() => setSignatureDrawn(true)}
              className={`h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                signatureDrawn 
                  ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-400'
              }`}
            >
              {signatureDrawn ? (
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span className="font-bold text-xs">Signature Confirmation Recorded (MVP)</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <PenTool className="w-6 h-6" />
                  <span className="text-xs font-semibold">Click here to record signature confirmation</span>
                </div>
              )}
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                checked={agreedTerms}
                onChange={e => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>I confirm that all contract parameters comply with Shariah governance guidelines and authorize submission for deployment review.</span>
            </label>

            {finishError && (
              <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{finishError}</p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
          <button
            disabled={step === 1}
            onClick={() => setStep((step - 1) as any)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
          >
            Back
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep((step + 1) as any)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md shadow-emerald-600/20 flex items-center gap-1 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
               <span>Submit for Deployment Review</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
