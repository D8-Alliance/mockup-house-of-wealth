import React, { useState } from 'react';
import { ShieldCheck, Search, Download, Filter, Building2, Globe, UserCheck, Shield } from 'lucide-react';
import { auditLogger } from '../audit/auditLogger';
import { useTenancy } from '../tenancy/TenancyContext';

export const AuditTrailView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const { tenantContext, activeOrganisation, activeCountryNode } = useTenancy();
  const allEvents = auditLogger.getEvents();

  const filteredEvents = allEvents.filter(e => {
    // Tenant filtering based on role
    if (tenantContext.role !== 'Super Admin' && tenantContext.role !== 'Security Administrator') {
      if (tenantContext.role === 'Country Admin' || tenantContext.role === 'National Regulator') {
        if (e.countryNodeId && e.countryNodeId !== tenantContext.countryNodeId) return false;
      } else {
        if (e.organisationId && e.organisationId !== tenantContext.organisationId) return false;
      }
    }

    if (filterAction !== 'ALL' && e.action !== filterAction) return false;

    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    return (
      e.eventId.toLowerCase().includes(query) ||
      e.action.toLowerCase().includes(query) ||
      e.userId.toLowerCase().includes(query) ||
      (e.userName && e.userName.toLowerCase().includes(query)) ||
      e.resourceType.toLowerCase().includes(query) ||
      e.resourceId.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-2 border border-purple-500/20">
            <Shield className="w-3.5 h-3.5" />
            Central Cryptographic Audit Event Ledger
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Audit Trail & Compliance Ledger</h1>
          <p className="text-sm text-slate-500">
            Tenant-aware audit log trail enforcing immutable tracking for logins, role switches, project approvals, and contracts.
          </p>
        </div>

        <button 
          onClick={() => alert("Exporting Audit Package CSV...")}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md cursor-pointer transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Package</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6 space-y-4">
        
        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter audit events by ID, user, resource..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Action:</span>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold outline-none"
            >
              <option value="ALL">All Actions</option>
              <option value="login">login</option>
              <option value="logout">logout</option>
              <option value="role_switch_demo">role_switch_demo</option>
              <option value="project_create">project_create</option>
              <option value="project_submit">project_submit</option>
              <option value="project_approve">project_approve</option>
              <option value="contract_approve">contract_approve</option>
              <option value="financial_transaction">financial_transaction</option>
              <option value="user_update">user_update</option>
            </select>
          </div>
        </div>

        {/* Audit Events Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60">
                <th className="p-3.5">Event ID</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Actor User / Role</th>
                <th className="p-3.5">Org & Node Scope</th>
                <th className="p-3.5">Resource</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredEvents.map(event => (
                <tr key={event.eventId} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                  <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white">{event.eventId}</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-lg font-bold text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {event.action}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 block">{event.userName || event.userId}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{event.role}</span>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-700 dark:text-slate-200 block">{event.organisationId}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{event.countryNodeId}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{event.resourceType}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{event.resourceId}</span>
                  </td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">{new Date(event.timestamp).toLocaleString()}</td>
                  <td className="p-3.5 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                      event.result === 'Success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600'
                    }`}>
                      ✓ {event.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
