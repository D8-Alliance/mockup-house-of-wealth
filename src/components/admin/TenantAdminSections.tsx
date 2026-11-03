import React from 'react';
import { Building2, Globe, Plus } from 'lucide-react';
import { apiClient, apiErrorMessage, CountryNodeRow, NetworkOverview, OrganisationDirectoryRow, OrganisationEntityType } from '../../services/apiClient';
import { useRBAC } from '../../rbac/RBACContext';
import { CollectionAccountsPanel } from './CollectionAccountsPanel';
import { Card, label, TD, TH } from './AdminLivePlatformSections';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';
const LABEL = 'text-xs font-bold text-slate-600 dark:text-slate-300';
const PRIMARY = 'px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50';
const SECONDARY = 'px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold cursor-pointer';
const THEAD = 'bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400';
const ENTITY_TYPES: Record<OrganisationEntityType, string> = { GLC: 'GLC', COMPANY: 'Company', INSTITUTION: 'Institution', INDIVIDUAL: 'Individual' };

const Notice: React.FC<{ text: string; tone: 'error' | 'ok' }> = ({ text, tone }) => (
  <p role={tone === 'error' ? 'alert' : 'status'} className={`p-3 rounded-xl text-xs font-bold ${tone === 'error' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>{text}</p>
);

const statusClass = (status: string) => (status === 'ACTIVE' ? 'text-emerald-600' : 'text-rose-600');

/** Suspend or reactivate with a reason, which goes into the audit log. */
const StatusControl: React.FC<{ status: string; busy: boolean; onChange: (status: 'ACTIVE' | 'SUSPENDED', reason: string) => void; what: string }> = ({ status, busy, onChange, what }) => {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const next = status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`font-bold cursor-pointer ${next === 'SUSPENDED' ? 'text-rose-600' : 'text-emerald-600'}`}>{next === 'SUSPENDED' ? 'Suspend' : 'Reactivate'}</button>;
  return (
    <div className="flex flex-col gap-1.5 min-w-[220px]">
      <p className="text-[11px] text-slate-500">{next === 'SUSPENDED' ? `Everyone in this ${what} is signed out and cannot sign in until it is reactivated.` : `People in this ${what} can sign in again.`}</p>
      <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (kept in the audit log)" className={INPUT} />
      <div className="flex gap-1.5">
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => { onChange(next, reason.trim()); setOpen(false); setReason(''); }} className={PRIMARY}>{next === 'SUSPENDED' ? 'Suspend' : 'Reactivate'}</button>
        <button type="button" onClick={() => setOpen(false)} className={SECONDARY}>Cancel</button>
      </div>
    </div>
  );
};

/** Organisations in scope: Super Admin and Country Admin add them, and suspend or reactivate them. */
export const LiveOrganisations: React.FC = () => {
  const { currentRole } = useRBAC();
  const manager = currentRole === 'Super Admin' || currentRole === 'Country Admin';
  const superAdmin = currentRole === 'Super Admin';
  const [rows, setRows] = React.useState<OrganisationDirectoryRow[] | null>(null);
  const [countries, setCountries] = React.useState<CountryNodeRow[]>([]);
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState('');
  const [busy, setBusy] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [draft, setDraft] = React.useState<{ name: string; countryNodeId: string; entityType: OrganisationEntityType | ''; registrationNumber: string } | null>(null);

  const load = React.useCallback(() => { apiClient.getOrganisationDirectory().then(setRows).catch((cause) => { setRows([]); setError(apiErrorMessage(cause, 'The organisations could not be loaded.')); }); }, []);
  React.useEffect(load, [load]);
  React.useEffect(() => { if (superAdmin) apiClient.getCountryNodeList().then(setCountries).catch(() => setCountries([])); }, [superAdmin]);

  const run = async (key: string, action: () => Promise<string>) => {
    setBusy(key);
    setError('');
    setDone('');
    try { setDone(await action()); load(); } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(''); }
  };
  const create = () => draft && run('create', async () => {
    const created = await apiClient.createOrganisation({ name: draft.name.trim(), countryNodeId: superAdmin ? draft.countryNodeId : undefined, entityType: draft.entityType || undefined, registrationNumber: draft.registrationNumber.trim() || undefined });
    setDraft(null);
    return `${created.name} added as ${created.id}. Give people roles in it from User Directory.`;
  });
  const needle = query.trim().toLowerCase();
  const shown = (rows ?? []).filter((row) => !needle || `${row.name} ${row.id} ${row.registrationNumber ?? ''}`.toLowerCase().includes(needle));

  return (
    <Card icon={<Building2 className="w-5 h-5 text-purple-600" />} title="Organisations" lead="Every organisation in your scope, its verification (KYB) and what it holds. A suspended organisation's members cannot sign in and cannot be given new roles; its records stay. Verification decisions are made in Organisation Verification.">
      {error && <Notice text={error} tone="error" />}
      {done && <Notice text={done} tone="ok" />}
      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID or registration no." className={`${INPUT} sm:w-72`} />
        {manager && !draft && <button type="button" onClick={() => setDraft({ name: '', countryNodeId: '', entityType: '', registrationNumber: '' })} className={`${PRIMARY} flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" />Add organisation</button>}
      </div>
      {draft && (
        <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-500/30 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className={LABEL}>Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="As registered" className={`${INPUT} mt-1 font-normal`} /></label>
            {superAdmin && <label className={LABEL}>Country<select value={draft.countryNodeId} onChange={(event) => setDraft({ ...draft, countryNodeId: event.target.value })} className={`${INPUT} mt-1 font-normal`}><option value="">Choose…</option>{countries.filter((country) => country.status === 'ACTIVE').map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>}
            <label className={LABEL}>Entity type (optional)<select value={draft.entityType} onChange={(event) => setDraft({ ...draft, entityType: event.target.value as OrganisationEntityType | '' })} className={`${INPUT} mt-1 font-normal`}><option value="">Set later in KYB</option>{(Object.keys(ENTITY_TYPES) as OrganisationEntityType[]).map((type) => <option key={type} value={type}>{ENTITY_TYPES[type]}</option>)}</select></label>
            <label className={LABEL}>Registration no. (optional)<input value={draft.registrationNumber} onChange={(event) => setDraft({ ...draft, registrationNumber: event.target.value })} placeholder="e.g. 201901012345 (1234567-A)" className={`${INPUT} mt-1 font-normal`} /></label>
          </div>
          <p className="text-[11px] text-slate-500">{superAdmin ? 'The organisation is created active.' : 'The organisation is created active in your country.'} Its members complete its KYB themselves.</p>
          <div className="flex gap-2"><button type="button" disabled={busy === 'create' || draft.name.trim().length < 2 || (superAdmin && !draft.countryNodeId)} onClick={() => void create()} className={PRIMARY}>Add</button><button type="button" onClick={() => setDraft(null)} className={SECONDARY}>Cancel</button></div>
        </div>
      )}
      {rows === null && <p className="text-xs text-slate-500">Loading...</p>}
      {rows && shown.length === 0 && <p className="text-xs text-slate-500">{rows.length ? 'No organisation matches.' : 'No organisation is registered yet.'}</p>}
      {shown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className={THEAD}><tr className="text-left"><th className={TH}>Organisation</th><th className={TH}>Country</th><th className={TH}>KYB</th><th className={`${TH} text-right`}>People</th><th className={`${TH} text-right`}>Projects</th><th className={`${TH} text-right`}>Pools</th><th className={TH}>Status</th>{manager && <th className={TH} />}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {shown.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className={TD}><span className="font-bold text-slate-900 dark:text-white">{row.name}</span> <span className="font-mono text-slate-400">{row.id}</span>{row.registrationNumber && <span className="block text-[11px] text-slate-500">Reg. {row.registrationNumber}</span>}{(row.entityType || row.groupName) && <span className="block text-[11px] text-slate-500">{[row.entityType && label(row.entityType), row.groupName && `Group: ${row.groupName}`].filter(Boolean).join(' · ')}</span>}</td>
                  <td className={`${TD} font-mono`}>{row.countryNodeId}</td>
                  <td className={TD}>{label(row.kybStatus)}</td>
                  <td className={`${TD} text-right font-mono`}>{row.users}</td>
                  <td className={`${TD} text-right font-mono`}>{row.projects}</td>
                  <td className={`${TD} text-right font-mono`}>{row.pools}</td>
                  <td className={`${TD} font-bold ${statusClass(row.status)}`}>{label(row.status)}</td>
                  {manager && <td className={TD}><StatusControl what="organisation" status={row.status} busy={busy === row.id} onChange={(status, reason) => void run(row.id, async () => { const result = await apiClient.setOrganisationStatus(row.id, status, reason); return `${row.name} is ${label(result.status).toLowerCase()}${result.peopleAffected ? `; ${result.peopleAffected} people affected` : ''}.`; })} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

/** Country nodes: activity per country, and for the Super Admin adding a node and switching one off. */
export const LiveCountryNodes: React.FC = () => {
  const { currentRole } = useRBAC();
  const superAdmin = currentRole === 'Super Admin';
  const [overview, setOverview] = React.useState<NetworkOverview | null>(null);
  const [nodes, setNodes] = React.useState<CountryNodeRow[] | null>(null);
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState('');
  const [busy, setBusy] = React.useState('');
  const [draft, setDraft] = React.useState<{ code: string; name: string; currency: string; timezone: string; regulatoryProfile: string } | null>(null);

  const load = React.useCallback(() => {
    apiClient.getNetworkOverview().then(setOverview).catch((cause) => setError(apiErrorMessage(cause, 'The country nodes could not be loaded.')));
    apiClient.getCountryNodeList().then(setNodes).catch(() => setNodes([]));
  }, []);
  React.useEffect(load, [load]);

  const run = async (key: string, action: () => Promise<string>) => {
    setBusy(key);
    setError('');
    setDone('');
    try { setDone(await action()); load(); } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(''); }
  };
  const figures = new Map((overview?.countries ?? []).map((row) => [row.code, row]));
  const rows = nodes && nodes.length ? nodes : (overview?.countries ?? []).map((row) => ({ code: row.code, name: row.name, currency: row.currency, timezone: '', regulatoryProfile: '', status: row.status }));

  return (
    <Card icon={<Globe className="w-5 h-5 text-purple-600" />} title="Country Nodes" lead="The country nodes, each with its own currency. A deactivated node signs out everyone in it and accepts no new organisations or roles; its records stay. Only the Super Admin adds or deactivates a node.">
      {error && <Notice text={error} tone="error" />}
      {done && <Notice text={done} tone="ok" />}
      {superAdmin && !draft && <button type="button" onClick={() => setDraft({ code: 'CN-', name: '', currency: '', timezone: '', regulatoryProfile: '' })} className={`${PRIMARY} flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" />Add country node</button>}
      {draft && (
        <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-500/30 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className={LABEL}>Code<input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} placeholder="CN-MYS" className={`${INPUT} mt-1 font-normal font-mono`} /></label>
            <label className={LABEL}>Country name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
            <label className={LABEL}>Currency<input value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value.toUpperCase() })} placeholder="MYR" maxLength={3} className={`${INPUT} mt-1 font-normal font-mono`} /></label>
            <label className={LABEL}>Time zone<input value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} placeholder="Asia/Kuala_Lumpur" className={`${INPUT} mt-1 font-normal`} /></label>
            <label className={`${LABEL} lg:col-span-2`}>Regulators<input value={draft.regulatoryProfile} onChange={(event) => setDraft({ ...draft, regulatoryProfile: event.target.value })} placeholder="e.g. Securities Commission / Bank Negara Malaysia" className={`${INPUT} mt-1 font-normal`} /></label>
          </div>
          <p className="text-[11px] text-slate-500">After adding it, set the country's trust account below before investors there place orders.</p>
          <div className="flex gap-2"><button type="button" disabled={busy === 'create' || !/^CN-[A-Z]{3}$/.test(draft.code) || draft.name.trim().length < 2 || !/^[A-Z]{3}$/.test(draft.currency) || !draft.timezone.trim() || draft.regulatoryProfile.trim().length < 2} onClick={() => void run('create', async () => { const created = await apiClient.createCountryNode(draft); setDraft(null); return `${created.name} (${created.code}) added.`; })} className={PRIMARY}>Add</button><button type="button" onClick={() => setDraft(null)} className={SECONDARY}>Cancel</button></div>
        </div>
      )}
      {!overview && !nodes && !error && <p className="text-xs text-slate-500">Loading...</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className={THEAD}><tr className="text-left"><th className={TH}>Country</th><th className={TH}>Currency</th><th className={`${TH} text-right`}>Organisations</th><th className={`${TH} text-right`}>People</th><th className={`${TH} text-right`}>Projects</th><th className={`${TH} text-right`}>Pools</th><th className={TH}>Status</th>{superAdmin && <th className={TH} />}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {rows.map((row) => {
                const figure = figures.get(row.code);
                return (
                  <tr key={row.code} className="align-top">
                    <td className={TD}><span className="font-bold text-slate-900 dark:text-white">{row.name}</span> <span className="font-mono text-slate-400">{row.code}</span>{row.timezone && <span className="block text-[11px] text-slate-500">{row.timezone}</span>}</td>
                    <td className={`${TD} font-mono`}>{row.currency}</td>
                    <td className={`${TD} text-right font-mono`}>{figure?.organisations ?? 0}</td>
                    <td className={`${TD} text-right font-mono`}>{figure?.users ?? 0}</td>
                    <td className={`${TD} text-right font-mono`}>{figure?.projects ?? 0}</td>
                    <td className={`${TD} text-right font-mono`}>{figure?.pools ?? 0}</td>
                    <td className={`${TD} font-bold ${statusClass(row.status)}`}>{label(row.status)}</td>
                    {superAdmin && <td className={TD}><StatusControl what="country" status={row.status} busy={busy === row.code} onChange={(status, reason) => void run(row.code, async () => { const result = await apiClient.setCountryNodeStatus(row.code, status, reason); return `${row.name} is ${label(result.status).toLowerCase()}${result.peopleAffected ? `; ${result.peopleAffected} people affected` : ''}.`; })} /></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <CollectionAccountsPanel />
    </Card>
  );
};
