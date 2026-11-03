import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { apiClient, AssetLeaseView } from '../../services/apiClient';
import { useT } from '../i18n';

type View = 'monthly' | 'yearly' | 'tenants';

const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4';
// Status colours carry their meaning (received, overdue, still to come) and always come with a label.
const RECEIVED = 'bg-emerald-500';
const OVERDUE = 'bg-rose-500';
const UPCOMING = 'bg-slate-300 dark:bg-slate-600';
const DAY_MS = 86_400_000;

interface Month { key: string; expected: number; received: number; overdue: number; upcoming: number; rows: Array<{ tenant: string; unit: string; amount: number; status: string; paidAt: string | null }> }

/**
 * The owner's rent across all leases: month by month for a year (expected against received, and what is late),
 * year by year with the collection rate, and by tenant, with how late each pays on average and how to reach them.
 * Worked out from the lease schedules the server already gives.
 */
export const LeaseReport: React.FC = () => {
  const { t, locale } = useT();
  const [leases, setLeases] = useState<AssetLeaseView[] | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  useEffect(() => { apiClient.getLeases().then(rows => setLeases(rows.filter(lease => lease.myParty === 'OWNER' && ['APPROVED', 'ENDED'].includes(lease.status)))).catch((cause) => setError(cause instanceof Error ? cause.message : t('Leases could not be loaded.'))); }, [t]);
  const currency = leases?.[0]?.currency ?? 'MYR';
  const money = (amount: number) => `${currency === 'MYR' ? 'RM' : currency} ${Math.round(amount).toLocaleString(locale)}`;
  const monthName = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString(locale, { month: 'short' });

  const data = useMemo(() => {
    const all = (leases ?? []).flatMap(lease => lease.payments.map(payment => ({ ...payment, lease })));
    const years = [...new Set(all.map(payment => Number(payment.period.slice(0, 4))))].sort((a, b) => b - a);
    const months: Month[] = Array.from({ length: 12 }, (_, index) => {
      const key = `${year}-${String(index + 1).padStart(2, '0')}`;
      const rows = all.filter(payment => payment.period === key);
      const sum = (status: string) => rows.filter(row => row.status === status).reduce((total, row) => total + row.amount, 0);
      return {
        key, expected: rows.reduce((total, row) => total + row.amount, 0), received: sum('PAID'), overdue: sum('OVERDUE'), upcoming: sum('DUE'),
        rows: rows.map(row => ({ tenant: row.lease.tenantOrganisationName ?? '-', unit: `${row.lease.unit.label}, ${row.lease.asset.name}`, amount: row.amount, status: row.status, paidAt: row.paidAt })),
      };
    });
    const yearly = years.map(y => {
      const rows = all.filter(payment => payment.period.startsWith(`${y}-`));
      const received = rows.filter(row => row.status === 'PAID').reduce((total, row) => total + row.amount, 0);
      const overdue = rows.filter(row => row.status === 'OVERDUE').reduce((total, row) => total + row.amount, 0);
      const upcoming = rows.filter(row => row.status === 'DUE').reduce((total, row) => total + row.amount, 0);
      // Collected out of what has fallen due; months still to come do not count against it.
      const dueSoFar = received + overdue;
      return { year: y, expected: received + overdue + upcoming, received, overdue, upcoming, rate: dueSoFar ? Math.round((received / dueSoFar) * 100) : null };
    });
    const byTenant = new Map<string, { tenant: string; leases: AssetLeaseView[] }>();
    for (const lease of leases ?? []) {
      const key = lease.tenantOrganisationName ?? lease.id;
      byTenant.set(key, { tenant: key, leases: [...(byTenant.get(key)?.leases ?? []), lease] });
    }
    const today = new Date().toISOString().slice(0, 10);
    const tenants = [...byTenant.values()].map(({ tenant, leases: own }) => {
      const payments = own.flatMap(lease => lease.payments);
      const paid = payments.filter(payment => payment.status === 'PAID');
      const late = paid.filter(payment => payment.paidAt).map(payment => Math.max(0, Math.round((Date.parse(payment.paidAt!) - Date.parse(payment.dueDate)) / DAY_MS)));
      const running = own.filter(lease => lease.status === 'APPROVED' && lease.endDate >= today);
      const monthsLeft = running.length ? Math.max(...running.map(lease => Math.max(0, Math.round((Date.parse(lease.endDate) - Date.parse(today)) / (30.44 * DAY_MS))))) : 0;
      return {
        tenant, units: own.map(lease => `${lease.unit.label}, ${lease.asset.name}`), monthlyRent: running.reduce((total, lease) => total + lease.monthlyRent, 0),
        paid: paid.reduce((total, payment) => total + payment.amount, 0), overdue: payments.filter(payment => payment.status === 'OVERDUE').reduce((total, payment) => total + payment.amount, 0),
        averageDaysLate: late.length ? Math.round(late.reduce((total, days) => total + days, 0) / late.length) : null,
        monthsLeft, endsOn: running.map(lease => lease.endDate).sort().at(-1) ?? null, contact: own.find(lease => lease.counterparty)?.counterparty ?? null,
      };
    }).sort((a, b) => b.overdue - a.overdue || b.monthlyRent - a.monthlyRent);
    return { years: years.length ? years : [year], months, yearly, tenants };
  }, [leases, year]);

  if (error) return <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>;
  if (!leases) return <p className="text-sm text-slate-500">{t('Loading...')}</p>;
  if (leases.length === 0) return <p className="text-xs text-slate-500">{t('No approved lease yet: the report starts with the first approved lease.')}</p>;

  const max = Math.max(1, ...data.months.map(month => month.expected));
  const totals = data.months.reduce((sum, month) => ({ expected: sum.expected + month.expected, received: sum.received + month.received, overdue: sum.overdue + month.overdue }), { expected: 0, received: 0, overdue: 0 });
  const legend = (
    <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-300">
      <span className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-sm ${RECEIVED}`} />{t('Received')}</span>
      <span className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-sm ${OVERDUE}`} />{t('Overdue')}</span>
      <span className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-sm ${UPCOMING}`} />{t('Still to come')}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5" role="tablist">
        {([['monthly', t('Monthly')], ['yearly', t('Yearly')], ['tenants', t('By tenant')]] as Array<[View, string]>).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => setView(value)} className={`py-2 rounded-xl text-xs font-black border ${view === value ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white' : 'border-slate-300 dark:border-slate-600'}`}>{label}</button>
        ))}
      </div>

      {view === 'monthly' && (
        <>
          <div className="flex items-center justify-between">
            <select value={year} onChange={(event) => { setYear(Number(event.target.value)); setOpenMonth(null); }} className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-black">
              {[...new Set([year, ...data.years])].sort((a, b) => b - a).map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <p className="text-[11px] text-slate-500 text-right">{t('{received} of {expected} received', { received: money(totals.received), expected: money(totals.expected) })}</p>
          </div>
          <section className={`${card} space-y-3`}>
            <h2 className="text-sm font-black">{t('Rent by month, {year}', { year })}</h2>
            {legend}
            <div className="flex items-end gap-1 h-36" role="img" aria-label={t('Rent by month, {year}', { year })}>
              {data.months.map(month => (
                <button key={month.key} type="button" onClick={() => setOpenMonth(openMonth === month.key ? null : month.key)} aria-label={`${monthName(month.key)}: ${money(month.received)} / ${money(month.expected)}`} className={`flex-1 h-full flex flex-col justify-end items-stretch gap-1 rounded-md ${openMonth === month.key ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                  <span className="flex flex-col-reverse rounded-t-[4px] overflow-hidden gap-[2px]" style={{ height: `${(month.expected / max) * 100}%` }}>
                    {month.received > 0 && <span className={RECEIVED} style={{ flexGrow: month.received }} />}
                    {month.overdue > 0 && <span className={OVERDUE} style={{ flexGrow: month.overdue }} />}
                    {month.upcoming > 0 && <span className={UPCOMING} style={{ flexGrow: month.upcoming }} />}
                  </span>
                  <span className="text-[9px] text-slate-500 text-center">{monthName(month.key).slice(0, 3)}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">{t('Tap a month to see who has paid.')}</p>
          </section>
          <section className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
            {data.months.filter(month => month.expected > 0).map(month => (
              <div key={month.key} className="py-2">
                <button type="button" onClick={() => setOpenMonth(openMonth === month.key ? null : month.key)} className="w-full flex justify-between gap-2 text-xs text-left">
                  <span className="font-bold">{new Date(`${month.key}-01T00:00:00`).toLocaleDateString(locale, { month: 'long' })}</span>
                  <span className="text-right">
                    <span className="font-black">{money(month.received)}</span><span className="text-slate-500"> / {money(month.expected)}</span>
                    {month.overdue > 0 && <span className="block text-[11px] font-black text-rose-700 dark:text-rose-400">{t('{amount} overdue', { amount: money(month.overdue) })}</span>}
                  </span>
                </button>
                {openMonth === month.key && (
                  <ul className="mt-2 space-y-1">
                    {month.rows.map((row, index) => (
                      <li key={index} className="flex justify-between gap-2 text-[11px]">
                        <span className="min-w-0"><span className="font-bold">{row.tenant}</span><span className="text-slate-500"> · {row.unit}</span></span>
                        <span className={`font-black shrink-0 ${row.status === 'PAID' ? 'text-emerald-700 dark:text-emerald-400' : row.status === 'OVERDUE' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500'}`}>{row.status === 'PAID' ? t('Paid') : row.status === 'OVERDUE' ? t('Overdue') : t('Due')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {totals.expected === 0 && <p className="py-2 text-xs text-slate-500">{t('No rent falls in {year}.', { year })}</p>}
          </section>
        </>
      )}

      {view === 'yearly' && (
        <section className={`${card} space-y-3`}>
          <h2 className="text-sm font-black">{t('Rent by year')}</h2>
          {legend}
          {data.yearly.map(row => (
            <div key={row.year} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-black">{row.year}</span>
                <span>{row.rate !== null ? t('{rate}% collected', { rate: row.rate }) : t('Not due yet')}</span>
              </div>
              <div className="flex h-3 rounded-[4px] overflow-hidden gap-[2px] bg-slate-100 dark:bg-slate-800">
                {row.received > 0 && <span className={RECEIVED} style={{ flexGrow: row.received }} />}
                {row.overdue > 0 && <span className={OVERDUE} style={{ flexGrow: row.overdue }} />}
                {row.upcoming > 0 && <span className={UPCOMING} style={{ flexGrow: row.upcoming }} />}
              </div>
              <p className="text-[11px] text-slate-500">{t('Expected {expected} · received {received} · overdue {overdue} · to come {upcoming}', { expected: money(row.expected), received: money(row.received), overdue: money(row.overdue), upcoming: money(row.upcoming) })}</p>
            </div>
          ))}
          {data.yearly.length > 1 && data.yearly[1].received > 0 && (
            <p className="text-[11px] font-bold">{t('Received in {year} so far is {pct}% of {previous}.', { year: data.yearly[0].year, pct: Math.round((data.yearly[0].received / data.yearly[1].received) * 100), previous: data.yearly[1].year })}</p>
          )}
        </section>
      )}

      {view === 'tenants' && data.tenants.map(row => (
        <section key={row.tenant} className={`${card} space-y-1.5`}>
          <div className="flex justify-between gap-2">
            <p className="text-sm font-black min-w-0">{row.tenant}</p>
            {row.monthlyRent > 0 && <p className="text-xs font-black shrink-0">{t('{amount} a month', { amount: money(row.monthlyRent) })}</p>}
          </div>
          <p className="text-[11px] text-slate-500">{row.units.join(' · ')}</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
            <dt className="text-slate-500">{t('Paid so far')}</dt><dd className="font-bold text-right">{money(row.paid)}</dd>
            <dt className="text-slate-500">{t('Overdue')}</dt><dd className={`font-bold text-right ${row.overdue > 0 ? 'text-rose-700 dark:text-rose-400' : ''}`}>{money(row.overdue)}</dd>
            <dt className="text-slate-500">{t('Pays on average')}</dt><dd className="font-bold text-right">{row.averageDaysLate === null ? '-' : row.averageDaysLate === 0 ? t('on time') : t('{days} days late', { days: row.averageDaysLate })}</dd>
            <dt className="text-slate-500">{t('Lease ends')}</dt><dd className="font-bold text-right">{row.endsOn ? t('{date} ({months} months left)', { date: row.endsOn, months: row.monthsLeft }) : t('ended')}</dd>
          </dl>
          {row.contact && (
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <p className="font-bold">{row.contact.name}</p>
              <div className="flex flex-wrap gap-3">
                <a href={`mailto:${row.contact.email}`} className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400"><Mail className="w-3.5 h-3.5" />{row.contact.email}</a>
                {row.contact.phone && <a href={`tel:${row.contact.phone}`} className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400"><Phone className="w-3.5 h-3.5" />{row.contact.phone}</a>}
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
};
