import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { apiClient, DistributionPreview, PayoutAccountForReview, SettlementDistribution, SettlementPayout, SettlementPool } from '../../services/apiClient';
import { useT } from '../i18n';

type Section = 'pools' | 'approve' | 'payouts' | 'accounts';

const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4';
const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-sm font-bold text-slate-900 dark:text-white';
const primary = 'w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-50';
const secondary = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 py-3 text-sm font-black disabled:opacity-50';
const alert = 'rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300';
const today = () => new Date().toISOString().slice(0, 10);
const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);
const num = (value: number | string | null | undefined) => Number(value ?? 0);

const STATUS_LABEL: Record<string, string> = {
  CALCULATED: 'Calculated', PENDING_APPROVAL: 'Awaiting approval', APPROVED: 'Approved', REJECTED: 'Rejected', PROCESSING: 'Paying out',
  SETTLED: 'Paid', PARTIALLY_SETTLED: 'Partly paid', FAILED: 'A payout failed', CANCELLED: 'Cancelled',
};
const KIND_LABEL: Record<string, string> = { PROFIT: 'Profit', LOSS: 'Loss', ABSORBED: 'Absorbed by earlier losses' };
const PAYOUT_LABEL: Record<string, string> = { QUEUED: 'To send', SUBMITTED: 'Sent to bank', SETTLED: 'Paid', FAILED: 'Failed', REVERSED: 'Reversed' };
const ISSUE_LABEL: Record<string, string> = { NO_ACCOUNT: 'No payout account', NOT_VERIFIED: 'Account not verified', COOLING_OFF: 'Account in cooling-off period' };

