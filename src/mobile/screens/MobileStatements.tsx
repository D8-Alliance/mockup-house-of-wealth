import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText, Receipt } from 'lucide-react';
import { statementsApi, StatementView } from '../../services/statementsApi';
import { useT } from '../i18n';

type Kind = 'investor' | 'tax';

/**
 * The investor's statements from the ledger: holdings, orders and profit for a year, and the annual income
 * statement for their tax return. The figures show on the phone; the PDF is the copy to keep or send.
 */
export const MobileStatements: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useT();
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear - 1, thisYear - 2];
  const [kind, setKind] = useState<Kind>('investor');
  const [year, setYear] = useState(thisYear);
  const [statement, setStatement] = useState<StatementView | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setStatement(null);
    // The current year runs to today; earlier years are whole calendar years.
    const query = { from: `${year}-01-01`, to: year === thisYear ? undefined : `${year}-12-31` };
    (kind === 'investor' ? statementsApi.getInvestorStatement(query) : statementsApi.getInvestorTaxStatement({ year: String(year) }))
      .then(setStatement)
      .catch((cause) => setError(cause instanceof Error ? cause.message : t('The statement could not be generated.')))
      .finally(() => setLoading(false));
  }, [kind, year, thisYear, t]);

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      if (kind === 'investor') await statementsApi.downloadInvestorStatement({ from: `${year}-01-01`, to: year === thisYear ? undefined : `${year}-12-31`, format: 'pdf' });
      else await statementsApi.downloadInvestorTaxStatement({ year: String(year), format: 'pdf' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('The statement could not be generated.'));
    } finally {
      setDownloading(false);
    }
  };

  const profitSection = statement?.sections.find(section => section.title === 'Profit distributions in period' || section.title === 'Income received');

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Portfolio')}</button>
      <h1 className="text-lg font-black">{t('Statements')}</h1>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('Statement')}>
        {([['investor', t('Investor statement'), <FileText key="i" className="w-4 h-4" />], ['tax', t('Annual income (tax)'), <Receipt key="t" className="w-4 h-4" />]] as Array<[Kind, string, React.ReactNode]>).map(([value, label, icon]) => (
          <button key={value} type="button" role="radio" aria-checked={kind === value} onClick={() => setKind(value)} className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-black border ${kind === value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      <label className="block text-xs font-bold text-slate-500">
        {t('Year')}
        <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-sm font-bold text-slate-900 dark:text-white">
          {years.map(option => <option key={option} value={option}>{option === thisYear ? t('{year} (to date)', { year: option }) : option}</option>)}
        </select>
      </label>

      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {loading && <p className="text-sm text-slate-500">{t('Preparing the statement...')}</p>}

      {statement && (
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div>
            <p className="text-sm font-black">{kind === 'investor' ? t('Investor statement') : t('Annual income statement {year}', { year })}</p>
            <p className="text-[11px] text-slate-500 font-mono break-all">{statement.reference}</p>
            <p className="text-[11px] text-slate-500">{statement.period.from} – {statement.period.to}</p>
          </div>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {statement.summary.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-slate-500">{t(label)}</dt>
                <dd className="font-black text-right">{value}</dd>
              </div>
            ))}
          </dl>
          {profitSection && profitSection.rows.length > 0 && (
            <p className="text-[11px] text-slate-500">{t('{count} profit payment(s) are listed in the PDF.', { count: profitSection.rows.length })}</p>
          )}
          {kind === 'tax' && <p className="text-[11px] text-slate-500">{t('The platform has not withheld tax. How this income is taxed depends on each pool and your residency; confirm with a tax adviser.')}</p>}
          <button type="button" disabled={downloading} onClick={() => void download()} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 disabled:opacity-60 text-white text-sm font-black">
            <Download className="w-4 h-4" />{downloading ? t('Downloading...') : t('Download PDF')}
          </button>
        </section>
      )}
    </div>
  );
};
