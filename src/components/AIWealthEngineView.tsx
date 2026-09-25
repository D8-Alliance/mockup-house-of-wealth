import React, { useState, useEffect } from 'react';
import { useRBAC } from '../rbac/RBACContext';
import { 
  BrainCircuit, 
  Sparkles, 
  Bot, 
  PieChart, 
  ShieldAlert, 
  FileText,
  FileSignature,
  Scale,
  Settings,
  Zap,
  MessageSquare,
  ShieldCheck,
  Layers,
  Coins,
  BarChart3,
  Cpu,
  Plus,
  MoreHorizontal,
  ChevronDown,
  Menu,
  X,
  CreditCard
} from 'lucide-react';

import { AIContractAdvisor } from '../ai/features/contract/AIContractAdvisor';
import { AIContractDraftAssistant } from '../ai/features/contract/AIContractDraftAssistant';
import { IslamicAgreementWizard } from '../ai/features/contract/IslamicAgreementWizard';
import { AIContractGapAnalysis } from '../ai/features/contract/AIContractGapAnalysis';
import { AIShariahAssistant } from '../ai/features/shariah/AIShariahAssistant';
import { AIInvestmentAdvisor } from '../ai/features/investment/AIInvestmentAdvisor';
import { AIPortfolioAnalysis } from '../ai/features/investment/AIPortfolioAnalysis';
import { AIInvestorDiscovery } from '../ai/features/investment/AIInvestorDiscovery';
import { AIProjectAnalyzer } from '../ai/features/project/AIProjectAnalyzer';
import { AIDueDiligenceAssistant } from '../ai/features/dueDiligence/AIDueDiligenceAssistant';
import { AIDocumentAnalyzer } from '../ai/features/document/AIDocumentAnalyzer';
import { AIRiskAnalyzer } from '../ai/features/risk/AIRiskAnalyzer';
import { AIRiskEarlyWarning } from '../ai/features/risk/AIRiskEarlyWarning';
import { AIFinancialScenarioEngine } from '../ai/features/scenario/AIFinancialScenarioEngine';
import { AIPoolOptimizer } from '../ai/features/poolOptimizer/AIPoolOptimizer';
import { AIGovernanceAdminPanel } from '../ai/components/AIGovernanceAdminPanel';
import { AIAssistant } from '../ai/components/AIAssistant';
import { UpgradePromptBanner } from './revenue/UpgradePromptBanner';
import { AIUsageDashboard } from '../ai/monetisation/AIUsageDashboard';
import { AdminAIAnalyticsPanel } from '../ai/monetisation/AdminAIAnalyticsPanel';
import { AIRagKnowledgeBase } from '../ai/components/AIRagKnowledgeBase';
import { ShariahReviewInbox } from '../ai/components/ShariahReviewInbox';
import { BuyAICreditsModal } from '../ai/monetisation/BuyAICreditsModal';
import { aiMonetisationService } from '../ai/monetisation/aiMonetisationService';
import { apiClient } from '../services/apiClient';

type AIEngineTab = 
  | 'overview'
  | 'ai-credits'
  | 'project-analyzer'
  | 'contract-advisor'
  | 'agreement-generation'
  | 'shariah-board'
  | 'shariah-assistant'
  | 'investment-matcher'
  | 'portfolio-analysis'
  | 'due-diligence'
  | 'risk-analyzer'
  | 'scenarios'
  | 'pool-optimizer'
  | 'governance-admin'
  | 'admin-ai-analytics'
  | 'rag-knowledge-base';

interface AIWealthEngineViewProps {
  onNavigateToMembership?: () => void;
}