function useMoney() {
  const { locale } = useT();
  return (currency: string, amount: number) => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Profit sharing for the Settlement Officer: record the project income that reached the trust account,
 * let the server work out each investor's share for a period, have another officer approve it, then
 * record each bank transfer to the investor. The server checks every step again and keeps the ledger.
 */
export const MobileSettlement: React.FC = () => {
  const { t } = useT();
  const [section, setSection] = useState<Section>('pools');
  const [distributions, setDistributions] = useState<SettlementDistribution[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); apiClient.getSettlementDistributions().then(setDistributions).catch((cause) => setError(errorText(cause, t('Distributions could not be loaded.')))); }, [t]);
  useEffect(load, [load]);
  const toApprove = distributions?.filter(item => item.status === 'PENDING_APPROVAL') ?? [];
  const toPay = distributions?.filter(item => ['APPROVED', 'PROCESSING', 'FAILED', 'PARTIALLY_SETTLED'].includes(item.status) && item.kind === 'PROFIT') ?? [];
  const sections: Array<[Section, string, number]> = [['pools', t('Pools'), 0], ['approve', t('Approve'), toApprove.length], ['payouts', t('Pay out'), toPay.length], ['accounts', t('Accounts'), 0]];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black">{t('Profit distribution')}</h1>
        <p className="text-xs text-slate-500">{t('Record project income, share the profit by the akad, approve, then pay each investor.')}</p>
      </div>
      <div className="grid grid-cols-4 gap-1.5" role="tablist">
        {sections.map(([value, text, count]) => (
          <button key={value} type="button" role="tab" aria-selected={section === value} onClick={() => setSection(value)} className={`relative py-2.5 px-1 rounded-xl text-[11px] font-black border ${section === value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>
            {text}
            {count > 0 && <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-emerald-950 text-[10px] font-black flex items-center justify-center">{count}</span>}
          </button>
        ))}
      </div>
      {error && <p role="alert" className={alert}>{error}</p>}
      {section === 'pools' && <PoolsSection onChanged={load} />}
      {section === 'approve' && <DistributionList items={toApprove} empty={t('No distribution is waiting for approval.')} onChanged={load} />}
      {section === 'payouts' && <DistributionList items={toPay} empty={t('No payout to make.')} onChanged={load} />}
      {section === 'accounts' && <AccountsSection />}
    </div>
  );
};

const PoolsSection: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const { t } = useT();
  const money = useMoney();
  const [pools, setPools] = useState<SettlementPool[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<{ pool: SettlementPool; mode: 'income' | 'period' } | null>(null);
  const load = useCallback(() => { setError(''); apiClient.getSettlementPools().then(setPools).catch((cause) => setError(errorText(cause, t('Pools could not be loaded.')))); }, [t]);
  useEffect(load, [load]);
  const done = () => { setOpen(null); load(); onChanged(); };

  if (open?.mode === 'income') return <IncomeForm pool={open.pool} onBack={() => setOpen(null)} onDone={done} />;
  if (open?.mode === 'period') return <PeriodForm pool={open.pool} onBack={() => setOpen(null)} onDone={done} />;
  return (
    <div className="space-y-3">
      {error && <p role="alert" className={alert}>{error}</p>}
      {!pools && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {pools?.length === 0 && <p className="text-xs text-slate-500">{t('No pool is full or closed yet, so there is no profit to share.')}</p>}
      {pools?.map(pool => (
        <section key={pool.poolId} className={`${card} space-y-2`}>
          <div>
            <p className="text-sm font-black">{pool.poolName}</p>
            <p className="text-[11px] text-slate-500">{pool.projectName} · {pool.akad}{pool.investorProfitSharePct !== null ? ` · ${t('investors {pct}%', { pct: pool.investorProfitSharePct })}` : ''}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-slate-500">{t('Capital')}</dt><dd className="font-bold text-right">{money(pool.currency, pool.capital)}</dd>
            <dt className="text-slate-500">{t('Investors')}</dt><dd className="font-bold text-right">{pool.investors}</dd>
            <dt className="text-slate-500">{t('Income recorded')}</dt><dd className="font-bold text-right">{money(pool.currency, pool.incomeRecorded)}</dd>
            <dt className="text-slate-500">{t('Profit paid out')}</dt><dd className="font-bold text-right">{money(pool.currency, pool.profitPaidOut)}</dd>
            <dt className="text-slate-500">{t('Available to pay')}</dt><dd className="font-black text-right text-emerald-700 dark:text-emerald-400">{money(pool.currency, pool.available)}</dd>
          </dl>
          {pool.lastPeriod && <p className="text-[11px] text-slate-500">{t('Last period: {period} ({kind}, {status})', { period: pool.lastPeriod.periodName, kind: t(KIND_LABEL[pool.lastPeriod.kind] ?? pool.lastPeriod.kind), status: t(STATUS_LABEL[pool.lastPeriod.status] ?? pool.lastPeriod.status) })}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setOpen({ pool, mode: 'income' })} className={secondary}>{t('Record income')}</button>
            <button type="button" onClick={() => setOpen({ pool, mode: 'period' })} className={primary}>{t('New period')}</button>
          </div>
        </section>
      ))}
    </div>
  );
};

const IncomeForm: React.FC<{ pool: SettlementPool; onBack: () => void; onDone: () => void }> = ({ pool, onBack, onDone }) => {
  const { t } = useT();
  const [form, setForm] = useState({ amount: '', reference: '', receivedAt: today(), note: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm(current => ({ ...current, [key]: event.target.value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try { await apiClient.recordPoolIncome({ poolId: pool.poolId, amount: Number(form.amount), reference: form.reference, receivedAt: form.receivedAt, note: form.note || undefined }); onDone(); } catch (cause) { setError(errorText(cause, t('The income could not be recorded.'))); } finally { setSaving(false); }
  };
  return (
    <form onSubmit={save} className="space-y-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Pools')}</button>
      <div>
        <h2 className="text-base font-black">{t('Record project income received')}</h2>
        <p className="text-xs text-slate-500">{pool.poolName}</p>
      </div>
      <p className="text-[11px] text-slate-500">{t('Record only money that is in the trust account statement. Profit is paid out of this income, never out of investors\' capital.')}</p>
      <label className="block text-xs font-bold text-slate-500">{t('Amount received ({currency})', { currency: pool.currency })}<input required type="number" min={0.01} step="0.01" inputMode="decimal" value={form.amount} onChange={set('amount')} className={input} /></label>
      <label className="block text-xs font-bold text-slate-500">{t('Bank reference')}<input required minLength={3} maxLength={120} value={form.reference} onChange={set('reference')} className={input} /></label>
      <label className="block text-xs font-bold text-slate-500">{t('Date received')}<input required type="date" max={today()} value={form.receivedAt} onChange={set('receivedAt')} className={input} /></label>
      <label className="block text-xs font-bold text-slate-500">{t('Note (optional)')}<input maxLength={300} value={form.note} onChange={set('note')} className={input} /></label>
      {error && <p role="alert" className={alert}>{error}</p>}
      <button type="submit" disabled={saving} className={primary}>{saving ? t('Saving...') : t('Record income')}</button>
    </form>
  );
};

const PeriodForm: React.FC<{ pool: SettlementPool; onBack: () => void; onDone: () => void }> = ({ pool, onBack, onDone }) => {
  const { t } = useT();
  const money = useMoney();
  const [form, setForm] = useState({ periodName: '', grossRevenue: '', eligibleCosts: '' });
  const [preview, setPreview] = useState<DistributionPreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => { setPreview(null); setForm(current => ({ ...current, [key]: event.target.value })); };
  const figures = { poolId: pool.poolId, periodName: form.periodName.trim(), grossRevenue: Number(form.grossRevenue), eligibleCosts: Number(form.eligibleCosts) };
  const work = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try { setPreview(await apiClient.previewDistribution(figures)); } catch (cause) { setError(errorText(cause, t('The figures could not be worked out.'))); } finally { setBusy(false); }
  };
  const send = async () => {
    if (!preview) return;
    setBusy(true);
    setError('');
    const base = { projectId: pool.projectId, poolId: pool.poolId, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, currency: pool.currency, periodName: figures.periodName, grossRevenue: figures.grossRevenue, eligibleCosts: figures.eligibleCosts };
    try {
      const created = preview.kind === 'PROFIT'
        ? await apiClient.createDistribution({ ...base, totalAmount: preview.totalAmount, allocations: preview.investors.map(investor => ({ beneficiaryUserId: investor.userId, destinationId: investor.destination!.id, amount: investor.amount })) })
        : await apiClient.recordPeriodResult(base);
      // Sent for approval straight away: another officer approves it.
      await apiClient.submitDistribution(created.id);
      onDone();
    } catch (cause) { setError(errorText(cause, t('The distribution could not be created.'))); } finally { setBusy(false); }
  };
  const blocked = !preview || preview.problems.length > 0 || (preview.kind === 'PROFIT' && preview.investors.some(investor => !investor.destination));
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Pools')}</button>
      <div>
        <h2 className="text-base font-black">{t('New period')}</h2>
        <p className="text-xs text-slate-500">{pool.poolName}</p>
      </div>
      <form onSubmit={work} className="space-y-3">
        <label className="block text-xs font-bold text-slate-500">{t('Period (e.g. Q4 2026)')}<input required maxLength={120} value={form.periodName} onChange={set('periodName')} className={input} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-bold text-slate-500">{t('Gross revenue')}<input required type="number" min={0} step="0.01" inputMode="decimal" value={form.grossRevenue} onChange={set('grossRevenue')} className={input} /></label>
          <label className="block text-xs font-bold text-slate-500">{t('Eligible costs')}<input required type="number" min={0} step="0.01" inputMode="decimal" value={form.eligibleCosts} onChange={set('eligibleCosts')} className={input} /></label>
        </div>
        <button type="submit" disabled={busy} className={secondary}>{t('Work out the shares')}</button>
      </form>

      {preview && (
        <section className={`${card} space-y-3`}>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {([
              [t('Net result'), money(pool.currency, preview.netResult)],
              [t('Earlier losses not yet recovered'), money(pool.currency, preview.unrecoveredLossBefore)],
              [t('Recovered from this period'), money(pool.currency, preview.lossOffset)],
              [t('Profit to share'), money(pool.currency, preview.distributableNet)],
              [t('Investors\' share ({pct}%)', { pct: preview.investorProfitSharePct }), money(pool.currency, preview.totalAmount)],
              [t('Income available to pay'), money(pool.currency, preview.funds.available)],
            ] as Array<[string, string]>).map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500">{label}</dt><dd className="font-bold text-right">{value}</dd></div>)}
          </dl>
          <p className="text-xs font-black">{t(KIND_LABEL[preview.kind])}</p>
          {preview.kind === 'PROFIT' && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {preview.investors.map(investor => (
                <li key={investor.userId} className="py-2 text-xs flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{investor.name}</p>
                    <p className="text-[11px] text-slate-500">{t('{pct}% of capital', { pct: investor.sharePct })} · {investor.destination ? `${investor.destination.provider} ${investor.destination.maskedReference}` : <span className="text-rose-700 dark:text-rose-400 font-bold">{t(ISSUE_LABEL[investor.issue ?? 'NO_ACCOUNT'])}</span>}</p>
                  </div>
                  <p className="font-black shrink-0">{money(pool.currency, investor.amount)}</p>
                </li>
              ))}
            </ul>
          )}
          {preview.problems.map(problem => <p key={problem} className={alert}>{t(problem)}</p>)}
          {preview.kind === 'PROFIT' && preview.totalAmount > preview.funds.available && <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">{t('Record the project income before paying out: approval can go ahead, but payment waits for the income.')}</p>}
          {error && <p role="alert" className={alert}>{error}</p>}
          <button type="button" disabled={busy || blocked} onClick={send} className={primary}>{preview.kind === 'PROFIT' ? t('Send for approval') : t('Record the result and send for approval')}</button>
        </section>
      )}
      {!preview && error && <p role="alert" className={alert}>{error}</p>}
    </div>
  );
};

const DistributionList: React.FC<{ items: SettlementDistribution[]; empty: string; onChanged: () => void }> = ({ items, empty, onChanged }) => {
  const { t } = useT();
  return (
    <div className="space-y-3">
      <button type="button" onClick={onChanged} className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400"><RefreshCw className="w-3.5 h-3.5" />{t('Refresh')}</button>
      {items.length === 0 && <p className="text-xs text-slate-500">{empty}</p>}
      {items.map(item => <DistributionCard key={item.id} item={item} onChanged={onChanged} />)}
    </div>
  );
};

const DistributionCard: React.FC<{ item: SettlementDistribution; onChanged: () => void }> = ({ item, onChanged }) => {
  const { t } = useT();
  const money = useMoney();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [failing, setFailing] = useState<string | null>(null);
  const act = async (call: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try { await call(); onChanged(); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(false); }
  };
  const payout = (allocation: SettlementDistribution['allocations'][number]): SettlementPayout | null => allocation.payoutInstruction;

  return (
    <section className={`${card} space-y-2`}>
      <div>
        <p className="text-sm font-black">{item.poolName ?? item.projectId} · {item.periodName}</p>
        <p className="text-[11px] text-slate-500">{t(KIND_LABEL[item.kind] ?? item.kind)} · {t(STATUS_LABEL[item.status] ?? item.status)} · {t('by {name}', { name: item.createdByName ?? item.createdBy })}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-slate-500">{t('Gross revenue')}</dt><dd className="font-bold text-right">{money(item.currency, num(item.grossRevenue))}</dd>
        <dt className="text-slate-500">{t('Eligible costs')}</dt><dd className="font-bold text-right">{money(item.currency, num(item.eligibleCosts))}</dd>
        {num(item.lossOffset) > 0 && <><dt className="text-slate-500">{t('Recovered from this period')}</dt><dd className="font-bold text-right">{money(item.currency, num(item.lossOffset))}</dd></>}
        <dt className="text-slate-500">{t('To investors')}</dt><dd className="font-black text-right">{money(item.currency, num(item.totalAmount))}</dd>
      </dl>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {item.allocations.map(allocation => {
          const instruction = payout(allocation);
          return (
            <li key={allocation.id} className="py-2 text-xs space-y-1.5">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold truncate">{allocation.beneficiaryName ?? allocation.beneficiaryUserId}</p>
                  <p className="text-[11px] text-slate-500">{allocation.destination ? `${allocation.destination.provider} ${allocation.destination.maskedReference}${allocation.destination.accountHolder ? ` · ${allocation.destination.accountHolder}` : ''}` : ''}</p>
                  {instruction && <p className={`text-[11px] font-black ${instruction.status === 'SETTLED' ? 'text-emerald-700 dark:text-emerald-400' : instruction.status === 'FAILED' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-300'}`}>{t(PAYOUT_LABEL[instruction.status])}{instruction.providerReference ? ` · ${instruction.providerReference}` : ''}{instruction.failureReason ? ` · ${instruction.failureReason}` : ''}</p>}
                </div>
                <p className="font-black shrink-0">{money(item.currency, num(allocation.amount))}</p>
              </div>
              {instruction?.status === 'QUEUED' && (
                <div className="flex gap-2">
                  <input value={refs[instruction.id] ?? ''} onChange={(event) => setRefs(current => ({ ...current, [instruction.id]: event.target.value }))} placeholder={t('Bank transfer reference')} className={`${input} mt-0 flex-1`} />
                  <button type="button" disabled={busy || (refs[instruction.id] ?? '').trim().length < 3} onClick={() => act(() => apiClient.submitPayout(instruction.id, refs[instruction.id].trim()))} className="rounded-xl bg-emerald-600 px-3 text-xs font-black text-white disabled:opacity-50">{t('Sent')}</button>
                </div>
              )}
              {instruction?.status === 'SUBMITTED' && failing !== instruction.id && (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={busy} onClick={() => act(() => apiClient.settlePayout(instruction.id))} className={primary}>{t('Money received')}</button>
                  <button type="button" disabled={busy} onClick={() => { setFailing(instruction.id); setComment(''); }} className={secondary}>{t('Failed')}</button>
                </div>
              )}
              {failing === instruction?.id && instruction && (
                <div className="space-y-2">
                  <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t('Why it failed (e.g. account closed)')} className={input} />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={busy || comment.trim().length < 3} onClick={() => act(async () => { await apiClient.failPayout(instruction.id, comment.trim()); setFailing(null); })} className={primary}>{t('Record failure')}</button>
                    <button type="button" onClick={() => setFailing(null)} className={secondary}>{t('Cancel')}</button>
                  </div>
                </div>
              )}
              {instruction?.status === 'FAILED' && <button type="button" disabled={busy} onClick={() => act(() => apiClient.retryPayout(instruction.id))} className={secondary}>{t('Try again')}</button>}
            </li>
          );
        })}
      </ul>

      {item.status === 'PENDING_APPROVAL' && !item.canApprove && <p className="text-[11px] font-bold text-slate-500">{t('Another settlement officer must approve this.')}</p>}
      {item.canApprove && !rejecting && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => act(() => apiClient.approveDistribution(item.id))} className={primary}>{t('Approve')}</button>
          <button type="button" disabled={busy} onClick={() => { setRejecting(true); setComment(''); }} className={secondary}>{t('Reject')}</button>
        </div>
      )}
      {rejecting && (
        <div className="space-y-2">
          <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t('Reason for rejecting')} className={input} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy || comment.trim().length < 3} onClick={() => act(() => apiClient.rejectDistribution(item.id, comment.trim()))} className={primary}>{t('Reject')}</button>
            <button type="button" onClick={() => setRejecting(false)} className={secondary}>{t('Cancel')}</button>
          </div>
        </div>
      )}
      {item.status === 'APPROVED' && <button type="button" disabled={busy} onClick={() => act(() => apiClient.processDistribution(item.id))} className={primary}>{t('Start paying out')}</button>}
      {error && <p role="alert" className={alert}>{error}</p>}
    </section>
  );
};

