import React, { useState, useEffect } from 'react';
import { SponsorProject, WorkflowStage, SponsorOrgType, ProjectMilestone } from './SponsorTypes';
import { SponsorKPICards } from './SponsorKPICards';
import { formatProjectMoney } from './sponsorMoney';
import { INITIAL_PDP_COUNTRY_CONFIGS } from '../../pdp/pdpCountryConfig';
import { ProjectRegistrationModal } from './ProjectRegistrationModal';
import { ProjectDetailView } from './ProjectDetailView';
import {
  Building2, Plus, Search, Filter, ArrowUpRight, ShieldCheck,
  Clock, DollarSign, Layers, PieChart, FileSpreadsheet, Settings, Users, Sparkles, Megaphone,
  CheckCircle2, AlertTriangle, FileText, CreditCard, ExternalLink, RefreshCw
} from 'lucide-react';
import { PDPSubscriptionCard } from '../revenue/PDPSubscriptionCard';
import { PromoteProjectModal } from '../revenue/PromoteProjectModal';
import { revenueService } from '../../revenue/revenueService';
  import { PDPSubscription, PDPPlan, HoWCreditBalance } from '../../revenue/revenueTypes';
import { PDPApplication } from '../../pdp/pdpTypes';
import { PDPRegistrationModal } from '../../pdp/components/PDPRegistrationModal';
import { PDPPoolCreationModal } from '../../pdp/components/PDPPoolCreationModal';
import { PDPApplicationDetailModal } from '../../pdp/components/PDPApplicationDetailModal';
import { apiClient } from '../../services/apiClient';
import { authService } from '../../auth/services/authService';
import { useRBAC } from '../../rbac/RBACContext';
import { takeProjectRegistrationRequest } from './sponsorNavigation';
import { ProjectProgressVisual } from '../projects/ProjectProgressVisual';
import { OrganisationKybPanel } from '../../organisations/OrganisationKybPanel';

const PROJECT_CATEGORIES: SponsorProject['category'][] = ['Green Energy & Solar', 'Agro-Industrial', 'SME Export', 'Commercial Real Estate', 'Social Waqf Housing'];

const defaultProjectMilestones = (projectId: string, funding: number, workflowStage: WorkflowStage): ProjectMilestone[] => {
  const stages: { title: string; status: ProjectMilestone['status']; completionPct: number }[] = [
    { title: 'Project information and sponsor evidence', status: workflowStage === 'Draft' ? 'In Progress' : 'Completed', completionPct: workflowStage === 'Draft' ? 50 : 100 },
    { title: 'Shariah term sheet review', status: workflowStage === 'Shariah Review' ? 'Pending Verification' : workflowStage === 'Draft' ? 'Upcoming' : 'Completed', completionPct: workflowStage === 'Shariah Review' ? 50 : workflowStage === 'Draft' ? 0 : 100 },
    { title: 'Due diligence and risk clearance', status: workflowStage === 'Approved' ? 'In Progress' : 'Upcoming', completionPct: workflowStage === 'Approved' ? 25 : 0 },
    { title: 'Funding, execution and completion', status: 'Upcoming', completionPct: 0 },
  ];
  return stages.map((stage, index) => ({ id: `${projectId}-M${index + 1}`, title: stage.title, targetDate: new Date(Date.now() + (index + 1) * 30 * 86400000).toISOString().slice(0, 10), completionPct: stage.completionPct, disbursementAmount: 0, status: stage.status, shariahSignoff: stage.completionPct === 100, auditorSignoff: stage.completionPct === 100 }));
};

/** The portal's stage for each lifecycle status on the server. */
const STAGE_OF_STATUS: Record<string, WorkflowStage> = { DRAFT: 'Draft', DUE_DILIGENCE: 'Shariah Review', APPROVED: 'Approved', FUNDING_OPEN: 'Funding Open', POOLING: 'Pooling', FUNDED: 'Funded', EXECUTION: 'Execution', PROFIT_DISTRIBUTION: 'Profit Distribution', COMPLETED: 'Completed' };
const stageOf = (status: string): WorkflowStage => STAGE_OF_STATUS[status] ?? 'Draft';

const mapProjectCategory = (sector: string, projectName: string): SponsorProject['category'] => {
  if (PROJECT_CATEGORIES.includes(sector as SponsorProject['category'])) return sector as SponsorProject['category'];
  return sector.toLowerCase().includes('housing') || projectName.toLowerCase().includes('waqf') ? 'Social Waqf Housing' : 'Green Energy & Solar';
};

