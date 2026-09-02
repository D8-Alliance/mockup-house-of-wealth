import React from 'react';
import { Globe, Building2, Users, FolderKanban, Coins, ShieldCheck, Activity, Plus, TrendingUp } from 'lucide-react';
import { countryNodeService } from '../../countryNodes/countryNodeService';
import { organisationService } from '../../organisations/organisationService';
import { userService } from '../../users/userService';
import { auditLogger } from '../../audit/auditLogger';

interface SuperAdminDashboardProps {
  onNavigateCountryNodes: () => void;
  onNavigateOrganisations: () => void;
  onNavigateUsers: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  onNavigateCountryNodes,
  onNavigateOrganisations,
  onNavigateUsers
}) => {
  const nodes = countryNodeService.getAllCountryNodes();
  const orgs = organisationService.getAllOrganisations();
  const users = userService.getAllUsers();
  const recentAudits = auditLogger.filterEvents({}).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Scope Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-purple-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/30 text-purple-200 border border-purple-400/30">
                GLOBAL SUPER ADMIN SCOPE
              </span>
              <span className="text-xs text-purple-300 font-mono">D-8 Sovereignty Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">Global Platform Control & Sovereignty Dashboard</h1>
            <p className="text-xs text-purple-200 max-w-2xl mt-1">
              Full cross-border oversight across all operating Country Nodes, registered corporate entities, multi-role user directories, and central bank compliance rules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateCountryNodes}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>Manage Country Nodes</span>
            </button>
          </div>
        </div>
      </div>

      {/* High Level KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={onNavigateCountryNodes} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm cursor-pointer hover:border-purple-500/50 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400">Country Nodes</span>
            <Globe className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{nodes.length}</p>
          <span className="text-[11px] font-bold text-emerald-600 mt-1 block">100% Operational Status</span>
        </div>

        <div onClick={onNavigateOrganisations} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm cursor-pointer hover:border-purple-500/50 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400">Registered Entities</span>
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{orgs.length}</p>
          <span className="text-[11px] font-bold text-purple-600 mt-1 block">Gov, GLC, PDP & Asset Managers</span>
        </div>

        <div onClick={onNavigateUsers} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm cursor-pointer hover:border-purple-500/50 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400">Active Platform Personnel</span>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{users.length}</p>
          <span className="text-[11px] font-bold text-emerald-600 mt-1 block">Enforced RBAC & MFA</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400">Cross-Border Pool Capital</span>
            <Coins className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">$4.25B</p>
          <span className="text-[11px] font-bold text-amber-600 mt-1 block">Active Sukuk Liquidity</span>
        </div>
      </div>

      {/* Country Nodes Overview */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-600" />
            Active Sovereignty Nodes Overview
          </h3>
          <button onClick={onNavigateCountryNodes} className="text-xs font-bold text-purple-600 hover:underline">
            View All ({nodes.length}) →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {nodes.slice(0, 3).map(n => (
            <div key={n.countryNodeId} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={n.flagUrl} alt={n.countryName} className="w-6 h-4 rounded object-cover" />
                  <span className="font-extrabold text-slate-900 dark:text-white">{n.countryName}</span>
                </div>
                <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold">{n.countryCode}</span>
              </div>
              <p className="text-slate-500 line-clamp-1">{n.regulatoryProfile}</p>
              <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400">Orgs: <strong className="text-slate-800 dark:text-slate-200">{n.activeOrganisationsCount}</strong></span>
                <span className="text-slate-400">Users: <strong className="text-purple-600">{n.activeUsersCount}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
