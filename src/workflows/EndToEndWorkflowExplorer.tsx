import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { Project } from '../projects/projectTypes';
import { WealthPool } from '../pooling/poolTypes';
import {
  apiClient, BackendDistribution, BackendFeasibilityAssessment, BackendFundingRequest, BackendPoolAkadTerms, BackendProjectLifecycle,
} from '../services/apiClient';
import { WORKFLOW_STEPS, WorkflowTimeline } from './WorkflowTimeline';
import { LifecycleStageView, Load, NextAction, REVIEW_STAGES } from './LifecycleStageView';
import { useRBAC } from '../rbac/RBACContext';
import { canApprovePools, canInvest, canManagePools, canSubmitProject } from '../rbac/menuVisibility';
import { projectService } from '../projects/projectService';
import { poolService } from '../pooling/poolService';

/**
 * Read-only lifecycle view for one real project and its pool. Every value comes from the
 * server (project, status history, feasibility review, pool, akad terms, tranche requests,
 * distributions). The only action is the next step, shown on the current step.
 */

interface EndToEndWorkflowExplorerProps {
  projects: Project[];
  pools: WealthPool[];
  /** Reload projects and pools after an action. */
  onRefresh: () => void;
  /** Open the page's existing windows for the step that needs one. */
  onStructurePool: (project: Project) => void;
  onSignOff: (pool: WealthPool) => void;
  onInvest: (pool: WealthPool) => void;
}

const idle = <T,>(): Load<T> => ({ data: null, error: null, loading: false });

const POOL_PROGRESS = ['DRAFT', 'APPROVED', 'OPEN', 'PAUSED', 'FULL', 'CLOSED'];
const APPROVED_PROJECT = ['APPROVED', 'FUNDING_OPEN', 'POOLING', 'FUNDED', 'EXECUTION', 'PROFIT_DISTRIBUTION', 'COMPLETED'];
const SETTLED_DISTRIBUTION = ['SETTLED', 'PAID', 'COMPLETED'];
const FEASIBILITY_SCREEN = 'AI Wealth Engine › Project Feasibility';

