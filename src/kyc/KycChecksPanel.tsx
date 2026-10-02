import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
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

// Plain-language names for the officer; unknown types fall back to the raw code.
export const CHECK_LABELS: Record<string, string> = {
  DOCUMENT_CONTENT: 'Documents vs entered details',
  DOCUMENT_CONSISTENCY: 'Entered details consistency',
  DUPLICATE_IDENTITY: 'Duplicate identity',
  DOCUMENT: 'Document authenticity',
  LIVENESS: 'Liveness',
  FACE_MATCH: 'Face match',
  REGISTRY: 'Government registry',
  AML_SCREENING: 'Sanctions / PEP screening',
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
  // Every finding that needs the officer's attention, one line each (e.g. a name on the ID that does not match).
  const issues = primary
    .filter((check) => check.status === 'FAIL' || check.status === 'REVIEW' || check.status === 'ERROR')
    .flatMap((check) => (check.reasons.length ? check.reasons : [`${check.status === 'ERROR' ? 'could not be run' : 'needs review'}`])
      .map((reason, index) => ({ key: `${check.id}-${index}`, label: CHECK_LABELS[check.checkType] ?? check.checkType, reason, failed: check.status === 'FAIL' })));

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
      {issues.length > 0 && (
        <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/30 space-y-1.5" role="alert">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4" />
            {issues.length} issue{issues.length === 1 ? '' : 's'} to check before deciding
          </div>
          <ul className="space-y-1">
            {issues.map(({ key, label, reason, failed }) => (
              <li key={key} className={`flex items-start gap-1.5 text-xs ${failed ? 'text-rose-700 dark:text-rose-300' : 'text-amber-800 dark:text-amber-200'}`}>
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span><strong>{label}:</strong> {reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
                <td className="py-1">{CHECK_LABELS[check.checkType] ?? check.checkType}</td>
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
