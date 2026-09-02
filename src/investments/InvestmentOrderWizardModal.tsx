import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, AlertTriangle, BookOpen, DollarSign } from 'lucide-react';
import { WealthPool } from '../pooling/poolTypes';
import { investmentService } from './investmentService';
import { useRBAC } from '../rbac/RBACContext';

interface InvestmentOrderWizardModalProps {
  pool: WealthPool | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const InvestmentOrderWizardModal: React.FC<InvestmentOrderWizardModalProps> = ({ pool, onClose, onSuccess }) => {
  const { activeUser, currentRole } = useRBAC();
  const [step, setStep] = useState<number>(1);
  const [amount, setAmount] = useState<number>(50000);
  const [confirmedRisk, setConfirmedRisk] = useState(false);

  if (!pool) return null;

  const profile = investmentService.getSuitabilityProfile(activeUser.id);

  const handlePlaceOrder = () => {
    const order = investmentService.createInvestmentOrder(
      pool.poolId,
      activeUser.id,
      activeUser.name,
      amount,
      activeUser.id,
      currentRole
    );
    investmentService.settleInvestmentOrder(order.investmentId, activeUser.id, currentRole);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600">
              SHARIAH INVESTMENT DESK
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Subscribe to {pool.poolName}</h2>
            <p className="text-xs text-slate-500">Contract: {pool.investmentStructure} • Indicative Return: {pool.indicativeExpectedReturn}% p.a.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps */}
        <div className="flex gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 text-xs font-bold">
          <button onClick={() => setStep(1)} className={`px-3 py-1 rounded-xl ${step === 1 ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>1. Suitability & Terms</button>
          <button onClick={() => setStep(2)} className={`px-3 py-1 rounded-xl ${step === 2 ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>2. Amount & Risk Sign-off</button>
        </div>

        {step === 1 && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white block">Investor Suitability Check</span>
              <p className="text-slate-500">Classification: <strong>{profile.investorType}</strong></p>
              <p className="text-slate-500">Risk Tolerance: <strong>{profile.riskProfile}</strong></p>
              <p className="text-slate-500">Status: <span className="text-emerald-600 font-bold">Passed Eligibility Criteria</span></p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <span className="font-extrabold text-emerald-900 dark:text-emerald-300 block">Islamic Contract Structure ({pool.investmentStructure})</span>
              <p className="text-slate-600 dark:text-slate-300">
                Capital is deployed under AAOIFI compliant {pool.investmentStructure} rules. Profits are distributed based on agreed ratios. Losses are shared pro-rata to capital contribution in accordance with Shariah law.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subscription Capital Amount ({pool.currency})</label>
              <input
                type="number"
                min={pool.minimumInvestment}
                max={pool.maximumInvestment}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-black text-lg"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Min: ${pool.minimumInvestment.toLocaleString()} • Max: ${pool.maximumInvestment.toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Mandatory Risk & Non-Guarantee Disclosure
              </div>
              <p className="text-[11px]">
                Indicative expected return of <strong>{pool.indicativeExpectedReturn}% p.a.</strong> is for projection purposes only. Past performance or projected returns do not guarantee future results. Returns depend on actual underlying project yield.
              </p>
              <label className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-200 dark:border-amber-800 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={confirmedRisk}
                  onChange={e => setConfirmedRisk(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                I understand and accept the risk disclosures & Shariah terms.
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center text-xs pt-2">
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl font-bold bg-slate-100 text-slate-600 dark:bg-slate-700">Back</button>
          ) : <div />}

          {step === 1 ? (
            <button onClick={() => setStep(2)} className="px-4 py-2 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-500">Proceed to Investment</button>
          ) : (
            <button
              disabled={!confirmedRisk}
              onClick={handlePlaceOrder}
              className={`px-5 py-2.5 rounded-xl font-black text-white flex items-center gap-2 ${confirmedRisk ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'}`}
            >
              <DollarSign className="w-4 h-4" />
              Confirm & Subscribe (${amount.toLocaleString()} {pool.currency})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
