import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Search, ShieldCheck } from 'lucide-react';
import { apiClient, PayoutAccountForReview } from '../../services/apiClient';

/**
 * Settlement review of payout bank accounts. New accounts start "Awaiting verification" and
 * receive no money until a settlement operator checks them with the bank. An operator never
 * verifies their own account (the server refuses it). Only masked numbers are shown here.
 */
export const PayoutVerificationPanel: React.FC = () => {
  const [accounts, setAccounts] = useState<PayoutAccountForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'PENDING_VERIFICATION' | 'VERIFIED' | 'ALL'>('PENDING_VERIFICATION');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const refresh = () => {
    setLoading(true);
    setError(null);
    apiClient.getPayoutAccountsForReview()
      // Removed accounts stay on record for past payouts but need no review.
      .then(rows => setAccounts(rows.filter(row => row.status !== 'REMOVED')))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load payout accounts.'))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const verify = async (account: PayoutAccountForReview) => {
    setVerifyingId(account.id);
    setRowError(null);
    try {
      await apiClient.verifyPayoutAccount(account.id);
      refresh();
    } catch (err) {
      setRowError({ id: account.id, message: err instanceof Error ? err.message : 'Failed to verify the account.' });
    } finally {
      setVerifyingId(null);
    }
  };

  const q = searchQuery.toLowerCase();
  const shown = accounts.filter(a =>
    (filter === 'ALL' || a.status === filter) &&
    [a.ownerName, a.provider, a.accountHolder, a.maskedReference].some(v => (v || '').toLowerCase().includes(q))
  );
  const pendingCount = accounts.filter(a => a.status === 'PENDING_VERIFICATION').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Settlement
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Payout Account Verification</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
            Check each new bank account with the bank before verifying it. Money is only paid into verified accounts, and you cannot verify your own.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-xs font-bold text-slate-400 block mb-1">Awaiting verification</span>
          <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 text-xs font-bold">
          {([['PENDING_VERIFICATION', 'Awaiting verification'], ['VERIFIED', 'Verified'], ['ALL', 'All']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl border ${filter === key ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search owner, bank or holder…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {error && <p className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-slate-400 bg-slate-50 dark:bg-slate-900/40">
            <tr>
              <th className="p-3.5">Owner</th>
              <th className="p-3.5">Bank</th>
              <th className="p-3.5">Account</th>
              <th className="p-3.5">Holder</th>
              <th className="p-3.5">Added</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">Loading…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">No payout accounts here.</td></tr>
            ) : shown.map(a => (
              <tr key={a.id} className="border-t border-slate-100 dark:border-slate-700/60 align-top">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">{a.ownerName || a.ownerUserId}</td>
                <td className="p-3.5"><span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-emerald-500" />{a.provider}</span></td>
                <td className="p-3.5 font-mono">
                  {a.maskedReference || '—'}
                  <span className="block text-[10px] text-slate-400 font-sans">{a.destinationType === 'DUITNOW_PROXY' ? 'DuitNow' : 'Bank account'}{a.currency ? ` · ${a.currency}` : ''}</span>
                </td>
                <td className="p-3.5">{a.accountHolder || '—'}</td>
                <td className="p-3.5 text-slate-500">{new Date(a.createdAt).toLocaleString()}</td>
                <td className="p-3.5">
                  {a.status === 'VERIFIED' ? (
                    <span className="flex items-center gap-1 font-bold text-emerald-600"><ShieldCheck className="w-3.5 h-3.5" />Verified{a.verifiedByName ? ` by ${a.verifiedByName}` : ''}</span>
                  ) : (
                    <span className="font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600">Awaiting verification</span>
                  )}
                </td>
                <td className="p-3.5 text-right">
                  {a.status === 'PENDING_VERIFICATION' && (
                    <button
                      type="button"
                      onClick={() => void verify(a)}
                      disabled={verifyingId === a.id}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {verifyingId === a.id ? 'Verifying…' : 'Verify'}
                    </button>
                  )}
                  {rowError?.id === a.id && <p className="mt-1 text-[11px] font-semibold text-red-600 max-w-56 ml-auto">{rowError.message}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
