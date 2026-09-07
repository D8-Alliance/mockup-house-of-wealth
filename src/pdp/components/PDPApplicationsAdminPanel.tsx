import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Plus, 
  Download, 
  Globe, 
  UserCheck, 
  FileSpreadsheet,
  ShieldAlert,
  ArrowUpRight,
  RotateCcw
} from 'lucide-react';
import { PDPApplication, PDPApplicationStatus, PDPType } from '../pdpTypes';
import { pdpService } from '../pdpService';
import { PDPApplicationDetailModal } from './PDPApplicationDetailModal';
import { PDPRegistrationModal } from './PDPRegistrationModal';
import { useRBAC } from '../../rbac/RBACContext';

export const PDPApplicationsAdminPanel: React.FC = () => {
  const { currentRole } = useRBAC();
  const [applications, setApplications] = useState<PDPApplication[]>(pdpService.getAllApplications());
  const [selectedApp, setSelectedApp] = useState<PDPApplication | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const refreshData = () => {
    setApplications(pdpService.getAllApplications());
  };

  useEffect(() => {
    const unsub = pdpService.subscribe(() => {
      setApplications(pdpService.getAllApplications());
    });
    return unsub;
  }, []);

  const filteredApps = applications.filter(app => {
    const matchesSearch = 
      app.organisationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.userEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCountry = selectedCountry === 'ALL' || app.countryCode === selectedCountry;
    const matchesStatus = selectedStatus === 'ALL' || app.status === selectedStatus;
    const matchesType = selectedType === 'ALL' || app.pdpType === selectedType;

    return matchesSearch && matchesCountry && matchesStatus && matchesType;
  });

  const totalCount = applications.length;
  const pendingCount = applications.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length;
  const activeCount = applications.filter(a => a.status === 'ACTIVE').length;
  const actionRequiredCount = applications.filter(a => a.status === 'ADDITIONAL_INFORMATION_REQUIRED').length;

  const handleOpenDetail = (app: PDPApplication) => {
    setSelectedApp(app);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              PDP LIFECYCLE MANAGEMENT
            </span>
            <span className="text-xs text-slate-400 font-mono">D-8 Sovereignty & KYB Protocol</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Pool & Project Data Provider (PDP) Applications Queue
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit, verify legal entity credentials, beneficial ownership (UBOs), bank settlement coordinates, and approve PDP issuers.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New PDP</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block mb-1">Total PDP Applicants</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</p>
          <span className="text-[10px] font-bold text-purple-600 mt-1 block">Registered in D-8 Directory</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block mb-1">Pending Compliance Review</span>
          <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
          <span className="text-[10px] font-bold text-amber-600 mt-1 block">Awaiting Dual-Key Signoff</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block mb-1">Verified & Active PDPs</span>
          <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
          <span className="text-[10px] font-bold text-emerald-600 mt-1 block">Authorized to Create Pools</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block mb-1">Corrections / Info Required</span>
          <p className="text-2xl font-black text-indigo-600">{actionRequiredCount}</p>
          <span className="text-[10px] font-bold text-indigo-600 mt-1 block">Pending Originator Action</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by legal name, application #, registration #, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Country Filter */}
          <select
            value={selectedCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Country Nodes</option>
            <option value="MYS">Malaysia (MYS)</option>
            <option value="IDN">Indonesia (IDN)</option>
            <option value="TUR">Türkiye (TUR)</option>
            <option value="NGA">Nigeria (NGA)</option>
            <option value="EGY">Egypt (EGY)</option>
            <option value="MYS-P2">Malaysia (MYS-P2)</option>
            <option value="BGD">Bangladesh (BGD)</option>
            <option value="IRN">Iran (IRN)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ADDITIONAL_INFORMATION_REQUIRED">Info Required</option>
            <option value="ACTIVE">Active / Verified</option>
            <option value="DRAFT">Draft</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All PDP Types</option>
            <option value="Company">Company</option>
            <option value="Organisation">Organisation / GLC</option>
            <option value="Institution">Institution / Fund</option>
            <option value="Individual">Individual</option>
          </select>

          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCountry('ALL');
              setSelectedStatus('ALL');
              setSelectedType('ALL');
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white"
            title="Reset Filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Application & Entity</th>
                <th className="py-3.5 px-4">Country Node</th>
                <th className="py-3.5 px-4">Entity Type</th>
                <th className="py-3.5 px-4">Authorised Rep</th>
                <th className="py-3.5 px-4">KYB Status</th>
                <th className="py-3.5 px-4">Lifecycle Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-300">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No PDP applications found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredApps.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 block font-bold">{app.applicationNumber}</span>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">{app.organisationName || 'Untitled PDP Draft'}</h4>
                        <span className="text-[11px] text-slate-500 font-mono">Reg: {app.registrationNumber || 'Pending'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{app.countryName}</span>
                      <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400">{app.countryCode} • {app.bankInfo?.currency}</span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {app.pdpType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{app.representative?.fullName || 'Not Assigned'}</span>
                        <span className="text-[10px] text-slate-400">{app.representative?.position || '—'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        app.kybStatus === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                        app.kybStatus === 'UNDER_REVIEW' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                        app.kybStatus === 'CORRECTION_REQUIRED' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' :
                        app.kybStatus === 'REJECTED' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                        'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                      }`}>
                        {app.kybStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        app.status === 'ACTIVE' ? 'bg-emerald-600 text-white' :
                        app.status === 'UNDER_REVIEW' ? 'bg-amber-500 text-white' :
                        app.status === 'ADDITIONAL_INFORMATION_REQUIRED' ? 'bg-indigo-600 text-white' :
                        app.status === 'REJECTED' ? 'bg-red-600 text-white' :
                        app.status === 'SUSPENDED' ? 'bg-slate-700 text-white' :
                        'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {app.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetail(app)}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-extrabold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Audit Dossier</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <PDPApplicationDetailModal
        application={selectedApp}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedApp(null);
        }}
        onRefresh={refreshData}
      />

      <PDPRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSubmitted={() => refreshData()}
      />
    </div>
  );
};
