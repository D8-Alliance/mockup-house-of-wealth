import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TermsChange } from './termsReview';

/** The last look before terms are sent: what changes, and anything that looks like a mistake. */
export const TermsConfirm: React.FC<{ title: string; changes?: TermsChange[]; summary?: string; warnings: string[]; busy: boolean; confirmLabel: string; onBack: () => void; onConfirm: () => void }> = ({ title, changes, summary, warnings, busy, confirmLabel, onBack, onConfirm }) => (
  <div className="space-y-3 p-4 rounded-2xl border border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/10 text-xs">
    <p className="font-black text-slate-800 dark:text-slate-100">{title}</p>
    {summary && <p className="text-slate-700 dark:text-slate-200">{summary}</p>}
    {changes && (changes.length ? (
      <table className="w-full">
        <thead><tr className="text-left text-[10px] uppercase text-slate-400"><th className="py-1 pr-2">Term</th><th className="pr-2">Now</th><th>You send</th></tr></thead>
        <tbody>
          {changes.map((change) => (
            <tr key={change.label} className="border-t border-slate-200 dark:border-slate-700">
              <td className="py-1.5 pr-2 font-bold">{change.label}</td>
              <td className="pr-2 text-slate-500 line-through">{change.from}</td>
              <td className="font-bold text-emerald-700 dark:text-emerald-300">{change.to}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : <p className="text-amber-700 font-bold">Nothing changes from the terms on the table.</p>)}
    {warnings.length > 0 ? (
      <div className="p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 space-y-1">
        <p className="font-black flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Check before sending</p>
        <ul className="list-disc pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
      </div>
    ) : <p className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />No obvious mistakes found.</p>}
    <p className="text-[10px] text-slate-400">Once sent, the other side is notified and can accept these terms as they are.</p>
    <div className="flex justify-end gap-2">
      <button type="button" disabled={busy} onClick={onBack} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Back to edit</button>
      <button type="button" disabled={busy} onClick={onConfirm} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">{busy ? 'Sending…' : confirmLabel}</button>
    </div>
  </div>
);
