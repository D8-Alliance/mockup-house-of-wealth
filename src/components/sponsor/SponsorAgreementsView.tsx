import React, { useEffect, useState } from 'react';
import { AlertTriangle, Banknote, FileText, HandCoins, RefreshCw, Scale } from 'lucide-react';
import { apiClient, apiErrorMessage, BackendDistribution, BackendFundingRequest, BackendPool, BackendProject } from '../../services/apiClient';
import { akadApi, AKAD_LABELS, PoolAkadTerms } from '../../services/akadApi';

/**
 * "My Contracts" for a delivery partner (PDP). A PDP receives funding and owes profit to
 * investors, so this shows its pools' akad terms, funding received and profit paid, all
 * read from the server, instead of the investor portfolio view.
 */

interface PoolRow {
  pool: BackendPool;
  project?: BackendProject;
  terms: PoolAkadTerms | null;
  termsError?: string;
}

const num = (value: number | string | null | undefined) => Number(value ?? 0) || 0;

/** Totals per currency, since a sponsor can hold pools in more than one currency. */
function sumByCurrency(items: { amount: number; currency: string }[]): string {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.amount);
  if (!totals.size) return '0';
  return [...totals].map(([currency, amount]) => `${currency} ${amount.toLocaleString()}`).join(' + ');
}

const FUNDING_STATUS_STYLE: Record<string, string> = {
  DISBURSED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  APPROVED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
  PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
};

export const SponsorAgreementsView: React.FC = () => {
  const [rows, setRows] = useState<PoolRow[]>([]);
  const [funding, setFunding] = useState<BackendFundingRequest[]>([]);
  const [distributions, setDistributions] = useState<BackendDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [projects, pools, paid] = await Promise.all([apiClient.getProjects(), apiClient.getPools(), apiClient.getDistributions().catch(() => [])]);
      const termResults = await Promise.allSettled(pools.map(pool => akadApi.getTerms(pool.poolId)));
      setRows(pools.map((pool, index) => {
        const result = termResults[index];
        return {
          pool,
          project: projects.find(project => project.projectId === pool.projectId),
          terms: result.status === 'fulfilled' ? result.value.current : null,
          termsError: result.status === 'rejected' ? apiErrorMessage(result.reason, 'Unable to load akad terms.') : undefined,
        };
      }));
      const fundingResults = await Promise.allSettled(projects.map(project => apiClient.getFundingRequests(project.projectId)));
      setFunding(fundingResults.flatMap(result => (result.status === 'fulfilled' ? result.value : [])));
      setDistributions(paid);
    } catch (loadError) {
      setError(apiErrorMessage(loadError, 'Unable to load your pool agreements.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const disbursed = funding.filter(request => request.status === 'DISBURSED');
  const awaiting = funding.filter(request => request.status === 'PENDING' || request.status === 'APPROVED');
  const withoutTerms = rows.filter(row => !row.terms && !row.termsError);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Pool Agreements</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            The akad terms investors accept for your pools, the funding you have received, and the profit you have paid them.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 self-start" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><Banknote className="w-3.5 h-3.5" /> Funding received</span>
          <span className="text-xl font-black text-slate-900 dark:text-white block">{loading ? '...' : sumByCurrency(disbursed.map(request => ({ amount: num(request.requestedAmount), currency: request.currency })))}</span>
          <span className="text-xs text-slate-500">{loading ? '' : `${disbursed.length} disbursed · ${awaiting.length} awaiting approval or release`}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><Scale className="w-3.5 h-3.5" /> Pools with akad terms</span>
          <span className="text-xl font-black text-slate-900 dark:text-white block">{loading ? '...' : `${rows.length - withoutTerms.length} of ${rows.length}`}</span>
          <span className="text-xs text-slate-500">{loading ? '' : withoutTerms.length ? `${withoutTerms.length} pool(s) cannot take investments until terms are published` : 'Every pool can take investments'}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><HandCoins className="w-3.5 h-3.5" /> Profit paid to investors</span>
          <span className="text-xl font-black text-slate-900 dark:text-white block">{loading ? '...' : sumByCurrency(distributions.map(item => ({ amount: num(item.investorProfit ?? item.totalAmount), currency: item.currency })))}</span>
          <span className="text-xs text-slate-500">{loading ? '' : distributions.length ? `${distributions.length} distribution(s) posted` : 'No profit distribution yet'}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Pool and project</th>
              <th className="px-4 py-3">Akad</th>
              <th className="px-4 py-3">Profit split</th>
              <th className="px-4 py-3">Terms</th>
              <th className="px-4 py-3">Expected return</th>
              <th className="px-4 py-3">Pool status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No pools yet. A pool is opened for your project after it is approved.</td></tr>
            )}
            {rows.map(({ pool, project, terms, termsError }) => {
              const investorPct = terms ? num(terms.investorProfitSharePct) : null;
              return (
                <tr key={pool.poolId}>
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900 dark:text-white block">{pool.poolName}</span>
                    <span className="text-slate-500">{project?.projectName ?? pool.projectId}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{terms ? AKAD_LABELS[terms.akadType] : pool.investmentStructure}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {investorPct === null ? '—' : `Investors ${investorPct}% · You ${100 - investorPct}%`}
                  </td>
                  <td className="px-4 py-3">
                    {terms && <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold"><FileText className="w-3.5 h-3.5" /> Version {terms.version}</span>}
                    {!terms && !termsError && <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold"><AlertTriangle className="w-3.5 h-3.5" /> Not published</span>}
                    {termsError && <span className="text-rose-600">{termsError}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{num(pool.indicativeExpectedReturn)}% (indicative)</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-200">{pool.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-black text-slate-900 dark:text-white">Funding requests</h2>
        {!loading && funding.length === 0 && <p className="text-xs text-slate-500">No funding requested yet. Request funding from the Sponsor Portal once a pool is open.</p>}
        <ul className="space-y-2">
          {funding.map(request => (
            <li key={request.fundingRequestId} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs">
              <span className="text-slate-700 dark:text-slate-200">{request.purpose}</span>
              <span className="flex items-center gap-2">
                <span className="font-black text-slate-900 dark:text-white">{request.currency} {num(request.requestedAmount).toLocaleString()}</span>
                <span className={`px-2 py-0.5 rounded-lg border font-bold ${FUNDING_STATUS_STYLE[request.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>{request.status}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
