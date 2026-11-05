import React, { useCallback, useEffect, useState } from 'react';
import { Landmark, Plus, Star, Trash2 } from 'lucide-react';
import { apiClient, apiErrorMessage, NewPayoutAccount, PayoutAccount } from '../../services/apiClient';
import { useT } from '../i18n';

const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3';
const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-base text-slate-900 dark:text-white';
const label = 'block text-xs font-bold text-slate-500';
const BANKS = ['Maybank Islamic', 'CIMB Islamic', 'Bank Islam Malaysia', 'Bank Muamalat', 'RHB Islamic', 'Public Islamic Bank', 'AmBank Islamic', 'Hong Leong Islamic', 'Affin Islamic', 'Alliance Islamic', 'Bank Rakyat', 'Agrobank'];
const CURRENCIES = ['MYR', 'IDR', 'TRY', 'BDT', 'EGP', 'NGN', 'PKR', 'IRR', 'USD'];

/**
 * The bank accounts profit, funding or lease proceeds are paid into, as on the website's profile: added here, then
 * verified by a settlement officer before any money is paid to them. The number is shown masked once saved.
 */
export const MobilePayoutAccounts: React.FC = () => {
  const { t, serverText } = useT();
  const [accounts, setAccounts] = useState<PayoutAccount[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<NewPayoutAccount>({ provider: '', destinationType: 'BANK_ACCOUNT', reference: '', accountHolder: '', currency: 'MYR' });

  const load = useCallback(() => {
    apiClient.getMyPayoutAccounts().then(setAccounts).catch((cause) => { setAccounts([]); setError(apiErrorMessage(cause, t('Your bank accounts could not be loaded.'))); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try { await action(); load(); } catch (cause) { setError(apiErrorMessage(cause, t('That did not go through.'))); } finally { setBusy(false); }
  };
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await apiClient.addMyPayoutAccount({ ...form, provider: form.provider.trim(), reference: form.reference.trim(), accountHolder: form.accountHolder?.trim() || undefined, isDefault: !accounts?.length });
      setAdding(false);
      setForm({ provider: '', destinationType: 'BANK_ACCOUNT', reference: '', accountHolder: '', currency: 'MYR' });
    });
  };

  return (
    <section className={card}>
      <h2 className="text-sm font-black flex items-center gap-2"><Landmark className="w-4 h-4 text-emerald-600" />{t('Bank accounts')}</h2>
      <p className="text-[11px] text-slate-500">{t('Profit and other payments are paid into your main account, once a settlement officer has verified it.')}</p>
      {!accounts && <p className="text-xs text-slate-500">{t('Loading...')}</p>}
      {accounts?.length === 0 && !adding && <p className="text-xs text-slate-500">{t('No bank account yet.')}</p>}
      {accounts?.map(account => (
        <div key={account.id} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-black flex items-center gap-1.5">{account.provider}{account.isDefault && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" aria-label={t('Main account')} />}</p>
              <p className="text-xs text-slate-500 font-mono">{account.maskedReference ?? '-'}{account.currency ? ` · ${account.currency}` : ''}</p>
              {account.accountHolder && <p className="text-[11px] text-slate-500">{account.accountHolder}</p>}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${account.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>{account.status === 'VERIFIED' ? t('Verified') : t('Waiting for verification')}</span>
          </div>
          <div className="flex gap-3 text-xs font-bold">
            {!account.isDefault && <button type="button" disabled={busy} onClick={() => void run(() => apiClient.setDefaultPayoutAccount(account.id))} className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 disabled:opacity-50"><Star className="w-3.5 h-3.5" />{t('Make it the main account')}</button>}
            <button type="button" disabled={busy} onClick={() => { if (window.confirm(t('Remove {bank} {number}?', { bank: account.provider, number: account.maskedReference ?? '' }))) void run(() => apiClient.removeMyPayoutAccount(account.id)); }} className="flex items-center gap-1 text-rose-700 dark:text-rose-300 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" />{t('Remove')}</button>
          </div>
        </div>
      ))}
      {adding ? (
        <form onSubmit={add} className="space-y-3">
          <label className={label}>{t('Bank')}
            <input required maxLength={40} list="mobile-payout-banks" value={form.provider} onChange={(event) => setForm(current => ({ ...current, provider: event.target.value }))} className={input} />
            <datalist id="mobile-payout-banks">{BANKS.map(bank => <option key={bank} value={bank} />)}</datalist>
          </label>
          <label className={label}>{t('Type')}
            <select value={form.destinationType} onChange={(event) => setForm(current => ({ ...current, destinationType: event.target.value as NewPayoutAccount['destinationType'] }))} className={input}>
              <option value="BANK_ACCOUNT">{t('Bank account')}</option>
              <option value="DUITNOW_PROXY">{t('DuitNow ID')}</option>
            </select>
          </label>
          <label className={label}>{form.destinationType === 'DUITNOW_PROXY' ? t('DuitNow ID') : t('Account number')}
            <input required minLength={6} maxLength={40} inputMode="numeric" autoComplete="off" value={form.reference} onChange={(event) => setForm(current => ({ ...current, reference: event.target.value }))} className={`${input} font-mono`} />
          </label>
          <label className={label}>{t('Account holder name')}
            <input maxLength={120} value={form.accountHolder ?? ''} onChange={(event) => setForm(current => ({ ...current, accountHolder: event.target.value }))} placeholder={t('As shown by the bank')} className={input} />
          </label>
          <label className={label}>{t('Currency')}
            <select value={form.currency} onChange={(event) => setForm(current => ({ ...current, currency: event.target.value }))} className={input}>{CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}</select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAdding(false)} className="py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-bold">{t('Cancel')}</button>
            <button type="submit" disabled={busy} className="py-3 rounded-xl bg-emerald-600 text-white text-sm font-black disabled:opacity-50">{busy ? t('Saving...') : t('Save')}</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => { setAdding(true); setError(''); }} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 text-sm font-black"><Plus className="w-4 h-4" />{t('Add a bank account')}</button>
      )}
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{serverText(error)}</p>}
    </section>
  );
};
