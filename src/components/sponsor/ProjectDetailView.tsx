import React, { useEffect, useState } from 'react';
import { SponsorProject, WorkflowStage, ProjectMilestone, TeamMember } from './SponsorTypes';
import { SponsorWorkflowBar } from './SponsorWorkflowBar';
import { ProjectMilestoneList } from './ProjectMilestoneList';
import { PDPPromotionCard } from '../revenue/PDPPromotionCard';
import { 
  Building2, CheckCircle2, Clock, AlertTriangle, ShieldCheck, 
  FileText, Users, MessageSquare, Download, ArrowLeft, Plus, DollarSign, Calendar
} from 'lucide-react';
import { apiClient, BackendProjectAnnouncement, BackendProjectDocument, CreateProjectAnnouncementInput, ProjectTeamCandidate } from '../../services/apiClient';
import { authService } from '../../auth/services/authService';

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
  const [projectDocuments, setProjectDocuments] = useState<BackendProjectDocument[]>([]);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const [team, setTeam] = useState<TeamMember[]>(project.team);
  const [teamMemberIds, setTeamMemberIds] = useState<Record<string, string>>({});
  const [teamCandidates, setTeamCandidates] = useState<ProjectTeamCandidate[]>([]);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [selectedTeamUser, setSelectedTeamUser] = useState('');
  const [newTeamRole, setNewTeamRole] = useState('');
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [announcements, setAnnouncements] = useState<BackendProjectAnnouncement[]>([]);
  const [announcementFormOpen, setAnnouncementFormOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [announcementType, setAnnouncementType] = useState<CreateProjectAnnouncementInput['announcementType']>('Quarterly Update');
  const [announcementBusy, setAnnouncementBusy] = useState(false);
  const [announcementError, setAnnouncementError] = useState('');

  const raisedPct = Math.min(100, Math.round((project.raisedFunding / project.targetFunding) * 100));
  const activeRole = authService.getAuthState().session?.user.activeRole;
  const announcementTypes: CreateProjectAnnouncementInput['announcementType'][] = activeRole === 'Project Manager'
    ? ['Milestone Notice']
    : activeRole === 'Finance Officer'
      ? ['Financial Statement', 'Dividends Announcement']
      : ['Compliance Officer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee'].includes(activeRole || '')
        ? ['Compliance Notice']
      : activeRole === 'Project Sponsor'
        ? ['Quarterly Update', 'Milestone Notice', 'Dividends Announcement']
        : [];
  const canPublishAnnouncement = ['Project Sponsor', 'Project Manager', 'Finance Officer', 'Compliance Officer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee'].includes(activeRole || '');

  useEffect(() => {
    let cancelled = false;
    setDocumentsLoaded(false);
    setDocumentError('');
    void apiClient.getProjectDocuments(project.id)
      .then((documents) => {
        if (!cancelled) {
          setProjectDocuments(documents);
          setDocumentsLoaded(true);
        }
      })
      .catch((error) => {
        if (!cancelled) setDocumentError(error instanceof Error ? error.message : 'Unable to load project documents.');
      });
    void apiClient.getProjectTeam(project.id)
      .then((members) => {
        if (!cancelled) {
          setTeam(members.map((member) => ({ id: member.id, name: member.name, role: member.role, qualification: member.qualification, avatarUrl: member.avatarUrl })));
          setTeamMemberIds(Object.fromEntries(members.map((member) => [member.userId, member.id])));
        }
      })
      .catch((error) => { if (!cancelled) setTeamError(error instanceof Error ? error.message : 'Unable to load project team.'); });
    void apiClient.getProjectAnnouncements(project.id)
      .then((items) => { if (!cancelled) setAnnouncements(items); })
      .catch((error) => { if (!cancelled) setAnnouncementError(error instanceof Error ? error.message : 'Unable to load investor announcements.'); });
    return () => { cancelled = true; };
  }, [project.id]);

  const openTeamForm = () => {
    setTeamError('');
    setTeamFormOpen(true);
    void apiClient.getProjectTeamCandidates(project.id)
      .then((candidates) => setTeamCandidates(candidates.filter((candidate) => !teamMemberIds[candidate.id])))
      .catch((error) => setTeamError(error instanceof Error ? error.message : 'Unable to load available users.'));
  };

  const handleAddTeamMember = async () => {
    if (!selectedTeamUser || !newTeamRole.trim()) {
      setTeamError('Choose a user and enter a project role.');
      return;
    }
    setTeamBusy(true);
    setTeamError('');
    try {
      const member = await apiClient.addProjectTeamMember(project.id, { userId: selectedTeamUser, projectRole: newTeamRole.trim() });
      setTeam((current) => [...current, { id: member.id, name: member.name, role: member.role, qualification: member.qualification, avatarUrl: member.avatarUrl }]);
      setTeamMemberIds((current) => ({ ...current, [member.userId]: member.id }));
      setTeamCandidates((current) => current.filter((candidate) => candidate.id !== member.userId));
      setSelectedTeamUser('');
      setNewTeamRole('');
      setTeamFormOpen(false);
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Unable to add team member.');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    setTeamBusy(true);
    setTeamError('');
    try {
      await apiClient.removeProjectTeamMember(project.id, memberId);
      setTeam((current) => current.filter((member) => member.id !== memberId));
      setTeamMemberIds((current) => Object.fromEntries(Object.entries(current).filter(([, value]) => value !== memberId)));
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Unable to remove team member.');
    } finally {
      setTeamBusy(false);
    }
  };

  const handlePublishAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      setAnnouncementError('Enter an announcement title and message before publishing.');
      return;
    }
    setAnnouncementBusy(true);
    setAnnouncementError('');
    try {
      const selectedType = announcementTypes.includes(announcementType) ? announcementType : announcementTypes[0];
      if (!selectedType) {
        setAnnouncementError('Your role has no permitted announcement types.');
        return;
      }
      const announcement = await apiClient.createProjectAnnouncement(project.id, {
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
        announcementType: selectedType,
      });
      setAnnouncements((current) => [announcement, ...current]);
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setAnnouncementFormOpen(false);
    } catch (error) {
      setAnnouncementError(error instanceof Error ? error.message : 'Unable to publish announcement.');
    } finally {
      setAnnouncementBusy(false);
    }
  };

  const handleProjectDocumentUpload = async () => {
    if (!documentFile) {
      setDocumentError('Choose a PDF file before clicking Upload.');
      return;
    }
    setDocumentBusy(true);
    setDocumentError('');
    try {
      const document = await apiClient.uploadProjectDocument(project.id, documentFile);
      setProjectDocuments((current) => [document, ...current]);
      setDocumentsLoaded(true);
      setDocumentFile(null);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'Unable to upload project document.');
    } finally {
      setDocumentBusy(false);
    }
  };

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
           { id: 'dataroom', label: `Data Room (${documentsLoaded ? projectDocuments.length : project.documents.length})`, icon: <FileText className="w-4 h-4" /> },
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
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
                <DollarSign className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No disbursements yet</p>
                <p className="mt-1 text-xs text-slate-500">Released escrow claims will appear here after a milestone is approved.</p>
              </div>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enterprise Data Room & Compliance Documents</h3>
              <p className="text-[11px] text-slate-500">Documents uploaded here are stored against this project and extracted for future AI/RAG analysis.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <label htmlFor={`project-pdf-${project.id}`} className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100">
                <FileText className="h-4 w-4" />
                <span>{documentFile ? 'Change PDF' : 'Choose PDF'}</span>
              </label>
              <input id={`project-pdf-${project.id}`} type="file" accept="application/pdf,.pdf" onChange={(event) => { setDocumentFile(event.target.files?.[0] || null); setDocumentError(''); }} className="sr-only" />
              <button type="button" onClick={() => void handleProjectDocumentUpload()} disabled={documentBusy || !documentFile} className="flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"><Plus className="h-3.5 w-3.5" /> {documentBusy ? 'Uploading...' : 'Upload PDF'}</button>
            </div>
          </div>
          <div className={`rounded-xl border p-3 text-xs ${documentFile ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
            {documentFile ? <><strong>Ready to upload:</strong> {documentFile.name} <span className="ml-2">({(documentFile.size / 1024 / 1024).toFixed(2)} MB)</span></> : <span>Choose a PDF file above. Maximum file size: 10 MB.</span>}
          </div>
          {documentError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{documentError}</p>}
          <div className="space-y-2">
            {documentsLoaded && projectDocuments.length === 0 && <p className="text-xs text-slate-500 italic py-4">No documents uploaded for this project.</p>}
            {documentsLoaded && projectDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{doc.fileName}</span>
                    <p className="text-[11px] text-slate-500">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB • {doc.extractionStatus} • Uploaded {new Date(doc.createdAt).toLocaleDateString()}</p>
                    {doc.extractionError && <p className="text-[11px] text-rose-600">{doc.extractionError}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void apiClient.downloadProjectDocument(project.id, doc.id).catch((error) => setDocumentError(error instanceof Error ? error.message : 'Unable to download document.'))}
                  title={`Download ${doc.fileName}`}
                  className="p-2 text-amber-600 hover:bg-amber-500/10 rounded-lg flex items-center gap-1 font-semibold"
                >
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Key Executive & Engineering Team</h3>
              <p className="text-[11px] text-slate-500">Assign active users from this organisation to the project.</p>
            </div>
            <button type="button" onClick={() => teamFormOpen ? setTeamFormOpen(false) : openTeamForm()} className="flex items-center justify-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-amber-600">
              <Plus className="h-4 w-4" /> {teamFormOpen ? 'Cancel' : 'Add Team Member'}
            </button>
          </div>
          {teamFormOpen && <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Organisation user
                <select value={selectedTeamUser} onChange={(event) => setSelectedTeamUser(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="">Choose a user</option>
                  {teamCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} ({candidate.email})</option>)}
                </select>
              </label>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Project role
                <input value={newTeamRole} onChange={(event) => setNewTeamRole(event.target.value)} placeholder="e.g. Engineering Lead" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </label>
              <button type="button" disabled={teamBusy || !selectedTeamUser || !newTeamRole.trim()} onClick={() => void handleAddTeamMember()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-white dark:text-slate-900 dark:disabled:bg-slate-700">{teamBusy ? 'Saving...' : 'Assign Member'}</button>
            </div>
            {teamCandidates.length === 0 && <p className="mt-3 text-xs font-semibold text-slate-500">No other active users are available in this project tenant.</p>}
          </div>}
          {teamError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{teamError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {team.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className="w-10 h-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-black text-amber-700">{m.name.slice(0, 1).toUpperCase()}</div>}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</h4>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{m.role}</p>
                  <p className="text-[10px] text-slate-500">{m.qualification}</p>
                </div>
                <button type="button" disabled={teamBusy} onClick={() => void handleRemoveTeamMember(m.id)} className="ml-auto rounded-lg px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">Remove</button>
              </div>
            ))}
            {team.length === 0 && <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/40"><Users className="mx-auto mb-2 h-8 w-8 text-slate-300" /><p className="text-sm font-bold text-slate-700 dark:text-slate-200">No team members assigned</p><p className="mt-1 text-xs text-slate-500">Click “Add Team Member” to assign an active organisation user.</p></div>}
          </div>
        </div>
      )}

      {/* Tab 6: Investor Comms */}
      {activeTab === 'investor-comms' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Investor Communications & Announcements</h3>
              <p className="text-[11px] text-slate-500">Published project updates will be shown here for investors and stakeholders.</p>
            </div>
            {canPublishAnnouncement && <button type="button" onClick={() => { setAnnouncementError(''); setAnnouncementFormOpen((open) => !open); }} className="flex items-center justify-center gap-1 rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-purple-700">
              <Plus className="h-4 w-4" /> {announcementFormOpen ? 'Cancel' : 'Create Announcement'}
            </button>}
          </div>
          {announcementFormOpen && <div className="rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/60 p-4 dark:border-purple-500/30 dark:bg-purple-500/5">
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Announcement title
                <input value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} placeholder="e.g. Q4 project progress update" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </label>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Announcement type
                <select value={announcementTypes.includes(announcementType) ? announcementType : announcementTypes[0]} onChange={(event) => setAnnouncementType(event.target.value as CreateProjectAnnouncementInput['announcementType'])} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  {announcementTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-3 block text-[11px] font-bold text-slate-600 dark:text-slate-300">Message
              <textarea value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} placeholder="Write the update for investors..." rows={4} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
            <div className="mt-3 flex justify-end">
              <button type="button" disabled={announcementBusy} onClick={() => void handlePublishAnnouncement()} className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300">{announcementBusy ? 'Publishing...' : 'Publish Announcement'}</button>
            </div>
          </div>}
          {announcementError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{announcementError}</p>}
          <div className="space-y-2">
            {announcements.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No investor announcements</p>
                <p className="mt-1 text-xs text-slate-500">Project Sponsor, Project Manager, Finance, and Compliance teams can publish updates here.</p>
              </div>
            ) : (
              announcements.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>{c.title}</span>
                    <span className="text-slate-400 font-normal">{new Date(c.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{c.type} • Published by {c.author} • {c.readCount} investor reads</p>
                  <p className="pt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{c.body}</p>
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
