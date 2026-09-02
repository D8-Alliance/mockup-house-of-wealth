import React, { useState } from 'react';
import { 
  GitPullRequest, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Layers, 
  Cpu, 
  Sliders, 
  Activity, 
  Check, 
  ChevronRight, 
  FileText, 
  Building2, 
  Coins, 
  Award,
  RefreshCw,
  Plus
} from 'lucide-react';
import { WORKFLOW_STEPS } from '../../workflows/WorkflowTimeline';
import { useRBAC } from '../../rbac/RBACContext';

interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  totalSteps: number;
  avgDuration: string;
  slaLimit: string;
  automationLevel: string;
  activeInstances: number;
  triggerEvent: string;
  steps: {
    stepNo: number;
    title: string;
    actor: string;
    type: 'AUTOMATED' | 'HUMAN_APPROVAL' | 'SMART_CONTRACT' | 'COMPLIANCE_CHECK';
    description: string;
    slaHours: number;
  }[];
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'WF-POOL-01',
    name: '17-Stage Shariah Wealth Pooling & Asset Tokenization',
    category: 'Core Capital Rail',
    description: 'End-to-end lifecycle from asset onboarding, AAOIFI Shariah vetting, multi-sig governance to smart pool funding, profit distribution & maturity.',
    totalSteps: 17,
    avgDuration: '4.2 Days',
    slaLimit: '7 Days',
    automationLevel: '68% Automated',
    activeInstances: 6,
    triggerEvent: 'PDP / Project Sponsor submits asset application',
    steps: [
      { stepNo: 1, title: 'Project Application & Onboarding', actor: 'Project Sponsor / PDP', type: 'HUMAN_APPROVAL', description: 'Initial legal prospectus, asset valuation, and sponsor profile submitted.', slaHours: 24 },
      { stepNo: 2, title: 'Intake & Completeness Review', actor: 'Project Reviewer', type: 'COMPLIANCE_CHECK', description: 'Automated verification of company documents and initial KYC/KYB screening.', slaHours: 12 },
      { stepNo: 3, title: 'Technical Due Diligence', actor: 'DD Auditor', type: 'HUMAN_APPROVAL', description: 'On-site engineering inspection, cash flow modeling, and encumbrance verification.', slaHours: 48 },
      { stepNo: 4, title: 'AAOIFI Shariah Board Review', actor: 'Shariah Board', type: 'HUMAN_APPROVAL', description: 'Fatwa structuring (Mudarabah/Ijarah/Musharakah), Riba screening, and contract certification.', slaHours: 24 },
      { stepNo: 5, title: 'AML & Regulatory Clearance', actor: 'Compliance Officer', type: 'COMPLIANCE_CHECK', description: 'PEP checks, sanction watchlist scans, and jurisdiction limit verification.', slaHours: 8 },
      { stepNo: 6, title: 'Actuarial Risk Assessment', actor: 'Risk Officer', type: 'AUTOMATED', description: 'Automated credit score calculation, FX sensitivity stress test, and loan-to-value checks.', slaHours: 12 },
      { stepNo: 7, title: 'Executive Committee Sign-Off', actor: 'Executive Approver', type: 'HUMAN_APPROVAL', description: 'Final multi-sig quorum approval to unlock tokenization rights.', slaHours: 24 },
      { stepNo: 8, title: 'Pool Structuring & Tranche Config', actor: 'Pool Manager', type: 'AUTOMATED', description: 'Tranche limits, expected profit rate, and maturity horizons locked into smart contract.', slaHours: 6 },
      { stepNo: 9, title: 'Smart Contract Minting & Registry', actor: 'System Administrator', type: 'SMART_CONTRACT', description: 'Asset-backed digital certificates minted on sovereign country ledger.', slaHours: 1 },
      { stepNo: 10, title: 'Marketplace Pool Opening', actor: 'System / Automated', type: 'AUTOMATED', description: 'Pool listed on House of Wealth discovery portal for investor subscriptions.', slaHours: 1 },
      { stepNo: 11, title: 'Investor Order Aggregation', actor: 'Investors', type: 'AUTOMATED', description: 'Real-time order book matching and escrow fund reservation.', slaHours: 72 },
      { stepNo: 12, title: 'Pool Allocation & Clearing', actor: 'Clearing Engine', type: 'SMART_CONTRACT', description: 'Automated pro-rata allocations, refund of unallocated balances, and token delivery.', slaHours: 2 },
      { stepNo: 13, title: 'Escrow Release & Milestone Disbursement', actor: 'Treasury Officer', type: 'HUMAN_APPROVAL', description: 'Milestone 1 construction / operational capital released to sponsor bank account.', slaHours: 12 },
      { stepNo: 14, title: 'Asset Monitoring & IoT Oracle Feeds', actor: 'Asset Manager / IoT', type: 'AUTOMATED', description: 'Quarterly operational revenue tracking, sensor telemetry, and tenant lease monitoring.', slaHours: 2160 },
      { stepNo: 15, title: 'Profit Calculation & Yield Distribution', actor: 'Yield Engine', type: 'SMART_CONTRACT', description: 'Net profit calculation, Mudarib performance incentive deduction, and direct investor wallet credits.', slaHours: 4 },
      { stepNo: 16, title: 'Zakat & Waqf Purification Sweep', actor: 'Shariah Auditor', type: 'AUTOMATED', description: 'Automated 2.5% Zakat calculation and non-halal purification transfer to Waqf trust.', slaHours: 2 },
      { stepNo: 17, title: 'Capital Return & Pool Maturity Exit', actor: 'Settlement Officer', type: 'SMART_CONTRACT', description: 'Principal redemption, asset title reversion, and final pool archiving.', slaHours: 24 }
    ]
  },
  {
    id: 'WF-PDP-02',
    name: 'Project Development Partner (PDP) KYB & Escrow Onboarding',
    category: 'Partner Verification',
    description: 'Corporate vetting, cross-border jurisdictional checks, track record validation, and legal escrow account bonding.',
    totalSteps: 6,
    avgDuration: '2.1 Days',
    slaLimit: '4 Days',
    automationLevel: '50% Automated',
    activeInstances: 3,
    triggerEvent: 'Institutional developer registers as PDP',
    steps: [
      { stepNo: 1, title: 'Corporate Registration & UBO Declarations', actor: 'PDP Applicant', type: 'HUMAN_APPROVAL', description: 'Ultimate beneficial ownership and corporate registry documentation uploaded.', slaHours: 12 },
      { stepNo: 2, title: 'Automated AML & Sanctions Check', actor: 'Compliance AI Engine', type: 'COMPLIANCE_CHECK', description: 'Instant global sanctions screening against UN, OFAC, and local central bank watchlists.', slaHours: 1 },
      { stepNo: 3, title: 'Historical Track Record Audit', actor: 'DD Auditor', type: 'HUMAN_APPROVAL', description: 'Review of past 3 years audited financials and completed real estate/agritech projects.', slaHours: 24 },
      { stepNo: 4, title: 'Shariah Governance Agreement Signing', actor: 'Shariah Advisor', type: 'HUMAN_APPROVAL', description: 'Sponsor agrees to adhere strictly to non-interest debt covenants and Halal audits.', slaHours: 12 },
      { stepNo: 5, title: 'Security Deposit & Escrow Trust Bond', actor: 'Treasury Officer', type: 'COMPLIANCE_CHECK', description: '5% performance security deposit verified in Meezan/Bank Islam trust account.', slaHours: 8 },
      { stepNo: 6, title: 'PDP Verified Badge Issuance', actor: 'Country Admin', type: 'SMART_CONTRACT', description: 'Cryptographic PDP certificate issued on D-8 multi-tenant node.', slaHours: 1 }
    ]
  },
  {
    id: 'WF-SUKUK-03',
    name: 'Smart Sukuk Structuring & AAOIFI Fatwa Certification',
    category: 'Shariah Governance',
    description: 'Standardized smart legal contract drafting, Shariah board quorum voting, digital seal generation, and regulator filing.',
    totalSteps: 5,
    avgDuration: '1.8 Days',
    slaLimit: '3 Days',
    automationLevel: '60% Automated',
    activeInstances: 4,
    triggerEvent: 'New asset tranche requested by Asset Owner',
    steps: [
      { stepNo: 1, title: 'Underlying Asset Tangibility Verification', actor: 'Asset Manager', type: 'COMPLIANCE_CHECK', description: 'Confirm underlying asset meets minimum 51% tangible asset ratio (Ayān).', slaHours: 12 },
      { stepNo: 2, title: 'Automated Legal Template Drafting', actor: 'Smart Contract Engine', type: 'AUTOMATED', description: 'Generates AAOIFI Standard 30 compliant Mudarabah/Ijarah bilateral contract.', slaHours: 1 },
      { stepNo: 3, title: 'Shariah Supervisory Board Quorum Review', actor: 'Shariah Committee', type: 'HUMAN_APPROVAL', description: '3-member Islamic scholar panel votes and signs with hardware cryptographic keys.', slaHours: 24 },
      { stepNo: 4, title: 'Fatwa Certificate Publication', actor: 'Shariah Advisor', type: 'SMART_CONTRACT', description: 'Tamper-proof PDF with SHA-256 hash published to public D-8 repository.', slaHours: 2 },
      { stepNo: 5, title: 'Central Bank / Securities Commission Filing', actor: 'Legal Officer', type: 'COMPLIANCE_CHECK', description: 'Regulatory notification dispatched to SECP / SC Malaysia / OJK.', slaHours: 12 }
    ]
  },
  {
    id: 'WF-DIST-04',
    name: 'Quarterly Profit Distribution, Mudarib Fee & Waqf Purification',
    category: 'Financial Yield',
    description: 'Automated net revenue reconciliation, profit-sharing ratio calculation, purification of non-permissible gains, and wallet payouts.',
    totalSteps: 5,
    avgDuration: '3.5 Hours',
    slaLimit: '12 Hours',
    automationLevel: '95% Automated',
    activeInstances: 1,
    triggerEvent: 'Quarterly period close on active pools',
    steps: [
      { stepNo: 1, title: 'Revenue Telemetry Ingestion', actor: 'IoT / Finance Engine', type: 'AUTOMATED', description: 'Rental income, harvest sales, or port handling fees ingested from banking feeds.', slaHours: 1 },
      { stepNo: 2, title: 'Mudarib Performance Incentive Calculation', actor: 'Yield Engine', type: 'AUTOMATED', description: 'Deduction of manager fee strictly based on pre-agreed 80/20 or 90/10 ratio.', slaHours: 1 },
      { stepNo: 3, title: 'Shariah Revenue Audit Check', actor: 'Shariah Auditor', type: 'COMPLIANCE_CHECK', description: 'One-click verification that no penalty interest or prohibited revenue was booked.', slaHours: 2 },
      { stepNo: 4, title: 'Zakat & Waqf Purification Automated Transfer', actor: 'Treasury Officer', type: 'SMART_CONTRACT', description: 'Purification funds routed automatically to Meezan Bank Waqf Trust escrow.', slaHours: 1 },
      { stepNo: 5, title: 'Multi-Currency Wallet Disbursement', actor: 'Clearing Engine', type: 'SMART_CONTRACT', description: 'Net profits credited instantly to investor digital wallets in PKR/MYR/USD.', slaHours: 1 }
    ]
  }
];

