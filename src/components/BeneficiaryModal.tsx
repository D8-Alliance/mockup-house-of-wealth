import React, { useState } from 'react';
import { 
  X, 
  Users, 
  HeartHandshake, 
  Check, 
  Star, 
  Percent, 
  ShieldCheck, 
  Mail, 
  Phone, 
  FileText, 
  AlertCircle,
  Building2,
  Wallet
} from 'lucide-react';
import { BeneficiaryItem } from '../types';

interface BeneficiaryModalProps {
  beneficiary: BeneficiaryItem | null; // null for Create
  onClose: () => void;
  onSave: (item: BeneficiaryItem) => void;
}

const RELATIONS = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Waqf Foundation',
  'Zakat Institution',
  'Other'
];

const DISTRIBUTION_TYPES: Array<'Profit Share' | 'Estate / Wasiyyah' | 'Zakat & Sadaqah' | 'All Proceeds'> = [
  'Profit Share',
  'Estate / Wasiyyah',
  'Zakat & Sadaqah',
  'All Proceeds'
];

const PAYOUT_METHODS = [
  'Bank Transfer (Meezan Bank Pakistan)',
  'Bank Transfer (Bank Alfalah Islamic)',
  'Bank Transfer (Maybank Islamic)',
  'E-Wallet / Easypaisa & JazzCash D-8 Pay',
  'Direct Waqf Endowment Smart Wallet',
  'Direct Zakat Disburser Pool',
  'International Wire (SWIFT)'
];

export const BeneficiaryModal: React.FC<BeneficiaryModalProps> = ({
  beneficiary,
  onClose,
  onSave
}) => {
  const isEditing = !!beneficiary;

  const [name, setName] = useState(beneficiary?.name || '');
  const [relation, setRelation] = useState<BeneficiaryItem['relation']>(beneficiary?.relation || 'Spouse');
  const [allocationPercent, setAllocationPercent] = useState<number>(beneficiary?.allocationPercent ?? 25);
  const [distributionType, setDistributionType] = useState<BeneficiaryItem['distributionType']>(beneficiary?.distributionType || 'Profit Share');
  const [email, setEmail] = useState(beneficiary?.email || '');
  const [phone, setPhone] = useState(beneficiary?.phone || '');
  const [identityNumber, setIdentityNumber] = useState(beneficiary?.identityNumber || '');
  const [payoutMethod, setPayoutMethod] = useState(beneficiary?.payoutMethod || PAYOUT_METHODS[0]);
  const [isPrimary, setIsPrimary] = useState(beneficiary?.isPrimary || false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter beneficiary or institution name.');
      return;
    }

    if (allocationPercent <= 0 || allocationPercent > 100) {
      setErrorMsg('Allocation percentage must be between 1% and 100%.');
      return;
    }

    const savedItem: BeneficiaryItem = {
      id: beneficiary?.id || `BEN-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      relation,
      allocationPercent: Number(allocationPercent),
      distributionType,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      identityNumber: identityNumber.trim() || undefined,
      payoutMethod,
      isPrimary
    };

    onSave(savedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {isEditing ? 'Edit Beneficiary & Wasiyyah' : 'Add New Beneficiary'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define profit distribution, Wasiyyah (will), or Waqf allocation
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700/80 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Beneficiary Name */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Beneficiary Name / Institution
            </label>
            <input 
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Fatima Al-Mansoor or Al-Hidayah Waqf"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Grid: Relationship + Distribution Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Relationship
              </label>
              <select
                value={relation}
                onChange={e => setRelation(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {RELATIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Distribution Purpose
              </label>
              <select
                value={distributionType}
                onChange={e => setDistributionType(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {DISTRIBUTION_TYPES.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Allocation Percentage Slider/Input */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-emerald-500" />
                <span>Allocation Percentage</span>
              </label>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg">
                {allocationPercent}%
              </span>
            </div>

            <input 
              type="range"
              min="1"
              max="100"
              value={allocationPercent}
              onChange={e => setAllocationPercent(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Specify proportion of returns or estate allocated to this beneficiary under Shariah guidelines.
            </p>
          </div>

          {/* Grid: Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Phone Number
              </label>
              <input 
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+971 50 123 4567"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Identity Number / Waqf Reg Code */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              National ID / Passport / Registration Code
            </label>
            <input 
              type="text"
              value={identityNumber}
              onChange={e => setIdentityNumber(e.target.value)}
              placeholder="e.g. 784-1988-1234567-1 or WAQF-REG-2024"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Preferred Payout Method */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Preferred Payout Channel
            </label>
            <select
              value={payoutMethod}
              onChange={e => setPayoutMethod(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {PAYOUT_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Primary Beneficiary Toggle */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                    Set as Primary Beneficiary
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    First priority recipient for automated distribution runs
                  </span>
                </div>
              </div>
              <input 
                type="checkbox"
                checked={isPrimary}
                onChange={e => setIsPrimary(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600"
              />
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Update Beneficiary' : 'Add Beneficiary'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
