import React, { useState } from 'react';
import { SponsorProject, WorkflowStage, ProjectMilestone } from './SponsorTypes';
import { SponsorWorkflowBar } from './SponsorWorkflowBar';
import { ProjectMilestoneList } from './ProjectMilestoneList';
import { PDPPromotionCard } from '../revenue/PDPPromotionCard';
import { 
  Building2, CheckCircle2, Clock, AlertTriangle, ShieldCheck, 
  FileText, Users, MessageSquare, Download, ArrowLeft, Plus, DollarSign, Calendar
} from 'lucide-react';

interface ProjectDetailViewProps {
  project: SponsorProject;
  onBack: () => void;
  onUpdateStage: (projectId: string, newStage: WorkflowStage) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onBack, onUpdateStage }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'disbursements' | 'dataroom' | 'team' | 'investor-comms' | 'due-diligence'>('overview');
  
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(project.milestones);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneAmount, setNewMilestoneAmount] = useState('');

  const raisedPct = Math.min(100, Math.round((project.raisedFunding / project.targetFunding) * 100));

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
    <div className="space-y-6">
      {/* Top Navigation / Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {project.orgType}
              </span>
              <span className="text-xs text-slate-400 font-mono">{project.id}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{project.title}</h2>
            <p className="text-xs text-slate-500">{project.orgName} • {project.location}, {project.country}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-500">Current Stage</div>
            <div className="font-bold text-amber-600 dark:text-amber-400 text-sm">{project.workflowStage}</div>
          </div>
        </div>
      </div>

      {/* 12-Stage Workflow Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Project Governance & Approval Lifecycle</h3>
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Click any stage to fast-forward workflow stage (Demo Mode)</span>
        </div>
        <SponsorWorkflowBar 
          currentStage={project.workflowStage} 
          onSelectStage={(newStage) => onUpdateStage(project.id, newStage)} 
        />
      </div>

      {/* Detail View Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview & Analytics', icon: <Building2 className="w-4 h-4" /> },
          { id: 'milestones', label: `Milestones (${milestones.length})`, icon: <Clock className="w-4 h-4" /> },
          { id: 'disbursements', label: `Disbursements (${project.disbursements.length})`, icon: <DollarSign className="w-4 h-4" /> },
          { id: 'dataroom', label: `Data Room (${project.documents.length})`, icon: <FileText className="w-4 h-4" /> },
          { id: 'team', label: `Project Team (${project.team.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'investor-comms', label: `Investor Comms (${project.comms.length})`, icon: <MessageSquare className="w-4 h-4" /> },
          { id: 'due-diligence', label: 'Shariah Due Diligence', icon: <ShieldCheck className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview & Analytics */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <PDPPromotionCard
            projectId={project.id}
            projectTitle={project.title}
            currentStatus={project.workflowStage}
            orgName={project.orgName}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Project Description & Scope</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{project.description}</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Category</span>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{project.category}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Shariah Structure</span>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{project.shariahContract}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Target Yield</span>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{project.expectedYield}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Tenure</span>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{project.tenureMonths} Months</div>
                </div>
              </div>
            </div>

            {/* Funding Progress Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Capital Pooling Progress</h3>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{raisedPct}% Funded</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-500" style={{ width: `${raisedPct}%` }} />
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Raised: ${project.raisedFunding.toLocaleString()}</span>
                <span>Target: ${project.targetFunding.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">Health & Governance Score</h3>
              </div>
              <div className="text-3xl font-extrabold text-emerald-400">{project.healthScore} / 100</div>
              <p className="text-xs text-slate-300">Audited by D-8 Shariah Board & AAOIFI standards compliance framework.</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Tab 2: Milestones */}
      {activeTab === 'milestones' && (
        <ProjectMilestoneList initialMilestones={project.milestones} />
      )}

      {/* Tab 3: Disbursements */}
      {activeTab === 'disbursements' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Escrow Disbursement History & Tranche Tracking</h3>
          <div className="space-y-2">
            {project.disbursements.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No disbursement claims released yet for this project.</p>
            ) : (
              project.disbursements.map((d) => (
                <div key={d.trancheId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{d.trancheId} ({d.milestoneId})</span>
                    <p className="text-[11px] text-slate-500">Escrow Ref: {d.escrowRef} • Requested: {d.requestedDate}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 dark:text-white">${d.amount.toLocaleString()}</div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">{d.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Data Room */}
      {activeTab === 'dataroom' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enterprise Data Room & Compliance Documents</h3>
          <div className="space-y-2">
            {project.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{doc.title}</span>
                    <p className="text-[11px] text-slate-500">{doc.category} • {doc.fileSize} • Uploaded {doc.uploadDate}</p>
                  </div>
                </div>
                <button className="p-2 text-amber-600 hover:bg-amber-500/10 rounded-lg flex items-center gap-1 font-semibold">
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Team */}
      {activeTab === 'team' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Key Executive & Engineering Team</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {project.team.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <img src={m.avatarUrl} alt={m.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</h4>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{m.role}</p>
                  <p className="text-[10px] text-slate-500">{m.qualification}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Investor Comms */}
      {activeTab === 'investor-comms' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Investor Communications & Announcements</h3>
          <div className="space-y-2">
            {project.comms.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No investor announcements broadcasted yet.</p>
            ) : (
              project.comms.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>{c.title}</span>
                    <span className="text-slate-400 font-normal">{c.date}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{c.type} • Published by {c.author} • {c.readCount} investor reads</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 7: Due Diligence */}
      {activeTab === 'due-diligence' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Shariah & Risk Due Diligence Matrix</h3>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">1. Shariah Asset Backing Verification (AAOIFI Standard 17)</span>
              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">PASSED</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">2. Riba / Gharar / Maysir Elimination Assessment</span>
              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">PASSED</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">3. Environmental & Social Impact Assessment (ESG)</span>
              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">PASSED</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
