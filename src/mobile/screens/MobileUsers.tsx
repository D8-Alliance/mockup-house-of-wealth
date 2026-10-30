import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { apiClient, BackendUser, OrganisationDirectoryRow } from '../../services/apiClient';
import { useRBAC } from '../../rbac/RBACContext';
import { useRoleAvailability } from '../../rbac/roleAvailability';
import { useT } from '../i18n';

/**
 * Roles a Country Admin may grant. The server refuses Super Admin, Country Admin and the system administrator
 * roles from anyone but Super Admin; Super Admin also gets Country Admin here.
 */
const COUNTRY_GRANTABLE = [
  'Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office',
  'Asset Owner', 'Asset Manager', 'Project Sponsor', 'Project Manager', 'Pool Manager', 'Portfolio Manager',
  'Organization Admin', 'Finance Officer', 'Risk Officer', 'Compliance Officer', 'Legal Officer', 'KYC Officer', 'KYB Officer',
  'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee', 'Auditor', 'Customer Support',
];
const SUPER_ADMIN_ONLY = ['Super Admin', 'Country Admin', 'System Administrator', 'Security Administrator', 'Data Administrator', 'AI Administrator'];

const statusOf = (user: BackendUser) => String((user.profile?.status as string | undefined) || (user.isActive ? 'ACTIVE' : 'DEACTIVATED'));
const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  SUSPENDED: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  LOCKED: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  DEACTIVATED: 'bg-slate-500/10 text-slate-500',
  PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
};
const label = (code: string) => code.charAt(0) + code.slice(1).toLowerCase();

/**
 * Users of the administrator's scope (a Country Admin: their country; Super Admin: every country): find a person,
 * see their roles and sign-in, grant or remove a role, and suspend or reactivate the account. The server checks
 * every change again and records it in the audit log.
 */
