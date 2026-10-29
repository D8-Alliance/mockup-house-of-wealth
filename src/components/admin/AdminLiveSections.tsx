import React from 'react';
import { Activity, Building2, FileText, Globe } from 'lucide-react';
import { apiClient, ContractTemplateRow, NetworkOverview, OrganisationDirectoryRow } from '../../services/apiClient';
import { useRBAC } from '../../rbac/RBACContext';
import { LedgerIntegrityPanel } from './LedgerIntegrityPanel';

/** Loads once on mount; the error is shown in place of the table. */
function useServerData<T>(load: () => Promise<T>) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    void load().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not be loaded.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { data, error };
}

const Card: React.FC<{ icon: React.ReactNode; title: string; lead: string; children: React.ReactNode }> = ({ icon, title, lead, children }) => (
  <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
    <div>
      <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">{icon}{title}</h3>
      <p className="text-xs text-slate-500">{lead}</p>
    </div>
    {children}
  </div>
);

const State: React.FC<{ error: string; loading: boolean; empty: boolean; emptyText: string }> = ({ error, loading, empty, emptyText }) => (
  <>
    {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
    {!error && loading && <p className="text-xs text-slate-500">Loading...</p>}
    {!error && !loading && empty && <p className="text-xs text-slate-500">{emptyText}</p>}
  </>
);

const TH = 'px-3 py-2.5 font-black';
const TD = 'px-3 py-2.5';
const label = (code: string) => code.toLowerCase().split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

export const LiveOrganisations: React.FC = () => {
  const { data, error } = useServerData<OrganisationDirectoryRow[]>(apiClient.getOrganisationDirectory);
  return (
    <Card icon={<Building2 className="w-5 h-5 text-purple-600" />} title="Organisations" lead="Every organisation in your scope, its verification (KYB) and what it holds. Verification decisions are made in Organisation Verification.">
      <State error={error} loading={!data} empty={!!data && data.length === 0} emptyText="No organisation is registered yet." />
      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400">
              <tr className="text-left"><th className={TH}>Organisation</th><th className={TH}>Country</th><th className={TH}>KYB</th><th className={`${TH} text-right`}>People</th><th className={`${TH} text-right`}>Projects</th><th className={`${TH} text-right`}>Pools</th><th className={TH}>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {data.map(row => (
                <tr key={row.id}>
                  <td className={TD}><span className="font-bold text-slate-900 dark:text-white">{row.name}</span> <span className="font-mono text-slate-400">{row.id}</span>{row.registrationNumber && <span className="block text-[11px] text-slate-500">Reg. {row.registrationNumber}</span>}</td>
                  <td className={`${TD} font-mono`}>{row.countryNodeId}</td>
                  <td className={TD}>{label(row.kybStatus)}</td>
                  <td className={`${TD} text-right font-mono`}>{row.users}</td>
                  <td className={`${TD} text-right font-mono`}>{row.projects}</td>
                  <td className={`${TD} text-right font-mono`}>{row.pools}</td>
                  <td className={TD}>{label(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export const LiveCountryNodes: React.FC = () => {
  const { data, error } = useServerData<NetworkOverview>(apiClient.getNetworkOverview);
  return (
    <Card icon={<Globe className="w-5 h-5 text-purple-600" />} title="Country Nodes" lead="The D-8 country nodes registered in the database, each with its own currency. A new node is added by a database migration, not from this screen.">
      <State error={error} loading={!data} empty={!!data && data.countries.length === 0} emptyText="No country node is registered." />
      {data && data.countries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400">
              <tr className="text-left"><th className={TH}>Country</th><th className={TH}>Currency</th><th className={`${TH} text-right`}>Organisations</th><th className={`${TH} text-right`}>People</th><th className={`${TH} text-right`}>Projects</th><th className={`${TH} text-right`}>Pools</th><th className={TH}>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {data.countries.map(row => (
                <tr key={row.code}>
                  <td className={TD}><span className="font-bold text-slate-900 dark:text-white">{row.name}</span> <span className="font-mono text-slate-400">{row.code}</span></td>
                  <td className={`${TD} font-mono`}>{row.currency}</td>
                  <td className={`${TD} text-right font-mono`}>{row.organisations}</td>
                  <td className={`${TD} text-right font-mono`}>{row.users}</td>
                  <td className={`${TD} text-right font-mono`}>{row.projects}</td>
                  <td className={`${TD} text-right font-mono`}>{row.pools}</td>
                  <td className={TD}>{label(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export const LiveContractTemplates: React.FC = () => {
  const { data, error } = useServerData<ContractTemplateRow[]>(apiClient.getContractTemplates);
  return (
    <Card icon={<FileText className="w-5 h-5 text-purple-600" />} title="Contract Templates" lead="The contract templates in your scope and how many approved clauses each carries. Agreements are drafted from these in AI Wealth Engine, Agreement Generation.">
      <State error={error} loading={!data} empty={!!data && data.length === 0} emptyText="No contract template is stored yet." />
      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400">
              <tr className="text-left"><th className={TH}>Template</th><th className={TH}>Contract</th><th className={TH}>Jurisdiction</th><th className={`${TH} text-right`}>Version</th><th className={`${TH} text-right`}>Approved clauses</th><th className={TH}>Approval</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {data.map(row => (
                <tr key={row.id}>
                  <td className={`${TD} font-bold text-slate-900 dark:text-white`}>{row.templateName}</td>
                  <td className={TD}>{row.contractType}</td>
                  <td className={TD}>{row.jurisdiction}</td>
                  <td className={`${TD} text-right font-mono`}>v{row.version}</td>
                  <td className={`${TD} text-right font-mono`}>{row.clauses.length}</td>
                  <td className={TD}>{label(row.approvalStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

/** What the browser can check right now: the API answers, how fast, and whether the audit and ledger chains hold. */
export const LiveSystemStatus: React.FC = () => {
  const { currentRole } = useRBAC();
  const [health, setHealth] = React.useState<{ ok: boolean; ms: number; time?: string; error?: string } | null>(null);
  const check = React.useCallback(() => {
    const started = performance.now();
    setHealth(null);
    void apiClient.getHealth()
      .then((result) => setHealth({ ok: result.status === 'ok', ms: Math.round(performance.now() - started), time: result.time }))
      .catch((cause) => setHealth({ ok: false, ms: Math.round(performance.now() - started), error: cause instanceof Error ? cause.message : 'No answer' }));
  }, []);
  React.useEffect(check, [check]);
  return (
    <div className="space-y-6">
      <Card icon={<Activity className="w-5 h-5 text-purple-600" />} title="System Status" lead="Checked from your browser now. Server metrics (CPU, memory, disk) are watched in the DigitalOcean console, not here.">
        {!health && <p className="text-xs text-slate-500">Checking the API...</p>}
        {health && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className={`px-3 py-1 rounded-full font-extrabold border ${health.ok ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 border-rose-500/20'}`}>{health.ok ? 'API answering' : 'API not answering'}</span>
            <span className="font-mono text-slate-500">{health.ms} ms round trip</span>
            {health.time && <span className="text-slate-500">Server time {new Date(health.time).toLocaleString()}</span>}
            {health.error && <span className="text-rose-600">{health.error}</span>}
            <button type="button" onClick={check} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 font-bold cursor-pointer">Check again</button>
          </div>
        )}
      </Card>
      {(currentRole === 'Super Admin' || currentRole === 'Auditor') && <LedgerIntegrityPanel canSeal={currentRole === 'Super Admin'} />}
    </div>
  );
};
