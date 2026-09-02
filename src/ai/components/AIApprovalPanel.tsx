import React from 'react';
import { ArrowRight, Bot, UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const AIApprovalPanel: React.FC<{ roleName: string }> = ({ roleName }) => {
  return (
    <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs space-y-2">
      <span className="font-extrabold text-purple-900 dark:text-purple-300 block uppercase tracking-wider text-[10px]">
        Mandatory Human-in-the-Loop Governance Workflow
      </span>

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200">
          <Bot className="w-3.5 h-3.5" />
          AI Recommendation
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
          <UserCheck className="w-3.5 h-3.5" />
          {roleName} Review
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          Authorised Human Decision
        </div>
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-400">
        AI recommendations do not autonomously execute transactions or grant final approvals.
      </p>
    </div>
  );
};
