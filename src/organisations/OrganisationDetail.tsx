import React, { useState } from 'react';
import { Building2, ArrowLeft, Users, FolderKanban, Coins, Landmark, FileText, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { Organisation } from './organisationTypes';
import { userService } from '../users/userService';
import { auditLogger } from '../audit/auditLogger';

interface OrganisationDetailProps {
  organisation: Organisation;
  onBack: () => void;
}

export const OrganisationDetail: React.FC<OrganisationDetailProps> = ({
  organisation,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'documents' | 'audit'>('overview');

  const orgId = organisation.organisationId || (organisation as any).id;
  const name = organisation.legalName || (organisation as any).name;
  const users = userService.getUsersByOrganisation(orgId);
  const events = auditLogger.filterEvents({ organisationId: orgId });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-500/20">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 mb-4 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organisations</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={organisation.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&q=80'}
              alt={name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white">{name}</h1>
                <span className="px-2.5 py-0.5 rounded bg-purple-500/30 text-purple-200 font-mono text-xs font-bold border border-purple-400/30">
                  {orgId}
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-1">
                Type: <strong className="text-white">{organisation.organisationType || (organisation as any).type}</strong> • Node: {organisation.countryNodeId} • Reg: {organisation.registrationNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {organisation.verificationStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Profile', icon: <Building2 className="w-4 h-4" /> },
          { id: 'users', label: `Users (${users.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'documents', label: `Documents (${organisation.documents?.length || 0})`, icon: <FileText className="w-4 h-4" /> },
          { id: 'audit', label: `Audit Trail (${events.length})`, icon: <FileSpreadsheet className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-extrabold text-xs cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Corporate Legal Profile</h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Industry Sector</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{organisation.industry || 'Multi-Sector'}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Email</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{organisation.contactEmail}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Registered Office Address</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{organisation.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Active Operational Metrics</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                <span className="text-xs text-purple-600 font-bold block">Active Users</span>
                <span className="text-2xl font-black text-purple-700 dark:text-purple-300">{organisation.activeUsersCount}</span>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <span className="text-xs text-emerald-600 font-bold block">Projects</span>
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{organisation.activeProjectsCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Organisation Personnel</h3>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.userId} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <div className="flex items-center gap-3">
                  <img src={u.profilePhoto} alt={u.fullName} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-white block">{u.fullName}</span>
                    <span className="text-[10px] text-slate-400">{u.email} • {u.primaryRole}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600">
                  {u.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