const AccountsSection: React.FC = () => {
  const { t } = useT();
  const [accounts, setAccounts] = useState<PayoutAccountForReview[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(() => { setError(''); apiClient.getPayoutAccountsForReview().then(rows => setAccounts(rows.filter(row => row.status === 'PENDING_VERIFICATION'))).catch((cause) => setError(errorText(cause, t('Payout accounts could not be loaded.')))); }, [t]);
  useEffect(load, [load]);
  const verify = async (id: string) => {
    setBusy(id);
    setError('');
    try { await apiClient.verifyPayoutAccount(id); load(); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(''); }
  };
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">{t('Check the name on the account against the investor\'s verified identity before you verify it. You cannot verify your own account.')}</p>
      {error && <p role="alert" className={alert}>{error}</p>}
      {!accounts && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {accounts?.length === 0 && <p className="text-xs text-slate-500">{t('No payout account is waiting for verification.')}</p>}
      {accounts?.map(account => (
        <section key={account.id} className={`${card} space-y-2`}>
          <p className="text-sm font-black">{account.ownerName ?? account.ownerUserId}</p>
          <p className="text-xs">{account.provider} {account.maskedReference}{account.accountHolder ? ` · ${account.accountHolder}` : ''}</p>
          <button type="button" disabled={busy === account.id} onClick={() => verify(account.id)} className={primary}>{t('Verify account')}</button>
        </section>
      ))}
    </div>
  );
};
