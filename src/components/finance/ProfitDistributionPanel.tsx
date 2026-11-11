import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { apiClient, apiErrorMessage, DistributionPreview, SettlementDistribution, SettlementPool } from '../../services/apiClient';
import { BankStatementMatchPanel } from './BankStatementMatchPanel';
import { RefundQueuePanel } from './RefundQueuePanel';

type Section = 'pools' | 'approve' | 'payouts' | 'statement' | 'refunds' | 'history';

const CARD = 'rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5';
const INPUT = 'mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs';
const LABEL = 'block text-[11px] font-bold text-slate-500';
const PRIMARY = 'rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white cursor-pointer disabled:opacity-50';
const SECONDARY = 'rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-50';
const ALERT = 'rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300';
const THEAD = 'bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400';
const today = () => new Date().toISOString().slice(0, 10);
const num = (value: number | string | null | undefined) => Number(value ?? 0);
const money = (currency: string, amount: number) => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_LABEL: Record<string, string> = {
  CALCULATED: 'Calculated', PENDING_APPROVAL: 'Awaiting approval', APPROVED: 'Approved', REJECTED: 'Rejected', PROCESSING: 'Paying out',
  SETTLED: 'Paid', PARTIALLY_SETTLED: 'Partly paid', FAILED: 'A payout failed', CANCELLED: 'Cancelled',
};
const KIND_LABEL: Record<string, string> = { PROFIT: 'Profit', LOSS: 'Loss', ABSORBED: 'Absorbed by earlier losses' };
const PAYOUT_LABEL: Record<string, string> = { QUEUED: 'To send', SUBMITTED: 'Sent to bank', SETTLED: 'Paid', FAILED: 'Failed', REVERSED: 'Reversed' };
const ISSUE_LABEL: Record<string, string> = { NO_ACCOUNT: 'No payout account', NOT_VERIFIED: 'Account not verified', COOLING_OFF: 'Account in cooling-off period' };

/**
 * Profit sharing on the web for the Settlement Officer (the same flow as the mini-app's Agihan tab): record the
 * project income that reached the trust account, let the server work out each investor's share for a period,
 * have another officer approve it, then record each bank transfer. The server checks every step and keeps the
 * ledger. Payout accounts are verified in Admin Center › Payout Account Verification.
 */
