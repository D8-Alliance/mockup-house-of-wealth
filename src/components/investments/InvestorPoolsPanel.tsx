import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Landmark, RefreshCw, ShieldAlert } from 'lucide-react';
import { apiClient, BackendInvestmentOrder, BackendPoolDetail, KycApplication } from '../../services/apiClient';
import { KycApplicationPanel } from '../../kyc/KycApplicationPanel';
import { KYC_STATUS_LABELS } from '../../kyc/kycLabels';
import { formatProjectMoney } from '../sponsor/sponsorMoney';
import { PaymentInstructionsCard } from '../../mobile/PaymentInstructionsCard';
import { PREFERRED_CONTRACT_COUNT } from '../../profile/FinancialPreferencesPanel';

const NOT_SET_UP = "The platform's bank account for your country is not set up yet, so do not transfer money now. Open \"How to pay\" on this order later in My investment orders to see the account, or cancel the order there.";

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Waiting for your transfer to be confirmed', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  SETTLED: { label: 'Confirmed: counts in the pool', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-500/10 text-slate-600' },
};

const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/**
 * Investors: the open pools of their country, each with its akad terms to read and accept (ijab and
 * qabul), and their own orders. An order counts once Finance has matched the transfer to the bank.
 */
export const InvestorPoolsPanel: React.FC = () => {
  const [pools, setPools] = useState<BackendPoolDetail[]>([]);
  const [orders, setOrders] = useState<BackendInvestmentOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [openTerms, setOpenTerms] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [placed, setPlaced] = useState<BackendInvestmentOrder | null>(null);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [preferred, setPreferred] = useState<string[]>([]);
  const [kyc, setKyc] = useState<KycApplication | null>(null);
  const [kycLoaded, setKycLoaded] = useState(false);
  // The server refuses orders until KYC is approved, so the form sits here until then.
  const verified = kyc?.status === 'APPROVED';

  const load = useCallback(async () => {
    setError('');
    try {
      const [list, mine, me] = await Promise.all([apiClient.getPools(), apiClient.getInvestmentOrders(), apiClient.getCurrentUser().catch(() => null)]);
      const open = list.filter((pool) => pool.status === 'OPEN');
      const saved = (me?.profile?.preferences as { preferredContracts?: unknown } | undefined)?.preferredContracts;
      const liked = Array.isArray(saved) ? saved.map((type) => String(type).toUpperCase()) : [];
      setPreferred(liked);
      const details = await Promise.all(open.map((pool) => apiClient.getPool(pool.poolId)));
      // Pools under the investor's preferred contracts (Profile › Financial preferences) come first.
      const rank = (pool: BackendPoolDetail) => (pool.akadTerms && liked.includes(pool.akadTerms.akadType.toUpperCase()) ? 0 : 1);
      setPools(details.sort((a, b) => rank(a) - rank(b)));
      setOrders(mine);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pools could not be loaded.');
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { apiClient.getMyKyc().then(setKyc).catch(() => setKyc(null)).finally(() => setKycLoaded(true)); }, []);

  const invest = async (pool: BackendPoolDetail) => {
    const amount = Number(amounts[pool.poolId]);
    if (!pool.akadTerms || accepted[pool.poolId] !== pool.akadTerms.id) return setError('Read and accept the akad terms first.');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter the amount to invest.');
    setBusy(pool.poolId);
    setError('');
    try {
      const order = await apiClient.createInvestmentOrder({ poolId: pool.poolId, amount, currency: pool.currency, idempotencyKey: newKey(), akadTermsId: pool.akadTerms.id, acceptAkad: true });
      setPlaced(order);
      setAmounts({ ...amounts, [pool.poolId]: '' });
      setAccepted({ ...accepted, [pool.poolId]: '' });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The order was not placed.');
    } finally {
      setBusy('');
    }
  };

  const cancel = async (order: BackendInvestmentOrder) => {
    setBusy(order.id);
    setError('');
    try {
      await apiClient.cancelInvestmentOrder(order.id, 'Cancelled by the investor before payment was confirmed');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The order was not cancelled.');
    } finally {
      setBusy('');
    }
  };


  return (
    <div className="space-y-4 text-xs">
      {kycLoaded && !verified && (
        <section className="bg-white dark:bg-slate-800 rounded-3xl border border-amber-300 dark:border-amber-500/40 p-5 space-y-3">
          <h3 className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white"><ShieldAlert className="w-4 h-4 text-amber-500" />Verify your identity before investing{kyc ? ` (${KYC_STATUS_LABELS[kyc.status]})` : ''}</h3>
          <p className="text-slate-500">Orders are accepted once a KYC officer has approved your identity verification. Fill in your details, upload the documents and submit for review.</p>
          <KycApplicationPanel application={kyc} loading={false} onChange={setKyc} />
        </section>
      )}
      <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white"><Landmark className="w-4 h-4 text-emerald-600" />Open pools</h3>
          <button type="button" onClick={() => void load()} className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
        {error && <p className="text-rose-600 font-bold">{error}</p>}
        {placed && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 text-emerald-800 dark:text-emerald-200">
            <p className="font-black flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Order {placed.orderNumber} placed.</p>
            <p className="mt-1">Finance confirms your transfer against the bank; your investment then counts in the pool.</p>
            <div className="mt-2 text-slate-900 dark:text-white"><PaymentInstructionsCard orderId={placed.id} notSetUpText={NOT_SET_UP} /></div>
          </div>
        )}
        {!loaded && <p className="text-slate-500">Loading…</p>}
        {loaded && pools.length === 0 && !error && <p className="text-slate-500">No pool is open to investors in your country right now.</p>}
        {pools.map((pool) => {
          const pct = pool.targetAmount > 0 ? Math.min(100, Math.round((pool.raisedAmount / pool.targetAmount) * 100)) : 0;
          const terms = pool.akadTerms;
          return (
            <div key={pool.poolId} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-black text-sm text-slate-900 dark:text-white">{pool.poolName}
                    {terms && preferred.length > 0 && preferred.length < PREFERRED_CONTRACT_COUNT && preferred.includes(terms.akadType.toUpperCase()) && <span className="ml-2 align-middle px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Your preferred contract</span>}
                  </p>
                  <p className="text-slate-500">{terms ? `${terms.akadType} · investors' profit share ${Number(terms.investorProfitSharePct)}%` : 'Akad terms not published yet'} · indicative return {Number(pool.indicativeExpectedReturn)}% (not guaranteed)</p>
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-200">{formatProjectMoney(pool.raisedAmount, pool.currency)} of {formatProjectMoney(pool.targetAmount, pool.currency)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
              {(pool.relatedPartyAmount ?? 0) > 0 && <p className="text-amber-700 dark:text-amber-300">Related party: {formatProjectMoney(pool.relatedPartyAmount ?? 0, pool.currency)} of the money raised comes from entities in the same corporate group as the organisation running this project.</p>}
              {terms && (
                <>
                  <button type="button" onClick={() => setOpenTerms(openTerms === pool.poolId ? null : pool.poolId)} className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer">
                    {openTerms === pool.poolId ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}Akad terms, version {terms.version}
                  </button>
                  {openTerms === pool.poolId && <pre className="whitespace-pre-wrap font-sans rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-slate-700 dark:text-slate-300 max-h-64 overflow-y-auto">{terms.termsText}</pre>}
                  <label className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <input type="checkbox" className="mt-0.5" checked={accepted[pool.poolId] === terms.id} onChange={(event) => setAccepted({ ...accepted, [pool.poolId]: event.target.checked ? terms.id : '' })} />
                    I have read the akad terms (version {terms.version}) and accept them for this investment.
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input type="number" min={1} value={amounts[pool.poolId] ?? ''} onChange={(event) => setAmounts({ ...amounts, [pool.poolId]: event.target.value })} placeholder={`Amount (${pool.currency === 'MYR' ? 'RM' : pool.currency})`} className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2" />
                    <button type="button" disabled={!verified || busy === pool.poolId || accepted[pool.poolId] !== terms.id || !(Number(amounts[pool.poolId]) > 0)} onClick={() => void invest(pool)} className="rounded-lg bg-emerald-600 px-4 py-2 font-black text-white disabled:opacity-50 cursor-pointer">{busy === pool.poolId ? 'Placing…' : 'Invest'}</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
        <h3 className="font-black text-sm text-slate-900 dark:text-white">My investment orders ({orders.length})</h3>
        {loaded && orders.length === 0 && <p className="text-slate-500">No orders yet.</p>}
        {orders.map((order) => {
          const status = ORDER_STATUS[order.status] ?? { label: order.status, className: 'bg-slate-500/10 text-slate-600' };
          return (
            <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{order.orderNumber} · {order.pool?.poolName ?? order.poolId}</p>
                <p className="text-slate-500">Placed {order.createdAt.slice(0, 10)}{order.settledAt ? ` · confirmed ${order.settledAt.slice(0, 10)}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 dark:text-white">{formatProjectMoney(Number(order.amount), order.currency)}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${status.className}`}>{status.label}</span>
                {order.status === 'PENDING' && <button type="button" onClick={() => setPayFor(payFor === order.id ? null : order.id)} className="rounded-lg border border-emerald-300 dark:border-emerald-600 px-2 py-1 font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer">{payFor === order.id ? 'Hide' : 'How to pay'}</button>}
                {order.status === 'PENDING' && <button type="button" disabled={busy === order.id} onClick={() => void cancel(order)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1 font-bold cursor-pointer disabled:opacity-50">Cancel</button>}
              </div>
              {payFor === order.id && order.status === 'PENDING' && <div className="w-full"><PaymentInstructionsCard orderId={order.id} notSetUpText={NOT_SET_UP} /></div>}
            </div>
          );
        })}
      </section>
    </div>
  );
};
