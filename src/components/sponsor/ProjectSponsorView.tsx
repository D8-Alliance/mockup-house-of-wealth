import React, { useState, useEffect } from 'react';
import { SponsorProject, WorkflowStage, SponsorOrgType } from './SponsorTypes';
import { INITIAL_SPONSOR_PROJECTS } from './SponsorData';
import { SponsorKPICards } from './SponsorKPICards';
import { ProjectRegistrationModal } from './ProjectRegistrationModal';
import { ProjectDetailView } from './ProjectDetailView';
import { 
  Building2, Plus, Search, Filter, ArrowUpRight, ShieldCheck, 
  Clock, DollarSign, Layers, PieChart, FileSpreadsheet, Settings, Users, Sparkles, Megaphone,
  CheckCircle2, AlertTriangle, FileText, CreditCard, ExternalLink, RefreshCw
} from 'lucide-react';
import { PDPSubscriptionCard } from '../revenue/PDPSubscriptionCard';
import { ProjectPromotionModal } from '../revenue/ProjectPromotionModal';
import { revenueService } from '../../revenue/revenueService';
import { PDPSubscription, PDPPlan, HoWCreditBalance } from '../../revenue/revenueTypes';
import { pdpService } from '../../pdp/pdpService';
import { PDPApplication } from '../../pdp/pdpTypes';
import { PDPRegistrationModal } from '../../pdp/components/PDPRegistrationModal';
import { PDPPoolCreationModal } from '../../pdp/components/PDPPoolCreationModal';
import { PDPApplicationDetailModal } from '../../pdp/components/PDPApplicationDetailModal';

export const ProjectSponsorView: React.FC = () => {
  const [projects, setProjects] = useState<SponsorProject[]>(INITIAL_SPONSOR_PROJECTS);
  const [selectedProject, setSelectedProject] = useState<SponsorProject | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [projectToPromote, setProjectToPromote] = useState<SponsorProject | null>(null);

  // PDP Modals State
  const [isPdpOnboardingModalOpen, setIsPdpOnboardingModalOpen] = useState(false);
  const [isPdpPoolModalOpen, setIsPdpPoolModalOpen] = useState(false);
  const [isPdpDetailModalOpen, setIsPdpDetailModalOpen] = useState(false);

  const sponsorOrgId = 'ORG-FELDA-MY';
  const userId = 'USR-8821';

  // PDP Application Status
  const [pdpApp, setPdpApp] = useState<PDPApplication | undefined>(
    pdpService.getApplicationById('PDP-2026-MYS-0014') || pdpService.getAllApplications()[0]
  );

  const [pdpSub, setPdpSub] = useState<PDPSubscription>(revenueService.getPDPSubscription(sponsorOrgId));
  const [pdpPlans] = useState(revenueService.getPDPPlans());
  const [creditBalance, setCreditBalance] = useState<HoWCreditBalance>(revenueService.getCreditBalance(userId));

  useEffect(() => {
    const unsubRev = revenueService.subscribe(() => {
      setPdpSub(revenueService.getPDPSubscription(sponsorOrgId));
      setCreditBalance(revenueService.getCreditBalance(userId));
    });
    const unsubPdp = pdpService.subscribe(() => {
      const updated = pdpService.getApplicationById('PDP-2026-MYS-0014') || pdpService.getAllApplications()[0];
      setPdpApp(updated);
    });

    return () => {
      unsubRev();
      unsubPdp();
    };
  }, [sponsorOrgId, userId]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'subscription' | 'my-projects' | 'campaigns' | 'pdp-dossier' | 'reports' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOrgType, setFilterOrgType] = useState<string>('ALL');

  const currentPDPPlan = pdpPlans.find(p => p.id === pdpSub.planId) || pdpPlans[1];

  const handleCreateProject = (newProj: SponsorProject) => {
    setProjects([newProj, ...projects]);
  };

  const handleUpdateStage = (projectId: string, newStage: WorkflowStage) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, workflowStage: newStage } : p));
    if (selectedProject && selectedProject.id === projectId) {
      setSelectedProject(prev => prev ? { ...prev, workflowStage: newStage } : null);
    }
  };

  const handleConfirmPromotion = (packageId: string, method: 'cash' | 'credits') => {
    if (projectToPromote) {
      revenueService.promoteProject(projectToPromote.id, projectToPromote.title, packageId, method === 'credits', userId);
      setProjectToPromote(null);
    }
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

  if (selectedProject) {
    return (
      <ProjectDetailView 
        project={selectedProject} 
        onBack={() => setSelectedProject(null)} 
        onUpdateStage={handleUpdateStage}
      />
    );
  }

  const isPdpActive = pdpApp?.status === 'ACTIVE';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner / Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Pool & Project Data Provider (PDP) Portal
            </span>
            <span className="text-xs text-slate-400">• FELDA Technoplant / GLC Sovereign Node (MYS)</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">D-8 Capital & Asset Originator Portal</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Register as a verified PDP, tokenize infrastructure assets, and structure high-yield Shariah wealth pools across D-8 member nations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsPdpOnboardingModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 text-xs rounded-xl border border-slate-700 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>{pdpApp ? 'Edit KYB Onboarding' : 'Register as PDP'}</span>
          </button>

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
              <p className="text-slate-500">Official accreditation on the D-8 House of Wealth decentralized ledger.</p>
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
      {activeTab === 'dashboard' || activeTab === 'my-projects' ? (
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
                      <span className="text-[10px] text-slate-400 font-mono">{p.id}</span>
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
                    <span>Capital Raised: ${p.raisedFunding.toLocaleString()}</span>
                    <span>{raisedPct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-emerald-500 h-full" style={{ width: `${raisedPct}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{p.shariahContract}</span>
                    <span>• {p.expectedYield}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProjectToPromote(p)}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                      title="Promote or feature this campaign in the Global D-8 Marketplace"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Promote</span>
                    </button>

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
            <button className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1">
              <FileSpreadsheet className="w-4 h-4" /> Export All (PDF / Excel)
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-1">FELDA Bio-Refinery IRR & Cash Flow Model</h4>
              <p className="text-slate-500 mb-2">Detailed 5-year projected yield calculations under SEDA Feed-in tariff rates.</p>
              <button className="text-purple-600 font-bold">Download Report (PDF)</button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-1">D-8 Shariah Compliance & Asset Audit Trail</h4>
              <p className="text-slate-500 mb-2">Verified certificate from D-8 Shariah Advisory Council.</p>
              <button className="text-purple-600 font-bold">Download Certificate (PDF)</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-xs text-slate-500">
          <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Module Active for Selected Sponsor Entity</p>
          <p>Please select a project from "My Projects" tab to manage campaign details, asset registration tokens, or team permissions.</p>
        </div>
      )}

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
        onClose={() => setIsRegisterModalOpen(false)}
        onSubmitProject={handleCreateProject}
      />

      {/* Promotion Package Modal */}
      {projectToPromote && (
        <ProjectPromotionModal
          projectId={projectToPromote.id}
          projectTitle={projectToPromote.title}
          availableCredits={creditBalance.availableCredits}
          onClose={() => setProjectToPromote(null)}
          onConfirmPromotion={handleConfirmPromotion}
        />
      )}
    </div>
  );
};
