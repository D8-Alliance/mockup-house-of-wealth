import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Building2, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { AgreementDetail, AgreementStatus, apiClient, AssetLeaseView, AvailableUnit, LeasableUnitInput, MyLeasableUnit } from '../../services/apiClient';
import { useRBAC } from '../../rbac/RBACContext';
import { LEASE_OWNER_ROLES, LEASE_REVIEWER_ROLES, LEASE_TENANT_ROLES } from '../mobileRoles';
import { useT } from '../i18n';

type Section = 'units' | 'find' | 'leases' | 'review';

const STATUS_LABEL: Record<string, string> = {
  PROPOSED: 'Under discussion', ACCEPTED: 'Awaiting Legal and Shariah approval', APPROVED: 'Approved', DECLINED: 'Declined',
  WITHDRAWN: 'Withdrawn', REJECTED: 'Rejected', ENDED: 'Ended',
};
const STATUS_STYLE: Record<string, string> = {
  PROPOSED: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  ACCEPTED: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  DECLINED: 'bg-slate-500/10 text-slate-500', WITHDRAWN: 'bg-slate-500/10 text-slate-500', ENDED: 'bg-slate-500/10 text-slate-500',
  REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
};
const RENT_LABEL: Record<string, string> = { DUE: 'Due', PAID: 'Paid', OVERDUE: 'Overdue' };
const RENT_STYLE: Record<string, string> = { DUE: 'text-slate-500', PAID: 'text-emerald-700 dark:text-emerald-400', OVERDUE: 'text-rose-700 dark:text-rose-400' };

const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4';
const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-sm font-bold text-slate-900 dark:text-white';
const primary = 'w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-50';
const secondary = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 py-3 text-sm font-black disabled:opacity-50';
const today = () => new Date().toISOString().slice(0, 10);
const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);

/**
 * Direct leasing without a project: an asset owner lists a unit of a verified asset (a floor, a shop lot, the
 * whole asset), a verified company asks to rent it, the two agree the rent, deposit and term, and Legal and
 * Shariah approve the Ijarah. The rent is paid to the owner's bank account and the owner records it here.
 */
export const MobileLeasing: React.FC = () => {
  const { t } = useT();
  const { currentRole } = useRBAC();
  const isOwner = LEASE_OWNER_ROLES.includes(currentRole);
  const isTenant = LEASE_TENANT_ROLES.includes(currentRole);
  const isReviewer = LEASE_REVIEWER_ROLES.includes(currentRole);
  const sections: Array<[Section, string]> = [
    ...(isOwner ? [['units', t('My units')] as [Section, string]] : []),
    ...(isTenant ? [['find', t('Find space')] as [Section, string]] : []),
    ...(isReviewer ? [['review', t('To review')] as [Section, string]] : []),
    ['leases', isReviewer && !isOwner && !isTenant ? t('All leases') : t('Leases')],
  ];
  const [section, setSection] = useState<Section>(sections[0][0]);
  const [openLease, setOpenLease] = useState<string | null>(null);
  const [renting, setRenting] = useState<AvailableUnit | null>(null);

  if (openLease) return <LeaseDetail id={openLease} onBack={() => setOpenLease(null)} />;
  if (renting) return <RentRequest unit={renting} onBack={() => setRenting(null)} onSent={(lease) => { setRenting(null); setOpenLease(lease.id); }} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black">{t('Leasing')}</h1>
        <p className="text-xs text-slate-500">{t('Rent space in a verified asset directly under Ijarah, without a project.')}</p>
      </div>
      {sections.length > 1 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }} role="tablist">
          {sections.map(([value, text]) => (
            <button key={value} type="button" role="tab" aria-selected={section === value} onClick={() => setSection(value)} className={`py-2.5 px-1 rounded-xl text-xs font-black border ${section === value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>{text}</button>
          ))}
        </div>
      )}
      {section === 'units' && <OwnerUnits />}
      {section === 'find' && <FindSpace onRent={setRenting} />}
      {section === 'review' && <LeaseList filter={(lease) => lease.canReview} empty={t('No lease is waiting for your review.')} onOpen={setOpenLease} />}
      {section === 'leases' && <LeaseList empty={isTenant ? t('Your company has no lease or request yet. Find space to ask for one.') : t('No lease yet.')} onOpen={setOpenLease} />}
    </div>
  );
};

/** Formats an amount in the account's language: "RM 25,500.00". */
function useMoney() {
  const { locale } = useT();
  return (currency: string, amount: number) => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const OwnerUnits: React.FC = () => {
  const { t } = useT();
  const money = useMoney();
  const [data, setData] = useState<{ assets: Array<{ id: string; name: string }>; units: MyLeasableUnit[] } | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState('');
  const load = useCallback(() => { setError(''); apiClient.getMyLeasableUnits().then(setData).catch((cause) => setError(errorText(cause, t('Your units could not be loaded.')))); }, [t]);
  useEffect(load, [load]);

  const toggle = async (unit: MyLeasableUnit) => {
    setBusy(unit.id);
    try { await apiClient.updateLeasableUnit(unit.id, { status: unit.status === 'LISTED' ? 'WITHDRAWN' : 'LISTED' }); load(); } catch (cause) { setError(errorText(cause, t('The unit could not be changed.'))); } finally { setBusy(''); }
  };

  if (adding && data) return <UnitForm assets={data.assets} onDone={(saved) => { setAdding(false); if (saved) load(); }} />;
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!data && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {data && (
        <>
          {data.assets.length === 0
            ? <p className={`${card} text-xs text-slate-500`}>{t('Only a verified asset can be leased out. Register your asset and have it verified on the web portal first.')}</p>
            : <button type="button" onClick={() => setAdding(true)} className={`${primary} flex items-center justify-center gap-1.5`}><Plus className="w-4 h-4" />{t('Add a unit for rent')}</button>}
          {data.units.length === 0 && data.assets.length > 0 && <p className="text-xs text-slate-500">{t('No unit listed yet. A unit can be a floor, a shop lot, a bay or the whole asset.')}</p>}
          {data.units.map(unit => (
            <section key={unit.id} className={`${card} space-y-2`}>
              <div className="flex items-start gap-2">
                <Building2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">{unit.label}</p>
                  <p className="text-[11px] text-slate-500">{unit.asset.name}{unit.floorArea ? ` · ${unit.floorArea.toLocaleString()} ${unit.floorAreaUnit === 'SQM' ? t('sq m') : t('sq ft')}` : ''}</p>
                </div>
                <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${unit.status === 'LISTED' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-slate-500/10 text-slate-500'}`}>{unit.status === 'LISTED' ? t('Listed') : t('Not listed')}</span>
              </div>
              <p className="text-xs"><span className="font-black">{t('{amount} a month', { amount: money(unit.currency, unit.monthlyRent) })}</span> · {t('deposit {months} months', { months: unit.depositMonths })} · {t('at least {months} months', { months: unit.minTermMonths })}</p>
              {unit.occupiedUntil && <p className="text-xs font-bold text-sky-700 dark:text-sky-300">{t('Leased until {date}', { date: unit.occupiedUntil })}</p>}
              {unit.requests > 0 && <p className="text-xs font-bold text-amber-700 dark:text-amber-300">{t('{count} request(s) waiting for your answer: see Leases.', { count: unit.requests })}</p>}
              <button type="button" disabled={busy === unit.id} onClick={() => toggle(unit)} className={secondary}>{unit.status === 'LISTED' ? t('Stop listing') : t('List again')}</button>
            </section>
          ))}
        </>
      )}
    </div>
  );
};

