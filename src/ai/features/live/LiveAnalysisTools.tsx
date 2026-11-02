import React from 'react';
import { AlertTriangle, Gauge, Layers, PieChart, Sparkles } from 'lucide-react';
import { apiClient, BackendPool, BackendProject, InvestorPosition } from '../../../services/apiClient';
import { formatProjectMoney } from '../../../components/sponsor/sponsorMoney';
import { useRBAC } from '../../../rbac/RBACContext';
import { canInvest } from '../../../rbac/menuVisibility';

/**
 * Analysis tools on the platform's own records: open pools, the investor's positions and the projects in scope.
 * They are fixed rules, not a language model, so the same data always gives the same answer and no credits are used.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const CARD = 'bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4';
const TABLE_WRAP = 'overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700';
const THEAD = 'bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400';
const TH = 'px-3 py-2.5 font-black';
const TD = 'px-3 py-2.5';
const pct = (value: number) => `${(Math.round(value * 10) / 10).toLocaleString()}%`;

function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    load().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not be loaded.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { data, error };
}

const Header: React.FC<{ icon: React.ReactNode; title: string; lead: string }> = ({ icon, title, lead }) => (
  <div>
    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">{icon}{title}</h3>
    <p className="text-xs text-slate-500">{lead}</p>
  </div>
);

const State: React.FC<{ error: string; loading: boolean; empty?: boolean; emptyText?: string }> = ({ error, loading, empty, emptyText }) => (
  <>
    {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
    {!error && loading && <p className="text-xs text-slate-500">Loading…</p>}
    {!error && !loading && empty && <p className="text-xs text-slate-500">{emptyText}</p>}
  </>
);

const raisedPct = (pool: BackendPool) => (pool.targetAmount ? Math.min(100, ((pool.raisedAmount ?? 0) / pool.targetAmount) * 100) : 0);
const daysOpen = (pool: BackendPool) => (pool.createdAt ? Math.max(1, Math.round((Date.now() - new Date(pool.createdAt).getTime()) / DAY_MS)) : null);

/** Open pools ranked for the investor: preferred contract, room left, return indicated, and diversification. */
export const LivePoolMatcher: React.FC = () => {
  const { currentRole } = useRBAC();
  const investor = canInvest(currentRole);
  const { data, error } = useLoad(async () => {
    const [pools, me, positions] = await Promise.all([
      apiClient.getPools(),
      apiClient.getCurrentUser().catch(() => null),
      investor ? apiClient.getInvestmentPositions().catch(() => [] as InvestorPosition[]) : Promise.resolve([] as InvestorPosition[]),
    ]);
    const open = pools.filter((pool) => pool.status === 'OPEN');
    const details = await Promise.all(open.map((pool) => apiClient.getPool(pool.poolId).catch(() => null)));
    const saved = (me?.profile?.preferences as { preferredContracts?: unknown } | undefined)?.preferredContracts;
    const liked = Array.isArray(saved) ? saved.map((item) => String(item).toUpperCase()) : [];
    const held = new Set(positions.map((position) => position.poolId));
    return open.map((pool, index) => {
      const akad = details[index]?.akadTerms?.akadType ?? null;
      const reasons: string[] = [];
      let score = 0;
      if (akad && liked.includes(akad.toUpperCase())) { score += 35; reasons.push('Your preferred contract'); }
      const filled = raisedPct({ ...pool, raisedAmount: details[index]?.raisedAmount ?? pool.raisedAmount });
      if (filled < 90) { score += 25 * (1 - filled / 100); reasons.push(`${Math.round(100 - filled)}% of the target still open`); } else reasons.push('Almost full');
      const indicated = Number(pool.indicativeExpectedReturn) || 0;
      score += Math.min(20, indicated * 2);
      if (!held.has(pool.poolId)) { score += 20; reasons.push('Spreads your holdings'); } else reasons.push('You already hold this pool');
      if (!akad) reasons.push('No akad terms yet: cannot invest');
      return { pool, akad, filled, indicated, score: akad ? Math.round(score) : 0, reasons };
    }).sort((a, b) => b.score - a.score);
  });

  return (
    <div className={CARD}>
      <Header icon={<Sparkles className="w-5 h-5 text-purple-600" />} title="Pool Matcher" lead="Open pools in your country, ranked by fixed weights: preferred contract 35, room left 25, indicated return up to 20, a pool you do not hold yet 20. The return is indicative and not guaranteed; read each pool's akad terms in Investments before investing." />
      <State error={error} loading={!data} empty={data?.length === 0} emptyText="No pool is open right now." />
      {data && data.length > 0 && (
        <div className={TABLE_WRAP}>
          <table className="w-full text-xs">
            <thead className={THEAD}><tr><th className={`${TH} text-left`}>Pool</th><th className={`${TH} text-left`}>Akad</th><th className={`${TH} text-right`}>Raised</th><th className={`${TH} text-right`}>Indicated return</th><th className={`${TH} text-right`}>Fit</th><th className={`${TH} text-left`}>Why</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {data.map((row) => (
                <tr key={row.pool.poolId} className="align-top">
                  <td className={`${TD} font-bold text-slate-900 dark:text-white`}>{row.pool.poolName}<p className="font-normal text-slate-500">{row.pool.projectName}</p></td>
                  <td className={TD}>{row.akad ?? '—'}</td>
                  <td className={`${TD} text-right`}>{pct(row.filled)}</td>
                  <td className={`${TD} text-right`}>{pct(row.indicated)}</td>
                  <td className={`${TD} text-right font-black`}>{row.score}</td>
                  <td className={`${TD} text-slate-500`}>{row.reasons.join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/** Share of capital by key; the largest share shows concentration. */
function shares(positions: InvestorPosition[], key: (position: InvestorPosition) => string) {
  const totals = new Map<string, number>();
  for (const position of positions) totals.set(key(position), (totals.get(key(position)) ?? 0) + position.capital);
  const all = [...totals.values()].reduce((sum, value) => sum + value, 0) || 1;
  return [...totals.entries()].map(([name, amount]) => ({ name, amount, share: (amount / all) * 100 })).sort((a, b) => b.amount - a.amount);
}

/** The investor's confirmed holdings: concentration by pool, contract and currency, and profit to date. */
export const LivePortfolioHealth: React.FC = () => {
  const { data, error } = useLoad(apiClient.getInvestmentPositions);
  const held = data?.filter((position) => position.capital > 0) ?? [];
  const byPool = shares(held, (position) => position.poolName);
  const byContract = shares(held, (position) => position.contract);
  const currencies = [...new Set(held.map((position) => position.currency))];
  const warnings = [
    ...(byPool[0] && byPool.length > 0 && byPool[0].share > 50 ? [`${pct(byPool[0].share)} of your capital is in one pool (${byPool[0].name}).`] : []),
    ...(byContract[0] && byContract[0].share > 75 && byContract.length > 0 ? [`${pct(byContract[0].share)} is under one contract type (${byContract[0].name}).`] : []),
    ...(held.some((position) => ['PAUSED', 'CLOSED'].includes(position.poolStatus)) ? ['A pool you hold is paused or closed.'] : []),
    ...((data ?? []).some((position) => position.pendingAmount > 0) ? ['Some orders are still waiting for Finance to confirm your transfer.'] : []),
  ];
  return (
    <div className={CARD}>
      <Header icon={<PieChart className="w-5 h-5 text-purple-600" />} title="Portfolio Health" lead="Your confirmed holdings by pool and contract, and profit earned so far. Warnings appear above 50% in one pool or 75% under one contract." />
      <State error={error} loading={!data} empty={held.length === 0} emptyText="You have no confirmed investment yet." />
      {held.length > 0 && (
        <div className="space-y-4">
          {warnings.length > 0 && <ul className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 space-y-1">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
          {currencies.map((currency) => {
            const mine = held.filter((position) => position.currency === currency);
            const capital = mine.reduce((sum, position) => sum + position.capital, 0);
            const earned = mine.reduce((sum, position) => sum + position.profitEarned, 0);
            return (
              <div key={currency} className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40"><p className="text-[10px] uppercase font-black text-slate-400">Capital</p><p className="font-black">{formatProjectMoney(capital, currency)}</p></div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40"><p className="text-[10px] uppercase font-black text-slate-400">Profit earned</p><p className="font-black">{formatProjectMoney(earned, currency)}</p></div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40"><p className="text-[10px] uppercase font-black text-slate-400">Return so far</p><p className="font-black">{pct(capital ? (earned / capital) * 100 : 0)}</p></div>
              </div>
            );
          })}
          <div className="grid md:grid-cols-2 gap-4">
            {[{ title: 'By pool', rows: byPool }, { title: 'By contract', rows: byContract }].map((group) => (
              <div key={group.title} className="space-y-1.5">
                <p className="text-xs font-black text-slate-700 dark:text-slate-200">{group.title}</p>
                {group.rows.map((row) => (
                  <div key={row.name} className="text-xs">
                    <div className="flex justify-between"><span>{row.name}</span><span className="font-mono">{pct(row.share)}</span></div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${row.share}%` }} /></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** Projects and pools that need attention: slow raising, overdue milestones, paused pools. */
export const LiveEarlyWarning: React.FC = () => {
  const { currentRole } = useRBAC();
  const investor = canInvest(currentRole);
  const { data, error } = useLoad(async () => {
    const [pools, projects, positions] = await Promise.all([
      apiClient.getPools(),
      investor ? Promise.resolve([] as BackendProject[]) : apiClient.getProjects().catch(() => [] as BackendProject[]),
      investor ? apiClient.getInvestmentPositions().catch(() => [] as InvestorPosition[]) : Promise.resolve([] as InvestorPosition[]),
    ]);
    const mine = new Set(positions.map((position) => position.poolId));
    const warnings: Array<{ level: 'HIGH' | 'MEDIUM'; subject: string; detail: string }> = [];
    for (const pool of pools) {
      if (investor && !mine.has(pool.poolId)) continue;
      const days = daysOpen(pool);
      const filled = raisedPct(pool);
      if (pool.status === 'PAUSED') warnings.push({ level: 'HIGH', subject: pool.poolName, detail: 'The pool is paused.' });
      if (pool.status === 'OPEN' && days !== null && days > 60 && filled < 50) warnings.push({ level: 'MEDIUM', subject: pool.poolName, detail: `Open ${days} days with ${pct(filled)} of the target raised.` });
    }
    const today = new Date();
    for (const project of projects) {
      for (const milestone of project.milestones ?? []) {
        if (milestone.targetDate && new Date(milestone.targetDate) < today && milestone.status !== 'COMPLETED' && milestone.completionPct < 100) {
          const late = Math.round((today.getTime() - new Date(milestone.targetDate).getTime()) / DAY_MS);
          warnings.push({ level: late > 30 ? 'HIGH' : 'MEDIUM', subject: project.projectName, detail: `Milestone "${milestone.title}" is ${late} days past its date at ${milestone.completionPct}%.` });
        }
      }
    }
    return warnings.sort((a, b) => (a.level === b.level ? 0 : a.level === 'HIGH' ? -1 : 1));
  });
  return (
    <div className={CARD}>
      <Header icon={<AlertTriangle className="w-5 h-5 text-purple-600" />} title="Risk & Early Warning" lead={investor ? 'Warnings on the pools you hold: paused pools, or pools open more than 60 days with under half the target raised.' : 'Warnings on pools and projects in your scope: paused pools, slow raising (over 60 days open, under half raised) and milestones past their date.'} />
      <State error={error} loading={!data} empty={data?.length === 0} emptyText="No warnings right now." />
      {data && data.length > 0 && (
        <ul className="space-y-2">
          {data.map((warning, index) => (
            <li key={index} className={`p-3 rounded-2xl border text-xs ${warning.level === 'HIGH' ? 'border-rose-200 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/30' : 'border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30'}`}>
              <span className="font-black">{warning.subject}</span>: {warning.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Illustrative losses on the investor's capital: in Mudarabah and Musharakah the investors bear capital losses. */
export const LiveStressScenarios: React.FC = () => {
  const { data, error } = useLoad(apiClient.getInvestmentPositions);
  const [loss, setLoss] = React.useState(25);
  const [scope, setScope] = React.useState('ALL');
  const held = data?.filter((position) => position.capital > 0) ?? [];
  const contracts = [...new Set(held.map((position) => position.contract))];
  const hit = (position: InvestorPosition) => scope === 'ALL' || position.contract === scope;
  const currencies = [...new Set(held.map((position) => position.currency))];
  return (
    <div className={CARD}>
      <Header icon={<Layers className="w-5 h-5 text-purple-600" />} title="Stress Scenarios" lead="What your confirmed capital would be if the projects lost part of it. Illustrative only: in Mudarabah the investors bear capital losses unless the manager was negligent; in Musharakah losses follow capital shares. Profit already paid is not taken back." />
      <State error={error} loading={!data} empty={held.length === 0} emptyText="You have no confirmed investment to test." />
      {held.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4 text-xs">
            <label className="font-bold text-slate-600 dark:text-slate-300">Capital loss: {loss}%<input type="range" min={0} max={100} step={5} value={loss} onChange={(event) => setLoss(Number(event.target.value))} className="block w-56 mt-1" /></label>
            <label className="font-bold text-slate-600 dark:text-slate-300">Applies to<select value={scope} onChange={(event) => setScope(event.target.value)} className="block mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"><option value="ALL">Every pool</option>{contracts.map((contract) => <option key={contract} value={contract}>{contract} pools only</option>)}</select></label>
          </div>
          {currencies.map((currency) => {
            const mine = held.filter((position) => position.currency === currency);
            const capital = mine.reduce((sum, position) => sum + position.capital, 0);
            const lost = mine.filter(hit).reduce((sum, position) => sum + position.capital * (loss / 100), 0);
            const paid = mine.reduce((sum, position) => sum + position.profitPaid, 0);
            return (
              <div key={currency} className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40"><p className="text-[10px] uppercase font-black text-slate-400">Capital now</p><p className="font-black text-base">{formatProjectMoney(capital, currency)}</p></div>
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10"><p className="text-[10px] uppercase font-black text-rose-400">Loss in scenario</p><p className="font-black text-base text-rose-700 dark:text-rose-300">{formatProjectMoney(lost, currency)}</p></div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40"><p className="text-[10px] uppercase font-black text-slate-400">Capital left + profit paid</p><p className="font-black text-base">{formatProjectMoney(capital - lost + paid, currency)}</p></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** For pool managers and admins: how fast each open pool is raising and when it would fill at that pace. */
export const LivePoolSizing: React.FC = () => {
  const { data, error } = useLoad(apiClient.getPools);
  const rows = (data ?? []).filter((pool) => pool.status === 'OPEN').map((pool) => {
    const days = daysOpen(pool);
    const raised = pool.raisedAmount ?? 0;
    const target = pool.targetAmount ?? 0;
    const perDay = days ? raised / days : 0;
    const remaining = Math.max(0, target - raised);
    const daysToFill = perDay > 0 ? Math.ceil(remaining / perDay) : null;
    return { pool, days, raised, target, perDay, remaining, daysToFill };
  });
  return (
    <div className={CARD}>
      <Header icon={<Gauge className="w-5 h-5 text-purple-600" />} title="Pool Sizing" lead="Each open pool's confirmed money against its target, the average raised per day since it was created, and the days to fill at that pace. A pool far from filling may need a smaller target or a longer raising period; changing either needs the project's approvals." />
      <State error={error} loading={!data} empty={rows.length === 0} emptyText="No pool is open right now." />
      {rows.length > 0 && (
        <div className={TABLE_WRAP}>
          <table className="w-full text-xs">
            <thead className={THEAD}><tr><th className={`${TH} text-left`}>Pool</th><th className={`${TH} text-right`}>Raised / target</th><th className={`${TH} text-right`}>Days open</th><th className={`${TH} text-right`}>Per day</th><th className={`${TH} text-right`}>Days to fill</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {rows.map((row) => (
                <tr key={row.pool.poolId}>
                  <td className={`${TD} font-bold text-slate-900 dark:text-white`}>{row.pool.poolName}</td>
                  <td className={`${TD} text-right font-mono`}>{formatProjectMoney(row.raised, row.pool.currency)} / {formatProjectMoney(row.target, row.pool.currency)}</td>
                  <td className={`${TD} text-right`}>{row.days ?? '—'}</td>
                  <td className={`${TD} text-right font-mono`}>{formatProjectMoney(row.perDay, row.pool.currency)}</td>
                  <td className={`${TD} text-right font-black ${row.daysToFill === null || row.daysToFill > 180 ? 'text-amber-600' : ''}`}>{row.remaining === 0 ? 'Full' : row.daysToFill === null ? 'No money yet' : row.daysToFill}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
