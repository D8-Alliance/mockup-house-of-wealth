import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Clock, FileText, Gavel, Send, UserCheck, Users } from 'lucide-react';
import { apiClient, CollectionCase, CollectionStage, CollectionTimings, CollectionTimingsView, LeasingTeam, OrganisationDuty } from '../../services/apiClient';
import { useT } from '../i18n';

const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4';
const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white';
const primary = 'w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-black text-white disabled:opacity-50 in-[.leasing-web]:w-auto in-[.leasing-web]:px-5';
const secondary = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 text-sm font-black disabled:opacity-50 in-[.leasing-web]:w-auto in-[.leasing-web]:px-5';
const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);

export const STAGE_LABEL: Record<CollectionStage, string> = {
  OPEN: 'Unpaid', REMINDER_1: 'Reminder 1 sent', REMINDER_2: 'Reminder 2 sent', REMINDER_3: 'Reminder 3 sent', LEGAL: 'With Legal', PAID: 'Paid', CLOSED: 'Closed',
};
const STAGE_STYLE: Record<CollectionStage, string> = {
  OPEN: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', REMINDER_1: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', REMINDER_2: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  REMINDER_3: 'bg-rose-500/10 text-rose-700 dark:text-rose-300', LEGAL: 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900', PAID: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', CLOSED: 'bg-slate-500/10 text-slate-500',
};
const DUTY_LABEL: Record<OrganisationDuty, string> = { ACCOUNTS: 'Accounts', SOA: 'Statement of account', COLLECTION: 'Collection', FIELD: 'Field (OTG)', LEGAL: 'Legal' };
const CHANNELS: Array<[string, string]> = [['CALL', 'Call'], ['WHATSAPP', 'WhatsApp'], ['EMAIL', 'Email'], ['VISIT', 'Visit'], ['MEETING', 'Meeting'], ['OTHER', 'Other']];
const ACTION_LABEL: Record<string, string> = { OPENED: 'Case opened', REMINDER_SENT: 'Reminder sent', TO_LEGAL: 'Passed to Legal', CLOSED: 'Closed', PAID: 'Paid' };
const ACTIVE: CollectionStage[] = ['OPEN', 'REMINDER_1', 'REMINDER_2', 'REMINDER_3', 'LEGAL'];
/** What a case chases: a month's rent, or a utility bill the owner recharged. */
const ITEM_LABEL: Record<string, string> = { RENT: 'Rent for', ELECTRICITY: 'Electricity bill for', WATER: 'Water bill for', SEWERAGE: 'Sewerage bill for', OTHER: 'Utility bill for' };
type Filter = 'action' | 'active' | 'legal' | 'closed';
const DEFAULT_TIMINGS: CollectionTimings = { graceDays: 7, reminder1Days: 7, reminder2Days: 14, reminder3Days: 7, legalDays: 7 };
const TIMING_FIELDS: Array<[keyof CollectionTimings, string]> = [
  ['graceDays', 'Days after the due date before a case opens'],
  ['reminder1Days', 'Days to send reminder 1'],
  ['reminder2Days', 'Days from reminder 1 to reminder 2'],
  ['reminder3Days', 'Days from reminder 2 to reminder 3'],
  ['legalDays', 'Days from reminder 3 to Legal'],
];