export const AIWealthEngineView: React.FC<AIWealthEngineViewProps> = ({ onNavigateToMembership }) => {
  const { activeUser, isAuthenticated } = useRBAC();
  const [activeTab, setActiveTab] = useState<AIEngineTab>('overview');
  const [chatOpen, setChatOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [creditBalance, setCreditBalance] = useState({
    availableBalance: 0,
    usedCredits: 0,
    remainingCredits: 0,
    usedThisMonth: 0,
    monthlyAllowance: 0,
    additionalCredits: 0,
    totalPoolCredits: 0,
    resetDate: '',
    userTier: 'FREE',
  });
  const [aiModuleDisabled, setAiModuleDisabled] = useState(false);

  useEffect(() => {
    const update = () => {
      void apiClient.getMembershipCreditSummary()
        .then(setCreditBalance)
        .catch(() => setCreditBalance({ availableBalance: 0, usedCredits: 0, remainingCredits: 0, usedThisMonth: 0, monthlyAllowance: 0, additionalCredits: 0, totalPoolCredits: 0, resetDate: '', userTier: 'FREE' }));
    };
    update();
    const unsubscribe = aiMonetisationService.subscribe(update);
    return () => unsubscribe();
  }, [activeUser.id, isAuthenticated]);

  useEffect(() => {
    void apiClient.getFeatureModules()
      .then(modules => setAiModuleDisabled(modules.some(module => module.moduleKey === 'AI_INTELLIGENCE' && module.mode === 'DISABLED')))
      .catch(() => {
        // Preserve the demo UI if the backend is unavailable; protected API calls remain authoritative.
        setAiModuleDisabled(false);
      });
  }, []);

  const isSuperAdmin = activeUser.role === 'Super Admin' || activeUser.role === 'AI Administrator';
  const canViewAiAdministration = ['Super Admin', 'AI Administrator', 'AI Model Reviewer'].includes(activeUser.role);
  const canViewShariahBoard = ['Super Admin', 'Country Admin', 'Organization Admin', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee'].includes(activeUser.role);
  const canViewProjectFeasibility = ['Super Admin', 'Project Sponsor', 'Project Manager', 'Finance Officer', 'Risk Officer', 'Compliance Officer', 'Country Admin', 'Organization Admin', 'AI Model Reviewer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'].includes(activeUser.role);

  useEffect(() => {
    if (!canViewAiAdministration && (activeTab === 'governance-admin' || activeTab === 'admin-ai-analytics')) setActiveTab('overview');
    if (!canViewProjectFeasibility && activeTab === 'project-analyzer') setActiveTab('overview');
  }, [activeTab, canViewAiAdministration, canViewProjectFeasibility]);

  if (aiModuleDisabled) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900 text-white border border-amber-500/30 shadow-xl space-y-4">
        <div className="flex items-center gap-3 text-amber-300">
          <ShieldAlert className="w-6 h-6" />
          <span className="text-xs font-black uppercase tracking-wider">AI Intelligence Module Disabled</span>
        </div>
        <h1 className="text-2xl font-black">Shariah Wealth Pooling AI Intelligence Layer</h1>
        <p className="text-sm text-slate-300 max-w-2xl">
          AI tools are unavailable because Platform Administration disabled the AI Intelligence module. Re-enable it from Admin Center → Module Availability to restore access.
        </p>
        <p className="text-[11px] text-amber-200/80">The backend remains authoritative and will reject protected AI requests while this module is disabled.</p>
      </div>
    );
  }

  const tabs: { id: AIEngineTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'AI Suite Overview', icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 'ai-credits', label: 'AI Credits & Usage', icon: <Coins className="w-4 h-4 text-amber-500" />, badge: `${creditBalance.availableBalance} Cr` },
    ...(canViewProjectFeasibility ? [{ id: 'project-analyzer' as AIEngineTab, label: 'Project Feasibility', icon: <FileText className="w-4 h-4" /> }] : []),
    { id: 'contract-advisor', label: 'Contract Structuring & Draft', icon: <Scale className="w-4 h-4" /> },
    { id: 'agreement-generation', label: 'Agreement Generation', icon: <FileSignature className="w-4 h-4" />, badge: 'DOCX/PDF' },
    { id: 'shariah-assistant', label: 'Shariah Governance Audit', icon: <ShieldCheck className="w-4 h-4" /> },
    ...(canViewShariahBoard ? [{ id: 'shariah-board' as AIEngineTab, label: 'Shariah Board Reviews', icon: <ShieldCheck className="w-4 h-4 text-purple-500" /> }] : []),
    { id: 'investment-matcher', label: 'Pool Matcher & Discovery', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'portfolio-analysis', label: 'Portfolio Health', icon: <PieChart className="w-4 h-4" /> },
    { id: 'due-diligence', label: 'Due Diligence & AML', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'risk-analyzer', label: 'Risk & Early Warning', icon: <Zap className="w-4 h-4" /> },
    { id: 'scenarios', label: 'Stress Scenarios', icon: <Layers className="w-4 h-4" /> },
    { id: 'pool-optimizer', label: 'Pool Sizing Optimizer', icon: <PieChart className="w-4 h-4" /> },
     ...(canViewAiAdministration ? [
       { id: 'governance-admin' as AIEngineTab, label: 'AI Governance Admin', icon: <Settings className="w-4 h-4" /> },
       { id: 'admin-ai-analytics' as AIEngineTab, label: 'Admin AI Analytics', icon: <BarChart3 className="w-4 h-4 text-purple-400" />, badge: 'Admin' },
     ] : []),
     { id: 'rag-knowledge-base', label: 'AI Knowledge Base', icon: <FileText className="w-4 h-4 text-purple-400" />, badge: 'RAG' }
  ];

  const primaryTabIds: AIEngineTab[] = ['overview', 'project-analyzer', 'contract-advisor', 'agreement-generation'];
  const primaryTabs = tabs.filter(tab => primaryTabIds.includes(tab.id));
  const secondaryTabs = tabs.filter(tab => !primaryTabIds.includes(tab.id));
  const mobileGroups: { label: string; tabs: AIEngineTab[] }[] = [
    { label: 'Intelligence', tabs: ['project-analyzer', 'investment-matcher', 'portfolio-analysis', 'due-diligence', 'risk-analyzer', 'scenarios', 'pool-optimizer', 'rag-knowledge-base'] },
    { label: 'Islamic Finance', tabs: ['contract-advisor', 'agreement-generation'] },
    { label: 'Governance', tabs: ['shariah-assistant', 'shariah-board', 'governance-admin', 'admin-ai-analytics'] },
    { label: 'Account', tabs: ['ai-credits'] },
  ].map(group => ({ ...group, tabs: group.tabs.filter(id => tabs.some(tab => tab.id === id)) as AIEngineTab[] })).filter(group => group.tabs.length > 0);
  const selectTab = (tab: AIEngineTab) => {
    setActiveTab(tab);
    setMoreMenuOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn font-sans text-xs">
      {/* AI Center Banner with Live Credit Balance Pill */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-purple-950 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                AI Decision Support Engine
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                Active User: <strong className="text-emerald-300">{activeUser.name}</strong> ({activeUser.role})
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Shariah Wealth Pooling AI Intelligence Layer
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              Autonomous recommendation orchestration for Islamic contract structuring, AAOIFI governance, pool matching, due diligence anomaly scanning, and multi-factor risk assessment.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Live AI Credit Pill */}
            <div className="p-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-300 uppercase">AI Balance:</span>
                  <span className="text-sm font-black text-white font-mono">{creditBalance.availableBalance} Credits</span>
                </div>
                <span className="text-[10px] text-slate-400">Used: {creditBalance.usedThisMonth} / {creditBalance.monthlyAllowance} mo</span>
              </div>
              <button
                onClick={() => setShowTopUpModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10.5px] flex items-center gap-1 shadow-sm cursor-pointer ml-1"
              >
                <Plus className="w-3 h-3" /> Top Up
              </button>
            </div>

            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              {chatOpen ? 'Close AI Chat' : 'Ask AI Assistant'}
            </button>
          </div>
        </div>
      </div>

      {/* Scalable navigation: primary modules stay visible on desktop; secondary modules live in More. */}
      <div className="hidden lg:flex items-center gap-2">
        {primaryTabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => selectTab(tab.id)} className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${isActive ? 'bg-purple-700 text-white shadow-lg shadow-purple-700/20' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'}`}>
              {tab.icon}<span>{tab.label}</span>{tab.badge && <span className={`text-[9px] font-black px-1.5 py-[2px] rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'}`}>{tab.badge}</span>}
            </button>
          );
        })}
        <div className="relative">
          <button onClick={() => setMoreMenuOpen(!moreMenuOpen)} className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${secondaryTabs.some(tab => tab.id === activeTab) ? 'bg-purple-700 text-white shadow-lg shadow-purple-700/20' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}>
            <MoreHorizontal className="w-4 h-4" /><span>{secondaryTabs.find(tab => tab.id === activeTab)?.label || 'More'}</span><ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {moreMenuOpen && <>
            <button aria-label="Close AI module menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setMoreMenuOpen(false)} />
            <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-2">
              {secondaryTabs.map(tab => <button key={tab.id} onClick={() => selectTab(tab.id)} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-xs ${activeTab === tab.id ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><span className="flex items-center gap-2">{tab.icon}<span>{tab.label}</span></span>{tab.badge && <span className="text-[9px] font-mono">{tab.badge}</span>}</button>)}
            </div>
          </>}
        </div>
      </div>

      {/* Mobile navigation drawer: grouped to avoid horizontal tab scrolling. */}
      <div className="lg:hidden">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200">
          <span className="flex items-center gap-2">{tabs.find(tab => tab.id === activeTab)?.icon}<span>{tabs.find(tab => tab.id === activeTab)?.label || 'AI Modules'}</span></span>{mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
        {mobileMenuOpen && <div className="mt-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 shadow-lg space-y-3">
          <button onClick={() => selectTab('overview')} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold ${activeTab === 'overview' ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><BrainCircuit className="w-4 h-4" />AI Suite Overview</button>
          {mobileGroups.map(group => <div key={group.label} className="space-y-1"><p className="px-3 text-[10px] uppercase tracking-wider font-black text-slate-400">{group.label}</p>{group.tabs.map(id => { const tab = tabs.find(item => item.id === id); if (!tab) return null; return <button key={tab.id} onClick={() => selectTab(tab.id)} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-xs ${activeTab === tab.id ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><span className="flex items-center gap-2">{tab.icon}<span>{tab.label}</span></span>{tab.badge && <span className="text-[9px] font-mono">{tab.badge}</span>}</button>; })}</div>)}
          {onNavigateToMembership && <button onClick={() => { setMobileMenuOpen(false); onNavigateToMembership(); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><CreditCard className="w-4 h-4" />Billing & Membership</button>}
        </div>}
      </div>

      {/* Render Active Tab */}
      <div className="mt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" /> AI Credits & Usage Engine
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Check balance breakdown (remaining, monthly allowance, purchased), review 7-operation credit schedule, and inspect audit logs.
              </p>
              <button onClick={() => setActiveTab('ai-credits')} className="text-purple-600 font-bold underline text-[11px] cursor-pointer">
                Open AI Credits Dashboard →
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600" /> Contract & Shariah AI
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Suggests Mudarabah, Musharakah, Wakalah, and Ijarah structures backed by AAOIFI standards.
              </p>
              <button onClick={() => setActiveTab('contract-advisor')} className="text-emerald-600 font-bold underline text-[11px] cursor-pointer">
                Launch Contract Advisor →
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" /> Pool Matching & Discovery
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Evaluates risk profile, return expectations, and lockup horizons to pair investors with wealth pools.
              </p>
              <button onClick={() => setActiveTab('investment-matcher')} className="text-purple-600 font-bold underline text-[11px] cursor-pointer">
                Match Wealth Pools →
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" /> Due Diligence & Fraud Scan
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Scans documentation for missing disclaimers, incomplete appraisals, and potential AML anomalies.
              </p>
              <button onClick={() => setActiveTab('due-diligence')} className="text-rose-600 font-bold underline text-[11px] cursor-pointer">
                Run Due Diligence Scan →
              </button>
            </div>

            {onNavigateToMembership && (
              <div className="md:col-span-2 lg:col-span-3 pt-2">
                <UpgradePromptBanner
                  title="Unlock Full AI Intelligence & Unlimited Scenario Engine"
                  subtitle="Upgrade to Wealth Pooling Plus or Professional for high-throughput AI contract gap analysis, automated AAOIFI audits, and real-time stress testing."
                  requiredTier="PLUS"
                  onViewPlans={onNavigateToMembership}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai-credits' && (
          <AIUsageDashboard 
            userId={activeUser.id || 'USR-8821'} 
            onNavigateToMembership={onNavigateToMembership} 
          />
        )}
        {activeTab === 'project-analyzer' && canViewProjectFeasibility && <AIProjectAnalyzer user={activeUser} />}
        {activeTab === 'contract-advisor' && (
          <div className="space-y-6">
            <AIContractAdvisor user={activeUser} />
            <AIContractDraftAssistant user={activeUser} />
            <AIContractGapAnalysis user={activeUser} />
          </div>
        )}
        {activeTab === 'agreement-generation' && <IslamicAgreementWizard />}
        {activeTab === 'shariah-assistant' && <AIShariahAssistant user={activeUser} />}
        {activeTab === 'shariah-board' && canViewShariahBoard && <ShariahReviewInbox role={activeUser.role} />}
        {activeTab === 'investment-matcher' && (
          <div className="space-y-6">
            <AIInvestmentAdvisor user={activeUser} />
            <AIInvestorDiscovery />
          </div>
        )}
        {activeTab === 'portfolio-analysis' && <AIPortfolioAnalysis />}
        {activeTab === 'due-diligence' && (
          <div className="space-y-6">
            <AIDueDiligenceAssistant user={activeUser} />
            <AIDocumentAnalyzer />
          </div>
        )}
        {activeTab === 'risk-analyzer' && (
          <div className="space-y-6">
            <AIRiskAnalyzer user={activeUser} />
            <AIRiskEarlyWarning />
          </div>
        )}
        {activeTab === 'scenarios' && <AIFinancialScenarioEngine />}
        {activeTab === 'pool-optimizer' && <AIPoolOptimizer />}
        {activeTab === 'governance-admin' && canViewAiAdministration && <AIGovernanceAdminPanel />}
        {activeTab === 'admin-ai-analytics' && canViewAiAdministration && <AdminAIAnalyticsPanel />}
        {activeTab === 'rag-knowledge-base' && <AIRagKnowledgeBase userRole={activeUser.role} />}
      </div>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <BuyAICreditsModal
          userId={activeUser.id || 'USR-8821'}
          onClose={() => setShowTopUpModal(false)}
        />
      )}

      {/* Floating AI Chat Drawer */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <AIAssistant
            userRole={activeUser.role}
            userName={activeUser.name}
            userId={activeUser.id || 'USR-8821'}
            currentContext="AI Decision Engine View"
            onClose={() => setChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
