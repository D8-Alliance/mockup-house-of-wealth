import React from 'react';
import { Globe2, Users, FolderKanban, Hourglass, ChevronRight, Building2 } from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';
import { MetricCard } from './MetricCard';
import { NavTab } from '../../types';
import { apiClient, NetworkOverview } from '../../services/apiClient';

interface NetworkDashboardWidgetsProps {
  /** Super Admin sees every country; a Country Admin sees only theirs (the server scopes it). */
  scope: 'global' | 'country';
  setTab: (tab: NavTab) => void;
}

const money = (value: number, currency: string) => `${currency === 'MYR' ? 'RM' : currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/** The country network as the database has it: no figure on this card is made up. */
export const NetworkDashboardWidgets: React.FC<NetworkDashboardWidgetsProps> = ({ scope, setTab }) => {
  const { canAccessTab } = useRBAC();
  const [overview, setOverview] = React.useState<NetworkOverview | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    void apiClient.getNetworkOverview().then(setOverview).catch(() => setFailed(true));
  }, []);

  const pending = failed ? '—' : 'Loading...';
  const waiting = overview?.waiting;
  const waitingTotal = waiting ? waiting.settlements + waiting.trancheRequests + waiting.assetsToVerify + waiting.kybToReview : 0;
  const single = scope === 'country' ? overview?.countries[0] : undefined;

  // Payments and tranches are decided in the queue further down this dashboard.
  const toQueue = () => document.getElementById('funding-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const waitingItems = waiting ? [
    { label: 'Investor payments to settle', count: waiting.settlements, allowed: true, open: toQueue },
    { label: 'Tranche releases to decide or pay', count: waiting.trancheRequests, allowed: true, open: toQueue },
    { label: 'Assets waiting for verification', count: waiting.assetsToVerify, allowed: canAccessTab('assets'), open: () => setTab('assets') },
    { label: 'Organisation KYB to review', count: waiting.kybToReview, allowed: canAccessTab('admin-center'), open: () => setTab('admin-center') },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scope === 'global' ? (
          <MetricCard label="Country Nodes" value={overview ? `${overview.totals.activeCountries} / ${overview.totals.countries} active` : pending} sub="Registered in the database" icon={<Globe2 className="w-5 h-5 text-purple-500" />} />
        ) : (
          <MetricCard label="Projects Value" value={single ? money(single.projectValue, single.currency) : pending} sub={single ? `${single.projects} submitted project${single.projects === 1 ? '' : 's'}` : 'Submitted projects'} icon={<Building2 className="w-5 h-5 text-emerald-500" />} />
        )}
        <MetricCard label="Platform Users" value={overview ? overview.totals.users.toLocaleString() : pending} sub={overview ? `${overview.totals.organisations} organisation${overview.totals.organisations === 1 ? '' : 's'}` : 'With an active role'} icon={<Users className="w-5 h-5 text-blue-500" />} />
        {scope === 'global' ? (
          <MetricCard label="Projects & Pools" value={overview ? `${overview.totals.projects} projects` : pending} sub={overview ? `${overview.totals.pools} wealth pool${overview.totals.pools === 1 ? '' : 's'}; drafts not counted` : 'Submitted projects'} icon={<FolderKanban className="w-5 h-5 text-emerald-500" />} />
        ) : (
          <MetricCard label="Investor Funds Settled" value={single ? money(single.settled, single.currency) : pending} sub={single ? `${single.pools} wealth pool${single.pools === 1 ? '' : 's'}` : 'Confirmed by Finance'} icon={<FolderKanban className="w-5 h-5 text-teal-500" />} />
        )}
        <MetricCard label="Waiting For Action" value={overview ? waitingTotal.toString() : pending} sub="Payments, tranches, assets and KYB" icon={<Hourglass className="w-5 h-5 text-amber-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-purple-500" />
            <span>{scope === 'global' ? 'D-8 Country Nodes' : 'Your Country Node'}</span>
          </h3>
          {failed && <p className="text-xs text-rose-600">The country figures could not be loaded. Refresh to try again.</p>}
          {!overview && !failed && <p className="text-xs text-slate-500">Loading...</p>}
          {overview && overview.countries.length === 0 && <p className="text-xs text-slate-500">No country node is registered yet.</p>}
          {overview && overview.countries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="py-2 pr-3 font-black">Country</th>
                    <th className="py-2 pr-3 font-black text-right">Organisations</th>
                    <th className="py-2 pr-3 font-black text-right">Users</th>
                    <th className="py-2 pr-3 font-black text-right">Projects</th>
                    <th className="py-2 pr-3 font-black text-right">Project value</th>
                    <th className="py-2 pr-3 font-black text-right">Settled</th>
                    <th className="py-2 font-black text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {overview.countries.map(country => (
                    <tr key={country.code}>
                      <td className="py-2.5 pr-3 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">{country.name} <span className="font-mono font-normal text-slate-400">{country.code}</span></td>
                      <td className="py-2.5 pr-3 text-right font-mono">{country.organisations}</td>
                      <td className="py-2.5 pr-3 text-right font-mono">{country.users}</td>
                      <td className="py-2.5 pr-3 text-right font-mono">{country.projects}</td>
                      <td className="py-2.5 pr-3 text-right font-mono whitespace-nowrap">{money(country.projectValue, country.currency)}</td>
                      <td className="py-2.5 pr-3 text-right font-mono whitespace-nowrap">{money(country.settled, country.currency)}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded-md font-extrabold border ${country.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                          {country.status === 'ACTIVE' ? 'Active' : country.status.charAt(0) + country.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] text-slate-400">Each country in its own currency. Projects exclude drafts; settled is investor money Finance has confirmed.</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Hourglass className="w-5 h-5 text-amber-500" />
            <span>Waiting For Action</span>
          </h3>
          <div className="space-y-2 text-xs">
            {!overview && <p className="text-slate-500">{pending}</p>}
            {waitingItems.map(item => (
              <button
                key={item.label}
                type="button"
                disabled={!item.allowed}
                onClick={item.open}
                className="w-full p-3 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold rounded-xl text-left flex items-center justify-between cursor-pointer disabled:cursor-default"
              >
                <span>{item.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className={`min-w-6 px-1.5 py-0.5 rounded-md text-center font-black ${item.count ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300'}`}>{item.count}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </span>
              </button>
            ))}
            {canAccessTab('ledger') && (
              <button type="button" onClick={() => setTab('ledger')} className="w-full p-3 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold rounded-xl text-left flex items-center justify-between cursor-pointer">
                <span>Open Audit Ledger</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
