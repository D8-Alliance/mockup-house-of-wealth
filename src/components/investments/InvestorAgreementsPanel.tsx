import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, FileSignature, RefreshCw } from 'lucide-react';
import { apiClient, BackendInvestmentOrder } from '../../services/apiClient';
import { AKAD_LABELS, AkadType } from '../../services/akadApi';
import { formatProjectMoney } from '../sponsor/sponsorMoney';

type Agreement = {
  termsId: string;
  poolName: string;
  terms: NonNullable<BackendInvestmentOrder['akadTerms']>;
  acceptedAt: string | null;
  currency: string;
  confirmed: number;
  awaiting: number;
  orders: number;
};

/**
 * The akad (Shariah contract) terms the investor accepted with their orders, one per pool and terms
 * version, with the full text they agreed to. Read from their own orders on the server, so it stays
 * readable after the pool fills up and is no longer listed. Cancelled orders made no agreement.
 */
export function agreementsFrom(orders: BackendInvestmentOrder[]): Agreement[] {
  const byTerms = new Map<string, Agreement>();
  for (const order of orders) {
    if (!order.akadTerms || order.status === 'CANCELLED') continue;
    const current = byTerms.get(order.akadTerms.id) ?? { termsId: order.akadTerms.id, poolName: order.pool?.poolName ?? order.poolId, terms: order.akadTerms, acceptedAt: null, currency: order.currency, confirmed: 0, awaiting: 0, orders: 0 };
    const amount = Number(order.amount);
    if (order.status === 'SETTLED') current.confirmed += amount;
    else current.awaiting += amount;
    current.orders += 1;
    // The first acceptance is when the agreement was made.
    if (order.akadAcceptedAt && (!current.acceptedAt || order.akadAcceptedAt < current.acceptedAt)) current.acceptedAt = order.akadAcceptedAt;
    byTerms.set(order.akadTerms.id, current);
  }
  return [...byTerms.values()].sort((a, b) => (b.acceptedAt ?? '').localeCompare(a.acceptedAt ?? ''));
}

export const InvestorAgreementsPanel: React.FC = () => {
  const [orders, setOrders] = useState<BackendInvestmentOrder[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = () => {
    setError('');
    apiClient.getInvestmentOrders()
      .then(setOrders)
      .catch((cause) => { setOrders([]); setError(cause instanceof Error ? cause.message : 'Your agreements could not be loaded.'); });
  };
  useEffect(load, []);

  const agreements = orders ? agreementsFrom(orders) : null;
  const date = (value: string) => new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 text-xs">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white"><FileSignature className="w-4 h-4 text-emerald-600" />My agreements</h3>
        <button type="button" onClick={load} className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>
      {error && <p className="text-rose-600 font-bold">{error}</p>}
      {agreements === null && <p className="text-slate-500">Loading…</p>}
      {agreements && agreements.length === 0 && !error && <p className="text-slate-500">You have not accepted any akad terms yet. When you invest in a pool, the terms you accept are kept here.</p>}
      {agreements?.map((agreement) => {
        const share = Number(agreement.terms.investorProfitSharePct);
        const isOpen = open === agreement.termsId;
        return (
          <div key={agreement.termsId} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-black text-sm text-slate-900 dark:text-white">{agreement.poolName}</p>
                <p className="text-slate-500">
                  {AKAD_LABELS[agreement.terms.akadType as AkadType] ?? agreement.terms.akadType} · your profit share {share}%, manager {Math.max(0, 100 - share)}% · terms version {agreement.terms.version}
                </p>
                {agreement.acceptedAt && <p className="text-slate-400">Accepted {date(agreement.acceptedAt)}</p>}
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900 dark:text-white block">{formatProjectMoney(agreement.confirmed, agreement.currency)} confirmed</span>
                {agreement.awaiting > 0 && <span className="font-semibold text-amber-600 block">{formatProjectMoney(agreement.awaiting, agreement.currency)} awaiting confirmation</span>}
                <span className="text-slate-400">{agreement.orders} order{agreement.orders === 1 ? '' : 's'}</span>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(isOpen ? null : agreement.termsId)} className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer">
              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}Read the terms you accepted
            </button>
            {isOpen && (
              <>
                <pre className="whitespace-pre-wrap font-sans rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-slate-700 dark:text-slate-300 max-h-72 overflow-y-auto">{agreement.terms.termsText}</pre>
                <p className="text-[10px] text-slate-400 font-mono break-all">Fingerprint (SHA-256): {agreement.terms.termsHash}</p>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
};
