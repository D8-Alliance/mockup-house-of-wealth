import React, { useEffect, useState } from 'react';
import { Landmark, Pencil } from 'lucide-react';
import { apiClient, CollectionAccountView } from '../../services/apiClient';
import { useRBAC } from '../../rbac/RBACContext';

const input = 'mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white';

interface Draft { bankName: string; accountName: string; accountNumber: string; swiftCode: string; instructions: string }

/**
 * The platform's trust (escrow) account in each country, which investors transfer to. Investors see it with the
 * payment details of their order (website and mini-app). Decision 2026-10-30: one platform account per country,
 * not one per pool, so investor money never goes straight to a sponsor; Finance releases it to projects by tranche.
 * Only Super Admin changes an account, and every change is audited.
 */
export const CollectionAccountsPanel: React.FC = () => {
  const { currentRole } = useRBAC();
  const canEdit = currentRole === 'Super Admin';
  const [rows, setRows] = useState<CollectionAccountView[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ bankName: '', accountName: '', accountNumber: '', swiftCode: '', instructions: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.getCollectionAccounts().then(setRows).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not be loaded.'));
  }, []);

  const edit = (row: CollectionAccountView) => {
    setError('');
    setEditing(row.countryNodeId);
    setDraft({ bankName: row.account?.bankName ?? '', accountName: row.account?.accountName ?? '', accountNumber: row.account?.accountNumber ?? '', swiftCode: row.account?.swiftCode ?? '', instructions: row.account?.instructions ?? '' });
  };

  const save = async (row: CollectionAccountView) => {
    const changing = row.account && row.account.accountNumber !== draft.accountNumber.trim();
    if (changing && !window.confirm(`Change the ${row.countryName} account number from ${row.account!.accountNumber} to ${draft.accountNumber.trim()}? Investors with unpaid orders will see the new account.`)) return;
    setSaving(true);
    setError('');
    try {
      const saved = await apiClient.saveCollectionAccount(row.countryNodeId, { bankName: draft.bankName, accountName: draft.accountName, accountNumber: draft.accountNumber, swiftCode: draft.swiftCode.trim().toUpperCase() || undefined, instructions: draft.instructions || undefined });
      setRows((current) => current?.map(item => (item.countryNodeId === saved.countryNodeId ? saved : item)) ?? null);
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The account was not saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div>
        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2"><Landmark className="w-4 h-4 text-emerald-600" />Investor collection accounts</h4>
        <p className="text-xs text-slate-500">The platform's trust (escrow) account in each country. Investors transfer to it, quoting their order number; Finance matches the transfer and later releases the money to projects by tranche. It is never a sponsor's own account.{canEdit ? '' : ' Only Super Admin changes these.'}</p>
      </div>
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!rows && !error && <p className="text-xs text-slate-500">Loading...</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows?.map(row => (
          <div key={row.countryNodeId} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="font-black text-slate-900 dark:text-white">{row.countryName} <span className="font-mono text-slate-400">{row.currency}</span></p>
              {canEdit && editing !== row.countryNodeId && (
                <button type="button" onClick={() => edit(row)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold"><Pencil className="w-3.5 h-3.5" />{row.account ? 'Change' : 'Set up'}</button>
              )}
            </div>
            {editing === row.countryNodeId ? (
              <div className="space-y-2">
                <label className="block font-bold text-slate-600 dark:text-slate-300">Bank<input className={input} value={draft.bankName} onChange={(event) => setDraft({ ...draft, bankName: event.target.value })} placeholder="e.g. Bank Islam Malaysia Berhad" /></label>
                <label className="block font-bold text-slate-600 dark:text-slate-300">Account name<input className={input} value={draft.accountName} onChange={(event) => setDraft({ ...draft, accountName: event.target.value })} placeholder="e.g. D-8 Wealth Pooling Trust Account" /></label>
                <label className="block font-bold text-slate-600 dark:text-slate-300">Account number<input className={`${input} font-mono`} value={draft.accountNumber} onChange={(event) => setDraft({ ...draft, accountNumber: event.target.value })} /></label>
                <label className="block font-bold text-slate-600 dark:text-slate-300">SWIFT code (optional)<input className={`${input} font-mono uppercase`} value={draft.swiftCode} onChange={(event) => setDraft({ ...draft, swiftCode: event.target.value })} placeholder="e.g. BIMBMYKL" /></label>
                <label className="block font-bold text-slate-600 dark:text-slate-300">Note to investors (optional)<textarea rows={2} className={input} value={draft.instructions} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} placeholder="e.g. Use DuitNow or IBG; cash deposits are not accepted." /></label>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-bold">Cancel</button>
                  <button type="button" disabled={saving || !draft.bankName.trim() || !draft.accountName.trim() || !draft.accountNumber.trim()} onClick={() => void save(row)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            ) : row.account ? (
              <dl className="space-y-1">
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Bank</dt><dd className="font-bold text-right">{row.account.bankName}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Account name</dt><dd className="font-bold text-right">{row.account.accountName}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Account number</dt><dd className="font-mono font-bold text-right">{row.account.accountNumber}</dd></div>
                {row.account.swiftCode && <div className="flex justify-between gap-2"><dt className="text-slate-500">SWIFT</dt><dd className="font-mono font-bold text-right">{row.account.swiftCode}</dd></div>}
                {row.account.instructions && <p className="text-slate-500">{row.account.instructions}</p>}
                <p className="text-[10px] text-slate-400">Updated {new Date(row.account.updatedAt).toLocaleString('en-MY')}</p>
              </dl>
            ) : (
              <p className="text-amber-700 dark:text-amber-300 font-bold">Not set up. Investors in this country are told not to transfer yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
