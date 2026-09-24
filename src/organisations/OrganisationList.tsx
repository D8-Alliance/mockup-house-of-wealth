import React, { useState } from 'react';
import { Building2, Search, Filter, Plus, ShieldCheck, CheckCircle2, AlertTriangle, Eye, ChevronRight } from 'lucide-react';
import { Organisation, OrganisationType, OrganisationStatus, OrganisationVerificationStatus } from './organisationTypes';
import { organisationService } from './organisationService';
import { useRBAC } from '../rbac/RBACContext';

interface OrganisationListProps {
  onSelectOrganisation: (org: Organisation) => void;
  onOpenOnboarding: () => void;
  onOpenVerification: (org: Organisation) => void;
}

export const OrganisationList: React.FC<OrganisationListProps> = ({
  onSelectOrganisation,
  onOpenOnboarding,
  onOpenVerification
}) => {
  const { currentRole, currentCountryNode, currentOrgId } = useRBAC();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<string>('ALL');

  const allOrgs = organisationService.getAllOrganisations();

  // Tenant scoping check!
  const scopedOrgs = allOrgs.filter(org => {
    if (currentRole === 'Super Admin' || currentRole === 'Security Administrator' || currentRole === 'System Administrator') {
      return true;
    }
    if (currentRole === 'Country Admin') {
      return org.countryNodeId === currentCountryNode || (org as any).countryNodeId === currentCountryNode;
    }
    // Org Admin & others: see own organisation
    return org.organisationId === currentOrgId || (org as any).id === currentOrgId;
  });

  const filteredOrgs = scopedOrgs.filter(org => {
    const name = org.legalName || (org as any).name || '';
    const reg = org.registrationNumber || '';
    const id = org.organisationId || (org as any).id || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          reg.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || org.organisationType === typeFilter || (org as any).type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || org.status === statusFilter;
    const matchesVerif = verificationFilter === 'ALL' || org.verificationStatus === verificationFilter;
    return matchesSearch && matchesType && matchesStatus && matchesVerif;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Multi-Tenant Architecture
            </span>
            <span className="text-xs text-slate-400 font-mono">KYB Corporate Registry</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600" />
            Organisation Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register and manage participating government bodies, GLCs, project sponsors, investment funds, and Islamic institutions.
          </p>
        </div>

        <button
          onClick={onOpenOnboarding}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow cursor-pointer transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard Organisation</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search org name, reg no, ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-white dark:bg-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        >
          <option value="ALL">All Organisation Types</option>
          <option value="Government">Government</option>
          <option value="Government-Linked Company">Government-Linked Company</option>
          <option value="Corporation">Corporation</option>
          <option value="Project Sponsor / Delivery Partner">Project Sponsor / Delivery Partner</option>
          <option value="Financial Institution">Financial Institution</option>
          <option value="Investment Fund">Investment Fund</option>
          <option value="Family Office">Family Office</option>
          <option value="Cooperative">Cooperative</option>
          <option value="Islamic Institution">Islamic Institution</option>
          <option value="Asset Manager">Asset Manager</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        >
          <option value="ALL">All Account Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="REJECTED">REJECTED</option>
        </select>

        <select
          value={verificationFilter}
          onChange={e => setVerificationFilter(e.target.value)}
          className="bg-white dark:bg-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        >
          <option value="ALL">All Verification States</option>
          <option value="VERIFIED">VERIFIED</option>
          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
          <option value="PENDING">PENDING</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {/* Grid of Organisations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrgs.map(org => {
          const orgId = org.organisationId || (org as any).id;
          const name = org.legalName || (org as any).name;
          return (
            <div
              key={orgId}
              className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 hover:border-purple-500/50 shadow-sm transition-all space-y-4 group cursor-pointer"
              onClick={() => onSelectOrganisation(org)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors line-clamp-1">
                      {name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    {org.organisationType || (org as any).type} • <strong className="text-slate-700 dark:text-slate-300">{org.countryNodeId}</strong>
                  </p>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${
                  org.verificationStatus === 'VERIFIED' || org.verificationStatus === ('Verified' as any)
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                }`}>
                  {org.verificationStatus}
                </span>
              </div>

              <div className="text-xs space-y-1.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-slate-500">
                  <span>Reg No:</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">{org.registrationNumber}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Contact:</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate max-w-[160px]">{org.contactEmail}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 text-center text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60">
                <div className="p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-bold block">Users</span>
                  <span className="font-black text-slate-800 dark:text-slate-100">{org.activeUsersCount}</span>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-bold block">Projects</span>
                  <span className="font-black text-purple-600">{org.activeProjectsCount}</span>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-bold block">Assets</span>
                  <span className="font-black text-emerald-600">{org.activeAssetsCount}</span>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-bold block">Pools</span>
                  <span className="font-black text-amber-600">{org.activePoolsCount}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                {(currentRole === 'Super Admin' || currentRole === 'Country Admin' || currentRole === 'Compliance Officer') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenVerification(org);
                    }}
                    className="px-3 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Review KYB</span>
                  </button>
                )}

                <div className="flex items-center gap-1 text-xs text-purple-600 font-bold ml-auto">
                  <span>Details</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
