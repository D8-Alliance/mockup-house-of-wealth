import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  CreditCard, 
  Wallet, 
  Check, 
  ShieldCheck, 
  AlertCircle,
  Globe,
  Star
} from 'lucide-react';
import { PaymentAccount } from '../types';

interface PaymentAccountModalProps {
  account: PaymentAccount | null; // null for Create
  onClose: () => void;
  onSave: (account: PaymentAccount) => void;
}

const COMMON_BANKS = [
  'Maybank Islamic Malaysia',
  'Bank Alfalah Islamic',
  'MCB Islamic Bank',
  'Faysal Bank Islamic',
  'Maybank Islamic Malaysia',
  'Maybank Islamic Berhad',
  'Bank Islam Malaysia',
  'Kuwait Finance House (KFH)',
  'Al Rajhi Bank',
  'Bank Muamalat Indonesia',
  'Turkiye Finans Katilim Bankasi',
  'Islami Bank Bangladesh Limited'
];

const COMMON_EWALLETS = [
  'Touch n Go eWallet Malaysia',
  'Boost Malaysia',
  'GrabPay Malaysia',
  'BigPay Malaysia',
  'Touch \'n Go eWallet / D-8 Pay',
  'GrabPay Halal Hub',
  'GoPay Indonesia'
];

export const PaymentAccountModal: React.FC<PaymentAccountModalProps> = ({
  account,
  onClose,
  onSave
}) => {
  const isEditing = !!account;

  const [type, setType] = useState<'Bank Account' | 'E-Wallet'>(account?.type || 'Bank Account');
  const [accountName, setAccountName] = useState(account?.accountName || '');
  const [institutionName, setInstitutionName] = useState(account?.institutionName || 'Maybank Islamic Malaysia');
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber || '');
  const [swiftBic, setSwiftBic] = useState(account?.swiftBic || '');
  const [currency, setCurrency] = useState(account?.currency || 'USD');
  const [isDefault, setIsDefault] = useState(account?.isDefault || false);
  const [status, setStatus] = useState<'Verified' | 'Pending Verification'>(account?.status || 'Verified');
  const [isShariahApproved, setIsShariahApproved] = useState(account?.isShariahApproved ?? true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (type === 'Bank Account' && !COMMON_BANKS.includes(institutionName)) {
      setInstitutionName(COMMON_BANKS[0]);
    } else if (type === 'E-Wallet' && !COMMON_EWALLETS.includes(institutionName)) {
      setInstitutionName(COMMON_EWALLETS[0]);
    }
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!accountName.trim()) {
      setErrorMsg('Please enter account holder name.');
      return;
    }
    if (!accountNumber.trim()) {
      setErrorMsg('Please enter valid account or IBAN / wallet number.');
      return;
    }

    const savedItem: PaymentAccount = {
      id: account?.id || `ACC-${Math.floor(1000 + Math.random() * 9000)}`,
      type,
      accountName: accountName.trim(),
      institutionName: institutionName.trim(),
      accountNumber: accountNumber.trim(),
      swiftBic: swiftBic.trim() || undefined,
      currency,
      isDefault,
      status,
      isShariahApproved
    };

    onSave(savedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              {type === 'Bank Account' ? <Building2 className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {isEditing ? 'Edit Financial Account' : 'Add Bank or E-Wallet'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure Shariah-compliant payout & collection accounts
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

          {/* Account Type Toggle */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Account Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('Bank Account')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-extrabold cursor-pointer transition-all ${
                  type === 'Bank Account'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Bank Account</span>
              </button>

              <button
                type="button"
                onClick={() => setType('E-Wallet')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-extrabold cursor-pointer transition-all ${
                  type === 'E-Wallet'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>E-Wallet / D-8 Pay</span>
              </button>
            </div>
          </div>

          {/* Account Holder Name */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Account Holder Full Name
            </label>
            <input 
              type="text"
              required
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              placeholder="e.g. Ahmad bin Razak"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Institution Selector or Custom */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              {type === 'Bank Account' ? 'Financial Institution / Bank' : 'E-Wallet Service Provider'}
            </label>
            <select
              value={institutionName}
              onChange={e => setInstitutionName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {(type === 'Bank Account' ? COMMON_BANKS : COMMON_EWALLETS).map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          {/* Account Number / IBAN */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              {type === 'Bank Account' ? 'IBAN / Account Number' : 'Wallet ID / Mobile Number'}
            </label>
            <input 
              type="text"
              required
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              placeholder={type === 'Bank Account' ? 'AE12 0240 0001 ...' : '+971 50 123 4567'}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Grid: SWIFT + Currency */}
          <div className="grid grid-cols-2 gap-3">
            {type === 'Bank Account' && (
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  SWIFT / BIC Code
                </label>
                <input 
                  type="text"
                  value={swiftBic}
                  onChange={e => setSwiftBic(e.target.value)}
                  placeholder="DIBKAEADXXX"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                />
              </div>
            )}

            <div className={type === 'E-Wallet' ? 'col-span-2' : ''}>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Settlement Currency
              </label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="USD">USD ($)</option>
                <option value="MYR">MYR (₨)</option>
                <option value="MYR">MYR (RM)</option>
                <option value="IDR">IDR (Rp)</option>
                <option value="TRY">TRY (₺)</option>
                <option value="BDT">BDT (৳)</option>
                <option value="NGN">NGN (₦)</option>
                <option value="EGP">EGP (E£)</option>
              </select>
            </div>
          </div>

          {/* Toggles & Verification */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  Set as Default Payout Account
                </span>
              </div>
              <input 
                type="checkbox"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <div>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                    Shariah Screening Verification
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Free from interest-bearing riba sweeps and non-halal investments
                  </span>
                </div>
              </div>
              <input 
                type="checkbox"
                checked={isShariahApproved}
                onChange={e => setIsShariahApproved(e.target.checked)}
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

          {/* Submit Action */}
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
              <span>{isEditing ? 'Update Account' : 'Add Financial Account'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
