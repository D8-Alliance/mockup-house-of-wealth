import React from 'react';
import { Network, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiClient, apiErrorMessage, CorporateGroup } from '../../services/apiClient';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';

/**
 * The country's corporate groups, kept by the KYB reviewers and administrators. An organisation that types a
 * group's name or another spelling in its KYB is saved under the official name, so investments between
 * entities of one group are always disclosed as related-party. Saving a group also updates organisations
 * that already used one of its spellings.
 */
export const CorporateGroupsPanel: React.FC = () => {
  const [groups, setGroups] = React.useState<CorporateGroup[] | null>(null);
  const [editing, setEditing] = React.useState<{ id?: string; name: string; aliases: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState('');
  const load = React.useCallback(() => { apiClient.getCorporateGroups().then(setGroups).catch((cause) => { setGroups([]); setError(apiErrorMessage(cause, 'The groups could not be loaded.')); }); }, []);
  React.useEffect(load, [load]);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setError('');
    setDone('');
    try { setDone(await action()); load(); } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(false); }
  };
  const save = () => editing && run(async () => {
    const saved = await apiClient.saveCorporateGroup({ name: editing.name.trim(), aliases: editing.aliases.split(/[\n,]/).map((alias) => alias.trim()).filter(Boolean) }, editing.id);
    setEditing(null);
    return `${saved.name} saved.${saved.organisationsUpdated ? ` ${saved.organisationsUpdated} organisation(s) moved to this name.` : ''}`;
  });

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2"><Network className="w-4 h-4 text-purple-600" />Corporate groups</h4>
          <p className="text-slate-500">The official name of each group, and the other ways organisations write it. A name or spelling typed in KYB is saved under the official name, so investments within one group are disclosed as related-party.</p>
        </div>
        {!editing && <button type="button" onClick={() => setEditing({ name: '', aliases: '' })} className="px-3 py-2 rounded-xl bg-purple-600 text-white font-bold flex items-center gap-1.5 cursor-pointer"><Plus className="w-3.5 h-3.5" />Add group</button>}
      </div>
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {done && <p role="status" className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300">{done}</p>}
      {editing && (
        <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-500/30 grid gap-2 md:grid-cols-2">
          <label className="font-bold text-slate-600 dark:text-slate-300">Official name<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="e.g. FELDA Group" className={`${INPUT} mt-1`} /></label>
          <label className="font-bold text-slate-600 dark:text-slate-300">Other spellings, one per line<textarea rows={3} value={editing.aliases} onChange={(event) => setEditing({ ...editing, aliases: event.target.value })} placeholder={'e.g.\nFGV\nFelda Global Ventures'} className={`${INPUT} mt-1`} /></label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 font-bold cursor-pointer">Cancel</button>
            <button type="button" disabled={busy || editing.name.trim().length < 2} onClick={() => void save()} className="px-3 py-2 rounded-xl bg-purple-600 text-white font-bold cursor-pointer disabled:opacity-50">{busy ? 'Saving…' : 'Save group'}</button>
          </div>
        </div>
      )}
      {groups?.length === 0 && !editing && <p className="text-slate-500">No group yet. Organisations' typed group names are kept as they wrote them.</p>}
      {groups && groups.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {groups.map((group) => (
            <li key={group.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 dark:text-slate-100">{group.name}</p>
                <p className="text-[11px] text-slate-500">{group.aliases.length ? `Also written: ${group.aliases.join(', ')}` : 'No other spellings'}</p>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setEditing({ id: group.id, name: group.name, aliases: group.aliases.join('\n') })} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" disabled={busy} onClick={() => { if (confirm(`Remove ${group.name}? Organisations keep the name they have.`)) void run(async () => { await apiClient.deleteCorporateGroup(group.id); return `${group.name} removed.`; }); }} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-600 cursor-pointer" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
