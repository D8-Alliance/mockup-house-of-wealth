import React, { useState } from 'react';
import { AIHumanDecision } from '../types/aiCoreTypes';
import { CheckCircle, XCircle, Edit3, AlertTriangle } from 'lucide-react';

interface AIReviewPanelProps {
  aiRequestId: string;
  userId: string;
  roleName: string;
  onDecisionSubmitted?: (decision: Exclude<AIHumanDecision, 'PENDING'>, note: string) => Promise<void> | void;
}

export const AIReviewPanel: React.FC<AIReviewPanelProps> = ({
  aiRequestId,
  userId,
  roleName,
  onDecisionSubmitted
}) => {
  const [decision, setDecision] = useState<AIHumanDecision>('PENDING');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleApplyDecision = async (selectedDecision: Exclude<AIHumanDecision, 'PENDING'>) => {
    if ((selectedDecision === 'OVERRIDDEN' || selectedDecision === 'MODIFIED') && !overrideReason.trim()) {
      setError('Please provide a justification note when modifying or overriding the AI recommendation.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (onDecisionSubmitted) {
        await onDecisionSubmitted(selectedDecision, overrideReason);
      }
      setDecision(selectedDecision);
      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to record the human decision.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1 text-xs">
        <div className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Human Decision Recorded: {decision}
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300">
          Decision logged under audit ID <span className="font-mono font-bold">{aiRequestId}</span> by {roleName}.
        </p>
        {overrideReason && (
          <p className="text-[10px] text-slate-500 italic">Justification: "{overrideReason}"</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <Edit3 className="w-3.5 h-3.5 text-purple-600" />
          Human Review & Signoff ({roleName})
        </span>
        <span className="text-[10px] text-slate-400 font-mono">{aiRequestId}</span>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
          Reviewer Justification / Override Reason (Required if overriding)
        </label>
        <textarea
          value={overrideReason}
          onChange={e => setOverrideReason(e.target.value)}
          placeholder="Enter comments, conditions, or reason for overriding AI recommendation..."
          className="w-full h-16 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {error && (
        <p role="alert" className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => handleApplyDecision('ACCEPTED')}
          disabled={submitting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] cursor-pointer"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Accept Recommendation
        </button>

        <button
          onClick={() => handleApplyDecision('MODIFIED')}
          disabled={submitting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Modify Conditions
        </button>

        <button
          onClick={() => handleApplyDecision('OVERRIDDEN')}
          disabled={submitting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Override AI
        </button>

        <button
          onClick={() => handleApplyDecision('REJECTED')}
          disabled={submitting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5" />
          Reject
        </button>
      </div>
    </div>
  );
};