const mapShariahContract = (contract: string): SponsorProject['shariahContract'] => {
  if (contract === 'Ijarah') return 'Ijarah (Lease)';
  if (contract === 'Mudarabah') return 'Mudarabah (Profit Share)';
  if (contract === 'Musharakah') return 'Musharakah (Partnership)';
  if (contract === 'Istisna') return 'Istisna (Manufacturing)';
  if (contract === 'Murabahah') return 'Murabahah (Cost-Plus)';
  if (contract === 'Wakalah') return 'Wakalah (Agency Investment)';
  return contract as SponsorProject['shariahContract'];
};

/** "8.5% p.a." from the stored percentage; the form keeps the label, the server keeps the number. */
const yieldLabel = (value: number | string | null | undefined) => (value === null || value === undefined || value === '' ? 'Pending assessment' : `${Number(value)}% p.a.`);

function projectTermsInput(project: SponsorProject) {
  const yieldPct = parseFloat(project.expectedYield);
  return { expectedYieldPct: Number.isFinite(yieldPct) ? yieldPct : undefined, tenureMonths: project.tenureMonths > 0 ? project.tenureMonths : undefined, location: project.location.trim() || undefined };
}

export const ProjectSponsorView: React.FC = () => {
  // The tenant the server resolved for this sign-in; a Keycloak token carries no organisation claim.
  const { tenantContext } = useRBAC();
  const [projects, setProjects] = useState<SponsorProject[]>([]);
  const [projectLoadError, setProjectLoadError] = useState('');
  const [selectedProject, setSelectedProject] = useState<SponsorProject | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(() => takeProjectRegistrationRequest());
  const [projectToPromote, setProjectToPromote] = useState<SponsorProject | null>(null);

  // PDP Modals State
  const [isPdpOnboardingModalOpen, setIsPdpOnboardingModalOpen] = useState(false);
  const [isPdpPoolModalOpen, setIsPdpPoolModalOpen] = useState(false);
  const [isPdpDetailModalOpen, setIsPdpDetailModalOpen] = useState(false);

  const sponsorOrgId = tenantContext.organisationId;
  const userId = tenantContext.userId;
  const [organisationName, setOrganisationName] = useState('');

  // The user's own PDP application from the server; none until they register as a PDP.
  const [pdpApp, setPdpApp] = useState<PDPApplication | undefined>(undefined);
  useEffect(() => {
    apiClient.getMyPdpApplications().then((applications) => setPdpApp(applications[0])).catch(() => setPdpApp(undefined));
    apiClient.getCurrentUser()
      .then((user) => setOrganisationName(user.assignedRoles.find((assignment) => assignment.organisationId === sponsorOrgId && assignment.organisationName)?.organisationName ?? ''))
      .catch(() => undefined);
  }, [sponsorOrgId]);

  const [pdpSub, setPdpSub] = useState<PDPSubscription>(revenueService.getPDPSubscription(sponsorOrgId));
  const [pdpPlans] = useState(revenueService.getPDPPlans());
  const [creditBalance, setCreditBalance] = useState<HoWCreditBalance>({ userId, totalCredits: 0, usedCredits: 0, availableCredits: 0, monthlyAllowance: 0, purchasedCredits: 0, resetDate: '' });

  useEffect(() => {
    const unsubRev = revenueService.subscribe(() => {
      setPdpSub(revenueService.getPDPSubscription(sponsorOrgId));
    });
    return () => {
      unsubRev();
    };
  }, [sponsorOrgId, userId]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'subscription' | 'my-projects' | 'history' | 'campaigns' | 'pdp-dossier' | 'reports' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOrgType, setFilterOrgType] = useState<string>('ALL');

  useEffect(() => {
    void apiClient.getProjects()
      .then((backendProjects) => {
        setProjectLoadError('');
        const projectsFromDatabase: SponsorProject[] = backendProjects.map((item) => ({
          id: item.projectId,
          code: item.projectCode,
          currency: item.countryNode?.currency || 'MYR',
          expectedYieldPct: item.expectedYieldPct === null || item.expectedYieldPct === undefined || item.expectedYieldPct === '' ? undefined : Number(item.expectedYieldPct),
          title: item.projectName,
          orgName: item.organisation?.name || item.organisationId,
          partnershipIds: item.assetEngagements?.map((engagement) => engagement.id) ?? [],
          orgType: item.sponsorEntityType || 'GLC / Sovereign-Backed Enterprise',
          category: mapProjectCategory(item.sector, item.projectName),
          shariahContract: mapShariahContract(item.proposedShariahContract),
          targetFunding: Number(item.fundingRequired),
          raisedFunding: 0,
          expectedYield: yieldLabel(item.expectedYieldPct),
          tenureMonths: item.tenureMonths ?? 0,
          location: item.location || item.countryNodeId,
          country: item.countryNodeId,
          workflowStage: stageOf(item.status),
          serverStatus: item.status,
          healthScore: 0,
           milestones: item.milestones?.map((milestone) => ({ id: milestone.id, title: milestone.title, targetDate: milestone.targetDate || '', completionPct: milestone.completionPct, disbursementAmount: Number(milestone.disbursementAmount), status: milestone.status === 'COMPLETED' ? 'Completed' : milestone.status === 'IN_PROGRESS' ? 'In Progress' : milestone.status === 'PENDING_VERIFICATION' ? 'Pending Verification' : 'Upcoming', shariahSignoff: milestone.shariahSignoff, auditorSignoff: milestone.auditorSignoff })) || defaultProjectMilestones(item.projectId, Number(item.fundingRequired), stageOf(item.status)),
          disbursements: [],
          documents: [],
          team: [],
          comms: [],
          description: item.description,
        }));
        setProjects(projectsFromDatabase);
      })
      .catch((error) => {
        setProjects([]);
        setProjectLoadError(error instanceof Error ? error.message : 'Unable to load projects from the backend.');
      });
  }, []);

  const currentPDPPlan = pdpPlans.find(p => p.id === pdpSub.planId) || pdpPlans[1];

  const [editingProject, setEditingProject] = useState<SponsorProject | null>(null);
  const [statusError, setStatusError] = useState('');

  const replaceProject = (updated: SponsorProject) => {
    setProjects((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedProject((current) => (current && current.id === updated.id ? updated : current));
  };

  /** Submits a draft for review, or takes it back to draft to correct it. */
  const handleChangeStatus = async (project: SponsorProject, status: 'DUE_DILIGENCE' | 'DRAFT') => {
    setStatusError('');
    try {
      const saved = await apiClient.updateProjectStatus(project.id, { status, note: status === 'DRAFT' ? 'Returned to draft by the sponsor to correct it.' : 'Submitted for review by the sponsor.' });
      replaceProject({ ...project, serverStatus: saved.status, workflowStage: stageOf(saved.status) });
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'The status was not changed.');
    }
  };

  const handleCreateProject = async (newProj: SponsorProject, documents: { businessPlan?: File; financialProjection?: File }) => {
    if (editingProject) {
      const saved = await apiClient.updateProjectDetails(editingProject.id, { projectName: newProj.title, description: newProj.description, sector: newProj.category, sponsorEntityType: newProj.orgType, proposedShariahContract: newProj.shariahContract, totalProjectCost: newProj.targetFunding, fundingRequired: newProj.targetFunding, ...projectTermsInput(newProj) });
      replaceProject({ ...editingProject, title: saved.projectName, description: saved.description, orgType: saved.sponsorEntityType || newProj.orgType, category: newProj.category, shariahContract: newProj.shariahContract, targetFunding: Number(saved.fundingRequired), expectedYield: yieldLabel(saved.expectedYieldPct), tenureMonths: saved.tenureMonths ?? 0, location: saved.location || editingProject.location });
      setEditingProject(null);
      return;
    }
    const session = authService.getAuthState().session;
    if (!session) throw new Error('Your session has expired. Please sign in again.');

    const backendProject = await apiClient.createProject({
      projectName: newProj.title,
      description: newProj.description,
      organisationId: tenantContext.organisationId,
      countryNodeId: tenantContext.countryNodeId,
      sector: newProj.category,
      totalProjectCost: newProj.targetFunding,
      sponsorContribution: 0,
      fundingRequired: newProj.targetFunding,
      proposedShariahContract: newProj.shariahContract,
      projectSponsorId: tenantContext.userId,
      sponsorEntityType: newProj.orgType,
      ...projectTermsInput(newProj),
    });
    void apiClient.getMembershipCreditSummary().then(summary => setCreditBalance({ userId: summary.userId, totalCredits: summary.totalPoolCredits, usedCredits: summary.usedCredits, availableCredits: summary.availableBalance, monthlyAllowance: summary.monthlyAllowance, purchasedCredits: summary.purchasedCredits ?? 0, resetDate: summary.resetDate })).catch(() => undefined);

    if (documents.businessPlan) await apiClient.uploadProjectDocument(backendProject.projectId, documents.businessPlan);
    if (documents.financialProjection) await apiClient.uploadProjectDocument(backendProject.projectId, documents.financialProjection);

    setProjects([{ ...newProj, id: backendProject.projectId, workflowStage: 'Draft', serverStatus: backendProject.status }, ...projects]);
  };


  const handleUpgradePDP = (plan: PDPPlan) => {
    revenueService.upgradePDPSubscription(sponsorOrgId, plan.id, 'Corporate FPX Bank Transfer');
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.orgName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrg = filterOrgType === 'ALL' || p.orgType.includes(filterOrgType);
    return matchesSearch && matchesOrg;
  });

  const projectCurrency = editingProject?.currency ?? INITIAL_PDP_COUNTRY_CONFIGS[tenantContext.countryNodeId.replace(/^CN-/, '')]?.primaryCurrency ?? 'MYR';
  if (selectedProject) {
    return (
      <>
        <ProjectDetailView
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
          onEdit={() => { setEditingProject(selectedProject); setIsRegisterModalOpen(true); }}
          onChangeStatus={(status) => void handleChangeStatus(selectedProject, status)}
          statusError={statusError}
        />
        <ProjectRegistrationModal
          isOpen={isRegisterModalOpen}
          onClose={() => { setIsRegisterModalOpen(false); setEditingProject(null); }}
          onSubmitProject={handleCreateProject}
          defaultOrgName={organisationName}
          editing={editingProject}
          currency={projectCurrency}
        />
      </>
    );
  }

  // Approved by a KYB reviewer; ACTIVE is kept for applications from before the server review existed.
  const isPdpActive = pdpApp?.status === 'APPROVED' || pdpApp?.status === 'ACTIVE';

  return (
      <div className="space-y-6 animate-fadeIn">
      {projectLoadError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{projectLoadError}</p>}
      {/* Banner / Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
               Pool & Project Delivery Partner (PDP) Portal
            </span>
            <span className="text-xs text-slate-400">• {organisationName || sponsorOrgId} ({tenantContext.countryNodeId.replace(/^CN-/, '')})</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">D-8 Capital & Asset Originator Portal</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Register as a verified PDP, tokenize infrastructure assets, and structure high-yield Shariah wealth pools across D-8 member nations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 font-black text-slate-950 text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Project</span>
          </button>

          {(!pdpApp || pdpApp.userId === userId) && <button
            onClick={() => setIsPdpOnboardingModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 text-xs rounded-xl border border-slate-700 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>{pdpApp ? 'Edit KYB Onboarding' : 'Register as PDP'}</span>
          </button>}

          <button
            onClick={() => setIsPdpPoolModalOpen(true)}
            disabled={!isPdpActive}
            className={`px-5 py-2.5 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              isPdpActive
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transform hover:scale-105'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Launch Wealth Pool</span>
          </button>
        </div>
      </div>

      {/* PDP Onboarding Status Banner */}
      {pdpApp && (
        <div className={`p-5 rounded-3xl border transition-all ${
          isPdpActive
            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
            : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${isPdpActive ? 'bg-emerald-600 text-white shadow-md' : 'bg-amber-600 text-white'}`}>
                {isPdpActive ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{pdpApp.organisationName}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    isPdpActive ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    PDP {pdpApp.status}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{pdpApp.applicationNumber}</span>
                </div>
                {pdpApp.reviewNote && (pdpApp.status === 'ADDITIONAL_INFORMATION_REQUIRED' || pdpApp.status === 'REJECTED') && (
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mt-1">{pdpApp.status === 'REJECTED' ? 'Rejected' : 'The reviewer asks'}: {pdpApp.reviewNote}{pdpApp.status === 'ADDITIONAL_INFORMATION_REQUIRED' ? ' Use "Edit KYB Onboarding" to correct and submit again.' : ''}</p>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Node: <span className="font-bold">{pdpApp.countryName} ({pdpApp.countryCode})</span> • Category: <span className="font-semibold">{pdpApp.businessCategory}</span> • Settlement: <span className="font-mono font-bold text-purple-600">{pdpApp.bankInfo?.accountNumber} ({pdpApp.bankInfo?.bankName})</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsPdpDetailModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>View KYB Dossier</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <SponsorKPICards projects={projects} />

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 text-xs font-semibold overflow-x-auto scrollbar-thin">
        {[
          { id: 'dashboard', label: 'Sponsor Dashboard', icon: <Building2 className="w-4 h-4" /> },
          { id: 'my-projects', label: `My Projects (${projects.length})`, icon: <Layers className="w-4 h-4" /> },
          { id: 'history', label: 'Past Project History', icon: <Clock className="w-4 h-4" /> },
          { id: 'pdp-dossier', label: 'PDP KYB Profile & UBOs', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'campaigns', label: 'Funding Campaigns', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'reports', label: 'Reports & Audit Trail', icon: <PieChart className="w-4 h-4" /> },
          { id: 'settings', label: 'PDP Settings', icon: <Settings className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* PDP Subscription Status Card */}
      {activeTab === 'dashboard' && (
        <PDPSubscriptionCard
          currentTierId={pdpSub.planId}
          activeProjectsCount={pdpSub.activeProjectsCount}
          onSelectPDPPlan={handleUpgradePDP}
        />
      )}

      {/* PDP Dossier Tab */}
      {activeTab === 'pdp-dossier' && pdpApp && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">PDP Corporate Identity & Regulatory Verification</h3>
               <p className="text-slate-500">Official accreditation on the D-8 Wealth Pooling decentralized ledger.</p>
            </div>
            <button
              onClick={() => setIsPdpOnboardingModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Update Dossier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">Entity Registration</span>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{pdpApp.organisationName}</p>
              <p className="text-slate-500">Reg: <span className="font-mono text-purple-600">{pdpApp.registrationNumber}</span></p>
              <p className="text-slate-500">Tax ID: <span className="font-mono">{pdpApp.taxIdentificationNumber}</span></p>
              <p className="text-slate-500">Address: {pdpApp.registeredAddress}</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">Authorised Representative</span>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{pdpApp.representative?.fullName}</p>
              <p className="text-slate-500">Position: <span className="font-bold">{pdpApp.representative?.position}</span></p>
              <p className="text-slate-500">ID / Passport: <span className="font-mono">{pdpApp.representative?.idPassportNumber}</span></p>
              <p className="text-slate-500">Email: {pdpApp.representative?.email}</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">Settlement Account</span>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{pdpApp.bankInfo?.bankName}</p>
              <p className="text-slate-500">Account: <span className="font-mono font-bold text-purple-600">{pdpApp.bankInfo?.accountNumber}</span></p>
              <p className="text-slate-500">SWIFT / BIC: <span className="font-mono">{pdpApp.bankInfo?.swiftBicCode}</span></p>
              <p className="text-slate-500">Currency: <span className="font-bold text-purple-600">{pdpApp.bankInfo?.currency}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Filter / Search Toolbar */}
      {(activeTab === 'dashboard' || activeTab === 'my-projects' || activeTab === 'campaigns') && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FELDA, MARA, RISDA or Project title..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterOrgType}
              onChange={(e) => setFilterOrgType(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="ALL">All Entity Types</option>
              <option value="FELDA">FELDA (Plantations)</option>
              <option value="FELCRA">FELCRA (Land Dev)</option>
              <option value="RISDA">RISDA (Rubber)</option>
              <option value="MARA">MARA (Entrepreneur)</option>
              <option value="Cooperative">Koperasi / Cooperatives</option>
              <option value="NGO">NGO / Waqf</option>
            </select>
          </div>
        </div>
      )}

      {/* Content Area */}
      {activeTab === 'history' ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">Project History</span>
            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Past and current project lifecycle</h2>
            <p className="mt-1 text-xs text-slate-500">A consolidated record of project status, funding structure and execution progress for this sponsor tenant.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredProjects.map((project) => <div key={project.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900 dark:text-white">{project.title}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{project.code ?? project.id}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{project.workflowStage}</span></div>
              <p className="mt-3 text-xs text-slate-500">{project.shariahContract} · Target MYR {project.targetFunding.toLocaleString()} · {project.country}</p>
              <div className="mt-3"><ProjectProgressVisual stage={project.workflowStage} compact /></div>
              <button onClick={() => setSelectedProject(project)} className="mt-3 text-xs font-black text-purple-600 underline">View project record →</button>
            </div>)}
          </div>
        </div>
      ) : activeTab === 'dashboard' || activeTab === 'my-projects' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredProjects.map((p) => {
            const raisedPct = Math.min(100, Math.round((p.raisedFunding / p.targetFunding) * 100));

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 relative group"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        {p.orgType.split('/')[0]}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{p.code ?? p.id}</span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-1 group-hover:text-purple-600 transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-slate-500">{p.orgName} • {p.location}</p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 whitespace-nowrap">
                    {p.workflowStage}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <span>Capital raised: {formatProjectMoney(p.raisedFunding, p.currency)}</span>
                    <span>{raisedPct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-emerald-500 h-full" style={{ width: `${raisedPct}%` }} />
                  </div>
                </div>

                <ProjectProgressVisual stage={p.workflowStage} compact />

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{p.shariahContract}</span>
                    <span>• {p.expectedYield}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProjectToPromote(p)}
                      disabled={!['Approved', 'Funding Open', 'Pooling', 'Funded'].includes(p.workflowStage)}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer text-[11px] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      title={['Approved', 'Funding Open', 'Pooling', 'Funded'].includes(p.workflowStage) ? 'Promote or feature this campaign in the Global D-8 Marketplace' : 'Promotion unlocks after project approval'}
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>{['Approved', 'Funding Open', 'Pooling', 'Funded'].includes(p.workflowStage) ? 'Promote' : 'Locked'}</span>
                    </button>

                    {p.serverStatus === 'DRAFT' && (
                      <button
                        onClick={() => { setEditingProject(p); setIsRegisterModalOpen(true); }}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer text-[11px]"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedProject(p)}
                      className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      Open Portal <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === 'reports' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Project Sponsor Enterprise Financial & Audit Reports</h3>
            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-semibold flex items-center gap-1">
              <FileSpreadsheet className="w-4 h-4" /> Reports coming soon
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-1">FELDA Bio-Refinery IRR & Cash Flow Model</h4>
              <p className="text-slate-500 mb-2">Detailed 5-year projected yield calculations under SEDA Feed-in tariff rates.</p>
              <button type="button" disabled className="text-slate-400 dark:text-slate-500 font-bold cursor-not-allowed" title="Report generation is not available yet">
                Download Report (PDF) - Coming soon
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-1">D-8 Shariah Compliance & Asset Audit Trail</h4>
              <p className="text-slate-500 mb-2">Verified certificate from D-8 Shariah Advisory Council.</p>
              <button type="button" disabled className="text-slate-400 dark:text-slate-500 font-bold cursor-not-allowed" title="Certificate download is not available yet">
                Download Certificate (PDF) - Coming soon
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'pdp-dossier' ? (
        <div className="space-y-4">
          {!pdpApp && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-xs text-slate-500 space-y-2">
              <p className="font-semibold text-slate-800 dark:text-slate-200">No PDP application for {organisationName || 'your organisation'} yet</p>
              <p>Register as a project delivery partner (PDP) to deliver projects and take part in asset partnerships. A KYB reviewer of your country checks the application.</p>
              <button type="button" onClick={() => setIsPdpOnboardingModalOpen(true)} className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold cursor-pointer">Register as PDP</button>
            </div>
          )}
          <OrganisationKybPanel />
        </div>
      ) : activeTab === 'settings' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-xs text-slate-500">
          <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">PDP settings</p>
          <p>Not available yet. Your organisation's registration details and verification are under PDP KYB Profile &amp; UBOs.</p>
        </div>
      ) : null}

      {/* PDP Modals */}
      <PDPRegistrationModal
        isOpen={isPdpOnboardingModalOpen}
        onClose={() => setIsPdpOnboardingModalOpen(false)}
        initialData={pdpApp}
        onSubmitted={(app) => setPdpApp(app)}
      />

      <PDPPoolCreationModal
        isOpen={isPdpPoolModalOpen}
        onClose={() => setIsPdpPoolModalOpen(false)}
        pdpApplication={pdpApp}
      />

      <PDPApplicationDetailModal
        application={pdpApp || null}
        isOpen={isPdpDetailModalOpen}
        onClose={() => setIsPdpDetailModalOpen(false)}
      />

      {/* Project Registration Modal */}
      <ProjectRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => { setIsRegisterModalOpen(false); setEditingProject(null); }}
        onSubmitProject={handleCreateProject}
        defaultOrgName={organisationName}
        editing={editingProject}
        currency={projectCurrency}
      />

      {/* Promotion Package Modal */}
      {projectToPromote && (
        <PromoteProjectModal
          projectId={projectToPromote.id}
          projectTitle={projectToPromote.title}
          orgName={projectToPromote.orgName}
          availableCredits={creditBalance.availableCredits}
          onClose={() => setProjectToPromote(null)}
          onSuccess={() => setProjectToPromote(null)}
        />
      )}
    </div>
  );
};