interface ActiveInstance {
  instanceId: string;
  workflowId: string;
  workflowName: string;
  targetEntity: string;
  currentStep: number;
  totalSteps: number;
  currentStepTitle: string;
  currentActor: string;
  status: 'RUNNING' | 'AWAITING_APPROVAL' | 'PAUSED' | 'COMPLETED';
  startedAt: string;
  progressPercent: number;
}

const INITIAL_INSTANCES: ActiveInstance[] = [
  {
    instanceId: 'INST-PAK-8910',
    workflowId: 'WF-POOL-01',
    workflowName: '17-Stage Shariah Wealth Pooling',
    targetEntity: 'Karachi Port Logistics Hub Sukuk ($8.2M)',
    currentStep: 4,
    totalSteps: 17,
    currentStepTitle: 'AAOIFI Shariah Board Review',
    currentActor: 'Shariah Board (Mufti Faraz / Dr. Mansour)',
    status: 'AWAITING_APPROVAL',
    startedAt: '2026-08-16 09:30',
    progressPercent: 24
  },
  {
    instanceId: 'INST-PAK-8911',
    workflowId: 'WF-POOL-01',
    workflowName: '17-Stage Shariah Wealth Pooling',
    targetEntity: 'Islamabad Enclave Residential Phase 2 ($3.5M)',
    currentStep: 11,
    totalSteps: 17,
    currentStepTitle: 'Investor Order Aggregation',
    currentActor: 'Retail & HNWI Investors',
    status: 'RUNNING',
    startedAt: '2026-08-14 11:00',
    progressPercent: 65
  },
  {
    instanceId: 'INST-MYS-3342',
    workflowId: 'WF-PDP-02',
    workflowName: 'PDP Partner Onboarding',
    targetEntity: 'FELDA Smart Agritech Holdings',
    currentStep: 5,
    totalSteps: 6,
    currentStepTitle: 'Security Deposit & Escrow Trust Bond',
    currentActor: 'Treasury Officer (Head of Controls)',
    status: 'AWAITING_APPROVAL',
    startedAt: '2026-08-17 08:15',
    progressPercent: 83
  },
  {
    instanceId: 'INST-TUR-1209',
    workflowId: 'WF-SUKUK-03',
    workflowName: 'Smart Sukuk Structuring',
    targetEntity: 'Bosphorus Maritime Logistics Sukuk',
    currentStep: 3,
    totalSteps: 5,
    currentStepTitle: 'Shariah Supervisory Board Quorum Review',
    currentActor: 'Shariah Committee',
    status: 'AWAITING_APPROVAL',
    startedAt: '2026-08-17 14:00',
    progressPercent: 60
  }
];

