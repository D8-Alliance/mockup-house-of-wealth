import React from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText, GitPullRequest, Globe, Lock, ReceiptText, ShieldAlert, DollarSign } from 'lucide-react';
import { apiClient, CountryRules, FeeSchedule } from '../../services/apiClient';
import { formatProjectMoney } from '../sponsor/sponsorMoney';
import { Card, label, Status, TD, TH, useServerData } from './AdminLivePlatformSections';

const THEAD = 'bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400';
const TABLE_WRAP = 'overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700';

const Tile: React.FC<{ title: string; value: React.ReactNode; sub?: string; warn?: boolean }> = ({ title, value, sub, warn }) => (
  <div className={`p-4 rounded-2xl border ${warn ? 'border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40'}`}>
    <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">{title}</p>
    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
    {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
  </div>
);

/** Counts per status, as chips. */
const StatusCounts: React.FC<{ title: string; counts: Record<string, number> }> = ({ title, counts }) => {
  const entries = Object.entries(counts);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-black text-slate-700 dark:text-slate-200">{title}</p>
      {entries.length === 0 ? <p className="text-xs text-slate-400">None yet.</p> : (
        <div className="flex flex-wrap gap-1.5">
          {entries.map(([status, count]) => <span key={status} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">{label(status)} <span className="font-mono">{count}</span></span>)}
        </div>
      )}
    </div>
  );
};

/** Amounts per status and currency, as a small table. */
const MoneyByStatus: React.FC<{ title: string; data: Record<string, Record<string, number>> }> = ({ title, data }) => {
  const rows = Object.entries(data).flatMap(([status, byCurrency]) => Object.entries(byCurrency).map(([currency, amount]) => ({ status, currency, amount })));
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-black text-slate-700 dark:text-slate-200">{title}</p>
      {rows.length === 0 ? <p className="text-xs text-slate-400">None yet.</p> : (
        <div className={TABLE_WRAP}>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {rows.map((row) => <tr key={`${row.status}-${row.currency}`}><td className={TD}>{label(row.status)}</td><td className={`${TD} text-right font-mono`}>{formatProjectMoney(row.amount, row.currency)}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface ComplianceData { kyc: Record<string, number>; kyb: Record<string, number>; assets: Record<string, number>; agreements: Record<string, number>; oldestKycWaitingDays: number | null; oldestKybWaitingDays: number | null; relatedParty: Array<{ currency: string; orders: number; amount: number }>; privacyConsentsLast30Days: number; users: number; openIncidents: number; highRisks: number }

export const LiveComplianceDashboard: React.FC = () => {
  const { data, error } = useServerData<ComplianceData>(() => apiClient.getGovernanceDashboard<ComplianceData>('compliance'));
  return (
    <Card icon={<BarChart3 className="w-5 h-5 text-purple-600" />} title="Compliance Dashboard" lead="Verification queues, related-party investment, incidents and high risks in your scope, from the database.">
      <Status error={error} loading={!data} />
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile title="KYC waiting" value={data.kyc.SUBMITTED ?? 0} sub={data.oldestKycWaitingDays !== null ? `Oldest ${data.oldestKycWaitingDays} days` : 'Nothing waiting'} warn={(data.oldestKycWaitingDays ?? 0) > 7} />
            <Tile title="KYB waiting" value={data.kyb.SUBMITTED ?? 0} sub={data.oldestKybWaitingDays !== null ? `Oldest ${data.oldestKybWaitingDays} days` : 'Nothing waiting'} warn={(data.oldestKybWaitingDays ?? 0) > 7} />
            <Tile title="Open incidents" value={data.openIncidents} warn={data.openIncidents > 0} />
            <Tile title="High risks (score 15+)" value={data.highRisks} warn={data.highRisks > 0} />
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <StatusCounts title="Investor KYC" counts={data.kyc} />
            <StatusCounts title="Organisation KYB" counts={data.kyb} />
            <StatusCounts title="Asset verification" counts={data.assets} />
            <StatusCounts title="Agreements" counts={data.agreements} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-black text-slate-700 dark:text-slate-200">Related-party investment (pending and confirmed)</p>
            {data.relatedParty.length === 0 ? <p className="text-xs text-slate-400">None.</p> : data.relatedParty.map((row) => <p key={row.currency} className="text-xs text-amber-700 dark:text-amber-300 font-bold">{row.orders} orders · {formatProjectMoney(row.amount, row.currency)}</p>)}
          </div>
          <p className="text-[11px] text-slate-500">{data.privacyConsentsLast30Days} of {data.users} users accepted the privacy notice in the last 30 days.</p>
        </div>
      )}
    </Card>
  );
};

interface AuditData { totalLast30Days: number; byAction: Array<{ action: string; count: number }>; byResource: Array<{ resourceType: string; count: number }>; failures: Array<{ id: string; action: string; resourceType: string; resourceId: string; userEmail: string | null; result: string; createdAt: string }>; perDay: Array<{ day: string; events: number }>; chains: Array<{ chain: string; records: number; lastSealedAt: string | null }> }

export const LiveAuditDashboard: React.FC = () => {
  const { data, error } = useServerData<AuditData>(() => apiClient.getGovernanceDashboard<AuditData>('audit'));
  const peak = Math.max(1, ...(data?.perDay.map((row) => row.events) ?? [1]));
  return (
    <Card icon={<FileSpreadsheet className="w-5 h-5 text-purple-600" />} title="Audit Dashboard" lead="Audit log activity in the last 30 days, failed actions, and when the hash chains were last sealed. Full records are in Audit Logs.">
      <Status error={error} loading={!data} />
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile title="Events (30 days)" value={data.totalLast30Days} />
            <Tile title="Failed actions" value={data.failures.length} warn={data.failures.length > 0} />
            {data.chains.map((chain) => <Tile key={chain.chain} title={`${chain.chain} chain`} value={chain.records} sub={chain.lastSealedAt ? `Sealed ${new Date(chain.lastSealedAt).toLocaleString()}` : 'Never sealed'} warn={!chain.lastSealedAt} />)}
          </div>
          {data.perDay.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-black text-slate-700 dark:text-slate-200">Events per day</p>
              <div className="flex items-end gap-1 h-24" role="img" aria-label="Audit events per day over the last 30 days">
                {data.perDay.map((row) => <div key={row.day} title={`${row.day}: ${row.events}`} className="flex-1 min-w-[4px] rounded-t bg-purple-500/70" style={{ height: `${Math.max(4, (row.events / peak) * 100)}%` }} />)}
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-5">
            <StatusCounts title="Most frequent actions" counts={Object.fromEntries(data.byAction.map((row) => [row.action, row.count]))} />
            <StatusCounts title="By record type" counts={Object.fromEntries(data.byResource.map((row) => [row.resourceType, row.count]))} />
          </div>
          {data.failures.length > 0 && (
            <div className={TABLE_WRAP}>
              <table className="w-full text-xs">
                <thead className={THEAD}><tr><th className={`${TH} text-left`}>When</th><th className={`${TH} text-left`}>Action</th><th className={`${TH} text-left`}>By</th><th className={`${TH} text-left`}>Result</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {data.failures.map((row) => <tr key={row.id}><td className={TD}>{new Date(row.createdAt).toLocaleString()}</td><td className={`${TD} font-mono`}>{row.action}</td><td className={TD}>{row.userEmail ?? '—'}</td><td className={TD}>{row.result}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

interface FinanceData { orders: Record<string, Record<string, number>>; settledLast30Days: Array<{ currency: string; orders: number; amount: number }>; tranches: Record<string, Record<string, number>>; distributions: Record<string, Record<string, number>>; payouts: Record<string, Record<string, number>>; collectionAccounts: Array<{ countryNodeId: string; name: string; configured: boolean }> }

export const LiveFinanceDashboard: React.FC = () => {
  const { data, error } = useServerData<FinanceData>(() => apiClient.getGovernanceDashboard<FinanceData>('finance'));
  const missing = data?.collectionAccounts.filter((row) => !row.configured) ?? [];
  return (
    <Card icon={<DollarSign className="w-5 h-5 text-purple-600" />} title="Finance Dashboard" lead="Investor money, tranche releases, profit distributions and payouts in your scope, per status and currency.">
      <Status error={error} loading={!data} />
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {data.settledLast30Days.length === 0 ? <Tile title="Confirmed (30 days)" value="0" /> : data.settledLast30Days.map((row) => <Tile key={row.currency} title={`Confirmed (30 days)`} value={formatProjectMoney(row.amount, row.currency)} sub={`${row.orders} orders`} />)}
            <Tile title="Countries without a trust account" value={missing.length} sub={missing.slice(0, 3).map((row) => row.name).join(', ') || 'All set'} warn={missing.length > 0} />
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <MoneyByStatus title="Investor orders" data={data.orders} />
            <MoneyByStatus title="Tranche releases" data={data.tranches} />
            <MoneyByStatus title="Profit distributions" data={data.distributions} />
            <MoneyByStatus title="Payouts to investors" data={data.payouts} />
          </div>
        </div>
      )}
    </Card>
  );
};

interface SecurityData { settings: Array<{ key: string; ok: boolean; value: string }>; roleChangesLast30Days: Array<{ id: string; action: string; userEmail: string | null; resourceId: string; metadata: Record<string, unknown>; createdAt: string }>; privilegedRoles: Array<{ role: string; holders: number }>; failedActionsLast30Days: number; openSecurityIncidents: number }

export const LiveSecurityDashboard: React.FC = () => {
  const { data, error } = useServerData<SecurityData>(() => apiClient.getGovernanceDashboard<SecurityData>('security'));
  return (
    <Card icon={<Lock className="w-5 h-5 text-purple-600" />} title="Security Dashboard" lead="Settings of the running server that production depends on, privileged role holders, and role changes in the last 30 days.">
      <Status error={error} loading={!data} />
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile title="Failed actions (30 days)" value={data.failedActionsLast30Days} warn={data.failedActionsLast30Days > 0} />
            <Tile title="Open security incidents" value={data.openSecurityIncidents} warn={data.openSecurityIncidents > 0} />
            {data.privilegedRoles.map((row) => <Tile key={row.role} title={row.role} value={row.holders} sub="active holders" />)}
          </div>
          <div className={TABLE_WRAP}>
            <table className="w-full text-xs">
              <thead className={THEAD}><tr><th className={`${TH} text-left`}>Production setting</th><th className={`${TH} text-left`}>Now</th><th className={`${TH} text-left`}>Ready</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {data.settings.map((row) => <tr key={row.key}><td className={TD}>{row.key}</td><td className={`${TD} font-mono`}>{row.value}</td><td className={`${TD} font-black ${row.ok ? 'text-emerald-600' : 'text-amber-600'}`}>{row.ok ? 'Yes' : 'Not yet'}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-black text-slate-700 dark:text-slate-200">Role changes (30 days)</p>
            {data.roleChangesLast30Days.length === 0 ? <p className="text-xs text-slate-400">None.</p> : (
              <ul className="space-y-1 text-xs">
                {data.roleChangesLast30Days.map((row) => <li key={row.id} className="text-slate-600 dark:text-slate-300">{new Date(row.createdAt).toLocaleString()} · <span className="font-mono">{row.action}</span> · {String(row.metadata?.role ?? '')} for {row.resourceId} by {row.userEmail ?? '—'}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export const LiveRegulatoryReports: React.FC = () => {
  const { data, error } = useServerData(apiClient.getGovernanceReports);
  const [busy, setBusy] = React.useState('');
  const [failed, setFailed] = React.useState('');
  const download = async (key: string) => {
    setBusy(key);
    setFailed('');
    try { await apiClient.downloadGovernanceReport(key); } catch (cause) { setFailed(cause instanceof Error ? cause.message : 'The report could not be exported.'); } finally { setBusy(''); }
  };
  return (
    <Card icon={<FileText className="w-5 h-5 text-purple-600" />} title="Regulatory Reports" lead="CSV exports from the platform's records, in your scope. Each export is written to the audit log. Filing formats for each regulator still need to be agreed with Compliance.">
      <Status error={error || failed} loading={!data} />
      {data && (
        <div className="grid md:grid-cols-2 gap-3">
          {data.map((report) => (
            <div key={report.key} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3">
              <div><p className="text-sm font-black text-slate-900 dark:text-white">{report.label}</p><p className="text-xs text-slate-500">{report.description}</p></div>
              <button type="button" disabled={busy === report.key} onClick={() => void download(report.key)} className="shrink-0 px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><Download className="w-3.5 h-3.5" />{busy === report.key ? 'Exporting…' : 'CSV'}</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export const LiveApprovalMatrix: React.FC = () => {
  const { data, error } = useServerData(apiClient.getApprovalMatrix);
  return (
    <Card icon={<GitPullRequest className="w-5 h-5 text-purple-600" />} title="Approval Matrix" lead="Who may take each decision and the rules the server enforces on it, read from the same role lists the services check. Changing it means changing the code.">
      <Status error={error} loading={!data} />
      {data && (
        <div className={TABLE_WRAP}>
          <table className="w-full text-xs">
            <thead className={THEAD}><tr><th className={`${TH} text-left`}>Process</th><th className={`${TH} text-left`}>Decision</th><th className={`${TH} text-left`}>Who</th><th className={`${TH} text-left`}>Rules</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {data.map((row) => (
                <tr key={`${row.process}-${row.step}`} className="align-top">
                  <td className={`${TD} font-bold text-slate-900 dark:text-white`}>{row.process}</td>
                  <td className={TD}>{row.step}</td>
                  <td className={TD}>{row.roles.join(', ')}</td>
                  <td className={`${TD} text-slate-500`}>{row.rules.join(' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export const LiveFeeSchedule: React.FC = () => {
  const { data, error } = useServerData<FeeSchedule>(apiClient.getFeeSchedule);
  const rm = (value: number) => formatProjectMoney(value, 'MYR');
  return (
    <Card icon={<ReceiptText className="w-5 h-5 text-purple-600" />} title="Platform Fee Schedule" lead="The prices the server charges today. They are set in the server code; any change, and the service tax treatment, needs management and tax adviser approval.">
      <Status error={error} loading={!data} />
      {data && (
        <div className="space-y-5">
          <div className={TABLE_WRAP}>
            <table className="w-full text-xs">
              <thead className={THEAD}><tr><th className={`${TH} text-left`}>Membership plan</th><th className={`${TH} text-right`}>Monthly</th><th className={`${TH} text-right`}>Annual</th><th className={`${TH} text-right`}>AI credits a month</th><th className={`${TH} text-right`}>Seats</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {data.plans.map((plan) => <tr key={plan.id}><td className={TD}>{plan.name}</td><td className={`${TD} text-right font-mono`}>{rm(plan.monthlyPriceMYR)}</td><td className={`${TD} text-right font-mono`}>{rm(plan.annualPriceMYR)}</td><td className={`${TD} text-right`}>{plan.aiCreditsMonthly}</td><td className={`${TD} text-right`}>{plan.userSeats}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className={TABLE_WRAP}>
              <table className="w-full text-xs">
                <thead className={THEAD}><tr><th className={`${TH} text-left`}>AI credit pack</th><th className={`${TH} text-right`}>Price</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {data.creditPackages.map((pack) => <tr key={pack.id}><td className={TD}>{pack.credits} credits{pack.bonusCredits ? ` + ${pack.bonusCredits} bonus` : ''}</td><td className={`${TD} text-right font-mono`}>{rm(pack.priceMYR)}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className={TABLE_WRAP}>
              <table className="w-full text-xs">
                <thead className={THEAD}><tr><th className={`${TH} text-left`}>Project promotion</th><th className={`${TH} text-right`}>Price</th><th className={`${TH} text-right`}>Or credits</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {data.promotionPackages.map((pack) => <tr key={pack.id}><td className={TD}>{pack.title}</td><td className={`${TD} text-right font-mono`}>{rm(pack.priceMYR)}</td><td className={`${TD} text-right`}>{pack.creditsCost}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
          <div className={TABLE_WRAP}>
            <table className="w-full text-xs">
              <thead className={THEAD}><tr><th className={`${TH} text-left`}>AI operation</th><th className={`${TH} text-right`}>Credits</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {data.aiOperations.map((row) => <tr key={row.operationKey}><td className={TD}>{row.operationName}</td><td className={`${TD} text-right`}>{row.creditsRequired}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">One purchased credit counts as {rm(data.creditValueMYR)} towards membership. The FPX fee of {rm(data.paymentGatewayFeeMYR)} per ToyyibPay bill is paid by the customer.</p>
        </div>
      )}
    </Card>
  );
};

export const LiveCountryRules: React.FC = () => {
  const { data, error } = useServerData<CountryRules>(apiClient.getCountryRules);
  return (
    <Card icon={<Globe className="w-5 h-5 text-purple-600" />} title="PDP Country Rules" lead="The rules the server applies in each country. They come from server settings (MIN_SPONSOR_CONTRIBUTION_PCT, KYC_INVESTMENT_LIMITS) and Country Nodes, so they are changed there, not here.">
      <Status error={error} loading={!data} />
      {data?.limitsError && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300">{data.limitsError}</p>}
      {data && (
        <>
          <div className={TABLE_WRAP}>
            <table className="w-full text-xs">
              <thead className={THEAD}><tr><th className={`${TH} text-left`}>Country</th><th className={`${TH} text-left`}>Currency</th><th className={`${TH} text-right`}>Min. sponsor capital</th><th className={`${TH} text-left`}>Investment limit by KYC level</th><th className={`${TH} text-left`}>Trust account</th><th className={`${TH} text-left`}>Regulator</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {data.countries.map((row) => (
                  <tr key={row.code} className="align-top">
                    <td className={`${TD} font-bold text-slate-900 dark:text-white`}>{row.name}</td>
                    <td className={TD}>{row.currency}</td>
                    <td className={`${TD} text-right`}>{row.minSponsorContributionPct}%</td>
                    <td className={TD}>{row.kycLimits.map((limit) => `${label(limit.level)}: ${limit.limit === null ? 'no limit' : formatProjectMoney(limit.limit, row.currency)}`).join(' · ')}</td>
                    <td className={`${TD} ${row.collectionBank ? '' : 'text-amber-600 font-bold'}`}>{row.collectionBank ?? 'Not set'}</td>
                    <td className={`${TD} text-slate-500`}>{row.regulatoryProfile}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">Every organisation's KYB needs: {data.requiredKybDocuments.map(label).join(', ')}.</p>
        </>
      )}
    </Card>
  );
};

/** AML, PEP and sanctions screening: no provider is connected yet, so the live system says so instead of showing examples. */
export const ScreeningNotAvailable: React.FC<{ section: 'compliance_aml' | 'compliance_pep' | 'compliance_sanctions' }> = ({ section }) => {
  const title = { compliance_aml: 'AML Transaction Monitoring', compliance_pep: 'PEP Screening', compliance_sanctions: 'Sanctions Screening' }[section];
  return (
    <Card icon={<ShieldAlert className="w-5 h-5 text-amber-600" />} title={title} lead="Not available yet.">
      <p className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-200">
        This screening needs a licensed screening provider (sanctions and PEP lists, transaction monitoring rules), which has not been chosen yet. Until then no automatic screening runs, so Compliance must check investors and organisations by hand during KYC and KYB review. Related-party investments are already flagged on the Compliance Dashboard.
      </p>
    </Card>
  );
};
