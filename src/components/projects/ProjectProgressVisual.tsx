import React from 'react';
import { CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { WorkflowStage } from '../sponsor/SponsorTypes';

const stages: { label: string; activeAt: WorkflowStage[] }[] = [
  { label: 'Draft', activeAt: ['Draft'] },
  { label: 'Shariah Review', activeAt: ['Shariah Review'] },
  { label: 'Approved', activeAt: ['Approved'] },
  { label: 'Funding', activeAt: ['Funding Open', 'Pooling', 'Funded'] },
  { label: 'Execution', activeAt: ['Execution', 'Profit Distribution'] },
  { label: 'Completed', activeAt: ['Completed'] },
];

const stageIndex = (stage: WorkflowStage) => {
  const index = stages.findIndex((item) => item.activeAt.includes(stage));
  return index < 0 ? 0 : index;
};

export const ProjectProgressVisual: React.FC<{ stage: WorkflowStage; compact?: boolean }> = ({ stage, compact = false }) => {
  const current = stageIndex(stage);
  const progress = Math.round((current / (stages.length - 1)) * 100);
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-black uppercase tracking-wider text-slate-500">Project progress</span>
        <span className="font-black text-emerald-600">{progress}% · {stage}</span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-purple-600 transition-all" style={{ width: `${Math.max(progress, 8)}%` }} /></div>
       <div className="grid min-h-[58px] grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6">
        {stages.map((item, index) => {
          const complete = index < current;
          const active = index === current;
           return <div key={item.label} className={`flex min-w-0 flex-col items-center gap-1 text-center leading-tight ${index <= current ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}><span>{complete ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : active ? <Clock3 className="h-4 w-4 shrink-0 text-amber-500" /> : <Circle className="h-4 w-4 shrink-0" />}</span><span className="break-words">{item.label}</span></div>;
        })}
      </div>
    </div>
  );
};
