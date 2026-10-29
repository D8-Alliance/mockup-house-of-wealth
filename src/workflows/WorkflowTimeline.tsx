import React from 'react';
import { 
  FilePlus, 
  Send, 
  Eye, 
  ShieldCheck, 
  BookOpen, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Lock, 
  Unlock, 
  Users, 
  DollarSign, 
  ArrowUpRight, 
  Activity, 
  Coins, 
  Award 
} from 'lucide-react';
import { ProjectStatus } from '../projects/projectTypes';
import { PoolStatus } from '../pooling/poolTypes';

interface WorkflowTimelineProps {
  projectStatus?: ProjectStatus;
  poolStatus?: PoolStatus;
  currentStepIndex?: number;
  onStepClick?: (stepIndex: number) => void;
  /** The step whose details are being viewed, when it differs from the current step. */
  selectedIndex?: number;
  /** Steps after this index are not clickable (not reached yet). */
  maxClickableIndex?: number;
  /** Header title; defaults to the generic pipeline name. */
  title?: string;
  /** Only show steps up to the current one. */
  hideFutureSteps?: boolean;
  /** Show completed steps in grey (past, read-only) instead of green. */
  mutedPastSteps?: boolean;
}

export const WORKFLOW_STEPS = [
  { id: 'draft', label: '1. Project Created', icon: FilePlus, role: 'Project Sponsor / Delivery Partner' },
  { id: 'submitted', label: '2. Submitted', icon: Send, role: 'Project Sponsor / Delivery Partner' },
  // Steps 3–7 follow the feasibility review stages, in the order the server runs them.
  { id: 'finance', label: '3. Finance Review', icon: Eye, role: 'Finance Officer' },
  { id: 'risk', label: '4. Risk Review', icon: AlertTriangle, role: 'Risk Officer' },
  { id: 'compliance', label: '5. Compliance Review', icon: UserCheck, role: 'Compliance Officer' },
  { id: 'shariah', label: '6. Shariah Review', icon: BookOpen, role: 'Shariah Reviewer' },
  { id: 'committee', label: '7. Investment Committee', icon: ShieldCheck, role: 'Shariah Committee' },
  { id: 'project_approved', label: '8. Project Approved', icon: CheckCircle2, role: 'Shariah Committee' },
  { id: 'pool_structured', label: '9. Pool Structuring', icon: Layers, role: 'Pool Manager' },
  { id: 'pool_approved', label: '10. Pool Approved', icon: Lock, role: 'Multi-Sig Governance' },
  { id: 'pool_open', label: '11. Pool Open', icon: Unlock, role: 'Marketplace' },
  { id: 'investor_sub', label: '12. Investor Discovery & Order', icon: Users, role: 'Investors' },
  { id: 'allocation', label: '13. Allocation & Settlement', icon: DollarSign, role: 'Clearing Engine' },
  { id: 'disbursement', label: '14. Funding Disbursement', icon: ArrowUpRight, role: 'Treasury / Finance' },
  { id: 'monitoring', label: '15. Project Execution', icon: Activity, role: 'Sponsor & Investors' },
  { id: 'returns', label: '16. Profit Distribution', icon: Coins, role: 'Yield Engine' },
  { id: 'maturity', label: '17. Maturity & Exit', icon: Award, role: 'Final Settlement' }
];

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  projectStatus,
  poolStatus,
  currentStepIndex,
  onStepClick,
  selectedIndex,
  maxClickableIndex,
  title = 'House of Wealth MVP End-to-End Lifecycle Pipeline',
  hideFutureSteps = false,
  mutedPastSteps = false
}) => {
  // Without an explicit step, place the project roughly by its server status (and its pool's).
  let activeIndex = currentStepIndex ?? 0;
  if (currentStepIndex === undefined) {
    if (poolStatus === 'CLOSED' || projectStatus === 'COMPLETED') activeIndex = 16;
    else if (projectStatus === 'PROFIT_DISTRIBUTION') activeIndex = 15;
    else if (projectStatus === 'EXECUTION') activeIndex = 14;
    else if (projectStatus === 'FUNDED' || poolStatus === 'FULLY_FUNDED') activeIndex = 12;
    else if (poolStatus === 'OPEN') activeIndex = 10;
    else if (poolStatus === 'APPROVED') activeIndex = 9;
    else if (poolStatus === 'DRAFT') activeIndex = 8;
    else if (projectStatus && ['APPROVED', 'FUNDING_OPEN', 'POOLING'].includes(projectStatus)) activeIndex = 7;
    else if (projectStatus === 'DUE_DILIGENCE') activeIndex = 1;
    else activeIndex = 0;
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            {title}
          </h3>
          <p className="text-[11px] text-slate-500">
            Current Stage: <span className="font-bold text-purple-600 dark:text-purple-400">{WORKFLOW_STEPS[activeIndex]?.label}</span> ({WORKFLOW_STEPS[activeIndex]?.role})
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300">
          Step {activeIndex + 1} of {WORKFLOW_STEPS.length}
        </span>
      </div>

      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex items-center min-w-max gap-2 px-1">
          {WORKFLOW_STEPS.map((step, idx) => {
            if (hideFutureSteps && idx > activeIndex) return null;
            const isDone = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const isSelected = selectedIndex === idx && !isCurrent;
            const isClickable = !!onStepClick && (maxClickableIndex === undefined || idx <= maxClickableIndex);
            const StepIcon = step.icon;

            return (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div className={`h-0.5 w-6 ${isDone && !mutedPastSteps ? 'bg-emerald-500' : isDone ? 'bg-slate-300 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
                <button
                  onClick={() => isClickable && onStepClick && onStepClick(idx)}
                  disabled={!isClickable}
                  aria-current={selectedIndex === idx ? 'step' : undefined}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold transition-all ${
                    isClickable ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    isCurrent
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-md scale-105'
                      : isDone && mutedPastSteps
                      ? 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
                      : isDone
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800'
                  } ${isSelected ? 'ring-2 ring-slate-500 ring-offset-2 dark:ring-offset-slate-800 text-slate-700 dark:text-slate-200' : ''}`}
                  title={`${step.label} - Assigned to: ${step.role}${isClickable ? '' : ' (not reached yet)'}`}
                >
                  <StepIcon className={`w-3.5 h-3.5 ${isCurrent ? 'animate-pulse' : ''}`} />
                  <span className="truncate max-w-35">{step.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
