import React, { useState } from 'react';
import { ProjectMilestone } from './SponsorTypes';
import { Calendar, ShieldCheck, CheckCircle2, Plus } from 'lucide-react';

interface ProjectMilestoneListProps {
  initialMilestones: ProjectMilestone[];
}

export const ProjectMilestoneList: React.FC<ProjectMilestoneListProps> = ({ initialMilestones }) => {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(initialMilestones);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneAmount, setNewMilestoneAmount] = useState('');

  const handleAddMilestone = () => {
    if (!newMilestoneTitle) return;
    const newM: ProjectMilestone = {
      id: `M-${milestones.length + 1}`,
      title: newMilestoneTitle,
      targetDate: '2026-12-31',
      completionPct: 0,
      disbursementAmount: parseFloat(newMilestoneAmount) || 500000,
      status: 'Upcoming',
      shariahSignoff: false,
      auditorSignoff: false
    };
    setMilestones([...milestones, newM]);
    setNewMilestoneTitle('');
    setNewMilestoneAmount('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Project Milestone Execution Matrix</h3>
        <span className="text-xs text-slate-500">Track phase completion & disbursement eligibility</span>
      </div>

      <div className="space-y-3">
        {milestones.map((m) => (
          <div key={m.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-500">{m.id}</span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{m.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  m.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {m.status}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">${m.disbursementAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Target: {m.targetDate}</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className={`w-3.5 h-3.5 ${m.shariahSignoff ? 'text-emerald-500' : 'text-slate-400'}`} /> 
                Shariah: {m.shariahSignoff ? 'Verified' : 'Pending'}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className={`w-3.5 h-3.5 ${m.auditorSignoff ? 'text-emerald-500' : 'text-slate-400'}`} /> 
                Audit: {m.auditorSignoff ? 'Passed' : 'Pending'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
        <input 
          type="text" 
          value={newMilestoneTitle} 
          onChange={(e) => setNewMilestoneTitle(e.target.value)} 
          placeholder="New Milestone Title..." 
          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
        />
        <input 
          type="number" 
          value={newMilestoneAmount} 
          onChange={(e) => setNewMilestoneAmount(e.target.value)} 
          placeholder="Disbursement $" 
          className="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
        />
        <button 
          onClick={handleAddMilestone} 
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg text-xs flex items-center gap-1 justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Milestone
        </button>
      </div>
    </div>
  );
};
