import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { AgreementTextCheck, apiClient, apiErrorMessage, BackendAiRun } from '../../../services/apiClient';

const STYLE: Record<AgreementTextCheck['status'], { icon: React.ReactNode; className: string }> = {
  FAIL: { icon: <XCircle className="w-4 h-4 text-rose-600 shrink-0" />, className: 'text-rose-700 dark:text-rose-300' },
  WARN: { icon: <CircleAlert className="w-4 h-4 text-amber-500 shrink-0" />, className: 'text-amber-800 dark:text-amber-300' },
  PASS: { icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />, className: 'text-slate-700 dark:text-slate-200' },
  INFO: { icon: <Info className="w-4 h-4 text-sky-500 shrink-0" />, className: 'text-slate-700 dark:text-slate-200' },
};
const ORDER: Record<AgreementTextCheck['status'], number> = { FAIL: 0, WARN: 1, INFO: 2, PASS: 3 };
const SEVERITY: Record<string, string> = { HIGH: 'bg-rose-500/10 text-rose-700', MEDIUM: 'bg-amber-500/10 text-amber-700', LOW: 'bg-slate-500/10 text-slate-600' };
const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'null' ? value.trim() : null);

/**
 * Checks on an agreement's text (blanks, the clauses its akad needs, the approved partnership terms),
 * and on request an AI scan for gaps with a draft review note. Replaces the old sample "gap analyzer".
 */
export const AgreementChecksPanel: React.FC<{ agreementId: string; version: number; onUseNote?: (note: string, aiRunId: string) => void; /** What failed, and the serious gaps the AI found: approving against them needs a reason. */ onSignals?: (signals: { failed: string[]; highGaps: number }) => void }> = ({ agreementId, version, onUseNote, onSignals }) => {
  const [checks, setChecks] = useState<AgreementTextCheck[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassed, setShowPassed] = useState(false);
  const [scan, setScan] = useState<BackendAiRun | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    setChecks(null);
    setScan(null);
    apiClient.getAgreementChecks(agreementId).then((result) => setChecks(result.checks)).catch((cause) => setError(apiErrorMessage(cause, 'The checks could not be loaded.')));
  }, [agreementId, version]);

  const sorted = [...(checks ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const count = (status: AgreementTextCheck['status']) => sorted.filter((check) => check.status === status).length;
  const shown = showPassed ? sorted : sorted.filter((check) => check.status !== 'PASS');
  const recommendation = (scan?.output?.recommendation ?? {}) as Record<string, unknown>;
  const gaps = (Array.isArray(recommendation.gaps) ? recommendation.gaps : []) as Array<Record<string, unknown>>;
  const draftNote = text(recommendation.draftNote);

  useEffect(() => {
    if (!checks || !onSignals) return;
    onSignals({ failed: checks.filter((check) => check.status === 'FAIL').map((check) => check.label), highGaps: gaps.filter((gap) => String(gap.severity).toUpperCase() === 'HIGH').length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checks, scan]);

  const runScan = async () => {
    setScanning(true);
    setScanError(null);
    try { setScan(await apiClient.scanAgreementGaps(agreementId)); } catch (cause) { setScanError(apiErrorMessage(cause, 'The AI scan is not available.')); } finally { setScanning(false); }
  };

  return (
    <section className="space-y-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-xs">
      <h4 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" />Agreement checks (version {version})</h4>
      {error && <p className="text-rose-600 font-bold">{error}</p>}
      {!checks && !error && <p className="text-slate-400">Checking…</p>}
      {checks && (
        <>
          <p className={`font-bold ${count('FAIL') ? 'text-rose-700 dark:text-rose-300' : count('WARN') ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{count('FAIL') ? `${count('FAIL')} to fix` : 'Nothing to fix'}{count('WARN') ? ` · ${count('WARN')} to confirm` : ''} · {count('PASS')} passed</p>
          <ul className="space-y-1.5">{shown.map((check) => <li key={check.key} className="flex items-start gap-2">{STYLE[check.status].icon}<span className={STYLE[check.status].className}><strong>{check.label}.</strong> {check.detail}</span></li>)}</ul>
          {count('PASS') > 0 && <button type="button" onClick={() => setShowPassed((value) => !value)} className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer">{showPassed ? 'Hide passed checks' : `Show ${count('PASS')} passed checks`}</button>}
        </>
      )}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-500" />AI scan for gaps</span>
          <button type="button" disabled={scanning || !checks} onClick={() => void runScan()} className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60">{scanning ? 'Reading the text… (can take a minute)' : scan ? 'Scan again' : 'Scan this version'}</button>
        </div>
        {scanError && <p className="text-rose-600 font-bold">{scanError}</p>}
        {scan && (
          <div className="space-y-2">
            {text(recommendation.rationale) && <p className="text-slate-700 dark:text-slate-200">{text(recommendation.rationale)}</p>}
            {gaps.length > 0 && (
              <ul className="space-y-1.5">
                {gaps.slice(0, 6).map((gap, index) => (
                  <li key={index} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className={`mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-black ${SEVERITY[String(gap.severity).toUpperCase()] ?? SEVERITY.LOW}`}>{String(gap.severity ?? 'LOW').toUpperCase()}</span>
                    <strong>{text(gap.title)}</strong>{text(gap.clause) ? <span className="text-slate-400"> (clause {text(gap.clause)})</span> : null}
                    {text(gap.suggestion) && <div className="text-slate-600 dark:text-slate-300 mt-0.5">{text(gap.suggestion)}</div>}
                  </li>
                ))}
              </ul>
            )}
            {draftNote && onUseNote && <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900"><p className="font-bold text-slate-600 dark:text-slate-300">Draft review note</p><p className="text-slate-700 dark:text-slate-200">{draftNote}</p><button type="button" onClick={() => scan && onUseNote(draftNote, scan.id)} className="mt-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer">Use as my note</button></div>}
            <p className="text-[10px] text-slate-400">AI reading of this version's text. It may miss or misread clauses; it never approves. The scan is recorded in the agreement's audit trail, and a decision using its note is marked AI-assisted.</p>
          </div>
        )}
      </div>
    </section>
  );
};
