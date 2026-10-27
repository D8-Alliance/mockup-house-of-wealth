import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, CircleDot, Hourglass, Lock, Map, XCircle } from 'lucide-react';
import { apiClient, ProjectRoadmapAction, ProjectRoadmapStep } from '../../services/apiClient';
import { useRBAC } from '../../rbac/RBACContext';

/** The sponsor's side reads its own steps as "You"; reviewers still see the role. */
const SPONSOR_SIDE = ['Project Sponsor', 'Project Manager', 'Organization Admin'];

const PHASES: Array<{ key: ProjectRoadmapStep['phase']; label: string }> = [
  { key: 'PREPARE', label: 'A. Prepare' },
  { key: 'REVIEW', label: 'B. Review' },
  { key: 'FUND', label: 'C. Fund and deliver' },
];

const STATUS: Record<ProjectRoadmapStep['status'], { icon: React.ReactNode; label: string; className: string }> = {
  DONE: { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, label: 'Done', className: 'text-emerald-600' },
  TODO: { icon: <CircleDot className="w-4 h-4 text-amber-500" />, label: 'To do', className: 'text-amber-600' },
  WAITING: { icon: <Hourglass className="w-4 h-4 text-blue-500" />, label: 'Waiting', className: 'text-blue-600' },
  LOCKED: { icon: <Lock className="w-4 h-4 text-slate-400" />, label: 'Later', className: 'text-slate-400' },
  OPTIONAL: { icon: <Circle className="w-4 h-4 text-slate-300" />, label: 'Optional', className: 'text-slate-400' },
  BLOCKED: { icon: <XCircle className="w-4 h-4 text-rose-500" />, label: 'Blocked', className: 'text-rose-600' },
};

const ACTION_LABELS: Record<ProjectRoadmapAction, string> = {
  'pdp-dossier': 'Open PDP & KYB',
  milestones: 'Open milestones',
  'project-analyzer': 'Open Project Feasibility',
  safeguards: 'Open capital & takaful',
  'contract-advisor': 'Open Contract Structuring',
  'asset-partnerships': 'Open Asset Partnerships',
  submit: 'Submit for review',
  contracts: 'Open agreements',
  'launch-pool': 'Launch wealth pool',
};

interface ProjectRoadmapProps {
  projectId: string;
  /** Changes when the project changes (status, details), so the roadmap reloads. */
  version: string;
  onAction: (action: ProjectRoadmapAction) => void;
}

/** What is done, what to do next and who acts, from registration to completion. */
export const ProjectRoadmap: React.FC<ProjectRoadmapProps> = ({ projectId, version, onAction }) => {
  const { currentRole } = useRBAC();
  const who = (text?: string) => (SPONSOR_SIDE.includes(currentRole) ? (text ?? '').replaceAll('Project Sponsor', 'You') : text ?? '');
  const [steps, setSteps] = useState<ProjectRoadmapStep[] | null>(null);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError('');
    apiClient.getProjectRoadmap(projectId)
      .then((items) => { if (!cancelled) setSteps(items); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'The roadmap could not be loaded.'); });
    return () => { cancelled = true; };
  }, [projectId, version]);

  if (error) return <p className="text-xs text-rose-600 font-bold">{error}</p>;
  if (!steps) return null;

  const next = steps.find((step) => step.status === 'TODO');
  const done = steps.filter((step) => step.status === 'DONE').length;
  const counted = steps.filter((step) => step.status !== 'OPTIONAL').length;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Map className="w-4 h-4 text-emerald-600" />Project roadmap</h3>
        <span className="text-slate-500">{done} of {counted} steps done</span>
      </div>

      {next ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <div>
            <p className="font-black text-amber-800 dark:text-amber-300">Next: {next.title}</p>
            <p className="text-slate-600 dark:text-slate-300">{next.detail}</p>
            <p className="text-[11px] text-slate-500">By: {who(next.who)}</p>
          </div>
          {next.action && <button type="button" onClick={() => onAction(next.action!)} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer">{ACTION_LABELS[next.action]}</button>}
        </div>
      ) : (
        <p className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 font-semibold">Nothing for you to do now: {steps.find((step) => step.status === 'WAITING')?.detail ?? 'every step is done.'}</p>
      )}

      <button type="button" onClick={() => setShowAll(!showAll)} className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
        {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}{showAll ? 'Hide all steps' : 'Show all steps'}
      </button>

      {showAll && (
        <div className="grid gap-4 lg:grid-cols-3">
          {PHASES.map((phase) => (
            <div key={phase.key} className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{phase.label}</p>
              {steps.filter((step) => step.phase === phase.key).map((step) => {
                // Collapsed: title and status only. Clicking shows what it means, who acts, and the way to its screen.
                const isOpen = expanded === step.key;
                const toggle = () => setExpanded(isOpen ? null : step.key);
                const canOpenScreen = step.action && step.status !== 'LOCKED';
                return (
                <div key={step.key} className={`rounded-xl border ${step === next ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700'} ${isOpen ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                  <button type="button" onClick={toggle} aria-expanded={isOpen} className="w-full flex items-center justify-between gap-2 p-3 text-left cursor-pointer hover:bg-white dark:hover:bg-slate-800 rounded-xl">
                    <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">{STATUS[step.status].icon}{step.title}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] font-black uppercase ${STATUS[step.status].className}`}>{STATUS[step.status].label}</span>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-1">
                      <p className="text-slate-500">{step.detail}</p>
                      <p className="text-[10px] text-slate-400">By: {who(step.who)}</p>
                      {canOpenScreen && <button type="button" onClick={() => onAction(step.action!)} className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">{ACTION_LABELS[step.action!]} →</button>}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
