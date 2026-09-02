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
}

export const WORKFLOW_STEPS = [
  { id: 'draft', label: '1. Project Created', icon: FilePlus, role: 'Project Sponsor / PDP' },
  { id: 'submitted', label: '2. Submitted', icon: Send, role: 'Project Sponsor / PDP' },
  { id: 'review', label: '3. Project Review', icon: Eye, role: 'Project Reviewer' },
  { id: 'dd', label: '4. Due Diligence', icon: ShieldCheck, role: 'DD Auditor' },
  { id: 'shariah', label: '5. Shariah Review', icon: BookOpen, role: 'Shariah Board' },
  { id: 'compliance', label: '6. Compliance Review', icon: UserCheck, role: 'Compliance Officer' },
  { id: 'risk', label: '7. Risk Assessment', icon: AlertTriangle, role: 'Risk Officer' },
  { id: 'project_approved', label: '8. Project Approved', icon: CheckCircle2, role: 'Executive Approver' },
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
  onStepClick
}) => {
  // Determine active step index based on status if not explicitly provided
  let activeIndex = currentStepIndex ?? 0;
  if (currentStepIndex === undefined) {
    if (poolStatus === 'CLOSED' || poolStatus === 'COMPLETED') activeIndex = 16;
    else if (poolStatus === 'ACTIVE') activeIndex = 14;
    else if (poolStatus === 'FULLY_FUNDED' || poolStatus === 'FUNDING') activeIndex = 13;
    else if (poolStatus === 'OPEN') activeIndex = 10;
    else if (poolStatus === 'APPROVED') activeIndex = 9;
    else if (poolStatus === 'UNDER_REVIEW' || poolStatus === 'PENDING_APPROVAL') activeIndex = 8;
    else if (projectStatus === 'POOLING') activeIndex = 8;
    else if (projectStatus === 'APPROVED') activeIndex = 7;
    else if (projectStatus === 'RISK_REVIEW') activeIndex = 6;
    else if (projectStatus === 'COMPLIANCE_REVIEW') activeIndex = 5;
    else if (projectStatus === 'SHARIAH_REVIEW') activeIndex = 4;
    else if (projectStatus === 'DUE_DILIGENCE') activeIndex = 3;
    else if (projectStatus === 'UNDER_REVIEW') activeIndex = 2;
    else if (projectStatus === 'SUBMITTED') activeIndex = 1;
    else activeIndex = 0;
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            House of Wealth MVP End-to-End Lifecycle Pipeline
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
            const isDone = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const StepIcon = step.icon;

            return (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div className={`h-0.5 w-6 ${isDone ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
                <button
                  onClick={() => onStepClick && onStepClick(idx)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-md scale-105'
                      : isDone
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                  title={`${step.label} - Assigned to: ${step.role}`}
                >
                  <StepIcon className={`w-3.5 h-3.5 ${isCurrent ? 'animate-pulse' : ''}`} />
                  <span className="truncate max-w-[140px]">{step.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
