import React from 'react';
import { WorkflowStage } from './SponsorTypes';
import { WORKFLOW_STAGES_LIST } from './SponsorData';
import { CheckCircle2, Clock, CircleAlert } from 'lucide-react';

interface SponsorWorkflowBarProps {
  currentStage: WorkflowStage;
  onSelectStage?: (stage: WorkflowStage) => void;
}

export const SponsorWorkflowBar: React.FC<SponsorWorkflowBarProps> = ({ currentStage, onSelectStage }) => {
  const currentIndex = WORKFLOW_STAGES_LIST.indexOf(currentStage);

  return (
    <div className="w-full bg-slate-900/90 dark:bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg overflow-x-auto">
      <div className="flex items-center justify-between gap-2 min-w-[950px]">
        {WORKFLOW_STAGES_LIST.map((stage, idx) => {
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          
          let stateStyle = 'bg-slate-800 text-slate-500 border-slate-700';
          if (isPassed) {
            stateStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40';
          } else if (isCurrent) {
            stateStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/80 ring-2 ring-amber-500/30';
          }

          return (
            <React.Fragment key={stage}>
              <button
                onClick={() => onSelectStage?.(stage)}
                title={`Click to view stage: ${stage}`}
                className={`flex-1 flex flex-col items-center p-2 rounded-lg border text-xs transition-all ${stateStyle} hover:border-amber-400/50 cursor-pointer`}
              >
                <div className="flex items-center gap-1 font-semibold mb-1">
                  {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {isCurrent && <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                  {!isPassed && !isCurrent && <CircleAlert className="w-3.5 h-3.5 text-slate-500" />}
                  <span className="text-[10px] opacity-75">#{idx + 1}</span>
                </div>
                <span className="text-[11px] font-medium text-center line-clamp-1 leading-tight">
                  {stage}
                </span>
              </button>
              {idx < WORKFLOW_STAGES_LIST.length - 1 && (
                <div className={`h-0.5 w-3 rounded ${idx < currentIndex ? 'bg-emerald-500' : 'bg-slate-800'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
