import React from 'react';
import { ArrowRight, HandCoins, ShieldCheck } from 'lucide-react';
import { apiClient, PublicOpenPool } from '../../services/apiClient';

const money = (currency: string, amount: number) => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/**
 * The landing page's preview of pools open for investment, from the database (GET /public/open-pools). Visitors
 * see the project, akad, indicative return and progress; investing needs sign-in and approved KYC.
 */
export const LiveOpenPoolsPreview: React.FC<{ onSignIn: () => void; onExplore: () => void }> = ({ onSignIn, onExplore }) => {
  const [pools, setPools] = React.useState<PublicOpenPool[] | null>(null);
  React.useEffect(() => { apiClient.getPublicOpenPools().then(setPools).catch(() => setPools([])); }, []);

  return (
    <section className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <HandCoins className="w-5 h-5 text-emerald-500" />
          <h2 className="text-xl sm:text-2xl font-black">Open for investment</h2>
          <span className="text-[11px] text-slate-500">Pools taking investment now. Returns are indicative, not promised; sign in and complete KYC to invest.</span>
        </div>
        <button onClick={onExplore} className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 hover:underline cursor-pointer">
          <span>Explore as a guest</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      {!pools && <p className="text-xs text-slate-500">Loading…</p>}
      {pools?.length === 0 && <p className="p-5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">No pool is open for investment right now. New pools appear here once they pass Shariah, compliance and risk sign-off.</p>}
      {pools && pools.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pools.map((pool) => {
            const pct = pool.target > 0 ? Math.min(100, Math.round((pool.raised / pool.target) * 1000) / 10) : 0;
            return (
              <div key={pool.poolId} className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm flex flex-col">
                <div className="px-5 py-4 bg-linear-to-br from-emerald-700 to-slate-900 text-white">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-bold">{pool.sector}</span>
                  <p className="mt-2 text-[11px] text-emerald-100">{pool.country} · {pool.akad}</p>
                </div>
                <div className="p-5 space-y-3 flex-1 flex flex-col">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{pool.poolName}</h3>
                    <p className="text-xs text-slate-500">{pool.projectName}</p>
                  </div>
                  <p className="text-xs font-bold text-slate-700">{pool.indicativeExpectedReturn}% a year, indicative</p>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>Raised {pct}%</span>
                      <span>{money(pool.currency, pool.raised)} / {money(pool.currency, pool.target)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    {pool.closesAt && <p className="mt-1 text-[10px] text-slate-500">Closes {new Date(pool.closesAt).toLocaleDateString()}</p>}
                  </div>
                  <button onClick={onSignIn} className="mt-auto w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Sign In to Invest</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
