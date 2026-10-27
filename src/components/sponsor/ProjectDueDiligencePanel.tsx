import React, { useEffect, useState } from 'react';
import { apiClient, BackendEvidenceRequirement, BackendFeasibilityAssessment } from '../../services/apiClient';

/** The review stages a project's feasibility analysis passes, and who decides each (mirrors the server). */
const STAGES: Array<{ key: string; label: string; who: string }> = [
  { key: 'FINANCE_REVIEW', label: 'Finance review', who: 'Finance Officer or Country Admin' },
  { key: 'RISK_REVIEW', label: 'Risk review', who: 'Risk Officer or Country Admin' },
  { key: 'COMPLIANCE_REVIEW', label: 'Compliance review', who: 'Compliance Officer or Country Admin' },
  { key: 'SHARIAH_REVIEW', label: 'Shariah review', who: 'Shariah Reviewer or Country Admin' },
  { key: 'INVESTMENT_COMMITTEE_REVIEW', label: 'Investment committee', who: 'Shariah Committee' },
  { key: 'FINAL_DECISION', label: 'Final decision', who: 'Shariah Committee' },
];
const EVIDENCE_LABELS: Record<string, string> = { FINANCIAL_MODEL: 'Financial model', CASHFLOW_FORECAST: 'Cashflow forecast', ASSET_VALUATION: 'Asset valuation', LEGAL_OWNERSHIP: 'Legal ownership' };
const tone = (value: string) => (/ACCEPT|APPROV|VERIFIED|PASS/i.test(value) ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : /REJECT|FAIL|MISSING/i.test(value) ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : /CHANGE|REVIEW|WARN/i.test(value) ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300');
const words = (value: string) => value.replaceAll('_', ' ').toLowerCase();

/** What the reviewers decided so far, what the AI pre-check found, and the state of each piece of evidence. */
export const ProjectDueDiligencePanel: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [analysis, setAnalysis] = useState<BackendFeasibilityAssessment | null | undefined>(undefined);
  const [evidence, setEvidence] = useState<BackendEvidenceRequirement[]>([]);

  useEffect(() => {
    apiClient.getLatestProjectFeasibility(projectId).then(setAnalysis).catch(() => setAnalysis(null));
    apiClient.getProjectEvidenceRequirements(projectId).then(setEvidence).catch(() => setEvidence([]));
  }, [projectId]);

  const decisionFor = (stage: string) => [...(analysis?.reviewHistory ?? [])].reverse().find((entry) => entry.stage === stage);
  const reached = (stage: string) => STAGES.findIndex((item) => item.key === stage);
  const current = analysis ? reached(analysis.reviewStage) : -1;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5 text-xs">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Shariah and risk due diligence</h3>
        <p className="text-slate-500">Decisions recorded by the reviewers. Nothing here is passed until a person has decided it.</p>
      </div>

      <section className="space-y-2">
        <p className="font-black uppercase text-[10px] text-slate-400">Review stages</p>
        {analysis === undefined ? <p className="text-slate-500">Loading…</p> : !analysis ? (
          <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">No feasibility analysis yet. The sponsor runs it in AI Wealth Engine → Project Feasibility; the review stages start from it.</p>
        ) : STAGES.map((stage, index) => {
          const decision = decisionFor(stage.key);
          const state = decision?.decision || decision?.status || (index === current ? 'WITH THE REVIEWER' : index < current ? 'PASSED ON' : 'NOT REACHED');
          return (
            <div key={stage.key} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">{index + 1}. {stage.label}</p>
                <p className="text-slate-500">{decision ? `${decision.reviewerRole ?? ''}${decision.date ? ` · ${decision.date.slice(0, 10)}` : ''}${decision.comment ? ` · "${decision.comment}"` : ''}` : `By: ${stage.who}`}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${tone(state)}`}>{words(state)}</span>
            </div>
          );
        })}
      </section>

      {analysis?.shariahAssessment?.checks?.length ? (
        <section className="space-y-2">
          <p className="font-black uppercase text-[10px] text-slate-400">AI pre-check of the Shariah structure ({analysis.shariahAssessment.structure})</p>
          <p className="text-slate-500">Advisory only; the Shariah review stage above is the decision.</p>
          {analysis.shariahAssessment.checks.map((check) => (
            <div key={check.label} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span>{check.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${tone(check.status)}`}>{words(check.status)}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="space-y-2">
        <p className="font-black uppercase text-[10px] text-slate-400">Evidence</p>
        {evidence.map((item) => (
          <div key={item.evidenceType} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <span><strong>{EVIDENCE_LABELS[item.evidenceType] ?? words(item.evidenceType)}</strong>{item.uploadedDocument ? ` · ${item.uploadedDocument.fileName}` : ''}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${tone(item.verificationStatus === 'NOT_STARTED' ? item.status : item.verificationStatus)}`}>{words(item.verificationStatus === 'NOT_STARTED' ? item.status : item.verificationStatus)}</span>
          </div>
        ))}
      </section>
    </div>
  );
};
