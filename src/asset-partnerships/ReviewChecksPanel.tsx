import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { apiClient, apiErrorMessage, BackendAiRun, PartnershipReviewCheck } from '../services/apiClient';

type Track = 'LEGAL' | 'SHARIAH';

const STATUS_STYLE: Record<PartnershipReviewCheck['status'], { icon: React.ReactNode; className: string }> = {
  FAIL: { icon: <XCircle className="w-4 h-4 text-rose-600 shrink-0" />, className: 'text-rose-700 dark:text-rose-300' },
  WARN: { icon: <CircleAlert className="w-4 h-4 text-amber-500 shrink-0" />, className: 'text-amber-800 dark:text-amber-300' },
  PASS: { icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />, className: 'text-slate-700 dark:text-slate-200' },
  INFO: { icon: <Info className="w-4 h-4 text-sky-500 shrink-0" />, className: 'text-slate-700 dark:text-slate-200' },
};
const ORDER: Record<PartnershipReviewCheck['status'], number> = { FAIL: 0, WARN: 1, INFO: 2, PASS: 3 };
const DECISION_LABEL: Record<string, string> = { APPROVE: 'Approve', REQUEST_CHANGES: 'Request changes', REJECT: 'Reject' };
const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'null' ? value.trim() : null);

/**
 * Pre-approval checks for the Legal or Shariah reviewer of an accepted partnership: the platform's
 * checks (instant, always the same for the same data), and on request an AI summary, questions for
 * the parties and a draft note the reviewer can use.
 */
export const ReviewChecksPanel: React.FC<{ engagementId: string; defaultTrack: Track; onUseNote: (note: string, aiRunId: string) => void }> = ({ engagementId, defaultTrack, onUseNote }) => {
  const [checks, setChecks] = useState<PartnershipReviewCheck[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [track, setTrack] = useState<Track>(defaultTrack);
  const [showPassed, setShowPassed] = useState(false);
  const [assist, setAssist] = useState<(BackendAiRun & { failing: number }) | null>(null);
  const [asking, setAsking] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);

  useEffect(() => {
    setChecks(null);
    apiClient.getPartnershipChecks(engagementId).then((result) => setChecks(result.checks)).catch((cause) => setError(apiErrorMessage(cause, 'The checks could not be loaded.')));
  }, [engagementId]);
  useEffect(() => { setAssist(null); setAssistError(null); }, [track]);

  const mine = (checks ?? []).filter((check) => check.track === track || check.track === 'BOTH').sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const count = (status: PartnershipReviewCheck['status']) => mine.filter((check) => check.status === status).length;
  const shown = showPassed ? mine : mine.filter((check) => check.status !== 'PASS');

  const ask = async () => {
    setAsking(true);
    setAssistError(null);
    try {
      setAssist(await apiClient.askPartnershipReviewAssistant(engagementId, track));
    } catch (cause) {
      setAssistError(apiErrorMessage(cause, 'The AI assistant is not available.'));
    } finally {
      setAsking(false);
    }
  };
  const recommendation = (assist?.output?.recommendation ?? {}) as Record<string, unknown>;
  const questions = (Array.isArray(recommendation.questions) ? recommendation.questions : []).map(text).filter((item): item is string => Boolean(item)).slice(0, 4);
  const draftNote = text(recommendation.draftNote);
  const suggested = text(recommendation.suggestedDecision)?.toUpperCase();

  return (
    <section className="space-y-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" />Pre-approval checks</h3>
        <div className="flex gap-1">
          {(['LEGAL', 'SHARIAH'] as Track[]).map((value) => (
            <button key={value} type="button" onClick={() => setTrack(value)} className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${track === value ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>{value === 'LEGAL' ? 'Legal' : 'Shariah'}</button>
          ))}
        </div>
      </div>
      {error && <p className="text-rose-600 font-bold">{error}</p>}
      {!checks && !error && <p className="text-slate-400">Checking…</p>}
      {checks && (
        <>
          <p className={`font-bold ${count('FAIL') ? 'text-rose-700 dark:text-rose-300' : count('WARN') ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {count('FAIL') ? `${count('FAIL')} to fix before approval` : 'Nothing blocks approval'}{count('WARN') ? ` · ${count('WARN')} to confirm` : ''} · {count('PASS')} passed
          </p>
          <ul className="space-y-1.5">
            {shown.map((check) => (
              <li key={check.key} className="flex items-start gap-2">
                {STATUS_STYLE[check.status].icon}
                <span className={STATUS_STYLE[check.status].className}><strong>{check.label}.</strong> {check.detail}</span>
              </li>
            ))}
          </ul>
          {count('PASS') > 0 && <button type="button" onClick={() => setShowPassed((value) => !value)} className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer">{showPassed ? 'Hide passed checks' : `Show ${count('PASS')} passed checks`}</button>}
          <p className="text-[10px] text-slate-400">Worked out by the platform from the terms, the asset's documents and its title checks. Read the documents yourself; you decide. What failed or warned is recorded with your decision.</p>
        </>
      )}

      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-500" />AI review assistant</span>
          <button type="button" disabled={asking || !checks} onClick={() => void ask()} className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60">{asking ? 'Thinking… (can take a minute)' : assist ? 'Ask again' : 'Summarise and draft a note'}</button>
        </div>
        {assistError && <p className="text-rose-600 font-bold">{assistError}</p>}
        {assist && (
          <div className="space-y-2">
            {suggested && DECISION_LABEL[suggested] && <p><span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-black">AI suggests: {DECISION_LABEL[suggested]}</span>{assist.failing > 0 && suggested !== 'APPROVE' && <span className="ml-2 text-[10px] text-slate-400">({assist.failing} check{assist.failing > 1 ? 's' : ''} failing, so approval is not suggested)</span>}</p>}
            {text(recommendation.rationale) && <p className="text-slate-700 dark:text-slate-200">{text(recommendation.rationale)}</p>}
            {questions.length > 0 && <div><p className="font-bold text-slate-600 dark:text-slate-300">Questions for the parties</p><ul className="list-disc pl-5">{questions.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {draftNote && (
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900">
                <p className="font-bold text-slate-600 dark:text-slate-300">Draft review note</p>
                <p className="text-slate-700 dark:text-slate-200">{draftNote}</p>
                <button type="button" onClick={() => assist && onUseNote(draftNote, assist.id)} className="mt-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer">Use as my review note</button>
              </div>
            )}
            <p className="text-[10px] text-slate-400">AI help from the checks and terms above. It may be wrong: edit the note before you use it. If you use it, your decision is recorded as AI-assisted. It never approves.</p>
          </div>
        )}
      </div>
    </section>
  );
};
