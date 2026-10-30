import React, { useEffect, useState } from 'react';
import { ArrowLeft, Coins, ExternalLink } from 'lucide-react';
import { PlatformInvestmentMethod, YearBasis, ZakatAuthority, zakatApi, ZakatCalculationResult } from '../../services/zakatApi';
import { useT } from '../i18n';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

/**
 * An opt-in zakat estimate on the phone, as on the website: the state authority's nisab, savings that have
 * completed a haul, income, debts, and the person's platform investments by the method their authority uses.
 * Zakat is paid to the authority's official channel; the platform does not collect it.
 */
export const MobileZakat: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t, locale } = useT();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [authorities, setAuthorities] = useState<ZakatAuthority[]>([]);
  const [authorityCode, setAuthorityCode] = useState('');
  const [yearBasis, setYearBasis] = useState<YearBasis>('HIJRI');
  const [platformMethod, setPlatformMethod] = useState<PlatformInvestmentMethod>('MUSTAGHALLAT');
  const [savings, setSavings] = useState('');
  const [savingsHaul, setSavingsHaul] = useState(true);
  const [income, setIncome] = useState('');
  const [debts, setDebts] = useState('');
  const [nisabOverride, setNisabOverride] = useState('');
  const [needsNisab, setNeedsNisab] = useState(false);
  const [result, setResult] = useState<ZakatCalculationResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const money = (value: number, currency = 'MYR') => { try { return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); } catch { return `${currency} ${value.toFixed(2)}`; } };

  useEffect(() => {
    zakatApi.getPreference().then((preference) => setEnabled(preference.enabled)).catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    zakatApi.getAuthorities().then((rows) => {
      setAuthorities(rows);
      setAuthorityCode((current) => current || rows.find((row) => row.isHomeCountry)?.code || rows[0]?.code || '');
    }).catch((cause: Error) => setError(cause.message));
    zakatApi.latest().then((latest) => latest && setResult(latest)).catch(() => undefined);
  }, [enabled]);

  const toggle = async (value: boolean) => {
    setError('');
    try { setEnabled((await zakatApi.setPreference(value)).enabled); } catch (cause) { setError(cause instanceof Error ? cause.message : t('The setting was not saved.')); }
  };

  const calculate = async () => {
    setBusy(true);
    setError('');
    try {
      const items = [
        { category: 'SAVINGS' as const, label: 'Savings and cash', amount: Number(savings) || 0, haulMet: savingsHaul },
        { category: 'INCOME' as const, label: 'Employment or other income', amount: Number(income) || 0 },
      ].filter(item => item.amount > 0);
      setResult(await zakatApi.calculate({ authorityCode, asOfDate: today(), yearBasis, platformInvestments: platformMethod, items, debts: Number(debts) || 0, ...(nisabOverride ? { nisabOverride: Number(nisabOverride) } : {}) }));
      setNeedsNisab(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t('Zakat could not be calculated.');
      setError(message);
      if (/No nisab is recorded/i.test(message)) setNeedsNisab(true);
    } finally {
      setBusy(false);
    }
  };

  const field = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-sm font-bold text-slate-900 dark:text-white';
  const back = <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Portfolio')}</button>;

  if (enabled === null) return <div className="space-y-4">{back}<p className="text-sm text-slate-500">{t('Loading...')}</p></div>;

  if (!enabled) {
    return (
      <div className="space-y-4">
        {back}
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h1 className="text-lg font-black flex items-center gap-2"><Coins className="w-5 h-5 text-emerald-600" />{t('Zakat tools')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("Zakat tools are optional. When turned on, you can estimate zakat on your savings, income and platform investments with your state zakat authority's nisab, and find its official payment channel.")}</p>
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          <button type="button" onClick={() => void toggle(true)} className="w-full py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black">{t('Turn on zakat tools')}</button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {back}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-black">{t('Zakat estimate')}</h1>
        <button type="button" onClick={() => void toggle(false)} className="text-[11px] text-slate-500 underline">{t('Turn off')}</button>
      </div>

      {result && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-5 shadow space-y-3">
          <div>
            <p className="text-xs text-emerald-100/80">{t('Zakat due')}{result.asOfDate ? ` · ${result.asOfDate}` : ''}</p>
            <p className="text-2xl font-black text-amber-200">{money(result.zakatDue, result.currency)}</p>
            <p className="text-xs text-emerald-100/80">{result.meetsNisab ? t('Your zakatable wealth reaches the nisab.') : t('Your zakatable wealth is below the nisab, so no zakat is due.')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="block text-emerald-100/70">{t('Net zakatable wealth')}</span><span className="font-black">{money(result.netWealth, result.currency)}</span></div>
            <div><span className="block text-emerald-100/70">{t('Nisab')}</span><span className="font-black">{money(result.nisabThreshold, result.currency)}</span></div>
          </div>
          {result.lines.length > 0 && (
            <ul className="text-xs space-y-1 border-t border-white/15 pt-2">
              {result.lines.map((line, index) => (
                <li key={`${line.category}-${index}`} className={`flex justify-between gap-2 ${line.included ? '' : 'opacity-60 line-through'}`}>
                  <span className="truncate">{t(line.label)}{line.source === 'PLATFORM' ? ` (${t('platform')})` : ''}</span>
                  <span className="font-bold shrink-0">{money(line.amount, result.currency)}</span>
                </li>
              ))}
            </ul>
          )}
          {result.authority && result.zakatDue > 0 && (
            <a href={result.payment.url || result.authority.website} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 w-full py-3 rounded-2xl bg-amber-300 text-emerald-950 text-sm font-black">
              {t('Pay at {authority}', { authority: result.authority.name })}<ExternalLink className="w-4 h-4" />
            </a>
          )}
          <p className="text-[11px] text-emerald-100/70">{t("Keep the authority's official receipt: individuals can claim it as a tax rebate. This is an estimate; your authority's assessment prevails.")}</p>
        </section>
      )}

      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <p className="text-sm font-black">{result ? t('Calculate again') : t('Calculate my zakat')}</p>
        <label className="block text-xs font-bold text-slate-500">{t('Zakat authority')}
          <select value={authorityCode} onChange={(event) => setAuthorityCode(event.target.value)} className={field}>
            {authorities.map((row) => <option key={row.code} value={row.code}>{row.region}: {row.name}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-500">{t('Year basis')}
          <select value={yearBasis} onChange={(event) => setYearBasis(event.target.value as YearBasis)} className={field}>
            <option value="HIJRI">{t('Hijri year (2.5%)')}</option>
            <option value="GREGORIAN">{t('Gregorian year (2.577%)')}</option>
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-500">{t('Savings and cash')}
          <input type="number" inputMode="decimal" min={0} value={savings} onChange={(event) => setSavings(event.target.value)} placeholder="0.00" className={field} />
        </label>
        <label className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
          <input type="checkbox" className="mt-0.5 w-5 h-5 shrink-0" checked={savingsHaul} onChange={(event) => setSavingsHaul(event.target.checked)} />
          {t('My savings have stayed at or above the nisab for a full year (haul).')}
        </label>
        <label className="block text-xs font-bold text-slate-500">{t('Employment or other income this year')}
          <input type="number" inputMode="decimal" min={0} value={income} onChange={(event) => setIncome(event.target.value)} placeholder="0.00" className={field} />
        </label>
        <label className="block text-xs font-bold text-slate-500">{t('Debts due now')}
          <input type="number" inputMode="decimal" min={0} value={debts} onChange={(event) => setDebts(event.target.value)} placeholder="0.00" className={field} />
        </label>
        <label className="block text-xs font-bold text-slate-500">{t('My investments on this platform')}
          <select value={platformMethod} onChange={(event) => setPlatformMethod(event.target.value as PlatformInvestmentMethod)} className={field}>
            <option value="MUSTAGHALLAT">{t('Count the profit I received (al-mustaghallat)')}</option>
            <option value="CAPITAL">{t('Count capital held a full year, plus profit')}</option>
            <option value="NONE">{t('Leave them out')}</option>
          </select>
        </label>
        {needsNisab && (
          <label className="block text-xs font-bold text-slate-500">{t("Nisab today, from your authority's website")}
            <input type="number" inputMode="decimal" min={0} value={nisabOverride} onChange={(event) => setNisabOverride(event.target.value)} className={field} />
          </label>
        )}
        {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
        <button type="button" disabled={busy || !authorityCode} onClick={() => void calculate()} className="w-full py-3.5 rounded-2xl bg-emerald-600 disabled:opacity-50 text-white text-sm font-black">{busy ? t('Calculating...') : t('Calculate')}</button>
      </section>
    </div>
  );
};