const label = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
const orDash = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));
const money = (currency: string, n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : `${currency} ${Math.round(n).toLocaleString()}`;

const mostAdvancedPool = (pools: WealthPool[]): WealthPool | null =>
  pools.length === 0 ? null : pools.reduce((a, b) => (POOL_PROGRESS.indexOf(b.status) > POOL_PROGRESS.indexOf(a.status) ? b : a));

/** The furthest lifecycle step this project has actually reached (0-based index into WORKFLOW_STEPS). */
function reachedStep(project: Project, pool: WealthPool | null, reviewStage: string | undefined, funding: BackendFundingRequest[], distributions: BackendDistribution[]): number {
  if (pool) {
    if (pool.status === 'CLOSED' || project.status === 'COMPLETED') return 16;
    if (project.status === 'PROFIT_DISTRIBUTION' || distributions.some(d => SETTLED_DISTRIBUTION.includes(d.status))) return 15;
    if (project.status === 'EXECUTION') return 14;
    if (funding.some(f => f.status === 'DISBURSED')) return 13;
    if (['FULL', 'PAUSED'].includes(pool.status) || project.status === 'FUNDED' || (pool.status === 'OPEN' && pool.amountRaised > 0)) return 12;
    if (pool.status === 'OPEN') return 10;
    if (pool.status === 'APPROVED') return 9;
    return 8;
  }
  if (APPROVED_PROJECT.includes(project.status)) return 7;
  if (project.status === 'DUE_DILIGENCE' || project.status === 'REJECTED') {
    if (reviewStage === 'FINAL_DECISION') return 6;
    return REVIEW_STAGES.find(r => r.stage === reviewStage)?.index ?? (project.status === 'REJECTED' ? 2 : 1);
  }
  return 0;
}

export const EndToEndWorkflowExplorer: React.FC<EndToEndWorkflowExplorerProps> = ({
  projects, pools, onRefresh, onStructurePool, onSignOff, onInvest,
}) => {
  const { activeUser, currentRole } = useRBAC();
  const [projectId, setProjectId] = useState<string>('');
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [lifecycle, setLifecycle] = useState<Load<BackendProjectLifecycle>>(idle());
  const [feasibility, setFeasibility] = useState<Load<BackendFeasibilityAssessment | null>>(idle());
  const [akadTerms, setAkadTerms] = useState<Load<BackendPoolAkadTerms | null>>(idle());
  const [funding, setFunding] = useState<Load<BackendFundingRequest[]>>(idle());
  const [distributions, setDistributions] = useState<Load<BackendDistribution[]>>(idle());

  // Default to the first project; keep the selection if it still exists after a refresh.
  useEffect(() => {
    if (projects.length > 0 && !projects.some(p => p.projectId === projectId)) {
      setProjectId(projects[0].projectId);
      setViewIndex(null);
    }
  }, [projects, projectId]);

  const project = projects.find(p => p.projectId === projectId) || null;
  const pool = useMemo(
    () => (project ? mostAdvancedPool(pools.filter(p => p.projectId === project.projectId)) : null),
    [project, pools]
  );

  // Load the real records behind each step for the selected project and pool.
  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    const run = <T,>(set: (l: Load<T>) => void, promise: Promise<T>) => {
      set({ data: null, error: null, loading: true });
      promise
        .then(data => !cancelled && set({ data, error: null, loading: false }))
        .catch(err => !cancelled && set({ data: null, error: err instanceof Error ? err.message : 'Could not load.', loading: false }));
    };

    run(setLifecycle, apiClient.getProjectLifecycle(project.projectId));
    run(setFeasibility, apiClient.getLatestProjectFeasibility(project.projectId));
    run(setFunding, apiClient.getFundingRequests(project.projectId));
    if (pool) {
      run(setAkadTerms, apiClient.getPool(pool.poolId).then(detail => detail.akadTerms));
      run(setDistributions, apiClient.getDistributions().then(all => all.filter(d => d.poolId === pool.poolId)));
    } else {
      setAkadTerms(idle());
      setDistributions(idle());
    }
    return () => { cancelled = true; };
  }, [project?.projectId, project?.status, pool?.poolId, pool?.status]);

  if (!project) {
    return (
      <div className="p-6 rounded-3xl border border-purple-500/20 bg-white dark:bg-slate-800 text-sm text-slate-500">
        No projects to show yet. Submit a project to see its lifecycle here.
      </div>
    );
  }

  const reviewStage = feasibility.data?.reviewStage;
  const reached = reachedStep(project, pool, reviewStage, funding.data || [], distributions.data || []);
  const shown = viewIndex === null ? reached : Math.min(viewIndex, reached);
  const step = WORKFLOW_STEPS[shown];
  const StepIcon = step.icon;
  const isPast = shown < reached;

  const run = async (work: () => Promise<unknown>) => {
    setActionError(null);
    setActionBusy(true);
    try {
      await work();
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The action failed.');
    } finally {
      setActionBusy(false);
    }
  };

  /** The one action that moves the project forward from where it really is. */
  const nextAction = ((): NextAction | null => {
    const base = { busy: actionBusy, error: actionError };

    if (project.status === 'DRAFT') {
      return {
        ...base,
        title: 'Submit for review',
        description: 'Send the project into due diligence, where its feasibility analysis is reviewed by Finance, Risk, Compliance, Shariah and the Investment Committee.',
        ...(canSubmitProject(currentRole)
          ? { buttonLabel: 'Submit for Review', onClick: () => void run(() => projectService.updateProjectStatus(project.projectId, 'DUE_DILIGENCE', activeUser.id, currentRole, 'Submitted for review')) }
          : { note: 'The project sponsor submits it.' }),
      };
    }
    if (project.status === 'REJECTED') return null;

    if (project.status === 'DUE_DILIGENCE') {
      const review = REVIEW_STAGES.find(r => r.stage === reviewStage);
      if (review) {
        return {
          ...base,
          title: label(review.stage),
          description: `The ${label(review.stage).toLowerCase()} decides whether the feasibility analysis moves to the next stage, goes back for changes or is rejected.`,
          note: `${review.who} decides in ${FEASIBILITY_SCREEN}.`,
        };
      }
      if (reviewStage === 'FINAL_DECISION') {
        return { ...base, title: 'Final decision', description: 'The Shariah Committee gives the final investment decision, which approves or rejects the project.', note: `The Shariah Committee decides in ${FEASIBILITY_SCREEN}.` };
      }
      return {
        ...base,
        title: 'Send the feasibility analysis to review',
        description: 'Run the project\'s feasibility analysis and send it to Finance, the first review stage.',
        note: `The project sponsor does this in ${FEASIBILITY_SCREEN}.`,
      };
    }

    if (!pool) {
      return APPROVED_PROJECT.includes(project.status) ? {
        ...base,
        title: 'Structure a wealth pool',
        description: 'Create the pool that will raise the funding, with its akad (Shariah contract) and investor profit share. The organisation must be an approved delivery partner (PDP) and the sponsor capital and takaful cover must be in place.',
        ...(canManagePools(currentRole)
          ? { buttonLabel: 'Structure Pool', onClick: () => onStructurePool(project) }
          : { note: 'Waiting for someone who can create pools, such as a Pool Manager.' }),
      } : null;
    }

    if (pool.status === 'DRAFT') {
      const a = pool.approvals;
      const signed = [a.shariahApproval, a.complianceApproval, a.riskApproval, a.authorisedApproval].filter(Boolean).length;
      return {
        ...base,
        title: `Governance sign-off (${signed} of 4 signed)`,
        description: 'The pool needs Shariah, compliance, risk and authorised-executive sign-offs before it can open.',
        ...(canApprovePools(currentRole)
          ? { buttonLabel: 'Open Sign-off', onClick: () => onSignOff(pool) }
          : { note: 'Waiting for a Pool Manager, Country Admin or Super Admin to sign.' }),
      };
    }
    if (pool.status === 'APPROVED') {
      return {
        ...base,
        title: 'Open the pool for subscriptions',
        description: 'All four sign-offs are done. Opening lists the pool so eligible investors can subscribe.',
        ...(canApprovePools(currentRole)
          ? { buttonLabel: 'Open Pool', onClick: () => void run(() => poolService.openPool(pool.poolId, activeUser.id, currentRole)) }
          : { note: 'Waiting for a Pool Manager, Country Admin or Super Admin to open it.' }),
      };
    }
    if (pool.status === 'OPEN' && project.status !== 'FUNDED') {
      return {
        ...base,
        title: 'Investor subscriptions',
        description: 'Investors subscribe until the target is reached. A settlement officer confirms each payment in the settlement queue; when the target is met the pool is marked full.',
        ...(canInvest(currentRole)
          ? { buttonLabel: 'Subscribe to Pool', onClick: () => onInvest(pool) }
          : { note: 'Only investor accounts with approved KYC can subscribe.' }),
      };
    }
    if (['FULL', 'OPEN', 'PAUSED'].includes(pool.status) && project.status === 'FUNDED') {
      return {
        ...base,
        title: 'Release the funds by tranche',
        description: 'The sponsor requests each disbursement tranche when its milestone is due, and an approver releases it.',
        note: 'The sponsor requests tranches in the Sponsor Portal; Country Admin or Super Admin releases them.',
      };
    }
    return null;
  })();

  return (
    <div className="bg-linear-to-br from-purple-900/5 via-slate-900/5 to-slate-900/10 dark:from-purple-950/30 dark:to-slate-900/60 p-6 rounded-3xl border border-purple-500/20 shadow-md space-y-6">
      {/* Selected project: name as the title, with the project switcher */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-500/10 text-purple-600">{project.projectCode}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-600">{label(project.status)}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              <Activity className="w-6 h-6 text-purple-600 shrink-0" />
              <span className="truncate">{project.projectName}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {orDash(project.organisationName)}{project.location ? ` · ${project.location}` : ''} · Lifecycle from real records, view only.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 shrink-0">
            Change project
            <select
              value={project.projectId}
              onChange={e => { setProjectId(e.target.value); setViewIndex(null); setActionError(null); }}
              className="max-w-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
            >
              {projects.map(p => (
                <option key={p.projectId} value={p.projectId}>{p.projectCode} – {p.projectName}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {([
            ['Shariah contract', orDash(project.proposedShariahContract)],
            ['Funding required', money(project.currency, project.fundingRequired)],
            ['Expected yield', project.indicativeExpectedReturn ? `${project.indicativeExpectedReturn}% p.a.` : '—'],
            ['Pool', pool ? `${pool.poolName} (${label(pool.status)})` : 'No pool yet'],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 block">{k}</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 wrap-break-word">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* All 17 steps. Reached steps are clickable for viewing; past ones are grey. Later steps can't be clicked. */}
      <WorkflowTimeline
        title="Lifecycle progress"
        currentStepIndex={reached}
        selectedIndex={shown}
        maxClickableIndex={reached}
        onStepClick={idx => setViewIndex(idx)}
        mutedPastSteps
      />

      {/* Step bar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-[11px] font-bold flex-wrap">
          <span className={`p-1.5 rounded-lg ${isPast ? 'bg-slate-200 dark:bg-slate-700 text-slate-500' : 'bg-purple-600 text-white'}`}><StepIcon className="w-3.5 h-3.5" /></span>
          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 font-mono">Step {shown + 1} of {WORKFLOW_STEPS.length}</span>
          <span className="text-slate-500">Assigned role: {step.role}</span>
          {isPast
            ? <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Past step · view only</span>
            : <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white">Current step</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewIndex(Math.max(0, shown - 1))}
            disabled={shown === 0}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40"
            aria-label="View previous step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewIndex(Math.min(reached, shown + 1))}
            disabled={shown >= reached}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40"
            aria-label="View next step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <LifecycleStageView
        index={shown}
        project={project}
        pool={pool}
        lifecycle={lifecycle}
        feasibility={feasibility}
        akadTerms={akadTerms}
        funding={funding}
        distributions={distributions}
        nextAction={isPast ? null : nextAction}
      />
    </div>
  );
};
