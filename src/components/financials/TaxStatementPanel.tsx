import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, Landmark } from 'lucide-react';
import { StatementFormat, statementsApi, taxApi, TaxProfile } from '../../services/statementsApi';

const thisYear = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).slice(0, 4);

/**
 * Tax details the user declares, and the annual income statement for their tax return.
 * Available to every user, whatever their religion; it reports income and does not compute tax.
 */
export const TaxStatementPanel: React.FC = () => {
  const [profile, setProfile] = useState<TaxProfile | null>(null);
  const [residenceCountry, setResidenceCountry] = useState('MY');
  const [resident, setResident] = useState(true);
  const [entityType, setEntityType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [taxId, setTaxId] = useState('');
  const [year, setYear] = useState(thisYear());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    taxApi.getProfile().then((saved) => {
      if (!saved) return;
      setProfile(saved);
      setResidenceCountry(saved.residenceCountry);
      setResident(saved.malaysianTaxResident);
      setEntityType(saved.entityType);
    }).catch(() => undefined);
  }, []);

  const save = async () => {
    setBusy('save'); setError(''); setMessage('');
    try {
      // An empty field keeps the stored tax number.
      const saved = await taxApi.setProfile({ residenceCountry: residenceCountry.toUpperCase(), malaysianTaxResident: resident, entityType, ...(taxId.trim() ? { taxIdNumber: taxId.trim() } : {}) });
      setProfile(saved); setTaxId(''); setMessage('Tax details saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tax details could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  const download = async (format: StatementFormat) => {
    setBusy(format); setError(''); setMessage('');
    try { await statementsApi.downloadInvestorTaxStatement({ year, format }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'The statement could not be generated.'); } finally { setBusy(null); }
  };

  const input = 'p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white';
  const years = Array.from({ length: 5 }, (_, index) => String(Number(thisYear()) - index));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Landmark className="w-5 h-5 text-sky-500" /> Annual income statement (for tax)</h3>
        <p className="text-xs text-slate-500 mt-1">Investment income paid out to you in a calendar year, grouped by type, with capital invested listed separately. It does not calculate tax; the platform has not withheld any.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <label className="space-y-1"><span className="block font-bold text-slate-600 dark:text-slate-300">Tax residence (country code)</span><input value={residenceCountry} maxLength={2} onChange={(event) => setResidenceCountry(event.target.value.toUpperCase())} className={`w-full ${input}`} /></label>
        <label className="space-y-1"><span className="block font-bold text-slate-600 dark:text-slate-300">Entity</span>
          <select value={entityType} onChange={(event) => setEntityType(event.target.value as 'INDIVIDUAL' | 'COMPANY')} className={`w-full ${input}`}><option value="INDIVIDUAL">Individual</option><option value="COMPANY">Company</option></select>
        </label>
        <label className="space-y-1 md:col-span-2"><span className="block font-bold text-slate-600 dark:text-slate-300">Tax number (TIN){profile?.taxIdNumber ? `: saved ${profile.taxIdNumber}` : ''}</span><input value={taxId} onChange={(event) => setTaxId(event.target.value)} placeholder={profile?.taxIdNumber ? 'Leave empty to keep the saved number' : 'e.g. IG12345678090'} className={`w-full ${input}`} /></label>
        <label className="flex items-center gap-2 md:col-span-3 font-bold text-slate-700 dark:text-slate-300"><input type="checkbox" checked={resident} onChange={(event) => setResident(event.target.checked)} /> I am a Malaysian tax resident for this year</label>
        <button onClick={() => void save()} disabled={busy !== null || residenceCountry.length !== 2} className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-bold disabled:opacity-50">{busy === 'save' ? 'Saving…' : 'Save tax details'}</button>
      </div>

      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label className="space-y-1"><span className="block font-bold text-slate-600 dark:text-slate-300">Year</span>
          <select value={year} onChange={(event) => setYear(event.target.value)} className={input}>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        </label>
        <button onClick={() => void download('pdf')} disabled={busy !== null} className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-2 disabled:opacity-50"><FileText className="w-4 h-4" /> {busy === 'pdf' ? 'Generating…' : 'Download PDF'}</button>
        <button onClick={() => void download('csv')} disabled={busy !== null} className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-700 text-white font-bold flex items-center gap-2 disabled:opacity-50"><FileSpreadsheet className="w-4 h-4" /> {busy === 'csv' ? 'Generating…' : 'Download CSV'}</button>
      </div>
      {message && <p className="text-xs text-emerald-600 font-semibold">{message}</p>}
      {error && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</div>}
      <p className="text-[11px] text-slate-400">How this income is taxed depends on each pool's legal structure and your residency. Confirm with a tax adviser.</p>
    </div>
  );
};
