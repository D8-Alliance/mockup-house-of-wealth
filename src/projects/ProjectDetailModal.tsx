import { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, BookOpen, AlertTriangle, FileText, Send } from 'lucide-react';
import { Project } from './projectTypes';
import { WorkflowTimeline } from '../workflows/WorkflowTimeline';
import { dueDiligenceService } from '../dueDiligence/dueDiligenceService';
import { riskService } from '../risk/riskService';
import { shariahService } from '../shariah/shariahService';
import { complianceService } from '../compliance/complianceService';
import { projectService } from './projectService';
import { useRBAC } from '../rbac/RBACContext';
import { PDPPromotionCard } from '../components/revenue/PDPPromotionCard';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const ProjectDetailModal = ({ project, onClose, onRefresh }: ProjectDetailModalProps) => {
  const { activeUser, currentRole } = useRBAC();
  const [activeTab, setActiveTab] = useState<'overview' | 'dd' | 'risk' | 'shariah' | 'compliance' | 'docs'>('overview');
  const [reviewComment, setReviewComment] = useState('');

  if (!project) return null;

  const ddRecord = dueDiligenceService.getByProject(project.projectId);
  const riskReport = riskService.getByProject(project.projectId);
  const shariahReview = shariahService.getByProject(project.projectId);
  const compReview = complianceService.getByProject(project.projectId);

  const handleAction = (action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT', nextStatus: any) => {
    projectService.updateProjectStatus(project.projectId, nextStatus, activeUser.id, currentRole, reviewComment);
    onRefresh();
    onClose();
  };

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
            <p className="text-xs text-slate-500">{project.organisationName} • {project.location}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Timeline */}
        <WorkflowTimeline projectStatus={project.status} />

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 text-xs font-bold overflow-x-auto">
          <button onClick={() => setActiveTab('overview')} className={`px-3 py-1.5 rounded-xl ${activeTab === 'overview' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Overview</button>
          <button onClick={() => setActiveTab('dd')} className={`px-3 py-1.5 rounded-xl ${activeTab === 'dd' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Due Diligence (10-Point)</button>
          <button onClick={() => setActiveTab('risk')} className={`px-3 py-1.5 rounded-xl ${activeTab === 'risk' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Risk Matrix</button>
          <button onClick={() => setActiveTab('shariah')} className={`px-3 py-1.5 rounded-xl ${activeTab === 'shariah' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Shariah Review</button>
          <button onClick={() => setActiveTab('compliance')} className={`px-3 py-1.5 rounded-xl ${activeTab === 'compliance' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Compliance</button>
          <button onClick={() => setActiveTab('docs')} className={`px-3 py-1.5 rounded-xl ${activeTab === 'docs' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Documents</button>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
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
                <p className="text-slate-500">Required: <strong className="text-slate-900 dark:text-white">${project.fundingRequired.toLocaleString()} {project.currency}</strong></p>
                <p className="text-slate-500">Sponsor Equity: <strong className="text-slate-900 dark:text-white">${project.sponsorContribution.toLocaleString()} {project.currency}</strong></p>
                <p className="text-slate-500">Indicative Expected Return: <strong className="text-purple-600 font-black">{project.indicativeExpectedReturn}% p.a.</strong></p>
                <p className="text-[10px] text-amber-600 font-bold">* Indicative returns are non-guaranteed projections.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white">Structure & Duration</h3>
                <p className="text-slate-500">Proposed Contract: <strong className="text-purple-600 font-bold">{project.proposedShariahContract}</strong></p>
                <p className="text-slate-500">Duration: <strong className="text-slate-900 dark:text-white">{project.projectDurationMonths} Months</strong></p>
                <p className="text-slate-500">Sector: <strong className="text-slate-900 dark:text-white">{project.sector}</strong></p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dd' && ddRecord && (
          <div className="space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 dark:text-white">10-Point Comprehensive Due Diligence</h3>
            <div className="grid grid-cols-2 gap-2">
              {ddRecord.checklist.map(item => (
                <div key={item.id} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{item.dimension}: {item.title}</span>
                    <p className="text-[11px] text-slate-500">{item.description}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'PASSED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'shariah' && shariahReview && (
          <div className="space-y-3 text-xs p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <h3 className="font-bold text-emerald-900 dark:text-emerald-300">Shariah Board Verification & Fatwa</h3>
            <p className="text-slate-600 dark:text-slate-300">Contract: <strong>{shariahReview.proposedContract}</strong></p>
            <p className="text-slate-600 dark:text-slate-300">Profit Ratio: <strong>{shariahReview.profitSharingRatioSponsorPercent}% Mudarib / {shariahReview.profitSharingRatioInvestorPercent}% Capital Providers</strong></p>
            <p className="text-slate-600 dark:text-slate-300">Fatwa Reference: <strong>{shariahReview.fatwaReferenceNumber || 'FATWA-PENDING'}</strong></p>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-slate-600 dark:text-slate-300">
              <strong>Human Authority Disclaimer:</strong> AI provides analytical structure recommendations. Final Shariah approval belongs strictly to the accredited human Shariah Advisor ({shariahReview.shariahAdvisorName}) and the D-8 Central Shariah Council.
            </div>
          </div>
        )}

        {/* Action Bar for Reviewers */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
          <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block">Review Comments / Governance Sign-off</label>
          <input
            type="text"
            value={reviewComment}
            onChange={e => setReviewComment(e.target.value)}
            placeholder="Add comments or review justification..."
            className="w-full p-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
          />

          <div className="flex justify-end gap-2 text-xs">
            <button
              onClick={() => handleAction('REQUEST_CHANGES', 'DRAFT')}
              className="px-3.5 py-2 rounded-xl font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
            >
              Request Changes
            </button>
            <button
              onClick={() => handleAction('REJECT', 'REJECTED')}
              className="px-3.5 py-2 rounded-xl font-bold bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
            >
              Reject Proposal
            </button>
            <button
              onClick={() => handleAction('APPROVE', 'APPROVED')}
              className="px-4 py-2 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
