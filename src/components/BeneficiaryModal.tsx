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
import { authService } from '../auth/services/authService';
import { phoneFormatFor } from '../countryNodes/countryPhone';
import { EstateFramework, estateRuleError, hasOwnerSetShare, TYPES_BY_FRAMEWORK } from '../beneficiaries/estateRules';

interface BeneficiaryModalProps {
  beneficiary: BeneficiaryItem | null; // null for Create
  onClose: () => void;
  onSave: (item: BeneficiaryItem) => void;
  /** Islamic (faraid, hibah, wasiyyah) or civil (will); decides which purposes are offered. */
  framework: EstateFramework;
  /** The owner's other beneficiaries, for the one-third wasiyyah limit. */
  others: BeneficiaryItem[];
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

const PAYOUT_METHODS = [
  'Bank Transfer (Maybank Islamic Malaysia)',
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
  onSave,
  framework,
  others
}) => {
  const isEditing = !!beneficiary;

  const [name, setName] = useState(beneficiary?.name || '');
  const [relation, setRelation] = useState<BeneficiaryItem['relation']>(beneficiary?.relation || 'Spouse');
  const [allocationPercent, setAllocationPercent] = useState<number>(beneficiary?.allocationPercent ?? 25);
  const [distributionType, setDistributionType] = useState<BeneficiaryItem['distributionType']>(beneficiary?.distributionType || TYPES_BY_FRAMEWORK[framework][0]);
  const distributionTypes = TYPES_BY_FRAMEWORK[framework];
  const ownerSetsShare = hasOwnerSetShare(distributionType);
  const [email, setEmail] = useState(beneficiary?.email || '');
  const [phone, setPhone] = useState(beneficiary?.phone || '');
  const [identityNumber, setIdentityNumber] = useState(beneficiary?.identityNumber || '');
  const [payoutMethod, setPayoutMethod] = useState(beneficiary?.payoutMethod || PAYOUT_METHODS[0]);
  const [isPrimary, setIsPrimary] = useState(beneficiary?.isPrimary || false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Hibah Amanah: the donor's offer (ijab). Already made when editing an existing hibah.
  const [ijabConfirmed, setIjabConfirmed] = useState<boolean>(!!beneficiary?.hibahAkad);
  const isHibah = distributionType === 'Hibah Amanah';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter beneficiary or institution name.');
      return;
    }

    if (ownerSetsShare && (allocationPercent <= 0 || allocationPercent > 100)) {
      setErrorMsg('Allocation percentage must be between 1% and 100%.');
      return;
    }

    const shareToSave = ownerSetsShare ? Number(allocationPercent) : 0;
    const ruleError = estateRuleError({ relation, distributionType, allocationPercent: shareToSave }, others);
    if (ruleError) {
      setErrorMsg(ruleError);
      return;
    }

    // A hibah is an akad: the recipient must be identified and reachable to give acceptance (qabul),
    // and the donor must make the offer (ijab) knowingly.
    if (isHibah) {
      if (!email.trim()) {
        setErrorMsg('Hibah Amanah needs the recipient’s email address, so they can accept the hibah (qabul).');
        return;
      }
      if (!identityNumber.trim()) {
        setErrorMsg('Hibah Amanah needs the recipient’s national ID or passport number.');
        return;
      }
      if (!ijabConfirmed) {
        setErrorMsg('Please confirm the hibah offer (ijab) to continue.');
        return;
      }
    }
    const hibahAkad = !isHibah
      ? undefined
      : beneficiary?.hibahAkad ?? { ijabDeclaredAt: new Date().toISOString(), qabulStatus: 'Awaiting acceptance' as const };

    const savedItem: BeneficiaryItem = {
      id: beneficiary?.id || `BEN-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      relation,
      allocationPercent: shareToSave,
      distributionType,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      identityNumber: identityNumber.trim() || undefined,
      payoutMethod,
      isPrimary,
      hibahAkad
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
                Define profit distribution, Wasiyyah (will), Hibah Amanah, or Waqf allocation
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
                {distributionTypes.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Allocation Percentage Slider/Input (not for a faraid heir, whose share is fixed by law) */}
          {!ownerSetsShare ? (
            <p className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300">
              <strong>Share fixed by faraid.</strong> A faraid heir&rsquo;s share is set by Islamic law and confirmed by the Syariah court&rsquo;s faraid certificate, so you do not choose a percentage. Listing the heir here helps the estate officer reach them.
            </p>
          ) : (
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
              {distributionType === 'Wasiyyah' ? 'Share of your estate. All wasiyyah together may not exceed one-third (33.33%).' : distributionType === 'Hibah Amanah' ? 'Share of your investments given by hibah.' : 'Share of the returns or estate for this beneficiary.'}
            </p>
          </div>
          )}

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
                placeholder={phoneFormatFor(authService.getAuthState().session?.user.countryNodeId).example}
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

          {/* Hibah Amanah akad: the donor's offer (ijab) here, the recipient's acceptance (qabul) later */}
          {isHibah && (
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-black text-slate-900 dark:text-white">Hibah Amanah akad (contract)</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <li><strong>Offer (ijab):</strong> you, the donor (penghibah), give the share above to the recipient (penerima hibah) voluntarily and without any payment in return.</li>
                <li><strong>Acceptance (qabul):</strong> the hibah takes effect only after the recipient accepts it. They will be asked to accept using the email address above.</li>
                <li><strong>Trust (amanah):</strong> the share is held in trust for the recipient, and passes to them on the terms of the hibah trust deed (for example, on the donor&rsquo;s death).</li>
                <li><strong>Conditions:</strong> the donor is of age and of sound mind, the gifted share is identified, and the recipient is identified by name and ID number.</li>
              </ol>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">The final akad and trust deed are subject to review by the Shariah adviser and the appointed trustee.</p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ijabConfirmed}
                  disabled={!!beneficiary?.hibahAkad}
                  onChange={e => setIjabConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-600"
                />
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  I make this offer of hibah (ijab) voluntarily, and I confirm that I am of age and of sound mind.
                </span>
              </label>
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                Recipient&rsquo;s acceptance (qabul): {beneficiary?.hibahAkad?.qabulStatus ?? 'Awaiting acceptance'}
              </p>
            </div>
          )}

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
