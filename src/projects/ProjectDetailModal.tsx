import { X, Info } from 'lucide-react';
import { Project } from './projectTypes';
import { WorkflowTimeline } from '../workflows/WorkflowTimeline';
import { PDPPromotionCard } from '../components/revenue/PDPPromotionCard';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
  onRefresh: () => void;
}

/**
 * A project's details from the server. Review decisions are not taken here: the project is
 * approved through its feasibility review (Finance, Risk, Compliance, Shariah, then the
 * Investment Committee) in AI Wealth Engine › Project Feasibility.
 */
export const ProjectDetailModal = ({ project, onClose }: ProjectDetailModalProps) => {
  if (!project) return null;
  const money = (n: number) => `${project.currency} ${n.toLocaleString()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-6 my-8 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600">
                {project.projectCode}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600">
                {project.status}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">{project.projectName}</h2>
            <p className="text-xs text-slate-500">{project.organisationName}{project.location ? ` • ${project.location}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Timeline */}
        <WorkflowTimeline projectStatus={project.status} />

        <div className="space-y-4">
          <PDPPromotionCard
            projectId={project.projectId}
            projectTitle={project.projectName}
            currentStatus={project.status}
            orgName={project.organisationName}
          />

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white">Funding Requirements</h3>
              <p className="text-slate-500">Required: <strong className="text-slate-900 dark:text-white">{money(project.fundingRequired)}</strong></p>
              <p className="text-slate-500">Total project cost: <strong className="text-slate-900 dark:text-white">{money(project.totalProjectCost)}</strong></p>
              <p className="text-slate-500">Expected yield: <strong className="text-purple-600 font-black">{project.indicativeExpectedReturn ? `${project.indicativeExpectedReturn}% p.a.` : '—'}</strong></p>
              <p className="text-[10px] text-amber-600 font-bold">* Indicative returns are non-guaranteed projections.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white">Structure & Duration</h3>
              <p className="text-slate-500">Proposed Contract: <strong className="text-purple-600 font-bold">{project.proposedShariahContract}</strong></p>
              <p className="text-slate-500">Tenure: <strong className="text-slate-900 dark:text-white">{project.projectDurationMonths ? `${project.projectDurationMonths} months` : '—'}</strong></p>
              <p className="text-slate-500">Sector: <strong className="text-slate-900 dark:text-white">{project.sector}</strong></p>
            </div>
          </div>
          {project.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{project.description}</p>
          )}
        </div>

        <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/60 dark:bg-purple-950/20 text-xs text-purple-900 dark:text-purple-200 flex gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Project review decisions are made in <strong>AI Wealth Engine › Project Feasibility</strong>, where Finance, Risk, Compliance, Shariah and the Investment Committee review in turn.</p>
        </div>
      </div>
    </div>
  );
};
