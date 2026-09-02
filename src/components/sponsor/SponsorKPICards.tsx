import React from 'react';
import { SponsorProject } from './SponsorTypes';
import { Building2, TrendingUp, CheckCircle, Clock, ShieldCheck, DollarSign } from 'lucide-react';

interface SponsorKPICardsProps {
  projects: SponsorProject[];
}

export const SponsorKPICards: React.FC<SponsorKPICardsProps> = ({ projects }) => {
  const totalTarget = projects.reduce((acc, p) => acc + p.targetFunding, 0);
  const totalRaised = projects.reduce((acc, p) => acc + p.raisedFunding, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalRaised / totalTarget) * 100) : 0;
  
  const activeCount = projects.filter(p => p.workflowStage !== 'Completed' && p.workflowStage !== 'Draft').length;
  const executionCount = projects.filter(p => p.workflowStage === 'Execution' || p.workflowStage === 'Profit Distribution').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Capital Raised</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          ${(totalRaised / 1000000).toFixed(2)}M
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{overallPct}% of target</span>
          <span>(${(totalTarget / 1000000).toFixed(2)}M target)</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Projects</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          {projects.length} Projects
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
          <span className="text-amber-600 dark:text-amber-400 font-semibold">{activeCount} in active workflow</span>
          <span>• {executionCount} in execution</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Expected Yield</span>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          9.55% p.a.
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">AAOIFI Compliant</span>
          <span>(Ijarah & Mudarabah)</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shariah Signoff Rate</span>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          100% Verified
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
          <span className="text-purple-600 dark:text-purple-400 font-semibold">D-8 Board Approved</span>
          <span>Zero non-compliance</span>
        </div>
      </div>
    </div>
  );
};
