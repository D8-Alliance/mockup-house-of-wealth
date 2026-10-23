import React from 'react';
import { SponsorProject, WorkflowStage } from './SponsorTypes';
import { Building2, TrendingUp, ShieldCheck, Wallet } from 'lucide-react';

interface SponsorKPICardsProps {
  projects: SponsorProject[];
}

/** Stages a project reaches only after the Shariah board approved it. */
const SHARIAH_APPROVED: ReadonlySet<WorkflowStage> = new Set(['Approved', 'Funding Open', 'Pooling', 'Funded', 'Execution', 'Profit Distribution', 'Completed']);

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency, notation: amount >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: amount >= 1_000_000 ? 2 : 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

/** Figures for the sponsor's own projects, all worked out from the projects themselves. */
export const SponsorKPICards: React.FC<SponsorKPICardsProps> = ({ projects }) => {
  const currencies = [...new Set(projects.map((p) => p.currency ?? 'MYR'))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const totalTarget = projects.reduce((acc, p) => acc + p.targetFunding, 0);
  const totalRaised = projects.reduce((acc, p) => acc + p.raisedFunding, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalRaised / totalTarget) * 100) : 0;

  const activeCount = projects.filter(p => p.workflowStage !== 'Completed' && p.workflowStage !== 'Draft').length;
  const draftCount = projects.filter(p => p.workflowStage === 'Draft').length;
  const executionCount = projects.filter(p => p.workflowStage === 'Execution' || p.workflowStage === 'Profit Distribution').length;

  const yields = projects.map((p) => p.expectedYieldPct).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const averageYield = yields.length ? yields.reduce((acc, value) => acc + value, 0) / yields.length : null;

  const shariahApproved = projects.filter((p) => SHARIAH_APPROVED.has(p.workflowStage)).length;
  const inShariahReview = projects.filter((p) => p.workflowStage === 'Shariah Review').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Capital Raised</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          {currency ? money(totalRaised, currency) : 'Several currencies'}
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{overallPct}% of target</span>
          {currency && <span>({money(totalTarget, currency)} target)</span>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projects</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 mt-2 text-xs text-slate-500">
          <span className="text-amber-600 dark:text-amber-400 font-semibold">{activeCount} in active workflow</span>
          <span>• {draftCount} draft</span>
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
          {averageYield === null ? '—' : `${averageYield.toFixed(2)}% p.a.`}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {averageYield === null ? 'No project has an expected yield yet' : `Your projection for ${yields.length} of ${projects.length} ${projects.length === 1 ? 'project' : 'projects'}; not a promise to investors`}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shariah Approval</span>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          {shariahApproved} of {projects.length} approved
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {inShariahReview > 0 ? <span className="text-purple-600 dark:text-purple-400 font-semibold">{inShariahReview} with the Shariah board</span> : projects.length === 0 ? 'No projects yet' : shariahApproved === projects.length ? 'Every project approved by the Shariah board' : 'Submit a project to start its Shariah review'}
        </div>
      </div>
    </div>
  );
};
