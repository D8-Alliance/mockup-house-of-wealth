import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { apiClient, BackendInvestmentOrder, BackendPoolDetail, KycApplication } from '../../services/apiClient';
import { formatProjectMoney } from '../../components/sponsor/sponsorMoney';
import { KYC_STATUS_LABELS } from '../../kyc/kycLabels';

const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

interface MobilePoolDetailProps {
  poolId: string;
  onBack: () => void;
  onOpenPortfolio: () => void;
  onOpenKyc: () => void;
}

/**
 * One pool: its progress, its akad terms to read and accept (ijab and qabul), and the order. The server checks
 * everything again (KYC approved, pool open, the accepted terms are the current ones); an order counts once
 * Finance matches the transfer to the bank.
 */
export const MobilePoolDetail: React.FC<MobilePoolDetailProps> = ({ poolId, onBack, onOpenPortfolio, onOpenKyc }) => {
  const [pool, setPool] = useState<BackendPoolDetail | null>(null);
  const [kyc, setKyc] = useState<KycApplication | null | undefined>(undefined);
  const [loadError, setLoadError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState<BackendInvestmentOrder | null>(null);
  // One key per order attempt: a double tap or a retry after a lost answer cannot place the order twice.
  const [orderKey, setOrderKey] = useState(newKey);

  useEffect(() => {
    apiClient.getPool(poolId).then(setPool).catch((cause) => setLoadError(cause instanceof Error ? cause.message : 'The pool could not be loaded.'));
    apiClient.getMyKyc().then(setKyc).catch(() => setKyc(null));
  }, [poolId]);

  const verified = kyc?.status === 'APPROVED';
  const terms = pool?.akadTerms ?? null;
  const value = Number(amount);
  const canOrder = !!pool && !!terms && verified && accepted && Number.isFinite(value) && value > 0 && !busy;

  const invest = async () => {
    if (!pool || !terms || !canOrder) return;
    setBusy(true);
    setError('');
    try {
      const order = await apiClient.createInvestmentOrder({ poolId: pool.poolId, amount: value, currency: pool.currency, idempotencyKey: orderKey, akadTermsId: terms.id, acceptAkad: true });
      setPlaced(order);
      setOrderKey(newKey());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The order was not placed.');
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">
      <ArrowLeft className="w-4 h-4" />Pools
    </button>
  );

  if (placed) {
    return (
      <div className="space-y-4">
        {back}
        <section className="rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-5 space-y-3">
          <p className="flex items-center gap-2 text-base font-black text-emerald-800 dark:text-emerald-200"><CheckCircle2 className="w-5 h-5" />Order placed</p>
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 space-y-1 text-sm">
            <p className="text-xs text-slate-500">Transfer</p>
            <p className="text-xl font-black">{formatProjectMoney(Number(placed.amount), placed.currency)}</p>
            <p className="text-xs text-slate-500 pt-2">Payment reference</p>
            <p className="text-lg font-black font-mono tracking-wide">{placed.orderNumber}</p>
          </div>
          <p className="text-xs text-emerald-900 dark:text-emerald-100">Transfer the amount to the pool's account and quote the reference. Finance confirms it against the bank; your investment then counts in the pool. Until then you can cancel the order from Portfolio.</p>
          <button type="button" onClick={onOpenPortfolio} className="w-full py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black">See my portfolio</button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {back}
      {loadError && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{loadError}</p>}
      {!pool && !loadError && <p className="text-sm text-slate-500">Loading the pool...</p>}

      {pool && (
        <>
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <h1 className="text-lg font-black leading-snug">{pool.poolName}</h1>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">Akad</span><span className="font-bold">{terms?.akadType ?? pool.investmentStructure}</span></div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><span className="block text-slate-500">Investors' profit share</span><span className="font-bold">{terms ? `${Number(terms.investorProfitSharePct)}%` : 'Not published'}</span></div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 col-span-2"><span className="block text-slate-500">Indicative return (not guaranteed)</span><span className="font-bold">{Number(pool.indicativeExpectedReturn).toFixed(2)}% a year</span></div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                <span>{formatProjectMoney(pool.raisedAmount, pool.currency)} raised</span>
                <span>of {formatProjectMoney(pool.targetAmount, pool.currency)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pool.targetAmount > 0 ? Math.min(100, Math.round((pool.raisedAmount / pool.targetAmount) * 100)) : 0}%` }} /></div>
            </div>
          </section>

          {kyc !== undefined && !verified && (
            <section className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 p-4 text-xs space-y-1">
              <p className="font-black flex items-center gap-2 text-sm"><ShieldAlert className="w-4 h-4 text-amber-600" />Verify your identity before investing</p>
              <p className="text-slate-600 dark:text-slate-300">Orders are accepted once a KYC officer approves your identity verification{kyc ? ` (now: ${KYC_STATUS_LABELS[kyc.status]})` : ''}. </p>
              {kyc?.status !== 'SUBMITTED' && <button type="button" onClick={onOpenKyc} className="mt-2 w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black">Verify my identity</button>}
            </section>
          )}

          {!terms && <p className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-500">The akad terms of this pool are not published yet, so it cannot take orders.</p>}

          {terms && (
            <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full flex items-center justify-between text-sm font-black">
                <span>Akad terms, version {terms.version}</span>
                {showTerms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showTerms && <pre className="whitespace-pre-wrap font-sans text-xs rounded-xl bg-slate-50 dark:bg-slate-800 p-3 max-h-72 overflow-y-auto text-slate-700 dark:text-slate-300">{terms.termsText}</pre>}
              <label className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <input type="checkbox" className="mt-0.5 w-5 h-5 shrink-0" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
                I have read the akad terms (version {terms.version}) and accept them for this investment.
              </label>
              <label className="block text-xs font-bold text-slate-500">
                Amount ({pool.currency === 'MYR' ? 'RM' : pool.currency})
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="e.g. 5000"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-base font-bold text-slate-900 dark:text-white"
                />
              </label>
              {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
              <button type="button" disabled={!canOrder} onClick={() => void invest()} className="w-full py-3.5 rounded-2xl bg-emerald-600 disabled:opacity-50 text-white text-sm font-black">
                {busy ? 'Placing the order...' : value > 0 ? `Invest ${formatProjectMoney(value, pool.currency)}` : 'Invest'}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
};
