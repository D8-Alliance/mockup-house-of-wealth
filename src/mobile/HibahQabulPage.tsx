import React, { useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { apiClient, HibahOffer } from '../services/apiClient';
import { LanguageToggle, useT } from './i18n';

const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-sm font-bold text-slate-900 dark:text-white';
const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);

/**
 * The hibah recipient's page, opened from the link the donor sent (/m/hibah/<token>), without signing in:
 * the recipient may have no account. They see who offers the hibah, confirm who they are with the last four
 * characters of their ID and their name (or a guardian answers for a minor), and accept or decline (qabul).
 */
export const HibahQabulPage: React.FC<{ token: string }> = ({ token }) => {
  const { t, locale } = useT();
  const [offer, setOffer] = useState<HibahOffer | null>(null);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [last4, setLast4] = useState('');
  const [asGuardian, setAsGuardian] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'ACCEPTED' | 'DECLINED' | null>(null);

  useEffect(() => { apiClient.getHibahOffer(token).then(setOffer).catch((cause) => setError(errorText(cause, t('This link is not valid or has expired.')))); }, [token, t]);
  const answer = async (decision: 'ACCEPT' | 'DECLINE') => {
    setBusy(true);
    setError('');
    try { const result = await apiClient.answerHibah(token, { decision, fullName: fullName.trim(), identityLast4: last4.trim(), asGuardian }); setDone(result.status); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(false); }
  };
  const ready = fullName.trim().length >= 3 && /^[A-Za-z0-9]{4}$/.test(last4.trim());
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <header className="flex items-center gap-2.5 px-4 py-3 bg-emerald-950 text-white">
        <img src="/wealth-pooling-logo.svg" alt="" className="w-8 h-8 rounded-full bg-white p-0.5" />
        <p className="flex-1 text-sm font-black">Wealth Pooling D-8</p>
        <LanguageToggle />
      </header>
      <main className="px-4 py-5 space-y-4 max-w-md mx-auto">
        <h1 className="text-lg font-black flex items-center gap-2"><HeartHandshake className="w-5 h-5 text-emerald-600" />{t('A hibah for you')}</h1>
        {!offer && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
        {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}

        {offer && !done && offer.status !== 'AWAITING' && <p className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-sm font-bold">{t('This hibah has already been answered.')}</p>}

        {offer && !done && offer.status === 'AWAITING' && (
          <>
            <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-sm">
              <p>{t('{donor} offers {recipient} a hibah of {share} of their investments on Wealth Pooling.', { donor: offer.donorName, recipient: offer.recipientName, share: offer.allocationPercent !== null ? `${offer.allocationPercent}%` : t('a share') })}</p>
              <p className="text-xs text-slate-500">{t('Offered (ijab) on {date}. Answer by {expires}.', { date: date(offer.ijabAt), expires: date(offer.expiresAt) })}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{t('A hibah amanah is a gift: the donor keeps the investments in trust during their lifetime, and they pass to you as the donor set out. It takes effect only if you accept it (qabul). You pay nothing for it.')}</p>
            </section>

            <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <label className="flex items-start gap-2 text-xs font-bold"><input type="checkbox" checked={asGuardian} onChange={(event) => setAsGuardian(event.target.checked)} className="mt-0.5 w-4 h-4" />{t('I answer as the guardian (wali) of {recipient}, who is a minor.', { recipient: offer.recipientName })}</label>
              <label className="block text-xs font-bold text-slate-500">{asGuardian ? t("The guardian's full name") : t('Your full name, as on your ID')}<input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" className={input} /></label>
              <label className="block text-xs font-bold text-slate-500">{t('Last four characters of {recipient}\'s ID number', { recipient: offer.recipientName })}<input value={last4} onChange={(event) => setLast4(event.target.value.slice(0, 4))} inputMode="text" autoComplete="off" className={input} /></label>
              <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-0.5 w-4 h-4" />{t('I understand that my answer is final and is recorded with the date and time.')}</label>
              <button type="button" disabled={busy || !ready || !understood} onClick={() => answer('ACCEPT')} className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-50">{t('I accept the hibah (qabul)')}</button>
              <button type="button" disabled={busy || !ready || !understood} onClick={() => answer('DECLINE')} className="w-full rounded-xl border border-slate-300 dark:border-slate-600 py-3 text-sm font-black disabled:opacity-50">{t('I decline the hibah')}</button>
            </section>
          </>
        )}

        {done && (
          <p className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-4 text-sm font-bold text-emerald-800 dark:text-emerald-200">
            {done === 'ACCEPTED' ? t('Thank you. Your acceptance (qabul) is recorded and the donor has been told.') : t('Your answer is recorded and the donor has been told.')}
          </p>
        )}
      </main>
    </div>
  );
};