export const ProfitDistributionPanel: React.FC = () => {
  const [section, setSection] = useState<Section>('pools');
  const [distributions, setDistributions] = useState<SettlementDistribution[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); apiClient.getSettlementDistributions().then(setDistributions).catch((cause) => setError(apiErrorMessage(cause, 'Distributions could not be loaded.'))); }, []);
  useEffect(load, [load]);
  const toApprove = distributions?.filter((item) => item.status === 'PENDING_APPROVAL') ?? [];
  const toPay = distributions?.filter((item) => ['APPROVED', 'PROCESSING', 'FAILED', 'PARTIALLY_SETTLED'].includes(item.status) && item.kind === 'PROFIT') ?? [];
  const sections: Array<[Section, string, number]> = [['pools', 'Pools', 0], ['approve', 'Approve', toApprove.length], ['payouts', 'Pay out', toPay.length], ['statement', 'Bank statement', 0], ['refunds', 'Refunds', 0], ['history', 'All periods', 0]];

  return (
    <div className="space-y-4">
      <div className={`${CARD} space-y-3`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Profit distribution</h3>
            <p className="text-xs text-slate-500">Record project income, share the profit by the akad, have another officer approve it, then pay each investor.</p>
          </div>
          <button type="button" onClick={load} className={`${SECONDARY} flex items-center gap-1.5`}><RefreshCw className="w-3.5 h-3.5" />Refresh</button>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist">
          {sections.map(([value, text, count]) => (
            <button key={value} type="button" role="tab" aria-selected={section === value} onClick={() => setSection(value)} className={`relative px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${section === value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
              {text}
              {count > 0 && <span className="ml-1.5 inline-flex min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-emerald-950 text-[10px] font-black items-center justify-center">{count}</span>}
            </button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className={ALERT}>{error}</p>}
      {section === 'pools' && <PoolsSection onChanged={load} />}
      {section === 'approve' && <DistributionGrid items={toApprove} empty="No distribution is waiting for approval." onChanged={load} />}
      {section === 'payouts' && <DistributionGrid items={toPay} empty="No payout to make." onChanged={load} />}
      {section === 'statement' && <BankStatementMatchPanel onSettled={load} />}
      {section === 'refunds' && <RefundQueuePanel />}
      {section === 'history' && <HistoryTable items={distributions ?? []} />}
    </div>
  );
};

const PoolsSection: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [pools, setPools] = useState<SettlementPool[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<{ pool: SettlementPool; mode: 'income' | 'period' } | null>(null);
  const load = useCallback(() => { setError(''); apiClient.getSettlementPools().then(setPools).catch((cause) => setError(apiErrorMessage(cause, 'Pools could not be loaded.'))); }, []);
  useEffect(load, [load]);
  const done = () => { setOpen(null); load(); onChanged(); };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className={`${CARD} space-y-3 min-w-0`}>
        {error && <p role="alert" className={ALERT}>{error}</p>}
        {!pools && !error && <p className="text-xs text-slate-500">Loading...</p>}
        {pools?.length === 0 && <p className="text-xs text-slate-500">No pool is full or closed yet, so there is no profit to share.</p>}
        {pools && pools.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className={THEAD}><tr><th className="p-2.5">Pool</th><th className="p-2.5 text-right">Capital</th><th className="p-2.5 text-right">Income recorded</th><th className="p-2.5 text-right">Profit paid</th><th className="p-2.5 text-right">Available</th><th className="p-2.5">Last period</th><th className="p-2.5"></th></tr></thead>
              <tbody>
                {pools.map((pool) => (
                  <tr key={pool.poolId} className={`border-t border-slate-100 dark:border-slate-700 align-top ${open?.pool.poolId === pool.poolId ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''}`}>
                    <td className="p-2.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100">{pool.poolName}</p>
                      <p className="text-[11px] text-slate-500">{pool.projectName} · {pool.akad}{pool.investorProfitSharePct !== null ? ` · investors ${pool.investorProfitSharePct}%` : ''} · {pool.investors} investor(s)</p>
                    </td>
                    <td className="p-2.5 text-right font-bold">{money(pool.currency, pool.capital)}</td>
                    <td className="p-2.5 text-right">{money(pool.currency, pool.incomeRecorded)}</td>
                    <td className="p-2.5 text-right">{money(pool.currency, pool.profitPaidOut)}</td>
                    <td className="p-2.5 text-right font-black text-emerald-700 dark:text-emerald-400">{money(pool.currency, pool.available)}</td>
                    <td className="p-2.5 text-[11px] text-slate-500">{pool.lastPeriod ? `${pool.lastPeriod.periodName} (${KIND_LABEL[pool.lastPeriod.kind] ?? pool.lastPeriod.kind}, ${STATUS_LABEL[pool.lastPeriod.status] ?? pool.lastPeriod.status})` : 'None yet'}</td>
                    <td className="p-2.5">
                      <div className="flex flex-col gap-1.5 min-w-[120px]">
                        <button type="button" onClick={() => setOpen({ pool, mode: 'income' })} className={SECONDARY}>Record income</button>
                        <button type="button" onClick={() => setOpen({ pool, mode: 'period' })} className={PRIMARY}>New period</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && (
        <div className={`${CARD} space-y-3 self-start`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">{open.mode === 'income' ? 'Record project income received' : 'New period'}</h4>
              <p className="text-[11px] text-slate-500">{open.pool.poolName}</p>
            </div>
            <button type="button" onClick={() => setOpen(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
          </div>
          {open.mode === 'income' ? <IncomeForm key={open.pool.poolId} pool={open.pool} onDone={done} /> : <PeriodForm key={open.pool.poolId} pool={open.pool} onDone={done} />}
        </div>
      )}
    </div>
  );
};

const IncomeForm: React.FC<{ pool: SettlementPool; onDone: () => void }> = ({ pool, onDone }) => {
  const [form, setForm] = useState({ amount: '', reference: '', receivedAt: today(), note: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try { await apiClient.recordPoolIncome({ poolId: pool.poolId, amount: Number(form.amount), reference: form.reference, receivedAt: form.receivedAt, note: form.note || undefined }); onDone(); } catch (cause) { setError(apiErrorMessage(cause, 'The income could not be recorded.')); } finally { setSaving(false); }
  };
  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-[11px] text-slate-500">Record only money that is in the trust account statement. Profit is paid out of this income, never out of investors' capital.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className={LABEL}>Amount received ({pool.currency})<input required type="number" min={0.01} step="0.01" value={form.amount} onChange={set('amount')} className={INPUT} /></label>
        <label className={LABEL}>Date received<input required type="date" max={today()} value={form.receivedAt} onChange={set('receivedAt')} className={INPUT} /></label>
      </div>
      <label className={LABEL}>Bank reference<input required minLength={3} maxLength={120} value={form.reference} onChange={set('reference')} className={INPUT} /></label>
      <label className={LABEL}>Note (optional)<input maxLength={300} value={form.note} onChange={set('note')} className={INPUT} /></label>
      {error && <p role="alert" className={ALERT}>{error}</p>}
      <button type="submit" disabled={saving} className={`${PRIMARY} w-full`}>{saving ? 'Saving...' : 'Record income'}</button>
    </form>
  );
};

const PeriodForm: React.FC<{ pool: SettlementPool; onDone: () => void }> = ({ pool, onDone }) => {
  const [form, setForm] = useState({ periodName: '', grossRevenue: '', eligibleCosts: '' });
  const [preview, setPreview] = useState<DistributionPreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => { setPreview(null); setForm((current) => ({ ...current, [key]: event.target.value })); };
  const figures = { poolId: pool.poolId, periodName: form.periodName.trim(), grossRevenue: Number(form.grossRevenue), eligibleCosts: Number(form.eligibleCosts) };
  const work = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try { setPreview(await apiClient.previewDistribution(figures)); } catch (cause) { setError(apiErrorMessage(cause, 'The figures could not be worked out.')); } finally { setBusy(false); }
  };
  const send = async () => {
    if (!preview) return;
    setBusy(true);
    setError('');
    const base = { projectId: pool.projectId, poolId: pool.poolId, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, currency: pool.currency, periodName: figures.periodName, grossRevenue: figures.grossRevenue, eligibleCosts: figures.eligibleCosts };
    try {
      const created = preview.kind === 'PROFIT'
        ? await apiClient.createDistribution({ ...base, totalAmount: preview.totalAmount, allocations: preview.investors.map((investor) => ({ beneficiaryUserId: investor.userId, destinationId: investor.destination!.id, amount: investor.amount })) })
        : await apiClient.recordPeriodResult(base);
      // Sent for approval straight away: another officer approves it.
      await apiClient.submitDistribution(created.id);
      onDone();
    } catch (cause) { setError(apiErrorMessage(cause, 'The distribution could not be created.')); } finally { setBusy(false); }
  };
  const blocked = !preview || preview.problems.length > 0 || (preview.kind === 'PROFIT' && preview.investors.some((investor) => !investor.destination));
  return (
    <div className="space-y-3">
      <form onSubmit={work} className="space-y-3">
        <label className={LABEL}>Period (e.g. Q4 2026)<input required maxLength={120} value={form.periodName} onChange={set('periodName')} className={INPUT} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className={LABEL}>Gross revenue<input required type="number" min={0} step="0.01" value={form.grossRevenue} onChange={set('grossRevenue')} className={INPUT} /></label>
          <label className={LABEL}>Eligible costs<input required type="number" min={0} step="0.01" value={form.eligibleCosts} onChange={set('eligibleCosts')} className={INPUT} /></label>
        </div>
        <button type="submit" disabled={busy} className={`${SECONDARY} w-full`}>Work out the shares</button>
      </form>
      {preview && (
        <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
          <dl className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
            {([
              ['Net result', money(pool.currency, preview.netResult)],
              ['Earlier losses not yet recovered', money(pool.currency, preview.unrecoveredLossBefore)],
              ['Recovered from this period', money(pool.currency, preview.lossOffset)],
              ['Profit to share', money(pool.currency, preview.distributableNet)],
              [`Investors' share (${preview.investorProfitSharePct}%)`, money(pool.currency, preview.totalAmount)],
              ['Income available to pay', money(pool.currency, preview.funds.available)],
            ] as Array<[string, string]>).map(([term, value]) => <div key={term} className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500">{term}</dt><dd className="font-bold text-right">{value}</dd></div>)}
          </dl>
          <p className="text-xs font-black">{KIND_LABEL[preview.kind]}</p>
          {preview.kind === 'PROFIT' && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700 max-h-72 overflow-y-auto">
              {preview.investors.map((investor) => (
                <li key={investor.userId} className="py-2 text-xs flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{investor.name}</p>
                    <p className="text-[11px] text-slate-500">{investor.sharePct}% of capital · {investor.destination ? `${investor.destination.provider} ${investor.destination.maskedReference}` : <span className="text-rose-700 dark:text-rose-400 font-bold">{ISSUE_LABEL[investor.issue ?? 'NO_ACCOUNT']}</span>}</p>
                  </div>
                  <p className="font-black shrink-0">{money(pool.currency, investor.amount)}</p>
                </li>
              ))}
            </ul>
          )}
          {preview.problems.map((problem) => <p key={problem} className={ALERT}>{problem}</p>)}
          {preview.kind === 'PROFIT' && preview.totalAmount > preview.funds.available && <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Record the project income before paying out: approval can go ahead, but payment waits for the income.</p>}
          <button type="button" disabled={busy || blocked} onClick={() => void send()} className={`${PRIMARY} w-full`}>{preview.kind === 'PROFIT' ? 'Send for approval' : 'Record the result and send for approval'}</button>
        </div>
      )}
      {error && <p role="alert" className={ALERT}>{error}</p>}
    </div>
  );
};

