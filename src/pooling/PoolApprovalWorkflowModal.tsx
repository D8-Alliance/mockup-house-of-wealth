import React from 'react';
import { X, CheckCircle2, ShieldCheck, BookOpen, AlertTriangle, UserCheck, Lock, Unlock } from 'lucide-react';
import { WealthPool } from './poolTypes';
import { poolService } from './poolService';
import { useRBAC } from '../rbac/RBACContext';

interface PoolApprovalWorkflowModalProps {
  pool: WealthPool | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const PoolApprovalWorkflowModal: React.FC<PoolApprovalWorkflowModalProps> = ({ pool, onClose, onRefresh }) => {
  const { activeUser, currentRole } = useRBAC();

  if (!pool) return null;

  const handleApproveStep = (step: 'shariah' | 'compliance' | 'risk' | 'authorised') => {
    poolService.approvePoolStep(pool.poolId, step, activeUser.id, currentRole);
    onRefresh();
  };

  const handleOpenMarketplace = () => {
    poolService.openPool(pool.poolId, activeUser.id, currentRole);
    onRefresh();
    onClose();
  };

  const { approvals } = pool;
  const isFullyApproved = approvals.shariahApproval && approvals.complianceApproval && approvals.riskApproval && approvals.authorisedApproval;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600">
              GOVERNANCE MULTI-SIG APPROVAL
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">{pool.poolName}</h2>
            <p className="text-xs text-slate-500">Target Capital: ${pool.targetAmount.toLocaleString()} {pool.currency} • Status: {pool.status}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            Segregation of duties requires four independent approvals before this pool can be unlocked for public investor subscriptions:
          </p>

          {/* 1. Shariah Approval */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white block">1. Shariah Board Verification</span>
                <span className="text-[11px] text-slate-500">Contract Structure & Profit Ratio Compliance</span>
              </div>
            </div>
            {approvals.shariahApproval ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Approved by {approvals.shariahApprovedBy}
              </span>
            ) : (
              <button onClick={() => handleApproveStep('shariah')} className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-500">
                Sign off (Shariah)
              </button>
            )}
          </div>

          {/* 2. Compliance Approval */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white block">2. Regulatory Compliance Screening</span>
                <span className="text-[11px] text-slate-500">KYC/KYB, Sanctions & Anti-Money Laundering</span>
              </div>
            </div>
            {approvals.complianceApproval ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Approved by {approvals.complianceApprovedBy}
              </span>
            ) : (
              <button onClick={() => handleApproveStep('compliance')} className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-500">
                Sign off (Compliance)
              </button>
            )}
          </div>

          {/* 3. Risk Approval */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white block">3. Risk Assessment Verification</span>
                <span className="text-[11px] text-slate-500">Likelihood x Impact Scoring & Mitigations</span>
              </div>
            </div>
            {approvals.riskApproval ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Approved by {approvals.riskApprovedBy}
              </span>
            ) : (
              <button onClick={() => handleApproveStep('risk')} className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-500">
                Sign off (Risk)
              </button>
            )}
          </div>

          {/* 4. Authorised Approver */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white block">4. Authorised Executive Sign-off</span>
                <span className="text-[11px] text-slate-500">Final Country Node Authorization</span>
              </div>
            </div>
            {approvals.authorisedApproval ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Approved by {approvals.authorisedApprovedBy}
              </span>
            ) : (
              <button onClick={() => handleApproveStep('authorised')} className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-500">
                Sign off (Executive)
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 text-xs pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl font-bold bg-slate-100 text-slate-600 dark:bg-slate-700">Close</button>
          {isFullyApproved && pool.status !== 'OPEN' && (
            <button onClick={handleOpenMarketplace} className="px-4 py-2 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-1.5">
              <Unlock className="w-3.5 h-3.5" />
              Open Pool on Marketplace
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