function useMoney() {
  const { locale } = useT();
  return (currency: string, amount: number) => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** What the next step is called: "Send reminder 2", or "Hand to Legal". */
const nextStepLabel = (t: ReturnType<typeof useT>['t'], step: CollectionStage | null) => (step === 'LEGAL' ? t('Hand to Legal') : step ? t('Send reminder {n}', { n: step.slice(-1) }) : '');

/**
 * Rent collection for the owner's team: each month a tenant has not paid some days after it was due becomes a case
 * (7 by default; each owner sets its own timings under Team).
 * The collection team sends reminders 1 to 3 (each a letter to the tenant), records every contact, and after the
 * third reminder hands the case to the owner's legal team. Recording the rent as received closes the case.
 */
export const LeaseCollections: React.FC = () => {
  const { t } = useT();
  const money = useMoney();
  const [cases, setCases] = useState<CollectionCase[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('action');
  const [open, setOpen] = useState<string | null>(null);
  const [team, setTeam] = useState(false);
  const [timings, setTimings] = useState<CollectionTimings>(DEFAULT_TIMINGS);
  useEffect(() => { if (!team) apiClient.getCollectionTimings().then((view) => setTimings(view.timings)).catch(() => undefined); }, [team]);
  const load = useCallback(() => { setError(''); apiClient.getCollectionCases().then(setCases).catch((cause) => { setCases([]); setError(errorText(cause, t('The collection cases could not be loaded.'))); }); }, [t]);
  useEffect(load, [load]);

  if (team) return <CollectionTeam onBack={() => setTeam(false)} />;
  if (open) return <CollectionCaseDetail id={open} onBack={() => { setOpen(null); load(); }} />;

  const all = cases ?? [];
  const needsAction = all.filter(item => ACTIVE.includes(item.stage) && item.stage !== 'LEGAL' && (item.late || item.canRemind || item.canEscalate));
  const shown = filter === 'action' ? needsAction : filter === 'active' ? all.filter(item => ACTIVE.includes(item.stage) && item.stage !== 'LEGAL') : filter === 'legal' ? all.filter(item => item.stage === 'LEGAL') : all.filter(item => !ACTIVE.includes(item.stage));
  const owed = all.filter(item => ACTIVE.includes(item.stage)).reduce((total, item) => total + item.amount, 0);
  const filters: Array<[Filter, string, number]> = [
    ['action', t('Needs action'), needsAction.length],
    ['active', t('Being chased'), all.filter(item => ACTIVE.includes(item.stage) && item.stage !== 'LEGAL').length],
    ['legal', t('With Legal'), all.filter(item => item.stage === 'LEGAL').length],
    ['closed', t('Closed'), all.filter(item => !ACTIVE.includes(item.stage)).length],
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black">{t('Rent collection')}</p>
          <p className="text-[11px] text-slate-500">{t('Unpaid {grace} days after the due date: reminder 1 within {r1} days, reminder 2 within {r2}, reminder 3 within {r3}, then Legal {legal} days later.', { grace: timings.graceDays, r1: timings.reminder1Days, r2: timings.reminder2Days, r3: timings.reminder3Days, legal: timings.legalDays })}</p>
        </div>
        <button type="button" onClick={() => setTeam(true)} className="shrink-0 flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-black"><Users className="w-3.5 h-3.5" />{t('Team')}</button>
      </div>
      {cases && cases.length > 0 && <p className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-800 dark:text-rose-200">{t('Outstanding in open cases: {amount}', { amount: money(all[0]?.currency ?? 'MYR', owed) })}</p>}
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
        {filters.map(([value, label, count]) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${filter === value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>{label} · {count}</button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!cases && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {cases && shown.length === 0 && <p className={`${card} text-center text-xs text-slate-500`}>{filter === 'action' ? t('Nothing to chase today.') : t('No case here.')}</p>}
      <div className="space-y-2 in-[.leasing-web]:grid in-[.leasing-web]:md:grid-cols-2 in-[.leasing-web]:gap-3 in-[.leasing-web]:space-y-0">
        {shown.map(item => (
          <button key={item.id} type="button" onClick={() => setOpen(item.id)} className={`${card} w-full text-left space-y-1.5`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-black truncate">{item.tenantName}</p>
                <p className="text-[11px] text-slate-500 truncate">{item.unit} · {item.asset} · {t(ITEM_LABEL[item.itemKind ?? 'RENT'] ?? 'Rent for')} {item.period}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${STAGE_STYLE[item.stage]}`}>{t(STAGE_LABEL[item.stage])}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-black">{money(item.currency, item.amount)}</span>
              {item.nextStep && <span className={`font-bold ${item.late ? 'text-rose-600' : 'text-slate-500'}`}>{item.late && <AlertTriangle className="inline w-3.5 h-3.5 mr-0.5 -mt-0.5" />}{nextStepLabel(t, item.nextStep)} · {item.actionDueAt}</span>}
            </div>
            {item.assignedName && <p className="text-[11px] text-slate-500">{t('With {name}', { name: item.assignedName })}</p>}
          </button>
        ))}
      </div>
    </div>
  );
};

const CollectionCaseDetail: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const { t, locale, serverText } = useT();
  const money = useMoney();
  const [item, setItem] = useState<CollectionCase | null>(null);
  const [team, setTeam] = useState<LeasingTeam | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'' | 'remind' | 'follow' | 'legal' | 'close' | 'assign'>('');
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState('CALL');
  const [promise, setPromise] = useState('');
  const [assignee, setAssignee] = useState('');
  useEffect(() => {
    apiClient.getCollectionCase(id).then(setItem).catch((cause) => setError(errorText(cause, t('The case could not be loaded.'))));
    apiClient.getLeasingTeam().then(setTeam).catch(() => setTeam(null));
  }, [id, t]);
  const act = async (call: () => Promise<CollectionCase>) => {
    setBusy(true); setError('');
    try { setItem(await call()); setMode(''); setNote(''); setPromise(''); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(false); }
  };
  const when = (value: string) => new Date(value).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!item) return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Rent collection')}</button>
      {error ? <p role="alert" className="text-xs font-bold text-rose-700">{serverText(error)}</p> : <p className="text-sm text-slate-500">{t('Loading...')}</p>}
    </div>
  );

  const collectors = (team?.members ?? []).filter(member => member.duties.includes('COLLECTION') || member.role === 'Asset Owner');
  const timeline = [
    ...item.history.map(entry => ({ at: entry.at, title: entry.action === 'REMINDER_SENT' ? t('Reminder {n} sent', { n: entry.stage.slice(-1) }) : t(ACTION_LABEL[entry.action] ?? entry.action), by: entry.byName === 'System' ? t('System') : entry.byName, note: entry.note && serverText(entry.note) })),
    ...item.followUps.map(entry => ({ at: entry.at, title: `${t(CHANNELS.find(([value]) => value === entry.channel)?.[1] ?? entry.channel)}${entry.promiseDate ? ` · ${t('promised to pay by {date}', { date: entry.promiseDate })}` : ''}`, by: entry.byName, note: entry.note })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Rent collection')}</button>
      <div>
        <h2 className="text-lg font-black">{item.tenantName}</h2>
        <p className="text-[11px] text-slate-500">{item.unit} · {item.asset} · <span className="font-mono">{item.id}</span></p>
        <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-black ${STAGE_STYLE[item.stage]}`}>{t(STAGE_LABEL[item.stage])}</span>
      </div>
      <section className={`${card} grid grid-cols-2 gap-2 text-xs`}>
        <div><p className="text-slate-500">{t(ITEM_LABEL[item.itemKind ?? 'RENT'] ?? 'Rent for')}</p><p className="font-black">{item.period}</p></div>
        <div><p className="text-slate-500">{t('Amount')}</p><p className="font-black">{money(item.currency, item.amount)}</p></div>
        <div><p className="text-slate-500">{t('Was due')}</p><p className="font-black">{item.dueDate ?? '-'}</p></div>
        <div><p className="text-slate-500">{t('Handled by')}</p><p className="font-black">{item.assignedName ?? t('Not assigned')}</p></div>
      </section>
      {item.nextStep && (
        <p className={`rounded-xl p-3 text-xs font-bold ${item.late ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-200' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'}`}>
          {item.late ? t('Overdue: {step} was due {date}.', { step: nextStepLabel(t, item.nextStep), date: item.actionDueAt ?? '' }) : t('Next: {step} by {date}.', { step: nextStepLabel(t, item.nextStep), date: item.actionDueAt ?? '' })}
        </p>
      )}
      {item.stage === 'LEGAL' && <p className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-xs font-bold">{t('With the legal team. Recording the rent as received still closes the case.')}</p>}
      {item.closedReason && <p className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-xs">{t('Closed: {reason}', { reason: item.closedReason })}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{serverText(error)}</p>}

      {!mode && (
        <div className="grid grid-cols-2 gap-2 in-[.leasing-web]:flex in-[.leasing-web]:flex-wrap">
          {item.canRemind && <button type="button" onClick={() => setMode('remind')} className={`${primary} col-span-2 flex items-center justify-center gap-1.5`}><Send className="w-4 h-4" />{nextStepLabel(t, item.nextStep)}</button>}
          {item.canEscalate && <button type="button" onClick={() => setMode('legal')} className={`${primary} col-span-2 flex items-center justify-center gap-1.5 !bg-slate-800`}><Gavel className="w-4 h-4" />{t('Hand to Legal')}</button>}
          {item.canFollowUp && <button type="button" onClick={() => setMode('follow')} className={secondary}>{t('Record a follow-up')}</button>}
          {item.canAssign && <button type="button" onClick={() => { setAssignee(item.assignedUserId ?? collectors[0]?.userId ?? ''); setMode('assign'); }} className={`${secondary} flex items-center justify-center gap-1`}><UserCheck className="w-4 h-4" />{t('Assign')}</button>}
          {item.canClose && <button type="button" onClick={() => setMode('close')} className={`${secondary} col-span-2`}>{t('Close without payment')}</button>}
        </div>
      )}

      {mode === 'remind' && (
        <form className={`${card} space-y-2`} onSubmit={(event) => { event.preventDefault(); void act(() => apiClient.sendCollectionReminder(item.id, note || undefined)); }}>
          <p className="text-xs">{t('The tenant is told and the reminder letter is ready to download. The case moves to the next stage.')}</p>
          <textarea rows={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('Note for the team (optional)')} className={input} />
          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode('')} className={secondary}>{t('Cancel')}</button><button type="submit" disabled={busy} className={primary}>{nextStepLabel(t, item.nextStep)}</button></div>
        </form>
      )}
      {mode === 'follow' && (
        <form className={`${card} space-y-2`} onSubmit={(event) => { event.preventDefault(); void act(() => apiClient.addCollectionFollowUp(item.id, { channel, note, promiseDate: promise || undefined })); }}>
          <label className="block text-xs font-bold text-slate-500">{t('How')}
            <select value={channel} onChange={(event) => setChannel(event.target.value)} className={input}>{CHANNELS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select>
          </label>
          <textarea required minLength={3} rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('What was said or found')} className={input} />
          <label className="block text-xs font-bold text-slate-500">{t('Promised to pay by (optional)')}<input type="date" value={promise} onChange={(event) => setPromise(event.target.value)} className={input} /></label>
          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode('')} className={secondary}>{t('Cancel')}</button><button type="submit" disabled={busy} className={primary}>{t('Save')}</button></div>
        </form>
      )}
      {(mode === 'legal' || mode === 'close') && (
        <form className={`${card} space-y-2`} onSubmit={(event) => { event.preventDefault(); void act(() => (mode === 'legal' ? apiClient.escalateCollectionCase(item.id, note) : apiClient.closeCollectionCase(item.id, note))); }}>
          <p className="text-xs">{mode === 'legal' ? t('The legal team is told, with the case, the letters and the follow-ups.') : t('Say why the case closes without the rent recorded as received, for example settled another way.')}</p>
          <textarea required minLength={3} rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder={mode === 'legal' ? t('Summary for Legal') : t('Reason')} className={input} />
          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode('')} className={secondary}>{t('Cancel')}</button><button type="submit" disabled={busy} className={primary}>{mode === 'legal' ? t('Hand to Legal') : t('Close the case')}</button></div>
        </form>
      )}
      {mode === 'assign' && (
        <form className={`${card} space-y-2`} onSubmit={(event) => { event.preventDefault(); void act(() => apiClient.assignCollectionCase(item.id, assignee)); }}>
          {collectors.length === 0 ? <p className="text-xs text-slate-500">{t('Nobody has the collection duty yet. The Asset Owner gives it under Team.')}</p> : (
            <select value={assignee} onChange={(event) => setAssignee(event.target.value)} className={input}>{collectors.map(member => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select>
          )}
          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode('')} className={secondary}>{t('Cancel')}</button><button type="submit" disabled={busy || !assignee} className={primary}>{t('Assign')}</button></div>
        </form>
      )}

      {item.letters.length > 0 && (
        <section className={`${card} space-y-2`}>
          <h3 className="text-sm font-black flex items-center gap-1.5"><FileText className="w-4 h-4 text-emerald-600" />{t('Reminder letters')}</h3>
          {item.letters.map(letter => (
            <div key={letter.number} className="flex items-center justify-between gap-2 text-xs">
              <span><span className="font-bold">{t('Reminder {n}', { n: letter.number })}</span> <span className="text-slate-500">· {new Date(letter.sentAt).toLocaleDateString(locale)}</span></span>
              <span className="flex gap-2 font-black text-emerald-700 dark:text-emerald-400">
                <button type="button" onClick={() => void apiClient.downloadReminderLetter(item.id, letter.number, 'ms').catch((cause) => setError(errorText(cause, t('The letter could not be opened.'))))}>BM</button>
                <button type="button" onClick={() => void apiClient.downloadReminderLetter(item.id, letter.number, 'en').catch((cause) => setError(errorText(cause, t('The letter could not be opened.'))))}>EN</button>
              </span>
            </div>
          ))}
        </section>
      )}

      {item.canDownloadLegalPack && (
        <section className={`${card} space-y-2`}>
          <h3 className="text-sm font-black flex items-center gap-1.5"><Gavel className="w-4 h-4 text-slate-700 dark:text-slate-300" />{t('Legal pack')}</h3>
          <p className="text-[11px] text-slate-500">{t('One zip for Legal: the case summary with its history and follow-ups, the Ijarah agreement (the signed copy, unchanged), the statement of account and every reminder letter.')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => void apiClient.downloadLegalPack(item.id, 'ms').catch((cause) => setError(errorText(cause, t('The legal pack could not be downloaded.'))))} className={secondary}>{t('Legal pack (BM)')}</button>
            <button type="button" disabled={busy} onClick={() => void apiClient.downloadLegalPack(item.id, 'en').catch((cause) => setError(errorText(cause, t('The legal pack could not be downloaded.'))))} className={secondary}>{t('Legal pack (EN)')}</button>
          </div>
        </section>
      )}

      <section className={`${card} space-y-2`}>
        <h3 className="text-sm font-black">{t('History')}</h3>
        <ol className="space-y-2">
          {timeline.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="border-l-2 border-emerald-500/40 pl-3 text-xs">
              <p className="font-bold">{entry.title}</p>
              <p className="text-[11px] text-slate-500">{entry.by} · {when(entry.at)}</p>
              {entry.note && <p className="text-[11px] mt-0.5">{entry.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};

/** The owner's people and their duties; the Asset Owner turns duties on and off. */
const CollectionTeam: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t, serverText } = useT();
  const [team, setTeam] = useState<LeasingTeam | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => { apiClient.getLeasingTeam().then(setTeam).catch((cause) => setError(errorText(cause, t('The team could not be loaded.')))); }, [t]);
  const toggle = async (userId: string, duty: OrganisationDuty, on: boolean) => {
    setBusy(`${userId}:${duty}`); setError('');
    try { setTeam(await apiClient.setLeasingDuty({ userId, duty, on })); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(''); }
  };
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Rent collection')}</button>
      <div>
        <h2 className="text-lg font-black">{t('Team')}</h2>
        <p className="text-[11px] text-slate-500">{t('Who does what for your leases. Collection sends the reminders and follows up; Legal takes over after the third reminder.')}</p>
      </div>
      <CollectionTimingsForm />
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{serverText(error)}</p>}
      {!team && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {team?.members.map(member => (
        <section key={member.userId} className={`${card} space-y-2`}>
          <div><p className="text-sm font-black">{member.name}</p><p className="text-[11px] text-slate-500">{member.email} · {t(member.role)}</p></div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(DUTY_LABEL) as OrganisationDuty[]).map(duty => {
              const on = member.duties.includes(duty);
              return team.canManage
                ? <button key={duty} type="button" disabled={busy === `${member.userId}:${duty}`} onClick={() => void toggle(member.userId, duty, !on)} aria-pressed={on} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold disabled:opacity-50 ${on ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600 text-slate-500'}`}>{t(DUTY_LABEL[duty])}</button>
                : on ? <span key={duty} className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{t(DUTY_LABEL[duty])}</span> : null;
            })}
          </div>
        </section>
      ))}
      {team && !team.canManage && <p className="text-[11px] text-slate-500">{t('Only the Asset Owner of your organisation changes duties.')}</p>}
    </div>
  );
};

/** The owner's own days for each collection step; the Asset Owner changes them, everyone else sees them. */
const CollectionTimingsForm: React.FC = () => {
  const { t, locale, serverText } = useT();
  const [view, setView] = useState<CollectionTimingsView | null>(null);
  const [draft, setDraft] = useState<Record<keyof CollectionTimings, string> | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const show = (next: CollectionTimingsView) => { setView(next); setDraft(Object.fromEntries(TIMING_FIELDS.map(([key]) => [key, String(next.timings[key])])) as Record<keyof CollectionTimings, string>); };
  useEffect(() => { apiClient.getCollectionTimings().then(show).catch((cause) => setError(errorText(cause, t('The collection timings could not be loaded.')))); }, [t]);
  if (!view || !draft) return error ? <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{serverText(error)}</p> : null;
  const { min, max } = view.limits;
  const values = Object.fromEntries(TIMING_FIELDS.map(([key]) => [key, Number(draft[key])])) as unknown as CollectionTimings;
  const valid = TIMING_FIELDS.every(([key]) => Number.isInteger(values[key]) && values[key] >= min && values[key] <= max);
  const changed = TIMING_FIELDS.some(([key]) => values[key] !== view.timings[key]);
  const isDefault = TIMING_FIELDS.every(([key]) => view.timings[key] === view.defaults[key]);
  const save = async (next: CollectionTimings) => {
    setBusy(true); setError(''); setSaved(false);
    try { show(await apiClient.setCollectionTimings(next)); setSaved(true); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(false); }
  };
  return (
    <form className={`${card} space-y-2`} onSubmit={(event) => { event.preventDefault(); if (valid) void save(values); }}>
      <div>
        <h3 className="text-sm font-black flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-600" />{t('Collection timings')}</h3>
        <p className="text-[11px] text-slate-500">{view.custom && view.updatedAt ? t('Your own timings, changed {date}.', { date: new Date(view.updatedAt).toLocaleDateString(locale) }) : t('The default timings apply.')} {t('A change applies to new cases and to the next step of open cases.')}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 in-[.leasing-web]:md:grid-cols-2">
        {TIMING_FIELDS.map(([key, label]) => (
          <label key={key} className="block text-xs font-bold text-slate-500">{t(label)}
            {view.canManage
              ? <input type="number" inputMode="numeric" required min={min} max={max} step={1} value={draft[key]} onChange={(event) => { setSaved(false); setDraft({ ...draft, [key]: event.target.value }); }} className={input} />
              : <span className="mt-1 block text-sm font-black text-slate-900 dark:text-white">{t('{n} days', { n: view.timings[key] })}</span>}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{serverText(error)}</p>}
      {saved && <p role="status" className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{t('Timings saved.')}</p>}
      {view.canManage && !valid && <p className="text-[11px] font-bold text-rose-600">{t('Each timing is a whole number of days from {min} to {max}.', { min, max })}</p>}
      {view.canManage ? (
        <div className="grid grid-cols-2 gap-2 in-[.leasing-web]:flex">
          <button type="button" disabled={busy || isDefault} onClick={() => void save(view.defaults)} className={secondary}>{t('Use the defaults')}</button>
          <button type="submit" disabled={busy || !valid || !changed} className={primary}>{t('Save timings')}</button>
        </div>
      ) : <p className="text-[11px] text-slate-500">{t('Only the Asset Owner of your organisation changes the timings.')}</p>}
    </form>
  );
};

/** The reminder letters on a lease, for the tenant (and the owner), each in Malay or English. */
export const LeaseReminderLetters: React.FC<{ leaseId: string }> = ({ leaseId }) => {
  const { t, locale } = useT();
  const [letters, setLetters] = useState<Array<{ caseId: string; period: string; number: 1 | 2 | 3; sentAt: string }>>([]);
  const [error, setError] = useState('');
  useEffect(() => { apiClient.getLeaseReminderLetters(leaseId).then((rows) => setLetters(Array.isArray(rows) ? rows : [])).catch(() => setLetters([])); }, [leaseId]);
  if (!letters.length) return null;
  return (
    <section className={`${card} space-y-2`}>
      <h3 className="text-sm font-black flex items-center gap-1.5"><FileText className="w-4 h-4 text-rose-600" />{t('Reminder letters')}</h3>
      {letters.map(letter => (
        <div key={`${letter.caseId}-${letter.number}`} className="flex items-center justify-between gap-2 text-xs">
          <span><span className="font-bold">{t('Reminder {n}', { n: letter.number })} · {letter.period}</span> <span className="text-slate-500">· {new Date(letter.sentAt).toLocaleDateString(locale)}</span></span>
          <span className="flex gap-2 font-black text-emerald-700 dark:text-emerald-400">
            <button type="button" onClick={() => void apiClient.downloadReminderLetter(letter.caseId, letter.number, 'ms').catch((cause) => setError(errorText(cause, t('The letter could not be opened.'))))}>BM</button>
            <button type="button" onClick={() => void apiClient.downloadReminderLetter(letter.caseId, letter.number, 'en').catch((cause) => setError(errorText(cause, t('The letter could not be opened.'))))}>EN</button>
          </span>
        </div>
      ))}
      {error && <p role="alert" className="text-[11px] font-bold text-rose-700">{error}</p>}
    </section>
  );
};
