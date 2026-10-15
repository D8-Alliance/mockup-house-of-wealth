import React, { useEffect, useState } from 'react';
import { Coins, ExternalLink, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { CalculateZakatInput, PlatformInvestmentMethod, YearBasis, ZakatAuthority, zakatApi, ZakatCalculationResult, ZakatCategory } from '../../services/zakatApi';

const CATEGORY_OPTIONS: Array<{ value: ZakatCategory; label: string; haul: boolean }> = [
  { value: 'SAVINGS', label: 'Savings and cash', haul: true },
  { value: 'INCOME', label: 'Employment or other income', haul: false },
  { value: 'INVESTMENT_INCOME', label: 'Other investment income (profit, dividends, rent)', haul: false },
  { value: 'INVESTMENT_CAPITAL', label: 'Other investment capital (shares, funds)', haul: true },
  { value: 'BUSINESS', label: 'Business assets (stock, receivables)', haul: true },
];

interface Item { category: ZakatCategory; label: string; amount: string; haulMet: boolean }

const money = (value: number, currency = 'MYR') => `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

/**
 * Opt-in zakat estimate: the user's state authority and the nisab recorded for the date,
 * haul per category, and their platform investments counted by the method their authority
 * uses. Payment goes to the authority's official channel, not to the platform.
 */
export const ZakatCalculatorCard: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [authorities, setAuthorities] = useState<ZakatAuthority[]>([]);
  const [authorityCode, setAuthorityCode] = useState('');
  const [asOfDate, setAsOfDate] = useState(today());
  const [yearBasis, setYearBasis] = useState<YearBasis>('HIJRI');
  const [platformMethod, setPlatformMethod] = useState<PlatformInvestmentMethod>('MUSTAGHALLAT');
  const [items, setItems] = useState<Item[]>([{ category: 'SAVINGS', label: 'Bank savings', amount: '', haulMet: true }]);
  const [debts, setDebts] = useState('');
  const [nisabOverride, setNisabOverride] = useState('');
  const [result, setResult] = useState<ZakatCalculationResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
    try { setEnabled((await zakatApi.setPreference(value)).enabled); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the preference.'); }
  };

  const calculate = async () => {
    setBusy(true);
    setError('');
    try {
      const input: CalculateZakatInput = {
        authorityCode,
        asOfDate,
        yearBasis,
        platformInvestments: platformMethod,
        items: items.filter((item) => Number(item.amount) > 0).map((item) => ({ category: item.category, label: item.label, amount: Number(item.amount), haulMet: item.haulMet })),
        debts: Number(debts) || 0,
        ...(nisabOverride ? { nisabOverride: Number(nisabOverride) } : {}),
      };
      setResult(await zakatApi.calculate(input));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Zakat could not be calculated.');
    } finally {
      setBusy(false);
    }
  };

  const setItem = (index: number, patch: Partial<Item>) => setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const authority = authorities.find((row) => row.code === authorityCode);
  const recordedNisab = authority?.nisabRates.find((rate) => rate.effectiveFrom.slice(0, 10) <= asOfDate && rate.effectiveTo.slice(0, 10) >= asOfDate);
  const input = 'p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white';

  if (enabled === null) return <div className="p-6 text-sm text-slate-500">Loading…</div>;

  if (!enabled) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-3 max-w-2xl">
        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Coins className="w-5 h-5 text-emerald-500" /> Zakat tools</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">Zakat tools are optional. When turned on, you can estimate zakat on your savings, income, business assets and platform investments using your state zakat authority's nisab, and find its official payment channel. Tax statements are available to everyone under Statements.</p>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <button onClick={() => void toggle(true)} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">Turn on zakat tools</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Zakat estimate</h3>
            <p className="text-xs text-slate-500">Using your state authority's nisab, haul rules and your platform investments.</p>
          </div>
          <button onClick={() => void toggle(false)} className="text-[11px] text-slate-400 hover:text-slate-600 underline">Turn off zakat tools</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <label className="space-y-1 md:col-span-2"><span className="block font-bold text-slate-700 dark:text-slate-300">Zakat authority</span>
            <select value={authorityCode} onChange={(event) => setAuthorityCode(event.target.value)} className={`w-full ${input}`}>
              {authorities.map((row) => <option key={row.code} value={row.code}>{row.region}: {row.name}</option>)}
            </select>
          </label>
          <label className="space-y-1"><span className="block font-bold text-slate-700 dark:text-slate-300">Calculation date</span>
            <input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} className={`w-full ${input}`} />
          </label>
          <label className="space-y-1"><span className="block font-bold text-slate-700 dark:text-slate-300">Year basis</span>
            <select value={yearBasis} onChange={(event) => setYearBasis(event.target.value as YearBasis)} className={`w-full ${input}`}>
              <option value="HIJRI">Hijri year (2.5%)</option>
              <option value="GREGORIAN">Gregorian year (2.577%)</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-2"><span className="block font-bold text-slate-700 dark:text-slate-300">My platform investments</span>
            <select value={platformMethod} onChange={(event) => setPlatformMethod(event.target.value as PlatformInvestmentMethod)} className={`w-full ${input}`}>
              <option value="MUSTAGHALLAT">Profit received only (al-mustaghallat)</option>
              <option value="CAPITAL">Capital held a full haul, plus profit (zakat saham method)</option>
              <option value="NONE">Leave out</option>
            </select>
          </label>
        </div>
        <p className="text-[11px] text-slate-500">
          Nisab: {recordedNisab ? `${money(Number(recordedNisab.amount), recordedNisab.currency)} (${recordedNisab.source})` : 'none recorded for this authority and date. Enter the nisab from the authority\'s website below.'}
          {' '}Which investment method applies is decided by your authority; check before paying.
        </p>

        <div className="space-y-2">
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Other assets and income</span>
          {items.map((item, index) => {
            const option = CATEGORY_OPTIONS.find((candidate) => candidate.value === item.category)!;
            return (
              <div key={index} className="grid grid-cols-12 gap-2 items-center text-xs">
                <select value={item.category} onChange={(event) => setItem(index, { category: event.target.value as ZakatCategory })} className={`col-span-4 ${input}`}>
                  {CATEGORY_OPTIONS.map((candidate) => <option key={candidate.value} value={candidate.value}>{candidate.label}</option>)}
                </select>
                <input value={item.label} onChange={(event) => setItem(index, { label: event.target.value })} placeholder="Description" className={`col-span-3 ${input}`} />
                <input type="number" min={0} value={item.amount} onChange={(event) => setItem(index, { amount: event.target.value })} placeholder="Amount (MYR)" className={`col-span-2 ${input}`} />
                <label className={`col-span-2 flex items-center gap-1 ${option.haul ? '' : 'opacity-40'}`} title="Owned for a full year">
                  <input type="checkbox" disabled={!option.haul} checked={option.haul && item.haulMet} onChange={(event) => setItem(index, { haulMet: event.target.checked })} /> Full haul
                </label>
                <button onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="col-span-1 p-1.5 text-slate-400 hover:text-rose-500" title="Remove"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
          <button onClick={() => setItems((current) => [...current, { category: 'SAVINGS', label: '', amount: '', haulMet: true }])} className="text-xs font-bold text-emerald-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add item</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="space-y-1"><span className="block font-bold text-slate-700 dark:text-slate-300">Debts due now (MYR)</span><input type="number" min={0} value={debts} onChange={(event) => setDebts(event.target.value)} className={`w-full ${input}`} /></label>
          {!recordedNisab && <label className="space-y-1"><span className="block font-bold text-slate-700 dark:text-slate-300">Nisab from the authority (MYR)</span><input type="number" min={1} value={nisabOverride} onChange={(event) => setNisabOverride(event.target.value)} className={`w-full ${input}`} /></label>}
        </div>

        {error && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</div>}
        <button onClick={() => void calculate()} disabled={busy || !authorityCode} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">{busy ? 'Calculating…' : 'Calculate zakat'}</button>
      </div>

      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Result</h4>
        {result ? (
          <>
            <div>
              <span className="text-xs text-slate-400 block">Zakat due{result.asOfDate ? ` on ${result.asOfDate}` : ''}</span>
              <span className="text-3xl font-black text-amber-400">{money(result.zakatDue, result.currency)}</span>
              <span className="block text-[11px] text-slate-400 mt-1">{result.meetsNisab ? `Net zakatable ${money(result.netWealth, result.currency)} at ${(result.zakatRate * 100).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}%` : `Below nisab of ${money(result.nisabThreshold, result.currency)}: no zakat due.`}</span>
            </div>
            <ul className="space-y-1.5 text-[11px]">
              {result.lines.map((line, index) => (
                <li key={index} className={line.included ? 'text-slate-200' : 'text-slate-500 line-through'} title={line.note}>
                  {line.label}: {money(line.amount, result.currency)}{line.source === 'PLATFORM' ? ' (platform)' : ''}{!line.included ? ` (${line.note})` : ''}
                </li>
              ))}
              {result.debtsOwed > 0 && <li className="text-slate-300">Less debts: {money(result.debtsOwed, result.currency)}</li>}
            </ul>
            <p className="text-[10px] text-slate-400">Nisab {money(result.nisabThreshold, result.currency)}: {result.nisabSource}</p>
            {result.authority && result.zakatDue > 0 && (
              <a href={result.authority.website} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2">
                Pay at {result.authority.name} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {result.taxNote && <p className="text-[11px] text-emerald-300 flex gap-1.5"><ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {result.taxNote}</p>}
            <p className="text-[10px] text-slate-500">{result.disclaimer}</p>
          </>
        ) : <p className="text-xs text-slate-400">Fill in your assets and calculate.</p>}
      </div>
    </div>
  );
};
