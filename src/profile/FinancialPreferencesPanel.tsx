import React, { useEffect, useState } from 'react';
import { Building2, Coins, Plus, ShieldCheck, Star, Trash2, X } from 'lucide-react';
import { apiClient, apiErrorMessage, NewPayoutAccount, PayoutAccount, ProfilePreferences } from '../services/apiClient';

interface FinancialPreferencesPanelProps {
  preferences: ProfilePreferences;
  onSave: (change: ProfilePreferences) => Promise<void>;
  /** Only roles that receive money (investors, PDPs, asset owners) keep payout accounts. */
  showPayoutAccounts: boolean;
  notify: (message: string) => void;
}

const CURRENCIES = [
  { code: 'MYR', label: 'MYR (RM) – Malaysian Ringgit' },
  { code: 'IDR', label: 'IDR (Rp) – Indonesian Rupiah' },
  { code: 'TRY', label: 'TRY (₺) – Turkish Lira' },
  { code: 'BDT', label: 'BDT (৳) – Bangladeshi Taka' },
  { code: 'EGP', label: 'EGP (E£) – Egyptian Pound' },
  { code: 'NGN', label: 'NGN (₦) – Nigerian Naira' },
  { code: 'PKR', label: 'PKR (₨) – Pakistani Rupee' },
  { code: 'IRR', label: 'IRR (﷼) – Iranian Rial' },
  { code: 'USD', label: 'USD ($) – US Dollar' },
];

const CONTRACTS = [
  { type: 'Mudarabah', desc: 'Profit-sharing: you provide capital, the PDP manages' },
  { type: 'Musharakah', desc: 'Joint venture: both partners contribute capital' },
  { type: 'Ijarah', desc: 'Leasing: income from renting out assets' },
  { type: 'Murabahah', desc: 'Cost-plus sale with a disclosed profit' },
  { type: 'Wakalah', desc: 'Agency: an agent invests for a set fee' },
  { type: 'Sukuk', desc: 'Islamic certificates backed by assets' },
];

const BANKS = ['Maybank Islamic', 'CIMB Islamic', 'Bank Islam Malaysia', 'Bank Muamalat', 'RHB Islamic', 'Public Islamic Bank', 'AmBank Islamic', 'Hong Leong Islamic', 'Affin Islamic', 'Alliance Islamic', 'Bank Rakyat', 'Agrobank'];

const INPUT = 'w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
const LABEL = 'text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5';