const DistributionGrid: React.FC<{ items: SettlementDistribution[]; empty: string; onChanged: () => void }> = ({ items, empty, onChanged }) => (
  items.length === 0
    ? <p className={`${CARD} text-xs text-slate-500`}>{empty}</p>
    : <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => <DistributionCard key={item.id} item={item} onChanged={onChanged} />)}</div>
);

const DistributionCard: React.FC<{ item: SettlementDistribution; onChanged: () => void }> = ({ item, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [failing, setFailing] = useState<string | null>(null);
  const act = async (call: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try { await call(); onChanged(); } catch (cause) { setError(apiErrorMessage(cause, 'That did not go through.')); } finally { setBusy(false); }
  };

  return (
    <section className={`${CARD} space-y-3`}>
      <div>
        <p className="text-sm font-black text-slate-900 dark:text-white">{item.poolName ?? item.projectId} · {item.periodName}</p>
        <p className="text-[11px] text-slate-500">{KIND_LABEL[item.kind] ?? item.kind} · {STATUS_LABEL[item.status] ?? item.status} · by {item.createdByName ?? item.createdBy}</p>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {([['Gross revenue', num(item.grossRevenue)], ['Eligible costs', num(item.eligibleCosts)], ['Recovered losses', num(item.lossOffset)], ['To investors', num(item.totalAmount)]] as Array<[string, number]>).map(([term, value]) => (
          <div key={term} className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-2"><dt className="text-[10px] text-slate-500">{term}</dt><dd className="font-black">{money(item.currency, value)}</dd></div>
        ))}
      </dl>
      {item.allocations.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className={THEAD}><tr><th className="p-2">Investor</th><th className="p-2 text-right">Amount</th><th className="p-2">Payout</th></tr></thead>
            <tbody>
              {item.allocations.map((allocation) => {
                const instruction = allocation.payoutInstruction;
                return (
                  <tr key={allocation.id} className="border-t border-slate-100 dark:border-slate-700 align-top">
                    <td className="p-2">
                      <p className="font-bold">{allocation.beneficiaryName ?? allocation.beneficiaryUserId}</p>
                      <p className="text-[11px] text-slate-500">{allocation.destination ? `${allocation.destination.provider} ${allocation.destination.maskedReference}${allocation.destination.accountHolder ? ` · ${allocation.destination.accountHolder}` : ''}` : ''}</p>
                    </td>
                    <td className="p-2 text-right font-black">{money(item.currency, num(allocation.amount))}</td>
                    <td className="p-2 min-w-[210px] space-y-1.5">
                      {instruction && <p className={`text-[11px] font-black ${instruction.status === 'SETTLED' ? 'text-emerald-700 dark:text-emerald-400' : instruction.status === 'FAILED' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-300'}`}>{PAYOUT_LABEL[instruction.status]}{instruction.providerReference ? ` · ${instruction.providerReference}` : ''}{instruction.failureReason ? ` · ${instruction.failureReason}` : ''}</p>}
                      {instruction?.status === 'QUEUED' && (
                        <div className="flex gap-1.5">
                          <input value={refs[instruction.id] ?? ''} onChange={(event) => setRefs((current) => ({ ...current, [instruction.id]: event.target.value }))} placeholder="Bank transfer reference" className={`${INPUT} mt-0 flex-1`} />
                          <button type="button" disabled={busy || (refs[instruction.id] ?? '').trim().length < 3} onClick={() => void act(() => apiClient.submitPayout(instruction.id, refs[instruction.id].trim()))} className={PRIMARY}>Sent</button>
                        </div>
                      )}
                      {instruction?.status === 'SUBMITTED' && failing !== instruction.id && (
                        <div className="flex gap-1.5">
                          <button type="button" disabled={busy} onClick={() => void act(() => apiClient.settlePayout(instruction.id))} className={PRIMARY}>Money received</button>
                          <button type="button" disabled={busy} onClick={() => { setFailing(instruction.id); setComment(''); }} className={SECONDARY}>Failed</button>
                        </div>
                      )}
                      {instruction && failing === instruction.id && (
                        <div className="space-y-1.5">
                          <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Why it failed (e.g. account closed)" className={`${INPUT} mt-0`} />
                          <div className="flex gap-1.5">
                            <button type="button" disabled={busy || comment.trim().length < 3} onClick={() => void act(async () => { await apiClient.failPayout(instruction.id, comment.trim()); setFailing(null); })} className={PRIMARY}>Record failure</button>
                            <button type="button" onClick={() => setFailing(null)} className={SECONDARY}>Cancel</button>
                          </div>
                        </div>
                      )}
                      {instruction?.status === 'FAILED' && <button type="button" disabled={busy} onClick={() => void act(() => apiClient.retryPayout(instruction.id))} className={SECONDARY}>Try again</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {item.status === 'PENDING_APPROVAL' && !item.canApprove && <p className="text-[11px] font-bold text-slate-500">Another settlement officer must approve this.</p>}
      {item.canApprove && !rejecting && (
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => void act(() => apiClient.approveDistribution(item.id))} className={PRIMARY}>Approve</button>
          <button type="button" disabled={busy} onClick={() => { setRejecting(true); setComment(''); }} className={SECONDARY}>Reject</button>
        </div>
      )}
      {rejecting && (
        <div className="flex flex-wrap gap-2">
          <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Reason for rejecting" className={`${INPUT} mt-0 flex-1 min-w-[200px]`} />
          <button type="button" disabled={busy || comment.trim().length < 3} onClick={() => void act(() => apiClient.rejectDistribution(item.id, comment.trim()))} className={PRIMARY}>Reject</button>
          <button type="button" onClick={() => setRejecting(false)} className={SECONDARY}>Cancel</button>
        </div>
      )}
      {item.status === 'APPROVED' && <button type="button" disabled={busy} onClick={() => void act(() => apiClient.processDistribution(item.id))} className={PRIMARY}>Start paying out</button>}
      {error && <p role="alert" className={ALERT}>{error}</p>}
    </section>
  );
};

const HistoryTable: React.FC<{ items: SettlementDistribution[] }> = ({ items }) => (
  <div className={CARD}>
    {items.length === 0 ? <p className="text-xs text-slate-500">No distribution yet.</p> : (
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left text-xs">
          <thead className={THEAD}><tr><th className="p-2.5">Pool</th><th className="p-2.5">Period</th><th className="p-2.5">Result</th><th className="p-2.5">Status</th><th className="p-2.5 text-right">To investors</th><th className="p-2.5">Created by</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="p-2.5 font-bold">{item.poolName ?? item.projectId}</td>
                <td className="p-2.5">{item.periodName}</td>
                <td className="p-2.5">{KIND_LABEL[item.kind] ?? item.kind}</td>
                <td className="p-2.5">{STATUS_LABEL[item.status] ?? item.status}</td>
                <td className="p-2.5 text-right font-bold">{money(item.currency, num(item.totalAmount))}</td>
                <td className="p-2.5 text-slate-500">{item.createdByName ?? item.createdBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
