import React from 'react';
import { Building2, Users, FolderKanban, Shield, UserPlus } from 'lucide-react';
import { organisationService } from '../../organisations/organisationService';
import { userService } from '../../users/userService';
import { useRBAC } from '../../rbac/RBACContext';

interface OrganisationAdminDashboardProps {
  onNavigateUsers: () => void;
  onOpenInviteModal: () => void;
}

export const OrganisationAdminDashboard: React.FC<OrganisationAdminDashboardProps> = ({
  onNavigateUsers,
  onOpenInviteModal
}) => {
  const { currentOrgId } = useRBAC();
  const org = organisationService.getOrganisationById(currentOrgId || 'ORG-FELDA-MYS') || organisationService.getAllOrganisations()[0];
  const orgId = org.organisationId || (org as any).id;
  const users = userService.getUsersByOrganisation(orgId);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-purple-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src={org.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&q=80'} alt={org.legalName || (org as any).name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20" />
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/30 text-purple-200 border border-purple-400/30">
                ORGANISATION ADMIN SCOPE
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">{org.legalName || (org as any).name}</h1>
              <p className="text-xs text-purple-200 mt-0.5">
                Reg: {org.registrationNumber} • Node: {org.countryNodeId} • Type: {org.organisationType || (org as any).type}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenInviteModal}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow flex items-center gap-2 cursor-pointer transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Personnel</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={onNavigateUsers} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm cursor-pointer hover:border-purple-500/50 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400">Organisation Members</span>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{users.length}</p>
          <span className="text-[11px] font-bold text-purple-600 mt-1 block">Internal Personnel & Leads</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400">KYB Verification Status</span>
            <Shield className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{org.verificationStatus}</p>
          <span className="text-[11px] font-bold text-slate-400 mt-1 block">Verified Entity Certificate</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400">Projects Managed</span>
            <FolderKanban className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{org.activeProjectsCount || 24}</p>
          <span className="text-[11px] font-bold text-indigo-600 mt-1 block">PDP & Agritech Ventures</span>
        </div>
      </div>
    </div>
  );
};
