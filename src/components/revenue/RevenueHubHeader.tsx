import React from 'react';
import { Download, ShieldCheck } from 'lucide-react';

interface RevenueHubHeaderProps {
  currentRole: string;
  isSuperAdmin: boolean;
  isFinance: boolean;
  isAuditor: boolean;
  isCountryAdmin: boolean;
  isPDP: boolean;
  isInvestor: boolean;
  userOrg?: string;
}

export const RevenueHubHeader: React.FC<RevenueHubHeaderProps> = ({
  currentRole,
  isSuperAdmin,
  isFinance,
  isAuditor,
  isCountryAdmin,
  isPDP,
  isInvestor,
  userOrg
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Revenue & Monetisation Hub
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 font-mono shadow-sm">
                SIMULATED REVENUE DATA – MVP
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                Scope: {currentRole}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Revenue & Financial Monetisation Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1">
              Multi-stream monetization orchestration covering Memberships, AI Tokens, Project Sponsor (PDP) Tiers, Featured Listings, and Sovereign Node Licensing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert('Simulated Master Financial Audit Package Exported (PDF + CSV)')}
              className="px-4 py-2.5 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Audit Report
            </button>
          </div>
        </div>
      </div>

      {!isSuperAdmin && !isFinance && !isAuditor && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <span className="font-bold">Role-Based Access Enforcement: </span>
            {isCountryAdmin && 'Showing financial telemetry restricted to Malaysia Country Node.'}
            {isPDP && `Showing billing and campaign records for ${userOrg || 'your PDP Organization'} only.`}
            {isInvestor && 'Showing personal membership and utility token invoices only. Global revenues are protected.'}
          </div>
        </div>
      )}
    </div>
  );
};
