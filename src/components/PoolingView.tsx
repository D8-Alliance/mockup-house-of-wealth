import React, { useState } from 'react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { useRBAC } from '../rbac/RBACContext';
import { EndToEndWorkflowExplorer } from '../workflows/EndToEndWorkflowExplorer';
import { ProjectFormModal } from '../projects/ProjectFormModal';
import { ProjectDetailModal } from '../projects/ProjectDetailModal';
import { PoolCreationModal } from '../pooling/PoolCreationModal';
import { PoolApprovalWorkflowModal } from '../pooling/PoolApprovalWorkflowModal';
import { InvestmentOrderWizardModal } from '../investments/InvestmentOrderWizardModal';
import { projectService } from '../projects/projectService';
import { poolService } from '../pooling/poolService';
import { Project } from '../projects/projectTypes';
import { WealthPool } from '../pooling/poolTypes';
import { Plus, ShieldCheck, ArrowRight, Layers, FileSpreadsheet, Lock } from 'lucide-react';

interface PoolingViewProps {
  lang: LanguageCode;
  onOpenAssetRegister: () => void;
}

export const PoolingView: React.FC<PoolingViewProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const { currentRole } = useRBAC();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedPoolForApproval, setSelectedPoolForApproval] = useState<WealthPool | null>(null);
  const [selectedPoolForInvestment, setSelectedPoolForInvestment] = useState<WealthPool | null>(null);
  const [selectedProjectForPoolCreation, setSelectedProjectForPoolCreation] = useState<Project | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  const projects = projectService.getAllProjects();
  const pools = poolService.getAllPools();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2 border border-emerald-500/20">
            Shariah Wealth Pooling & Liquidity Platform
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.pooling} MVP Workflow Console
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            Multi-tier capital mobilization engine supporting Mudarabah, Musharakah, Wakalah, and Waqf liquidity pools across D-8 nations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="px-4 py-2.5 text-xs font-black bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Submit New Project</span>
          </button>
        </div>
      </div>

      {/* End-to-End Workflow Master Explorer Engine */}
      <EndToEndWorkflowExplorer onRefresh={refreshData} />

      {/* Active Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            Active Projects ({projects.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(proj => (
            <div key={proj.projectId} className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {proj.projectCode} • {proj.countryNodeId}
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                    {proj.status}
                  </span>
                </div>

                <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-2 leading-snug">
                  {proj.projectName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {proj.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs my-4 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Contract</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{proj.proposedShariahContract}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Indicative Return</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{proj.indicativeExpectedReturn}% p.a.</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-2 justify-between items-center text-xs">
                <button
                  onClick={() => setSelectedProject(proj)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl"
                >
                  View Details
                </button>
                {proj.status === 'APPROVED' && (
                  <button
                    onClick={() => setSelectedProjectForPoolCreation(proj)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Structure Pool
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wealth Pools Marketplace Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Wealth Pools Marketplace ({pools.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pools.map(pool => {
            const pct = Math.min(100, Math.round((pool.amountRaised / pool.targetAmount) * 100));
            return (
              <div key={pool.poolId} className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {pool.poolCode} • {pool.countryNodeId}
                    </span>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {pool.status}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-2 leading-snug">
                    {pool.poolName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {pool.feesDescription}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs my-4 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Contract</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{pool.investmentStructure}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Indicative Return</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{pool.indicativeExpectedReturn}% p.a.</span>
                    </div>
                  </div>

                  {/* Capital Raised Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Raised</span>
                      <span className="font-bold text-slate-900 dark:text-white">${pool.amountRaised.toLocaleString()} / ${pool.targetAmount.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex justify-between items-center">
                  {pool.status === 'DRAFT' || pool.status === 'UNDER_REVIEW' ? (
                    <button
                      onClick={() => setSelectedPoolForApproval(pool)}
                      className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Multi-Sig Governance Approval
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedPoolForInvestment(pool)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow flex items-center justify-center gap-1.5"
                    >
                      <span>Subscribe to Pool</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <ProjectFormModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSaved={refreshData}
      />

      <ProjectDetailModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onRefresh={refreshData}
      />

      <PoolCreationModal
        isOpen={!!selectedProjectForPoolCreation}
        project={selectedProjectForPoolCreation}
        onClose={() => setSelectedProjectForPoolCreation(null)}
        onSaved={refreshData}
      />

      <PoolApprovalWorkflowModal
        pool={selectedPoolForApproval}
        onClose={() => setSelectedPoolForApproval(null)}
        onRefresh={refreshData}
      />

      <InvestmentOrderWizardModal
        pool={selectedPoolForInvestment}
        onClose={() => setSelectedPoolForInvestment(null)}
        onSuccess={refreshData}
      />
    </div>
  );
};
