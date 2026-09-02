import React from 'react';
import { Globe, Building2, Users, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { countryNodeService } from '../../countryNodes/countryNodeService';
import { organisationService } from '../../organisations/organisationService';
import { userService } from '../../users/userService';
import { useRBAC } from '../../rbac/RBACContext';

interface CountryAdminDashboardProps {
  onNavigateOrganisations: () => void;
  onNavigateUsers: () => void;
}

export const CountryAdminDashboard: React.FC<CountryAdminDashboardProps> = ({
  onNavigateOrganisations,
  onNavigateUsers
}) => {
  const { currentCountryNode } = useRBAC();
  const node = countryNodeService.getCountryNodeById(currentCountryNode || 'CN-MYS') || countryNodeService.getAllCountryNodes()[0];
  const orgs = organisationService.getOrganisationsByCountryNode(node.countryNodeId);
  const users = userService.getUsersByCountryNode(node.countryNodeId);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-indigo-500/30">
        <div className="flex items-center gap-4 mb-3">
          <img src={node.flagUrl} alt={node.countryName} className="w-12 h-8 rounded-lg object-cover border border-white/20" />
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              NATIONAL COUNTRY ADMIN SCOPE
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">{node.countryName} Sovereign Node</h1>
          </div>
        </div>
        <p className="text-xs text-indigo-200 max-w-xl">
          National governance oversight, organization KYB verification, country personnel roles, and regulatory compliance under <strong>{node.regulatoryProfile}</strong>.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={onNavigateOrganisations} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm cursor-pointer hover:border-purple-500/50 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400">National Organisations</span>
            <Building2 className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{orgs.length}</p>
          <span className="text-[11px] font-bold text-emerald-600 mt-1 block">GLCs, PDPs & Asset Owners</span>
        </div>

        <div onClick={onNavigateUsers} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm cursor-pointer hover:border-purple-500/50 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400">Country Users</span>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{users.length}</p>
          <span className="text-[11px] font-bold text-indigo-600 mt-1 block">Scoped to {node.countryCode}</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400">National Currency</span>
            <Globe className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{node.currency}</p>
          <span className="text-[11px] font-bold text-slate-500 mt-1 block">Timezone: {node.timezone}</span>
        </div>
      </div>

      {/* Organisation KYB Queue */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-600" />
          National Corporate Entity Registry & Verification
        </h3>
        <div className="space-y-3 text-xs">
          {orgs.map(o => (
            <div key={o.organisationId || (o as any).id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{o.legalName || (o as any).name}</h4>
                <p className="text-slate-500">{o.organisationType || (o as any).type} • Reg: {o.registrationNumber}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                {o.verificationStatus}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
