import React from 'react';
import { GitPullRequest, KeyRound, Megaphone, TrendingUp } from 'lucide-react';
import { apiClient, PlatformRevenue, WorkflowPipeline } from '../../services/apiClient';

/** Loads once on mount; the error is shown in place of the content. */
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

const Status: React.FC<{ error: string; loading: boolean }> = ({ error, loading }) => (
  <>
    {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
    {!error && loading && <p className="text-xs text-slate-500">Loading...</p>}
  </>
);

const TH = 'px-3 py-2.5 font-black';
const TD = 'px-3 py-2.5';
const label = (code: string) => code.toLowerCase().split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
const rm = (value: number) => `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Where records stand in each workflow; the stages and who acts at each are fixed in the server code. */
export const LiveWorkflowPipelines: React.FC = () => {
  const { data, error } = useServerData<WorkflowPipeline[]>(apiClient.getWorkflowPipelines);
  return (
    <Card icon={<GitPullRequest className="w-5 h-5 text-purple-600" />} title="Workflow Pipelines" lead="How many records stand at each stage of each workflow, in your scope. The stages and who decides each one are fixed in the server code, not configured here.">
      <Status error={error} loading={!data} />
      {data && (
        <div className="space-y-4">
          {data.map(pipeline => {
            const total = pipeline.stages.reduce((sum, stage) => sum + stage.count, 0);
            return (
              <div key={pipeline.key} className="space-y-2">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-black text-slate-900 dark:text-white">{pipeline.label}</span>
                  <span className="text-slate-500">{total} in total</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pipeline.stages.map((stage, index) => (
                    <React.Fragment key={stage.status}>
                      {index > 0 && <span className="text-slate-300 self-center">›</span>}
                      <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${stage.count ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                        {label(stage.status)} <span className="font-mono">{stage.count}</span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const ACTIONS = ['create', 'read', 'update', 'delete', 'approve', 'disburse', 'audit', 'export'];

/** Each role's permissions as the server enforces them (server/src/policy/permissions.ts). */
export const LivePermissionMatrix: React.FC = () => {
  const { data, error } = useServerData<Array<{ role: string; permissions: Record<string, string[]> }>>(apiClient.getServerPermissions);
  const [role, setRole] = React.useState('Super Admin');
  const selected = data?.find(row => row.role === role) ?? data?.[0];
  const resources = selected ? Object.keys(selected.permissions) : [];
  return (
    <Card icon={<KeyRound className="w-5 h-5 text-purple-600" />} title="Permission Matrix" lead="What each role may do on each resource, read from the server's policy. Changing it is a code change with its tests, not a setting.">
      <Status error={error} loading={!data} />
      {data && selected && (
        <>
          <select value={selected.role} onChange={event => setRole(event.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold">
            {data.map(row => <option key={row.role} value={row.role}>{row.role}</option>)}
          </select>
          {resources.length === 0 ? <p className="text-xs text-slate-500">This role has no permissions.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr className="text-left">
                    <th className={TH}>Resource</th>
                    {ACTIONS.map(action => <th key={action} className={`${TH} text-center`}>{action}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {resources.map(resource => (
                    <tr key={resource}>
                      <td className={`${TD} font-bold text-slate-900 dark:text-white`}>{label(resource)}</td>
                      {ACTIONS.map(action => (
                        <td key={action} className={`${TD} text-center`}>
                          {selected.permissions[resource]?.includes(action)
                            ? <span className="text-emerald-600 font-black" aria-label="allowed">✓</span>
                            : <span className="text-slate-300" aria-label="not allowed">·</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

/** Platform income from paid payment records; zakat collected for payers is not income and is left out. */
export const LiveRevenue: React.FC = () => {
  const { data, error } = useServerData<PlatformRevenue>(apiClient.getPlatformRevenue);
  const peak = Math.max(1, ...(data?.byMonth.map(month => month.amountMYR) ?? [1]));
  return (
    <Card icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} title="Revenue" lead="Paid membership, AI credit and promotion payments recorded by the platform. Zakat is collected for payers and is not income, so it is not counted.">
      <Status error={error} loading={!data} />
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-[11px] font-bold text-slate-500">Total paid</p>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{rm(data.totalMYR)}</p>
            </div>
            {data.byProduct.map(row => (
              <div key={row.productType} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-bold text-slate-500">{label(row.productType)}</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{rm(row.amountMYR)}</p>
                <p className="text-[11px] text-slate-500">{row.count} payment{row.count === 1 ? '' : 's'}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 dark:text-white mb-2">Paid per month, last 12 months (RM)</p>
            <div className="flex items-end gap-1.5 h-32">
              {data.byMonth.map(month => (
                <div key={month.month} className="flex-1 flex flex-col items-center justify-end h-full" title={`${month.month}: ${rm(month.amountMYR)}`}>
                  <div className="w-full rounded-t-md bg-emerald-500/70" style={{ height: `${Math.round((month.amountMYR / peak) * 100)}%`, minHeight: month.amountMYR ? 2 : 0 }} />
                  <span className="mt-1 text-[9px] text-slate-400">{month.month.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
          {data.activeMemberships.length > 0 && (
            <p className="text-xs text-slate-600 dark:text-slate-300">Active memberships: {data.activeMemberships.map(row => `${row.tier} ${row.count}`).join(' · ')}</p>
          )}
          <div className="overflow-x-auto">
            <p className="text-xs font-black text-slate-900 dark:text-white mb-2">Latest payments</p>
            {data.latest.length === 0 ? <p className="text-xs text-slate-500">No payment recorded yet.</p> : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr className="text-left">
                    <th className={TH}>Date</th><th className={TH}>Product</th><th className={`${TH} text-right`}>Amount</th>
                    <th className={TH}>Provider</th><th className={TH}>Status</th><th className={TH}>Organisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {data.latest.map(row => (
                    <tr key={row.id}>
                      <td className={`${TD} whitespace-nowrap`}>{new Date(row.paidAt ?? row.createdAt).toLocaleDateString()}</td>
                      <td className={TD}>{label(row.productType)}</td>
                      <td className={`${TD} text-right font-mono whitespace-nowrap`}>{rm(row.amountMYR)}</td>
                      <td className={TD}>{label(row.provider)}</td>
                      <td className={TD}>{label(row.status)}</td>
                      <td className={`${TD} font-mono text-slate-500`}>{row.organisationId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

/** Project promotion campaigns bought by delivery partners, with what each has drawn so far. */
export const LivePromotions: React.FC = () => {
  const { data, error } = useServerData<PlatformRevenue>(apiClient.getPlatformRevenue);
  return (
    <Card icon={<Megaphone className="w-5 h-5 text-amber-500" />} title="Marketplace Promotions" lead="Promotion campaigns on projects, their payment and their results. Delivery partners buy them from their project page.">
      <Status error={error} loading={!data} />
      {data && data.campaigns.length === 0 && <p className="text-xs text-slate-500">No promotion campaign has been bought yet.</p>}
      {data && data.campaigns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400">
              <tr className="text-left">
                <th className={TH}>Project</th><th className={TH}>Package</th><th className={TH}>Runs</th><th className={`${TH} text-right`}>Price</th>
                <th className={TH}>Payment</th><th className={`${TH} text-right`}>Views · clicks · leads</th><th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {data.campaigns.map(row => (
                <tr key={row.id}>
                  <td className={`${TD} font-bold text-slate-900 dark:text-white`}>{row.projectName}</td>
                  <td className={TD}>{row.packageName}</td>
                  <td className={`${TD} whitespace-nowrap`}>{new Date(row.startDate).toLocaleDateString()}{row.endDate ? ` – ${new Date(row.endDate).toLocaleDateString()}` : ''}</td>
                  <td className={`${TD} text-right font-mono whitespace-nowrap`}>{row.creditsCost ? `${row.creditsCost} credits` : rm(row.priceMYR)}</td>
                  <td className={TD}>{label(row.paymentStatus)}</td>
                  <td className={`${TD} text-right font-mono`}>{row.views} · {row.clicks} · {row.investorLeads}</td>
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