const UnitForm: React.FC<{ assets: Array<{ id: string; name: string }>; onDone: (saved: boolean) => void }> = ({ assets, onDone }) => {
  const { t } = useT();
  const [form, setForm] = useState({ assetId: assets[0]?.id ?? '', label: '', floorArea: '', floorAreaUnit: 'SQFT', monthlyRent: '', depositMonths: '2', minTermMonths: '12', availableFrom: '', permittedUse: '', description: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(current => ({ ...current, [key]: event.target.value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body: LeasableUnitInput = {
      assetId: form.assetId, label: form.label, monthlyRent: Number(form.monthlyRent), currency: 'MYR',
      depositMonths: Number(form.depositMonths), minTermMonths: Number(form.minTermMonths), floorAreaUnit: form.floorAreaUnit as 'SQFT' | 'SQM',
      ...(form.floorArea ? { floorArea: Number(form.floorArea) } : {}), ...(form.availableFrom ? { availableFrom: form.availableFrom } : {}),
      permittedUse: form.permittedUse, description: form.description,
    };
    try { await apiClient.createLeasableUnit(body); onDone(true); } catch (cause) { setError(errorText(cause, t('The unit could not be saved.'))); } finally { setSaving(false); }
  };
  return (
    <form onSubmit={save} className="space-y-3">
      <button type="button" onClick={() => onDone(false)} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('My units')}</button>
      <h2 className="text-base font-black">{t('Add a unit for rent')}</h2>
      <label className="block text-xs font-bold text-slate-500">{t('Asset')}<select required value={form.assetId} onChange={set('assetId')} className={input}>{assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
      <label className="block text-xs font-bold text-slate-500">{t('Unit name (e.g. Floor 7, Lot G-03, whole building)')}<input required minLength={2} maxLength={80} value={form.label} onChange={set('label')} className={input} /></label>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="block text-xs font-bold text-slate-500">{t('Floor area')}<input type="number" min={1} inputMode="decimal" value={form.floorArea} onChange={set('floorArea')} className={input} /></label>
        <label className="block text-xs font-bold text-slate-500">{t('Unit')}<select value={form.floorAreaUnit} onChange={set('floorAreaUnit')} className={input}><option value="SQFT">{t('sq ft')}</option><option value="SQM">{t('sq m')}</option></select></label>
      </div>
      <label className="block text-xs font-bold text-slate-500">{t('Asking rent a month (RM)')}<input required type="number" min={1} step="0.01" inputMode="decimal" value={form.monthlyRent} onChange={set('monthlyRent')} className={input} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-bold text-slate-500">{t('Deposit (months of rent)')}<input required type="number" min={0} max={12} step="0.5" value={form.depositMonths} onChange={set('depositMonths')} className={input} /></label>
        <label className="block text-xs font-bold text-slate-500">{t('Shortest lease (months)')}<input required type="number" min={1} max={360} value={form.minTermMonths} onChange={set('minTermMonths')} className={input} /></label>
      </div>
      <label className="block text-xs font-bold text-slate-500">{t('Available from')}<input type="date" min={today()} value={form.availableFrom} onChange={set('availableFrom')} className={input} /></label>
      <label className="block text-xs font-bold text-slate-500">{t('Permitted use (e.g. Office)')}<input maxLength={160} value={form.permittedUse} onChange={set('permittedUse')} className={input} /></label>
      <label className="block text-xs font-bold text-slate-500">{t('Description')}<textarea maxLength={2000} rows={3} value={form.description} onChange={set('description')} className={input} /></label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      <button type="submit" disabled={saving} className={primary}>{saving ? t('Saving...') : t('List the unit')}</button>
    </form>
  );
};

const FindSpace: React.FC<{ onRent: (unit: AvailableUnit) => void }> = ({ onRent }) => {
  const { t } = useT();
  const money = useMoney();
  const [units, setUnits] = useState<AvailableUnit[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiClient.getAvailableUnits().then(setUnits).catch((cause) => setError(errorText(cause, t('Units could not be loaded.')))); }, [t]);
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!units && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {units?.length === 0 && <p className="text-xs text-slate-500">{t('No space is offered for rent in your country yet.')}</p>}
      {units?.map(unit => (
        <section key={unit.id} className={`${card} space-y-2`}>
          <div>
            <p className="text-sm font-black">{unit.label} · {unit.asset.name}</p>
            <p className="text-[11px] text-slate-500">{[unit.asset.region, unit.ownerOrganisationName].filter(Boolean).join(' · ')}</p>
          </div>
          <p className="text-xs"><span className="font-black">{t('{amount} a month', { amount: money(unit.currency, unit.monthlyRent) })}</span>{unit.floorArea ? ` · ${unit.floorArea.toLocaleString()} ${unit.floorAreaUnit === 'SQM' ? t('sq m') : t('sq ft')}` : ''}</p>
          <p className="text-[11px] text-slate-500">{t('deposit {months} months', { months: unit.depositMonths })} · {t('at least {months} months', { months: unit.minTermMonths })}{unit.permittedUse ? ` · ${unit.permittedUse}` : ''}{unit.availableFrom ? ` · ${t('from {date}', { date: unit.availableFrom })}` : ''}</p>
          {unit.description && <p className="text-xs text-slate-600 dark:text-slate-300">{unit.description}</p>}
          {unit.taken.length > 0 && <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">{t('Taken: {periods}', { periods: unit.taken.map(period => `${period.startDate} – ${period.endDate}`).join(', ') })}</p>}
          <button type="button" onClick={() => onRent(unit)} className={primary}>{t('Ask to rent')}</button>
        </section>
      ))}
    </div>
  );
};

const RentRequest: React.FC<{ unit: AvailableUnit; onBack: () => void; onSent: (lease: AssetLeaseView) => void }> = ({ unit, onBack, onSent }) => {
  const { t } = useT();
  const money = useMoney();
  const earliest = unit.availableFrom && unit.availableFrom > today() ? unit.availableFrom : today();
  const [form, setForm] = useState({ startDate: earliest, termMonths: String(unit.minTermMonths), monthlyRent: String(unit.monthlyRent), intendedUse: unit.permittedUse, tenantActivity: '', message: '' });
  const [declared, setDeclared] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(current => ({ ...current, [key]: event.target.value }));
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const rent = Number(form.monthlyRent);
      onSent(await apiClient.requestLease({ unitId: unit.id, startDate: form.startDate, termMonths: Number(form.termMonths), ...(rent !== unit.monthlyRent ? { monthlyRent: rent } : {}), intendedUse: form.intendedUse, tenantActivity: form.tenantActivity, shariahDeclaration: declared, message: form.message || undefined }));
    } catch (cause) { setError(errorText(cause, t('The request could not be sent.'))); } finally { setSending(false); }
  };
  return (
    <form onSubmit={send} className="space-y-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Find space')}</button>
      <div>
        <h1 className="text-lg font-black">{t('Ask to rent {unit}', { unit: unit.label })}</h1>
        <p className="text-xs text-slate-500">{unit.asset.name} · {t('asking {amount} a month', { amount: money(unit.currency, unit.monthlyRent) })}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-bold text-slate-500">{t('Start date')}<input required type="date" min={earliest} value={form.startDate} onChange={set('startDate')} className={input} /></label>
        <label className="block text-xs font-bold text-slate-500">{t('Months')}<input required type="number" min={unit.minTermMonths} max={360} value={form.termMonths} onChange={set('termMonths')} className={input} /></label>
      </div>
      <label className="block text-xs font-bold text-slate-500">{t('Rent you offer a month (RM)')}<input required type="number" min={1} step="0.01" inputMode="decimal" value={form.monthlyRent} onChange={set('monthlyRent')} className={input} /></label>
      <label className="block text-xs font-bold text-slate-500">{t('What you will use the space for')}<input required minLength={3} maxLength={300} value={form.intendedUse} onChange={set('intendedUse')} className={input} /></label>
      <label className="block text-xs font-bold text-slate-500">{t("Your company's business")}<input required minLength={3} maxLength={300} value={form.tenantActivity} onChange={set('tenantActivity')} placeholder={t('e.g. engineering consultancy')} className={input} /></label>
      <label className="block text-xs font-bold text-slate-500">{t('Message to the owner (optional)')}<textarea maxLength={2000} rows={3} value={form.message} onChange={set('message')} className={input} /></label>
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={declared} onChange={(event) => setDeclared(event.target.checked)} className="mt-0.5 w-4 h-4" />
        <span>{t('I confirm that our business and our use of the space are Shariah-compliant (no alcohol, gambling, conventional lending or other prohibited activity).')}</span>
      </label>
      <p className="text-[11px] text-slate-500">{t('Your company must be verified (KYB). The owner answers, then Legal and Shariah approve the Ijarah before the lease starts.')}</p>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      <button type="submit" disabled={sending || !declared} className={primary}>{sending ? t('Sending...') : t('Send request')}</button>
    </form>
  );
};

const LeaseList: React.FC<{ filter?: (lease: AssetLeaseView) => boolean; empty: string; onOpen: (id: string) => void }> = ({ filter, empty, onOpen }) => {
  const { t } = useT();
  const money = useMoney();
  const [leases, setLeases] = useState<AssetLeaseView[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); apiClient.getLeases().then(setLeases).catch((cause) => setError(errorText(cause, t('Leases could not be loaded.')))); }, [t]);
  useEffect(load, [load]);
  const shown = leases ? (filter ? leases.filter(filter) : leases) : null;
  return (
    <div className="space-y-3">
      <button type="button" onClick={load} className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400"><RefreshCw className="w-3.5 h-3.5" />{t('Refresh')}</button>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!shown && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {shown?.length === 0 && <p className="text-xs text-slate-500">{empty}</p>}
      {shown?.map(lease => (
        <button key={lease.id} type="button" onClick={() => onOpen(lease.id)} className={`${card} w-full text-left flex items-center gap-3`}>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-black">{lease.unit.label} · {lease.asset.name}</p>
            <p className="text-[11px] text-slate-500">{lease.myParty === 'OWNER' ? lease.tenantOrganisationName : lease.myParty === 'TENANT' ? lease.ownerOrganisationName : `${lease.ownerOrganisationName} → ${lease.tenantOrganisationName}`}</p>
            <p className="text-xs">{t('{amount} a month', { amount: money(lease.currency, lease.monthlyRent) })} · {lease.startDate} – {lease.endDate}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${STATUS_STYLE[lease.status]}`}>{t(STATUS_LABEL[lease.status])}</span>
              {(lease.canRespond || lease.canReview) && <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-amber-400 text-emerald-950">{t('Your turn')}</span>}
              {lease.rent.overdue > 0 && <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-300">{t('{amount} overdue', { amount: money(lease.currency, lease.rent.overdue) })}</span>}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      ))}
    </div>
  );
};

const HISTORY_LABEL: Record<string, string> = {
  PROPOSED: 'Asked to rent', COUNTERED: 'Proposed new terms', ACCEPTED: 'Accepted the terms', DECLINED: 'Declined', WITHDRAWN: 'Withdrew', ENDED: 'Ended the lease',
  LEGAL_APPROVED: 'Legal approved', SHARIAH_APPROVED: 'Shariah approved', LEGAL_REJECTED: 'Legal rejected', SHARIAH_REJECTED: 'Shariah rejected',
  LEGAL_CHANGES_REQUESTED: 'Legal asked for changes', SHARIAH_CHANGES_REQUESTED: 'Shariah asked for changes',
};

const LeaseDetail: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const { t, locale } = useT();
  const money = useMoney();
  const { currentRole } = useRBAC();
  const [lease, setLease] = useState<AssetLeaseView | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'' | 'accept' | 'counter' | 'decline' | 'withdraw' | 'review' | 'end'>('');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [counter, setCounter] = useState({ monthlyRent: '', depositAmount: '', startDate: '', termMonths: '' });
  const [track, setTrack] = useState<'LEGAL' | 'SHARIAH'>('LEGAL');
  const [paying, setPaying] = useState<string | null>(null);
  const [payment, setPayment] = useState({ reference: '', paidAt: today() });

  const reload = useCallback(() => { apiClient.getLease(id).then(setLease).catch((cause) => setError(errorText(cause, t('The lease could not be loaded.')))); }, [id, t]);
  useEffect(reload, [reload]);
  const open = (next: typeof mode) => {
    setMode(next);
    setNote('');
    setConfirmed(false);
    setError('');
    if (lease && next === 'counter') setCounter({ monthlyRent: String(lease.monthlyRent), depositAmount: String(lease.depositAmount), startDate: lease.startDate, termMonths: String(lease.termMonths) });
  };
  const act = async (call: () => Promise<AssetLeaseView>) => {
    setBusy(true);
    setError('');
    try { setLease(await call()); setMode(''); setPaying(null); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(false); }
  };

  if (!lease) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Leasing')}</button>
        {error ? <p role="alert" className="text-xs font-bold text-rose-700">{error}</p> : <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      </div>
    );
  }

  const waitingText = lease.status === 'PROPOSED'
    ? (lease.canRespond ? t('Your turn: accept, propose other terms or decline.') : lease.awaiting === 'OWNER' ? t('Waiting for the owner to answer.') : t('Waiting for the tenant to answer.'))
    : lease.status === 'ACCEPTED'
      ? t('Both sides agreed. Waiting for Legal ({legal}) and Shariah ({shariah}) approval.', { legal: lease.legalApprovedAt ? t('done') : t('pending'), shariah: lease.shariahApprovedAt ? t('done') : t('pending') })
      : lease.status === 'APPROVED' ? t('Approved. Sign the Ijarah agreement; rent is paid to the owner\'s bank account each month and the owner records it here.') : '';
  const isSuperAdmin = currentRole === 'Super Admin';
  const row = (label: string, value: React.ReactNode) => <div className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500">{label}</dt><dd className="font-bold text-right">{value}</dd></div>;
  const noteBox = (required: boolean, placeholder: string) => <textarea required={required} minLength={required ? 3 : undefined} maxLength={2000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder={placeholder} className={input} />;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Leasing')}</button>
      <div>
        <h1 className="text-lg font-black">{lease.unit.label} · {lease.asset.name}</h1>
        <p className="text-[11px] text-slate-500 font-mono">{lease.id}</p>
        <span className={`inline-block mt-1 text-[10px] font-black rounded-full px-2 py-0.5 ${STATUS_STYLE[lease.status]}`}>{t(STATUS_LABEL[lease.status])}</span>
      </div>
      {waitingText && <p className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-200">{waitingText}</p>}

      <section className={card}>
        <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {row(t('Owner'), lease.ownerOrganisationName)}
          {row(t('Tenant'), lease.tenantOrganisationName ?? '-')}
          {lease.asset.location && row(t('Address'), lease.asset.location)}
          {row(t('Rent a month'), money(lease.currency, lease.monthlyRent))}
          {row(t('Deposit'), money(lease.currency, lease.depositAmount))}
          {row(t('Period'), `${lease.startDate} – ${lease.endDate}`)}
          {row(t('Months'), lease.termMonths)}
          {row(t('Use'), lease.intendedUse)}
          {row(t("Tenant's business"), lease.tenantActivity)}
        </dl>
        {lease.shariahFlags && lease.shariahFlags.length > 0 && <p className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-xs font-bold text-amber-800 dark:text-amber-200">{t('Check the activity: it may involve {flags}.', { flags: lease.shariahFlags.join(', ') })}</p>}
      </section>

      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}

      {!mode && (lease.canRespond || lease.canWithdraw || lease.canReview || lease.canEnd) && (
        <div className="grid grid-cols-2 gap-2">
          {lease.canRespond && <button type="button" onClick={() => open('accept')} className={primary}>{t('Accept')}</button>}
          {lease.canRespond && <button type="button" onClick={() => open('counter')} className={secondary}>{t('Propose other terms')}</button>}
          {lease.canRespond && <button type="button" onClick={() => open('decline')} className={secondary}>{t('Decline')}</button>}
          {lease.canWithdraw && <button type="button" onClick={() => open('withdraw')} className={secondary}>{t('Withdraw')}</button>}
          {lease.canReview && <button type="button" onClick={() => open('review')} className={`${primary} col-span-2`}>{t('Review')}</button>}
          {lease.canEnd && <button type="button" onClick={() => open('end')} className={`${secondary} col-span-2`}>{t('End the lease early')}</button>}
        </div>
      )}

      {mode === 'accept' && (
        <section className={`${card} space-y-3`}>
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 w-4 h-4" /><span>{t('I accept these terms on behalf of my organisation.')}</span></label>
          {noteBox(false, t('Note (optional)'))}
          <button type="button" disabled={busy || !confirmed} onClick={() => act(() => apiClient.respondLease(lease.id, { action: 'ACCEPT', confirmed: true, note: note || undefined }))} className={primary}>{t('Accept')}</button>
          <button type="button" onClick={() => setMode('')} className={secondary}>{t('Cancel')}</button>
        </section>
      )}

      {mode === 'counter' && (
        <form className={`${card} space-y-3`} onSubmit={(event) => { event.preventDefault(); act(() => apiClient.respondLease(lease.id, { action: 'COUNTER', monthlyRent: Number(counter.monthlyRent), ...(Number(counter.depositAmount) !== lease.depositAmount ? { depositAmount: Number(counter.depositAmount) } : {}), startDate: counter.startDate, termMonths: Number(counter.termMonths), note: note || undefined })); }}>
          <label className="block text-xs font-bold text-slate-500">{t('Rent a month (RM)')}<input required type="number" min={1} step="0.01" value={counter.monthlyRent} onChange={(event) => setCounter(current => ({ ...current, monthlyRent: event.target.value }))} className={input} /></label>
          <label className="block text-xs font-bold text-slate-500">{t('Deposit (RM)')}<input required type="number" min={0} step="0.01" value={counter.depositAmount} onChange={(event) => setCounter(current => ({ ...current, depositAmount: event.target.value }))} className={input} /></label>
          <p className="text-[11px] text-slate-500">{t('Leave the deposit as it is to work it out again from the new rent.')}</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-slate-500">{t('Start date')}<input required type="date" min={today()} value={counter.startDate} onChange={(event) => setCounter(current => ({ ...current, startDate: event.target.value }))} className={input} /></label>
            <label className="block text-xs font-bold text-slate-500">{t('Months')}<input required type="number" min={1} max={360} value={counter.termMonths} onChange={(event) => setCounter(current => ({ ...current, termMonths: event.target.value }))} className={input} /></label>
          </div>
          {noteBox(false, t('Note (optional)'))}
          <button type="submit" disabled={busy} className={primary}>{t('Send the new terms')}</button>
          <button type="button" onClick={() => setMode('')} className={secondary}>{t('Cancel')}</button>
        </form>
      )}

      {(mode === 'decline' || mode === 'withdraw' || mode === 'end') && (
        <form className={`${card} space-y-3`} onSubmit={(event) => { event.preventDefault(); act(() => (mode === 'decline' ? apiClient.respondLease(lease.id, { action: 'DECLINE', note: note || undefined }) : mode === 'withdraw' ? apiClient.withdrawLease(lease.id, note || undefined) : apiClient.endLease(lease.id, note))); }}>
          {noteBox(mode === 'end', mode === 'end' ? t('Why the lease ends early, as both sides agreed') : t('Reason (optional)'))}
          <button type="submit" disabled={busy} className={primary}>{mode === 'decline' ? t('Decline') : mode === 'withdraw' ? t('Withdraw') : t('End the lease')}</button>
          <button type="button" onClick={() => setMode('')} className={secondary}>{t('Cancel')}</button>
        </form>
      )}

      {mode === 'review' && (
        <section className={`${card} space-y-3`}>
          {isSuperAdmin && (
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('Approval')}>
              {(['LEGAL', 'SHARIAH'] as const).map(value => <button key={value} type="button" role="radio" aria-checked={track === value} onClick={() => setTrack(value)} className={`py-2 rounded-xl text-xs font-black border ${track === value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>{value === 'LEGAL' ? t('Legal') : t('Shariah')}</button>)}
            </div>
          )}
          {noteBox(true, t('Your review note (required)'))}
          {(['APPROVE', 'REQUEST_CHANGES', 'REJECT'] as const).map(decision => (
            <button key={decision} type="button" disabled={busy || note.trim().length < 3} onClick={() => act(() => apiClient.reviewLease(lease.id, { decision, note, ...(isSuperAdmin ? { track } : {}) }))} className={decision === 'APPROVE' ? primary : secondary}>
              {decision === 'APPROVE' ? t('Approve') : decision === 'REQUEST_CHANGES' ? t('Ask for changes') : t('Reject')}
            </button>
          ))}
          <button type="button" onClick={() => setMode('')} className={secondary}>{t('Cancel')}</button>
        </section>
      )}

      {['APPROVED', 'ENDED'].includes(lease.status) && lease.myParty && <LeaseAgreementCard lease={lease} onChanged={reload} />}
      {['APPROVED', 'ENDED'].includes(lease.status) && (lease.myParty || lease.deposit.receivedAt) && <DepositCard lease={lease} onChanged={setLease} />}

      {lease.payments.length > 0 && (
        <section className={`${card} space-y-2`}>
          <h2 className="text-sm font-black">{t('Rent schedule')}</h2>
          <p className="text-[11px] text-slate-500">{t('Paid {paid} · overdue {overdue} · still due {due}', { paid: money(lease.currency, lease.rent.paid), overdue: money(lease.currency, lease.rent.overdue), due: money(lease.currency, lease.rent.due) })}</p>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {lease.payments.map(item => (
              <li key={item.period} className="py-2 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">{new Date(`${item.period}-01T00:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</p>
                    <p className="text-[11px] text-slate-500">{item.status === 'PAID' ? t('paid {date} · ref {reference}', { date: item.paidAt ?? '', reference: item.reference ?? '' }) : t('due {date}', { date: item.dueDate })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black">{money(item.currency, item.amount)}</p>
                    <p className={`text-[11px] font-black ${RENT_STYLE[item.status]}`}>{t(RENT_LABEL[item.status])}</p>
                  </div>
                </div>
                {lease.canRecordPayment && item.status !== 'PAID' && paying !== item.period && <button type="button" onClick={() => { setPaying(item.period); setPayment({ reference: '', paidAt: today() }); }} className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">{t('Record as received')}</button>}
                {paying === item.period && (
                  <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); act(() => apiClient.recordLeaseRent(lease.id, item.period, payment)); }}>
                    <input required minLength={3} maxLength={120} value={payment.reference} onChange={(event) => setPayment(current => ({ ...current, reference: event.target.value }))} placeholder={t('Transfer reference in your bank')} className={input} />
                    <input required type="date" max={today()} value={payment.paidAt} onChange={(event) => setPayment(current => ({ ...current, paidAt: event.target.value }))} className={input} />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="submit" disabled={busy} className={primary}>{t('Save')}</button>
                      <button type="button" onClick={() => setPaying(null)} className={secondary}>{t('Cancel')}</button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${card} space-y-2`}>
        <h2 className="text-sm font-black">{t('History')}</h2>
        <ol className="space-y-2">
          {lease.history.map((entry, index) => (
            <li key={index} className="text-xs">
              <p className="font-bold">{t(HISTORY_LABEL[entry.action] ?? entry.action)} · {entry.byName}</p>
              <p className="text-[11px] text-slate-500">{new Date(entry.at).toLocaleString(locale)}</p>
              {entry.terms && <p className="text-[11px]">{t('{amount} a month', { amount: money(lease.currency, entry.terms.monthlyRent) })} · {t('Deposit')} {money(lease.currency, entry.terms.depositAmount)} · {entry.terms.startDate} – {entry.terms.endDate}</p>}
              {entry.note && <p className="text-[11px] italic">“{entry.note}”</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};

const AGREEMENT_STATUS: Record<AgreementStatus, string> = {
  DRAFT: 'Draft: both sides agree to it', LEGAL_REVIEW: 'In legal review', SHARIAH_REVIEW: 'In Shariah review', APPROVED: 'Approved: ready to sign',
  CHANGES_REQUESTED: 'Changes requested', EXECUTION: 'Signed by both sides',
};

/**
 * The lease's Ijarah agreement: the owner drafts it from the approved terms, both sides agree to the text,
 * the owner sends it to legal and Shariah review, then each side signs with a one-time code. Reviewers work
 * on the web portal; the parties do everything here.
 */
const LeaseAgreementCard: React.FC<{ lease: AssetLeaseView; onChanged: () => void }> = ({ lease, onChanged }) => {
  const { t } = useT();
  const { activeUser } = useRBAC();
  const [agreement, setAgreement] = useState<AgreementDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState<{ challengeId: string; destination: string; testCode?: string } | null>(null);
  const [otp, setOtp] = useState('');
  const [typedName, setTypedName] = useState('');
  const agreementId = lease.agreement?.id;
  const load = useCallback(() => { if (agreementId) apiClient.getAgreement(agreementId).then(setAgreement).catch((cause) => setError(errorText(cause, t('The agreement could not be loaded.')))); }, [agreementId, t]);
  useEffect(load, [load]);
  const act = async (call: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try { await call(); onChanged(); load(); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(false); }
  };

  const isOwner = lease.myParty === 'OWNER';
  const actions = agreement?.partyActions ?? [];
  const canConsent = actions.some(item => item.action === 'CONSENT');
  const canSign = actions.some(item => item.action === 'SIGN');
  const canSubmit = agreement?.availableActions.some(item => item.action === 'LEGAL_REVIEW') ?? false;
  const canRevise = isOwner && agreement?.status === 'CHANGES_REQUESTED';
  const status = agreement?.status ?? lease.agreement?.status;

  return (
    <section className={`${card} space-y-2`}>
      <h2 className="text-sm font-black">{t('Ijarah agreement')}</h2>
      {!agreementId && (isOwner
        ? <>
            <p className="text-xs text-slate-500">{t('Draft the agreement from the approved terms: rent, deposit, period and permitted use. The tenant then agrees to it, Legal and Shariah review the text, and both sides sign.')}</p>
            <button type="button" disabled={busy} onClick={() => act(() => apiClient.draftLeaseAgreement(lease.id))} className={primary}>{t('Draft the Ijarah agreement')}</button>
          </>
        : <p className="text-xs text-slate-500">{t('Waiting for the owner to draft the agreement.')}</p>)}
      {agreementId && (
        <>
          <p className="text-xs"><span className="font-mono">{lease.agreement?.contractNumber}</span>{agreement ? ` · ${t('version {version}', { version: agreement.latestVersion ?? 1 })}` : ''}</p>
          {status && <p className="text-xs font-black">{t(AGREEMENT_STATUS[status])}</p>}
          {agreement?.parties?.filter(party => party.role).map(party => (
            <p key={party.displayName} className="text-[11px] text-slate-500">{party.displayName}: {party.signedAt ? t('signed') : party.consentedVersion === agreement.latestVersion ? t('agreed to this version') : t('not agreed yet')}</p>
          ))}
          <button type="button" onClick={() => act(() => apiClient.downloadAgreement(agreementId, 'pdf'))} className={secondary}>{t('Read the agreement (PDF)')}</button>
          {canConsent && <button type="button" disabled={busy} onClick={() => act(() => apiClient.agreementPartyAction(agreementId, { action: 'CONSENT' }))} className={primary}>{t('Agree to version {version}', { version: agreement?.latestVersion ?? 1 })}</button>}
          {canSubmit && <button type="button" disabled={busy} onClick={() => act(() => apiClient.reviewAgreement(agreementId, { reviewStatus: 'LEGAL_REVIEW' }))} className={primary}>{t('Send for legal review')}</button>}
          {canRevise && <button type="button" disabled={busy} onClick={() => act(() => apiClient.draftLeaseAgreement(lease.id))} className={primary}>{t('Draft a new version')}</button>}
          {canSign && !code && <button type="button" disabled={busy} onClick={() => act(async () => { const issued = await apiClient.requestSignCode(agreementId); setCode(issued); setTypedName(''); setOtp(''); })} className={primary}>{t('Sign the agreement')}</button>}
          {canSign && code && (
            <div className="space-y-2">
              <p className="text-[11px]">{t('A one-time code was sent to {destination}.', { destination: code.destination })}{code.testCode ? ` ${t('Test code: {code}', { code: code.testCode })}` : ''}</p>
              <input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" placeholder={t('One-time code')} className={input} />
              <input value={typedName} onChange={(event) => setTypedName(event.target.value)} placeholder={t('Type your full name: {name}', { name: activeUser.name })} className={input} />
              <button type="button" disabled={busy || otp.trim().length < 4 || typedName.trim().length < 3} onClick={() => act(async () => { await apiClient.agreementPartyAction(agreementId, { action: 'SIGN', signatureName: typedName.trim(), otpChallengeId: code.challengeId, otpCode: otp.trim() }); setCode(null); })} className={primary}>{t('Sign')}</button>
            </div>
          )}
          {agreement?.signingBlocked && <p className="text-[11px] text-amber-700 dark:text-amber-300">{agreement.signingBlocked}</p>}
          {status === 'EXECUTION' && <button type="button" onClick={() => act(() => apiClient.downloadSignedAgreement(agreementId))} className={secondary}>{t('Signed copy (PDF)')}</button>}
          {status === 'EXECUTION' && <p className="text-[11px] text-slate-500">{t('Pay the stamp duty (LHDN STAMPS) within 30 days of signing.')}</p>}
        </>
      )}
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
    </section>
  );
};

/**
 * The security deposit: the owner records it as received, and after the lease refunds it within 30 days,
 * less only unpaid rent and repairs beyond fair wear and tear, each deduction with its reason.
 */
const DepositCard: React.FC<{ lease: AssetLeaseView; onChanged: (lease: AssetLeaseView) => void }> = ({ lease, onChanged }) => {
  const { t, locale } = useT();
  const deposit = lease.deposit;
  const [mode, setMode] = useState<'' | 'receive' | 'refund'>('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(today());
  const [deductions, setDeductions] = useState<Array<{ reason: string; amount: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const money = (amount: number) => `${lease.currency === 'MYR' ? 'RM' : lease.currency} ${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const deducted = deductions.reduce((total, item) => total + (Number(item.amount) || 0), 0);
  const act = async (call: () => Promise<AssetLeaseView>) => {
    setBusy(true);
    setError('');
    try { onChanged(await call()); setMode(''); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(false); }
  };
  const open = (next: 'receive' | 'refund') => { setMode(next); setReference(''); setDate(today()); setDeductions([]); setError(''); };

  return (
    <section className={`${card} space-y-2`}>
      <h2 className="text-sm font-black">{t('Security deposit')}</h2>
      <p className="text-xs"><span className="font-black">{money(deposit.amount)}</span> · {deposit.returnedAt ? t('refunded {date}', { date: deposit.returnedAt }) : deposit.receivedAt ? t('received {date} · ref {reference}', { date: deposit.receivedAt, reference: deposit.reference ?? '' }) : t('not received yet')}</p>
      {deposit.refund && (
        <div className="text-[11px] space-y-0.5">
          <p className="font-bold">{t('Refunded {amount} · ref {reference}', { amount: money(deposit.refund.amount), reference: deposit.refund.reference })}</p>
          {deposit.refund.deductions.map((item, index) => <p key={index} className="text-slate-500">− {money(item.amount)}: {item.reason}</p>)}
        </div>
      )}
      {deposit.refundDueBy && !deposit.returnedAt && <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">{t('To be refunded by {date}, less only unpaid rent and repairs beyond fair wear and tear.', { date: deposit.refundDueBy })}</p>}

      {lease.canRecordDeposit && mode !== 'receive' && <button type="button" onClick={() => open('receive')} className={secondary}>{t('Record deposit received')}</button>}
      {lease.canReturnDeposit && mode !== 'refund' && <button type="button" onClick={() => open('refund')} className={primary}>{t('Refund the deposit')}</button>}

      {mode === 'receive' && (
        <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); act(() => apiClient.recordLeaseDeposit(lease.id, { reference: reference.trim(), receivedAt: date })); }}>
          <input required minLength={3} maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} placeholder={t('Transfer reference in your bank')} className={input} />
          <input required type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} className={input} />
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" disabled={busy} className={primary}>{t('Save')}</button>
            <button type="button" onClick={() => setMode('')} className={secondary}>{t('Cancel')}</button>
          </div>
        </form>
      )}

      {mode === 'refund' && (
        <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); act(() => apiClient.refundLeaseDeposit(lease.id, { deductions: deductions.map(item => ({ reason: item.reason.trim(), amount: Number(item.amount) })), reference: reference.trim(), paidAt: date })); }}>
          <p className="text-[11px] text-slate-500">{t('Deduct only rent still unpaid and the actual cost of repairing damage beyond fair wear and tear. The tenant sees each reason.')}</p>
          {deductions.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_7rem_auto] gap-2 items-end">
              <input required minLength={3} maxLength={300} value={item.reason} onChange={(event) => setDeductions(current => current.map((row, i) => (i === index ? { ...row, reason: event.target.value } : row)))} placeholder={t('Reason')} className={input} />
              <input required type="number" min={0.01} step="0.01" inputMode="decimal" value={item.amount} onChange={(event) => setDeductions(current => current.map((row, i) => (i === index ? { ...row, amount: event.target.value } : row)))} placeholder={t('Amount')} className={input} />
              <button type="button" aria-label={t('Remove')} onClick={() => setDeductions(current => current.filter((_, i) => i !== index))} className="mb-1 text-xs font-black text-slate-500">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setDeductions(current => [...current, { reason: '', amount: '' }])} className="text-xs font-black text-emerald-700 dark:text-emerald-400">{t('+ Add a deduction')}</button>
          <p className={`text-xs font-black ${deducted > deposit.amount ? 'text-rose-700 dark:text-rose-400' : ''}`}>{t('To refund: {amount}', { amount: money(Math.max(0, deposit.amount - deducted)) })}</p>
          <input required minLength={3} maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} placeholder={t('Transfer reference in your bank')} className={input} />
          <input required type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} className={input} />
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" disabled={busy || deducted > deposit.amount} className={primary}>{t('Record the refund')}</button>
            <button type="button" onClick={() => setMode('')} className={secondary}>{t('Cancel')}</button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
    </section>
  );
};