export const WorkflowEnginePanel: React.FC = () => {
  const { currentRole } = useRBAC();
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate>(WORKFLOW_TEMPLATES[0]);
  const [activeTab, setActiveTab] = useState<'designer' | 'instances' | 'rules'>('designer');
  const [instances, setInstances] = useState<ActiveInstance[]>(INITIAL_INSTANCES);
  const [simulatingInstanceId, setSimulatingInstanceId] = useState<string | null>(null);

  const handleAdvanceStep = (instId: string) => {
    setSimulatingInstanceId(instId);
    setTimeout(() => {
      setInstances(prev => prev.map(inst => {
        if (inst.instanceId === instId) {
          const nextStep = inst.currentStep + 1;
          const isComplete = nextStep > inst.totalSteps;
          const wf = WORKFLOW_TEMPLATES.find(w => w.id === inst.workflowId);
          const nextStepObj = wf?.steps[nextStep - 1];

          return {
            ...inst,
            currentStep: isComplete ? inst.totalSteps : nextStep,
            currentStepTitle: isComplete ? 'Lifecycle Fully Completed' : (nextStepObj?.title || 'Next Step'),
            currentActor: isComplete ? 'System Closed' : (nextStepObj?.actor || 'System'),
            status: isComplete ? 'COMPLETED' : (nextStepObj?.type === 'HUMAN_APPROVAL' ? 'AWAITING_APPROVAL' : 'RUNNING'),
            progressPercent: isComplete ? 100 : Math.round((nextStep / inst.totalSteps) * 100)
          };
        }
        return inst;
      }));
      setSimulatingInstanceId(null);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Orchestration Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">BPMN & State Machine Controller</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-purple-600" />
            Automated Workflow Engine & State Machine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure, visualize, and monitor multi-step automated execution pipelines, multi-sig gates, and SLA state transitions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('designer')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'designer' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Workflow Pipelines
            </button>
            <button
              onClick={() => setActiveTab('instances')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'instances' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>Live Instances</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                {instances.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Defined Pipelines</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{WORKFLOW_TEMPLATES.length}</span>
            <span className="text-xs text-emerald-600 font-bold">100% Validated</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Running Instances</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{instances.length}</span>
            <span className="text-xs text-slate-400">In Real-Time</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Automation Ratio</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">71.4%</span>
            <span className="text-xs text-emerald-600 font-semibold">Zero Human Lag</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Average SLA Turnaround</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">2.4h</span>
            <span className="text-xs text-slate-400">Target &lt; 24h</span>
          </div>
        </div>
      </div>

      {activeTab === 'designer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Workflow Selector */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
              Select Workflow Blueprint
            </div>
            {WORKFLOW_TEMPLATES.map(wf => {
              const isSelected = selectedWorkflow.id === wf.id;
              return (
                <div
                  key={wf.id}
                  onClick={() => setSelectedWorkflow(wf)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-purple-500/10 border-purple-500 shadow-sm ring-1 ring-purple-500/30'
                      : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                      {wf.id}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {wf.category}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                    {wf.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {wf.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700/60 font-semibold">
                    <span>{wf.totalSteps} Steps</span>
                    <span className="text-emerald-600">{wf.automationLevel}</span>
                    <span>SLA: {wf.slaLimit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Step-by-Step Flow Pipeline */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-4">
              <div>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                  {selectedWorkflow.category} Pipeline
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedWorkflow.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trigger Event: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{selectedWorkflow.triggerEvent}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {selectedWorkflow.totalSteps} Stages
                </span>
              </div>
            </div>

            {/* Visual Steps Timeline */}
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {selectedWorkflow.steps.map((step, idx) => {
                const isAuto = step.type === 'AUTOMATED' || step.type === 'SMART_CONTRACT';
                return (
                  <div
                    key={step.stepNo}
                    className="flex items-start gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 transition-all hover:border-purple-500/40"
                  >
                    {/* Step Number Badge */}
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                      {step.stepNo}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h5 className="text-xs font-black text-slate-900 dark:text-white">
                          {step.title}
                        </h5>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            step.type === 'AUTOMATED' 
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : step.type === 'SMART_CONTRACT'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : step.type === 'COMPLIANCE_CHECK'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {step.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            SLA: {step.slaHours}h
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {step.description}
                      </p>

                      <div className="flex items-center gap-2 pt-1 text-[11px]">
                        <span className="text-slate-400 font-medium">Assigned Actor:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {step.actor}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'instances' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Active Workflow Execution Instances
                </h3>
                <p className="text-xs text-slate-500">
                  Live state machine executions in flight across D-8 country nodes with manual transition triggers.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {instances.map(inst => {
                const isSimulating = simulatingInstanceId === inst.instanceId;
                return (
                  <div
                    key={inst.instanceId}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                          {inst.instanceId}
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {inst.targetEntity}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inst.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-600'
                            : inst.status === 'AWAITING_APPROVAL'
                            ? 'bg-amber-500/20 text-amber-600'
                            : 'bg-blue-500/20 text-blue-600'
                        }`}>
                          {inst.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>Workflow: <strong className="text-slate-700 dark:text-slate-300">{inst.workflowName}</strong></span>
                        <span>•</span>
                        <span>Active Stage: <strong className="text-purple-600 dark:text-purple-400">{inst.currentStepTitle} (Step {inst.currentStep}/{inst.totalSteps})</strong></span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden max-w-md">
                        <div
                          className="bg-purple-600 h-full transition-all duration-500 rounded-full"
                          style={{ width: `${inst.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAdvanceStep(inst.instanceId)}
                        disabled={isSimulating || inst.status === 'COMPLETED'}
                        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow transition-all cursor-pointer ${
                          inst.status === 'COMPLETED'
                            ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                      >
                        {isSimulating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white" />
                        )}
                        <span>{inst.status === 'COMPLETED' ? 'Pipeline Complete' : 'Execute Next Step'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