export const MobileUsers: React.FC = () => {
  const { t } = useT();
  const [users, setUsers] = useState<BackendUser[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  // Seeded demo personas are left out unless asked for, so the list is the real people.
  const [showDemo, setShowDemo] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError('');
    apiClient.getUsers().then(setUsers).catch((cause) => { setUsers((current) => current ?? []); setError(cause instanceof Error ? cause.message : t('The users could not be loaded.')); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);

  const needle = query.trim().toLowerCase();
  const demoCount = (users ?? []).filter(user => user.demoAccount).length;
  const shown = (users ?? []).filter(user => {
    if (user.demoAccount && !showDemo) return false;
    const status = statusOf(user);
    if (statusFilter === 'ACTIVE' && status !== 'ACTIVE') return false;
    if (statusFilter === 'SUSPENDED' && status === 'ACTIVE') return false;
    return !needle || `${user.name} ${user.email} ${user.assignedRoles.map(role => role.role).join(' ')}`.toLowerCase().includes(needle);
  });

  const open = users?.find(user => user.id === openId);
  if (open) return <MobileUserDetail user={open} onBack={() => setOpenId(null)} onChanged={(updated) => setUsers((current) => current?.map(user => (user.id === updated.id ? updated : user)) ?? null)} onReload={load} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black">{t('Users')}{users ? ` (${users.length - (showDemo ? 0 : demoCount)})` : ''}</h1>
        <button type="button" onClick={load} aria-label={t('Refresh')} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Name, email or role')} className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-9 pr-3 py-3 text-base" />
      </div>
      <div className="flex gap-2">
        {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map(value => (
          <button key={value} type="button" onClick={() => setStatusFilter(value)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${statusFilter === value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>
            {value === 'ALL' ? t('All') : value === 'ACTIVE' ? t('Active') : t('Not active')}
          </button>
        ))}
      </div>
      {demoCount > 0 && (
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={showDemo} onChange={(event) => setShowDemo(event.target.checked)} className="w-4 h-4" />
          {t('Show {count} demo account(s)', { count: demoCount })}
        </label>
      )}

      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!users && <p className="text-sm text-slate-500">{t('Loading users...')}</p>}
      {users && shown.length === 0 && !error && <p className="text-sm text-slate-500">{needle ? t('Nobody matches the search.') : t('No user here.')}</p>}

      {shown.map(user => {
        const status = statusOf(user);
        return (
          <button key={user.id} type="button" onClick={() => setOpenId(user.id)} className="w-full text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
            <span className="w-10 h-10 shrink-0 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-black uppercase">{user.name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('')}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black truncate">{user.name}</span>
              <span className="block text-xs text-slate-500 truncate">{user.assignedRoles.map(role => t(role.role)).join(', ') || t('No active role')}</span>
            </span>
            {user.demoAccount && <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-500/10 text-slate-500">{t('Demo')}</span>}
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${STATUS_STYLE[status] ?? STATUS_STYLE.DEACTIVATED}`}>{t(label(status))}</span>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        );
      })}
    </div>
  );
};

interface MobileUserDetailProps {
  user: BackendUser;
  onBack: () => void;
  onChanged: (user: BackendUser) => void;
  onReload: () => void;
}

const MobileUserDetail: React.FC<MobileUserDetailProps> = ({ user, onBack, onChanged, onReload }) => {
  const { t, locale } = useT();
  const { currentRole, currentUserId, currentCountryNode } = useRBAC();
  const { filterEnabled } = useRoleAvailability();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [organisations, setOrganisations] = useState<OrganisationDirectoryRow[]>([]);
  const [organisationId, setOrganisationId] = useState(user.assignedRoles[0]?.organisationId ?? '');
  const self = user.id === currentUserId;
  const superAdmin = currentRole === 'Super Admin';
  const status = statusOf(user);
  const profile = user.profile ?? {};

  useEffect(() => {
    if (!adding) return;
    apiClient.getOrganisationDirectory().then(setOrganisations).catch(() => setOrganisations([]));
  }, [adding]);

  const grantable = useMemo(() => {
    const held = new Set(user.assignedRoles.filter(role => role.organisationId === organisationId).map(role => role.role));
    return filterEnabled([...COUNTRY_GRANTABLE, ...(superAdmin ? ['Country Admin'] : [])]).filter(role => !held.has(role));
  }, [filterEnabled, organisationId, superAdmin, user.assignedRoles]);
  const organisation = organisations.find(item => item.id === organisationId);
  const country = organisation?.countryNodeId || user.assignedRoles.find(role => role.organisationId === organisationId)?.countryNodeId || currentCountryNode;

  const act = async (name: string, action: () => Promise<unknown>, done: string) => {
    setBusy(name);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(done);
      onReload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('That did not go through.'));
    } finally {
      setBusy('');
    }
  };

  const revoke = (role: BackendUser['assignedRoles'][number]) => {
    if (!window.confirm(t('Remove the role {role} from {name}?', { role: t(role.role), name: role.organisationName ? `${user.name} (${role.organisationName})` : user.name }))) return;
    void act(`revoke-${role.role}-${role.organisationId}`, () => apiClient.revokeRole(user.id, role.role, role.organisationId, role.countryNodeId), t('{role} removed.', { role: t(role.role) }));
  };

  const grant = () => {
    if (!newRole || !organisationId) return;
    void act('grant', () => apiClient.assignRole(user.id, newRole, organisationId, country), t('{role} granted.', { role: t(newRole) })).then(() => { setAdding(false); setNewRole(''); });
  };

  const setStatus = (next: 'ACTIVE' | 'SUSPENDED') => {
    if (!window.confirm(next === 'SUSPENDED' ? t('Suspend {name}? They will not be able to use the platform until reactivated.', { name: user.name }) : t('Reactivate {name}?', { name: user.name }))) return;
    setBusy('status');
    setError('');
    setNotice('');
    apiClient.updateUserStatus(user.id, next)
      .then((updated) => { onChanged(updated); setNotice(next === 'SUSPENDED' ? t('Account suspended.') : t('Account reactivated.')); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : t('The status did not change.')))
      .finally(() => setBusy(''));
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Users')}</button>

      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
        <div className="flex items-start gap-3">
          <UserRound className="w-10 h-10 p-2 rounded-full bg-emerald-500/10 text-emerald-700 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-black">{user.name}</h1>
            <p className="text-xs text-slate-500 break-all">{user.email}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><dt className="text-slate-500">{t('Status')}</dt><dd className="font-bold">{t(label(status))}</dd></div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5"><dt className="text-slate-500">{t('MFA')}</dt><dd className="font-bold">{profile.mfaEnabled ? t('Enabled') : t(String(profile.mfaStatus || 'Not signed in yet'))}</dd></div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 col-span-2"><dt className="text-slate-500">{t('Last sign-in')}</dt><dd className="font-bold">{profile.lastLogin ? new Date(String(profile.lastLogin)).toLocaleString(locale) : t('Not recorded yet')}</dd></div>
        </dl>
      </section>

      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">{notice}</p>}
      {self && <p className="text-xs text-slate-500">{t('This is your own account. Another administrator changes your roles and status.')}</p>}

      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <h2 className="text-sm font-black flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" />{t('Roles')}</h2>
        {user.assignedRoles.length === 0 && <p className="text-xs text-slate-500">{t('No active role.')}</p>}
        {user.assignedRoles.map(role => {
          const locked = self || (!superAdmin && SUPER_ADMIN_ONLY.includes(role.role)) || role.role === 'Super Admin';
          const key = `revoke-${role.role}-${role.organisationId}`;
          return (
            <div key={`${role.role}-${role.organisationId}`} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">{t(role.role)}</p>
                <p className="text-[11px] text-slate-500 truncate">{role.organisationName ?? role.organisationId} · {role.countryNodeId}</p>
              </div>
              {!locked && (
                <button type="button" disabled={!!busy} onClick={() => revoke(role)} aria-label={t('Remove {role}', { role: t(role.role) })} className="p-2 rounded-lg text-rose-600 hover:bg-rose-500/10 disabled:opacity-50">
                  {busy === key ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          );
        })}

        {!self && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 text-sm font-black"><Plus className="w-4 h-4" />{t('Add a role')}</button>
        )}
        {!self && adding && (
          <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <label className="block text-xs font-bold text-slate-500">{t('Organisation')}
              <select value={organisationId} onChange={(event) => setOrganisationId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-base">
                {[...new Map([
                  ...user.assignedRoles.map(role => [role.organisationId, role.organisationName ?? role.organisationId] as const),
                  ...organisations.map(item => [item.id, item.name] as const),
                ]).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-500">{t('Role')}
              <select value={newRole} onChange={(event) => setNewRole(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-base">
                <option value="">{t('Choose a role')}</option>
                {grantable.map(role => <option key={role} value={role}>{t(role)}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setAdding(false); setNewRole(''); }} className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-bold">{t('Cancel')}</button>
              <button type="button" disabled={!newRole || !organisationId || !!busy} onClick={grant} className="py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black disabled:opacity-50">{busy === 'grant' ? t('Granting...') : t('Grant')}</button>
            </div>
          </div>
        )}
      </section>

      {!self && (
        status === 'ACTIVE'
          ? <button type="button" disabled={!!busy} onClick={() => setStatus('SUSPENDED')} className="w-full py-3 rounded-2xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm font-black disabled:opacity-50">{busy === 'status' ? t('Suspending...') : t('Suspend account')}</button>
          : <button type="button" disabled={!!busy} onClick={() => setStatus('ACTIVE')} className="w-full py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black disabled:opacity-50">{busy === 'status' ? t('Reactivating...') : t('Reactivate account')}</button>
      )}
      <p className="text-[11px] text-slate-500">{t('Every change is recorded in the audit log with your name.')}</p>
    </div>
  );
};
