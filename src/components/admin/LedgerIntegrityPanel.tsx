import React, { useEffect, useState } from 'react';
import { CheckCircle2, Link2, RefreshCw, ShieldAlert } from 'lucide-react';
import { apiClient, apiErrorMessage, HashChainReport } from '../../services/apiClient';

const CHAIN_LABELS: Record<string, string> = { AUDIT: 'Audit log', LEDGER: 'Financial ledger' };
const BREAK_LABELS: Record<string, string> = {
  CONTENT_CHANGED: 'a sealed record was changed',
  RECORD_MISSING: 'a sealed record was deleted',
  LINK_MISMATCH: 'the chain was rewritten',
  SEQUENCE_GAP: 'a link is missing',
};

/**
 * Status of the server-side hash chains over the audit log and ledger. A break
 * means a sealed record no longer matches what was sealed.
 */
export const LedgerIntegrityPanel: React.FC<{ canSeal: boolean }> = ({ canSeal }) => {
  const [report, setReport] = useState<HashChainReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (seal: boolean) => {
    setBusy(true);
    setError('');
    try {
      setReport(seal ? await apiClient.sealHashChains() : await apiClient.getHashChainIntegrity());
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Unable to check ledger integrity.'));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { void run(false); }, []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2"><Link2 className="w-4 h-4 text-purple-500" /> Tamper-evident hash chain</h2>
          <p className="text-[11px] text-slate-500 mt-1">Each audit event and ledger transaction is sealed with a SHA-256 hash linked to the previous one. Changing or deleting a sealed record breaks the chain.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void run(false)} disabled={busy} className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> Verify</button>
          {canSeal && <button onClick={() => void run(true)} disabled={busy} className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50">Seal new records</button>}
        </div>
      </div>
      {error && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</div>}
      {report && (
        <div className="grid gap-3 md:grid-cols-2">
          {report.chains.map((chain) => (
            <div key={chain.chain} className={`rounded-2xl border p-4 text-xs ${chain.valid ? 'border-emerald-200 dark:border-emerald-800/60' : 'border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20'}`}>
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>{CHAIN_LABELS[chain.chain] || chain.chain}</span>
                {chain.valid
                  ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Intact</span>
                  : <span className="flex items-center gap-1 text-rose-600"><ShieldAlert className="w-4 h-4" /> Broken</span>}
              </div>
              <div className="mt-2 text-slate-600 dark:text-slate-300">{chain.sealedCount} sealed · {chain.unsealedCount} awaiting seal</div>
              {chain.firstBreak && <div className="mt-1 text-rose-700 dark:text-rose-300 font-semibold">Link #{chain.firstBreak.sequence}: {BREAK_LABELS[chain.firstBreak.reason] || chain.firstBreak.reason} (record {chain.firstBreak.recordId})</div>}
              <div className="mt-2 font-mono text-[10px] text-slate-400 break-all">Head #{chain.headSequence}: {chain.headHash}</div>
            </div>
          ))}
        </div>
      )}
      {report && <p className="text-[10px] text-slate-400">Checked {new Date(report.checkedAt).toLocaleString()}. The head hash can be published or anchored externally so the chain cannot be rebuilt unnoticed.</p>}
    </div>
  );
};
