import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiClient, apiErrorMessage, KycApplication, KycCheckRecommendation, KycCheckStatus } from '../services/apiClient';

const RECOMMENDATION_STYLES: Record<KycCheckRecommendation, { label: string; className: string }> = {
  CLEAR: { label: 'No issues found', className: 'bg-emerald-500/10 text-emerald-600' },
  ATTENTION: { label: 'Needs attention', className: 'bg-amber-500/10 text-amber-600' },
  ADVERSE: { label: 'Adverse signals', className: 'bg-rose-500/10 text-rose-600' },
  PENDING: { label: 'Checks running', className: 'bg-purple-500/10 text-purple-600' },
};

const STATUS_STYLES: Record<KycCheckStatus, string> = {
  PASS: 'text-emerald-600',
  FAIL: 'text-rose-600',
  REVIEW: 'text-amber-600',
  PENDING: 'text-purple-600',
  ERROR: 'text-slate-500',
  SKIPPED: 'text-slate-400',
};

interface KycChecksPanelProps {
  application: KycApplication;
  onUpdated: (application: KycApplication) => void;
}

/** Advisory automated-check results for the officer. They never decide the application. */
export const KycChecksPanel: React.FC<KycChecksPanelProps> = ({ application, onUpdated }) => {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const checks = application.checks ?? [];
  const latestRound = checks.reduce((max, check) => Math.max(max, check.round), 0);
  const current = checks.filter((check) => check.round === latestRound);
  const primary = current.filter((check) => !check.shadow);
  const shadows = current.filter((check) => check.shadow);
  const recommendation = application.checkRecommendation ? RECOMMENDATION_STYLES[application.checkRecommendation] : null;
  const canRerun = application.status === 'SUBMITTED' || application.status === 'APPROVED';

  const rerun = async () => {
    setRunning(true);
    setError('');
    try {
      onUpdated(await apiClient.rerunKycChecks(application.id));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The checks could not be re-run.'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Automated checks (advisory)</h5>
        <div className="flex items-center gap-2">
          {recommendation && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${recommendation.className}`}>{recommendation.label}</span>}
          {canRerun && (
            <button type="button" disabled={running} onClick={() => void rerun()} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50" title="Runs a new round of checks; the application status is not changed">
              <RefreshCw className={`w-3 h-3 ${running ? 'animate-spin' : ''}`} />
              Re-run
            </button>
          )}
        </div>
      </div>
      {error && <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">{error}</div>}
      {!primary.length && <p className="text-xs text-slate-400">No automated checks have run for this application yet.</p>}
      {(application.checkReasons ?? []).length > 0 && (
        <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
          {application.checkReasons!.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      )}
      {primary.length > 0 && (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-slate-400 uppercase">
              <th className="py-1">Check</th><th>Provider</th><th>Result</th><th>Score</th>
            </tr>
          </thead>
          <tbody>
            {primary.map((check) => (
              <tr key={check.id} className="border-t border-slate-100 dark:border-slate-700 align-top">
                <td className="py-1 font-mono">{check.checkType}</td>
                <td>{check.provider}</td>
                <td className={`font-bold ${STATUS_STYLES[check.status]}`}>
                  {check.status}
                  {check.reasons.length > 0 && <div className="font-normal text-slate-500">{check.reasons.join('; ')}</div>}
                </td>
                <td>{check.score === null ? '-' : check.score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {shadows.length > 0 && (
        <p className="text-[11px] text-slate-500">
          Shadow providers: {shadows.map((check) => `${check.provider} ${check.checkType} ${check.status}${check.agree === null ? '' : check.agree ? ' (agrees)' : ' (disagrees)'}`).join(' · ')}
        </p>
      )}
      <p className="text-[10px] text-slate-400">Round {latestRound || '-'}. These signals support your review; the decision remains yours.</p>
    </div>
  );
};
