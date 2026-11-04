import React, { useState } from 'react';
import { CheckCircle2, FileUp } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useT } from './i18n';

const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm';
const LABEL = 'block text-xs font-bold text-slate-600 dark:text-slate-300';

/**
 * /m/estate/report: an executor or beneficiary reports a member's death, without signing in. They give the
 * deceased's ID number and name, their own name and the last four characters of their own ID as the member recorded
 * them, and the death certificate. The answer is the same whatever the details, so it cannot be used to look people up.
 */
export const DeathReportPage: React.FC = () => {
  const { t } = useT();
  const [form, setForm] = useState({ deceasedIdNumber: '', deceasedName: '', dateOfDeath: '', reporterName: '', reporterIdLast4: '', reporterRelation: '', reporterEmail: '', reporterPhone: '' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return setError(t('Attach the death certificate (PDF, JPG or PNG).'));
    setBusy(true);
    setError('');
    try {
      const result = await apiClient.reportDeath(form, file);
      setDone(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('The report could not be sent.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-4 py-8">
      <div className="max-w-md mx-auto space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Wealth Pooling</p>
          <h1 className="text-2xl font-black">{t('Report a death')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('For the executor, administrator or a beneficiary of a member who has passed away. An estate officer checks the death certificate and contacts you. Our condolences.')}</p>
        </div>
        {done ? (
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 space-y-2">
            <p className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-200"><CheckCircle2 className="w-5 h-5" />{t('Report sent')}</p>
            <p className="text-sm text-emerald-900 dark:text-emerald-100">{done}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-black uppercase text-slate-400">{t('The member who passed away')}</p>
            <label className={LABEL}>{t('Their ID or passport number')}<input required value={form.deceasedIdNumber} onChange={set('deceasedIdNumber')} className={`${INPUT} mt-1`} /></label>
            <label className={LABEL}>{t('Their full name')}<input required value={form.deceasedName} onChange={set('deceasedName')} className={`${INPUT} mt-1`} /></label>
            <label className={LABEL}>{t('Date of death')}<input required type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfDeath} onChange={set('dateOfDeath')} className={`${INPUT} mt-1`} /></label>
            <p className="text-xs font-black uppercase text-slate-400 pt-2">{t('You')}</p>
            <label className={LABEL}>{t('Your full name')}<input required value={form.reporterName} onChange={set('reporterName')} className={`${INPUT} mt-1`} /></label>
            <label className={LABEL}>{t('Last four characters of your ID number')}<input required maxLength={4} value={form.reporterIdLast4} onChange={set('reporterIdLast4')} className={`${INPUT} mt-1 font-mono`} /></label>
            <label className={LABEL}>{t('Your relation to them')}<input required value={form.reporterRelation} onChange={set('reporterRelation')} placeholder={t('e.g. Son, executor')} className={`${INPUT} mt-1`} /></label>
            <label className={LABEL}>{t('Your email (optional)')}<input type="email" value={form.reporterEmail} onChange={set('reporterEmail')} className={`${INPUT} mt-1`} /></label>
            <label className={LABEL}>{t('Your phone (optional)')}<input value={form.reporterPhone} onChange={set('reporterPhone')} className={`${INPUT} mt-1`} /></label>
            <label className="flex items-center gap-2 px-3 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm cursor-pointer">
              <FileUp className="w-4 h-4 text-emerald-600" />
              <span className="truncate">{file ? file.name : t('Death certificate (PDF, JPG or PNG)')}</span>
              <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
            {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>}
            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-black disabled:opacity-50">{busy ? t('Sending…') : t('Send report')}</button>
            <p className="text-[11px] text-slate-400">{t('Your details are used only to handle this estate and are kept with the case.')}</p>
          </form>
        )}
      </div>
    </div>
  );
};
