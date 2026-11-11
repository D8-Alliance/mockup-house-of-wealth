import React, { useState } from 'react';
import { FileUp } from 'lucide-react';
import { apiClient, apiErrorMessage, BankStatementMatch } from '../../services/apiClient';

const CARD = 'rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5';
const INPUT = 'mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs';
const LABEL = 'block text-[11px] font-bold text-slate-500';
const PRIMARY = 'rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white cursor-pointer disabled:opacity-50';
const ALERT = 'rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300';
const THEAD = 'bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400';
const money = (currency: string, amount: number) => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Bank statement matching for payouts already sent: the officer exports the trust account's statement as CSV, the
 * server pairs its outgoing lines with the payouts marked "Sent to bank", and the officer confirms the pairs in one
 * go instead of one by one. Pairs by transfer reference are ticked; pairs by amount alone are left for the officer to
 * check and tick. Nothing is settled until "Confirm".
 */
export const BankStatementMatchPanel: React.FC<{ onSettled: () => void }> = ({ onSettled }) => {
  const [currency, setCurrency] = useState('MYR');
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [result, setResult] = useState<BankStatementMatch | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ settled: string[]; failed: Array<{ payoutId: string; reason: string }> } | null>(null);

  const read = async (chosen: File | undefined) => {
    setResult(null); setDone(null); setError('');
    if (!chosen) { setFile(null); return; }
    setFile({ name: chosen.name, text: await chosen.text() });
  };
  const match = async () => {
    if (!file) return;
    setBusy(true); setError(''); setDone(null);
    try {
      const next = await apiClient.matchBankStatement({ csv: file.text, currency: currency.trim().toUpperCase() });
      setResult(next);
      setTicked(new Set(next.matches.filter((item) => item.basis === 'REFERENCE').map((item) => item.payoutId)));
    } catch (cause) { setError(apiErrorMessage(cause, 'The statement could not be matched.')); } finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!result) return;
    const items = result.matches.filter((item) => ticked.has(item.payoutId)).map((item) => ({ payoutId: item.payoutId, line: item.line.line, description: item.line.description.slice(0, 300) }));
    setBusy(true); setError('');
    try {
      setDone(await apiClient.settleFromStatement({ items, statementName: file?.name }));
      setResult(null);
      onSettled();
    } catch (cause) { setError(apiErrorMessage(cause, 'The payouts could not be confirmed.')); } finally { setBusy(false); }
  };
  const toggle = (id: string) => setTicked((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  return (
    <div className="space-y-4">
      <section className={`${CARD} space-y-3`}>
        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Match a bank statement</h4>
          <p className="text-xs text-slate-500">Export the trust account's statement from online banking as CSV (one month at a time). Payouts marked "Sent to bank" are paired with its outgoing lines; you confirm the pairs before anything is marked paid.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] items-end">
          <label className={LABEL}>Statement (CSV)
            <input type="file" accept=".csv,text/csv" onChange={(event) => void read(event.target.files?.[0])} className={INPUT} />
          </label>
          <label className={LABEL}>Currency
            <input value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} className={INPUT} />
          </label>
          <button type="button" disabled={busy || !file || currency.trim().length !== 3} onClick={() => void match()} className={`${PRIMARY} flex items-center gap-1.5`}><FileUp className="w-3.5 h-3.5" />{busy && !result ? 'Matching...' : 'Match'}</button>
        </div>
        {error && <p role="alert" className={ALERT}>{error}</p>}
        {done && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs space-y-1">
            <p className="font-bold text-emerald-800 dark:text-emerald-300">{done.settled.length} payout{done.settled.length === 1 ? '' : 's'} confirmed as paid. Each investor is told.</p>
            {done.failed.map((item) => <p key={item.payoutId} className="text-rose-700 dark:text-rose-300">{item.payoutId}: {item.reason}</p>)}
          </div>
        )}
      </section>

      {result && (
        <>
          <section className={`${CARD} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">{result.lineCount} outgoing line{result.lineCount === 1 ? '' : 's'} in the statement · {result.submittedCount} payout{result.submittedCount === 1 ? '' : 's'} sent in {result.currency} · <span className="font-bold text-slate-700 dark:text-slate-200">{result.matches.length} paired</span></p>
              <button type="button" disabled={busy || ticked.size === 0} onClick={() => void confirm()} className={PRIMARY}>Confirm {ticked.size} as paid</button>
            </div>
            {result.matches.length === 0 ? <p className="text-xs text-slate-500">No line could be paired with a payout.</p> : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs">
                  <thead className={THEAD}><tr><th className="p-2" /><th className="p-2 text-left">Investor</th><th className="p-2 text-left">Period</th><th className="p-2 text-right">Payout</th><th className="p-2 text-left">Statement line</th><th className="p-2 text-left">Paired by</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {result.matches.map((item) => (
                      <tr key={item.payoutId}>
                        <td className="p-2"><input type="checkbox" aria-label={`Confirm ${item.payoutId}`} checked={ticked.has(item.payoutId)} onChange={() => toggle(item.payoutId)} /></td>
                        <td className="p-2 font-bold">{item.payout.beneficiaryName ?? item.payoutId}<p className="font-normal text-[10px] text-slate-400">{item.payoutId}{item.payout.providerReference ? ` · ref ${item.payout.providerReference}` : ''}</p></td>
                        <td className="p-2">{item.payout.periodName}</td>
                        <td className="p-2 text-right font-bold">{money(item.payout.currency, item.payout.amount)}</td>
                        <td className="p-2">#{item.line.line} · {item.line.date}<p className="text-[10px] text-slate-500 max-w-xs truncate" title={item.line.description}>{item.line.description}</p></td>
                        <td className="p-2">{item.basis === 'REFERENCE' ? <span className="font-bold text-emerald-700 dark:text-emerald-400">Reference and amount</span> : <span className="font-bold text-amber-700 dark:text-amber-400">Amount only: check the name</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {result.mismatches.length > 0 && (
            <section className={`${CARD} space-y-2`}>
              <h4 className="text-sm font-black text-rose-700 dark:text-rose-300">Reference found, amount differs</h4>
              <p className="text-xs text-slate-500">These are never confirmed here. Check the transfer with the bank; mark the payout failed if the wrong amount went out.</p>
              {result.mismatches.map((item) => <p key={item.payoutId} className="text-xs"><span className="font-bold">{item.payout.beneficiaryName ?? item.payoutId}</span> ({item.payoutId}): expected {money(result.currency, item.expected)}, line #{item.line.line} shows {money(result.currency, item.line.amount)}.</p>)}
            </section>
          )}

          {result.ambiguous.length > 0 && (
            <section className={`${CARD} space-y-2`}>
              <h4 className="text-sm font-black text-amber-700 dark:text-amber-400">Same amount more than once</h4>
              <p className="text-xs text-slate-500">Without a transfer reference these cannot be told apart. Confirm them one by one under Pay out.</p>
              {result.ambiguous.map((item) => <p key={item.amount} className="text-xs">{money(result.currency, item.amount)}: payouts {item.payouts.map((payout) => payout.beneficiaryName ?? payout.id).join(', ')} · lines {item.lines.map((line) => `#${line}`).join(', ')}</p>)}
            </section>
          )}

          {result.unmatchedPayouts.length > 0 && (
            <section className={`${CARD} space-y-2`}>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">Sent, but not in this statement</h4>
              {result.unmatchedPayouts.map((payout) => <p key={payout.id} className="text-xs">{payout.beneficiaryName ?? payout.id} · {payout.periodName} · {money(payout.currency, payout.amount)}{payout.providerReference ? ` · ref ${payout.providerReference}` : ''}</p>)}
            </section>
          )}

          {result.unmatchedLines.length > 0 && (
            <details className={CARD}>
              <summary className="text-sm font-black cursor-pointer">Other outgoing lines ({result.unmatchedLines.length})</summary>
              <div className="mt-2 space-y-1">{result.unmatchedLines.map((line) => <p key={line.line} className="text-xs text-slate-500">#{line.line} · {line.date} · {line.description} · {money(result.currency, line.amount)}</p>)}</div>
            </details>
          )}
        </>
      )}
    </div>
  );
};
