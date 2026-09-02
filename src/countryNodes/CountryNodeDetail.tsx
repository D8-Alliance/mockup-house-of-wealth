import React, { useState } from 'react';
import { Globe, ArrowLeft, Building2, Users, FolderKanban, Coins, ShieldCheck, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { CountryNode } from './countryNodeTypes';
import { organisationService } from '../organisations/organisationService';
import { userService } from '../users/userService';
import { auditLogger } from '../audit/auditLogger';

interface CountryNodeDetailProps {
  countryNode: CountryNode;
  onBack: () => void;
}

export const CountryNodeDetail: React.FC<CountryNodeDetailProps> = ({
  countryNode,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'organisations' | 'users' | 'compliance' | 'audit'>('overview');

  const orgs = organisationService.getOrganisationsByCountryNode(countryNode.countryNodeId);
  const users = userService.getUsersByCountryNode(countryNode.countryNodeId);
  const events = auditLogger.filterEvents({ countryNodeId: countryNode.countryNodeId });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-500/20">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 mb-4 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Country Nodes</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={countryNode.flagUrl}
              alt={countryNode.countryName}
              className="w-16 h-12 rounded-xl object-cover border-2 border-white/20 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white">{countryNode.countryName} Node</h1>
                <span className="px-2.5 py-0.5 rounded bg-purple-500/30 text-purple-200 font-mono text-xs font-bold border border-purple-400/30">
                  {countryNode.countryCode}
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-1">
                Region: {countryNode.region} • Currency: <strong className="text-white">{countryNode.currency}</strong> • Timezone: {countryNode.timezone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {countryNode.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: <Globe className="w-4 h-4" /> },
          { id: 'organisations', label: `Organisations (${orgs.length})`, icon: <Building2 className="w-4 h-4" /> },
          { id: 'users', label: `Users (${users.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'compliance', label: 'Compliance & Regulatory', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'audit', label: `Audit Events (${events.length})`, icon: <FileSpreadsheet className="w-4 h-4" /> }
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

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              Sovereignty & Central Bank Profile
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Regulatory Authority</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{countryNode.regulatoryProfile}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Node ID</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{countryNode.countryNodeId}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Created Date</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{new Date(countryNode.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Node Wealth Capacities</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                <span className="text-xs text-purple-600 font-bold block">Organisations</span>
                <span className="text-2xl font-black text-purple-700 dark:text-purple-300">{countryNode.activeOrganisationsCount}</span>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <span className="text-xs text-emerald-600 font-bold block">Active Users</span>
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{countryNode.activeUsersCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organisations List */}
      {activeTab === 'organisations' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Registered Organisations in {countryNode.countryName}</h3>
          <div className="space-y-3">
            {orgs.map(o => (
              <div key={o.organisationId} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{o.legalName}</h4>
                  <p className="text-slate-500">{o.organisationType} • Reg: {o.registrationNumber}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users List */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Active Users in {countryNode.countryName}</h3>
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
