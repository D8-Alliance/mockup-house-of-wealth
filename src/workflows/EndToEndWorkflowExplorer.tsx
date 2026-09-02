import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  BookOpen, 
  UserCheck, 
  AlertTriangle, 
  Layers, 
  DollarSign, 
  Activity, 
  Coins, 
  Award,
  ArrowRight
} from 'lucide-react';
import { projectService } from '../projects/projectService';
import { dueDiligenceService } from '../dueDiligence/dueDiligenceService';
import { riskService } from '../risk/riskService';
import { shariahService } from '../shariah/shariahService';
import { complianceService } from '../compliance/complianceService';
import { poolService } from '../pooling/poolService';
import { investmentService } from '../investments/investmentService';
import { fundingService } from '../funding/fundingService';
import { distributionService } from '../distributions/distributionService';
import { WorkflowTimeline } from './WorkflowTimeline';
import { useRBAC } from '../rbac/RBACContext';

export const EndToEndWorkflowExplorer: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const { activeUser, currentRole } = useRBAC();
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [activeProjectId, setActiveProjectId] = useState<string>('PROJ-MYS-001');

  const handleSimulateNext = () => {
    const nextIdx = (activeStepIdx + 1) % 17;
    setActiveStepIdx(nextIdx);

    if (nextIdx === 1) {
      projectService.updateProjectStatus(activeProjectId, 'SUBMITTED', activeUser.id, currentRole, 'Automated E2E simulation step');
    } else if (nextIdx === 3) {
      dueDiligenceService.updateChecklistItem(activeProjectId, 'DD-1', 'PASSED', activeUser.id, currentRole);
    } else if (nextIdx === 4) {
      shariahService.approveShariahStructure(activeProjectId, activeUser.id, currentRole, 'Automated Shariah sign-off');
    } else if (nextIdx === 5) {
      complianceService.approveCompliance(activeProjectId, activeUser.id, currentRole, 'Automated compliance screening passed');
    } else if (nextIdx === 6) {
      riskService.approveRiskAssessment(activeProjectId, activeUser.id, currentRole, 'Risk approved with medium rating');
    } else if (nextIdx === 7) {
      projectService.updateProjectStatus(activeProjectId, 'APPROVED', activeUser.id, currentRole, 'Executive sign-off complete');
    } else if (nextIdx === 10) {
      const pool = poolService.getPoolsByProject(activeProjectId)[0];
      if (pool) poolService.openPool(pool.poolId, activeUser.id, currentRole);
    } else if (nextIdx === 13) {
      const pool = poolService.getPoolsByProject(activeProjectId)[0];
      if (pool) {
        const order = investmentService.createInvestmentOrder(pool.poolId, activeUser.id, activeUser.name, 500000, activeUser.id, currentRole);
        investmentService.settleInvestmentOrder(order.investmentId, activeUser.id, currentRole);
      }
    } else if (nextIdx === 14) {
      const pool = poolService.getPoolsByProject(activeProjectId)[0];
      if (pool) {
        const req = fundingService.createFundingRequest(activeProjectId, pool.poolId, 3500000, 'Milestone 1 release', activeUser.id, currentRole);
        fundingService.approveAndDisburse(req.id, activeUser.id, currentRole);
      }
    } else if (nextIdx === 16) {
      const pool = poolService.getPoolsByProject(activeProjectId)[0];
      if (pool) {
        distributionService.createDistribution(pool.poolId, 500000, 'Q3 2026 Profit Distribution', activeUser.id, currentRole);
        distributionService.maturePoolAndExit(pool.poolId, activeUser.id, currentRole);
      }
    }

    onRefresh();
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/10 via-slate-900/5 to-slate-900/10 dark:from-purple-950/40 dark:to-slate-900 p-6 rounded-3xl border border-purple-500/20 shadow-md space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-purple-600 text-white shadow-sm">
            MVP WORKFLOW ORCHESTRATOR
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">House of Wealth End-to-End Test Engine</h2>
          <p className="text-xs text-slate-500">
            Simulate or inspect any stage of the 17-step Shariah wealth pooling pipeline in real time.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveStepIdx(0)}
            className="px-3.5 py-2 rounded-2xl text-xs font-extrabold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Pipeline
          </button>
          <button
            onClick={handleSimulateNext}
            className="px-4 py-2 rounded-2xl text-xs font-black bg-purple-600 text-white hover:bg-purple-500 shadow-md flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Simulate Next Workflow Stage
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <WorkflowTimeline currentStepIndex={activeStepIdx} onStepClick={idx => setActiveStepIdx(idx)} />

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
        <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          Active Simulation Focus: Target Project {activeProjectId}
        </h4>
        <p className="text-slate-600 dark:text-slate-300">
          All RBAC permissions, Country Node sovereignty rules ({activeUser.countryNodeId || 'CN-MYS'}), and multi-tenant isolation contexts are strictly enforced during this workflow.
        </p>
      </div>
    </div>
  );
};