export const FinancialPreferencesPanel: React.FC<FinancialPreferencesPanelProps> = ({ preferences, onSave, showPayoutAccounts, notify }) => {
  const [currency, setCurrency] = useState(preferences.currency ?? 'MYR');
  const [contracts, setContracts] = useState<string[]>(preferences.preferredContracts ?? CONTRACTS.map((c) => c.type));
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    setCurrency(preferences.currency ?? 'MYR');
    setContracts(preferences.preferredContracts ?? CONTRACTS.map((c) => c.type));
  }, [preferences.currency, preferences.preferredContracts]);

  const savePreferences = async () => {
    setSavingPrefs(true);
    try {
      await onSave({ currency, preferredContracts: contracts });
      notify('Preferences saved.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleContract = (type: string) => setContracts((current) => current.includes(type) ? current.filter((t) => t !== type) : [...current, type]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Coins className="w-5 h-5 text-emerald-500" />
          <span>Shariah & Financial Preferences</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Saved to your profile.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="pref-currency" className={LABEL}>Preferred currency</label>
          <select id="pref-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${INPUT} font-bold cursor-pointer`}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <span className={LABEL}>Zakat</span>
          <p className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            Zakat on wealth is 2.5% once your holdings reach the nisab and a full lunar year (hawl) has passed. The rate is set by Shariah, so it is not a setting.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className={LABEL}>Islamic contracts you are interested in</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CONTRACTS.map((item) => (
            <label key={item.type} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={contracts.includes(item.type)} onChange={() => toggleContract(item.type)} className="mt-1 accent-emerald-600 rounded cursor-pointer" />
              <span>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">{item.type}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{item.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" disabled={savingPrefs} onClick={() => void savePreferences()} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-60">
          {savingPrefs ? 'Saving…' : 'Save preferences'}
        </button>
      </div>

      {showPayoutAccounts && <PayoutAccountsSection notify={notify} />}
    </div>
  );
};

const PayoutAccountsSection: React.FC<{ notify: (message: string) => void }> = ({ notify }) => {
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    apiClient.getMyPayoutAccounts()
      .then(setAccounts)
      .catch((cause) => setError(apiErrorMessage(cause, 'Unable to load your payout accounts.')))
      .finally(() => setLoading(false));
  }, []);

  const run = async (action: () => Promise<PayoutAccount[]>, done: string) => {
    setError(null);
    try {
      setAccounts(await action());
      notify(done);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The change was not saved.'));
    }
  };

  return (
    <div className="pt-6 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <span>Payout bank accounts</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Where profit distributions and other payments to you are sent. The account number is stored encrypted, and a settlement officer verifies each new account before any money is paid into it.
          </p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer shrink-0">
            <Plus className="w-4 h-4" />
            <span>Add bank account</span>
          </button>
        )}
      </div>

      {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold">{error}</p>}

      {adding && (
        <AddPayoutAccountForm
          onCancel={() => setAdding(false)}
          onAdd={async (input) => {
            setError(null);
            try {
              await apiClient.addMyPayoutAccount(input);
              setAccounts(await apiClient.getMyPayoutAccounts());
              setAdding(false);
              notify('Bank account added. It will be used once a settlement officer verifies it.');
            } catch (cause) {
              setError(apiErrorMessage(cause, 'Unable to add the bank account.'));
            }
          }}
        />
      )}

      {loading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : accounts.length === 0 ? (
        !adding && <p className="text-xs text-slate-500 dark:text-slate-400">You have no payout account yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className={`p-4 rounded-2xl border space-y-3 ${account.isDefault ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/60'}`}>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">{account.provider}</span>
                    {account.isDefault && (
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-500/20">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Default
                      </span>
                    )}
                  </div>
                  {account.accountHolder && <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{account.accountHolder}</span>}
                </div>
                <button
                  type="button"
                  title="Remove account"
                  onClick={() => { if (confirm(`Remove ${account.provider} ${account.maskedReference ?? ''}?`)) void run(() => apiClient.removeMyPayoutAccount(account.id), 'Bank account removed.'); }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-700 dark:text-slate-300 font-bold">{account.maskedReference ?? '••••'}</span>
                <span className="text-slate-400 text-[11px]">{account.destinationType === 'DUITNOW_PROXY' ? 'DuitNow' : 'Bank account'}{account.currency ? ` · ${account.currency}` : ''}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                {account.status === 'VERIFIED' ? (
                  <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400"><ShieldCheck className="w-3.5 h-3.5" />Verified</span>
                ) : (
                  <span className="font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">Awaiting verification</span>
                )}
                {!account.isDefault && (
                  <button type="button" onClick={() => void run(() => apiClient.setDefaultPayoutAccount(account.id), 'Default payout account changed.')} className="font-extrabold text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer">
                    Make default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AddPayoutAccountForm: React.FC<{ onAdd: (input: NewPayoutAccount) => Promise<void>; onCancel: () => void }> = ({ onAdd, onCancel }) => {
  const [provider, setProvider] = useState('');
  const [destinationType, setDestinationType] = useState<NewPayoutAccount['destinationType']>('BANK_ACCOUNT');
  const [reference, setReference] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onAdd({ provider: provider.trim(), destinationType, reference: reference.trim(), accountHolder: accountHolder.trim() || undefined, currency, isDefault });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-slate-900 dark:text-white">New payout account</span>
        <button type="button" onClick={onCancel} title="Cancel" className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="payout-bank" className={LABEL}>Bank</label>
          <input id="payout-bank" list="payout-banks" required maxLength={40} value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. Bank Islam Malaysia" className={INPUT} />
          <datalist id="payout-banks">{BANKS.map((bank) => <option key={bank} value={bank} />)}</datalist>
        </div>
        <div>
          <label htmlFor="payout-type" className={LABEL}>Type</label>
          <select id="payout-type" value={destinationType} onChange={(e) => setDestinationType(e.target.value as NewPayoutAccount['destinationType'])} className={`${INPUT} cursor-pointer`}>
            <option value="BANK_ACCOUNT">Bank account number</option>
            <option value="DUITNOW_PROXY">DuitNow ID (phone, MyKad or business number)</option>
          </select>
        </div>
        <div>
          <label htmlFor="payout-number" className={LABEL}>{destinationType === 'DUITNOW_PROXY' ? 'DuitNow ID' : 'Account number'}</label>
          <input id="payout-number" required minLength={6} maxLength={40} inputMode="numeric" autoComplete="off" value={reference} onChange={(e) => setReference(e.target.value)} className={`${INPUT} font-mono`} />
        </div>
        <div>
          <label htmlFor="payout-holder" className={LABEL}>Account holder name</label>
          <input id="payout-holder" maxLength={120} value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="As shown by the bank" className={INPUT} />
        </div>
        <div>
          <label htmlFor="payout-currency" className={LABEL}>Currency</label>
          <select id="payout-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${INPUT} cursor-pointer`}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 self-end pb-3 cursor-pointer">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="accent-emerald-600" />
          Make this my default account
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Cancel</button>
        <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-60">
          {saving ? 'Saving…' : 'Add account'}
        </button>
      </div>
    </form>
  );
};
