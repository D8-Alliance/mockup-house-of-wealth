import React, { useState } from 'react';
import { 
  KeyRound, 
  Search, 
  Filter, 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  X, 
  Download, 
  Play, 
  Layers, 
  HelpCircle,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserRole, ResourceModule, PermissionAction, RoleDefinition } from '../../rbac/types';
import { ROLE_DEFINITIONS } from '../../rbac/roleDefinitions';
import { hasPermission } from '../../rbac/rbacEngine';
import { useRBAC } from '../../rbac/RBACContext';

const ALL_MODULES: { key: ResourceModule; label: string; iconDesc: string }[] = [
  { key: 'dashboard', label: 'Executive Dashboard', iconDesc: 'Analytics & KPIs' },
  { key: 'assets', label: 'Asset Management', iconDesc: 'Tokenization & Registry' },
  { key: 'contracts', label: 'Smart Contracts', iconDesc: 'AAOIFI Legal Structuring' },
  { key: 'marketplace', label: 'Marketplace', iconDesc: 'Secondary & Discoveries' },
  { key: 'pooling', label: 'Wealth Pools', iconDesc: 'Capital Aggregation' },
  { key: 'approvals', label: 'Approval Matrix', iconDesc: 'Multi-Sig Governance' },
  { key: 'governance', label: 'Shariah Board', iconDesc: 'Fatwa & Compliance' },
  { key: 'users', label: 'User Directory', iconDesc: 'Identity & KYB' },
  { key: 'ledger', label: 'Accounting Ledger', iconDesc: 'Immutable Settlement' },
  { key: 'audit_logs', label: 'Audit Logs', iconDesc: 'Security & Forensics' },
  { key: 'reports', label: 'Regulatory Reports', iconDesc: 'Central Bank Exports' },
  { key: 'profile', label: 'User Profile & Wallet', iconDesc: 'Account & Custody' }
];

const ACTION_COLORS: Record<PermissionAction, { bg: string; text: string; label: string }> = {
  create: { bg: 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', text: 'text-emerald-600', label: 'C' },
  read: { bg: 'bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-500/30', text: 'text-blue-600', label: 'R' },
  update: { bg: 'bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-500/30', text: 'text-amber-600', label: 'U' },
  delete: { bg: 'bg-red-500/10 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-500/30', text: 'text-red-600', label: 'D' },
  approve: { bg: 'bg-purple-500/10 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-500/30', text: 'text-purple-600', label: 'A' },
  audit: { bg: 'bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-500/30', text: 'text-indigo-600', label: 'Aud' },
  export: { bg: 'bg-teal-500/10 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-500/30', text: 'text-teal-600', label: 'Exp' }
};

export const PermissionMatrixPanel: React.FC = () => {
  const { currentRole } = useRBAC();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');

  // Simulator State
  const [simRole, setSimRole] = useState<UserRole>('Compliance Officer');
  const [simModule, setSimModule] = useState<ResourceModule>('approvals');
  const [simAction, setSimAction] = useState<PermissionAction>('approve');
  const [simResult, setSimResult] = useState<{ allowed: boolean; reason: string } | null>(null);

  const allRolesList = Object.values(ROLE_DEFINITIONS) as RoleDefinition[];

  const categories = ['ALL', 'System Executive', 'Governance & Risk', 'Operational Management', 'Participant & User'];

  const filteredRoles = allRolesList.filter(role => {
    const matchesSearch = role.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          role.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || role.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const displayedModules = selectedModule === 'ALL' 
    ? ALL_MODULES 
    : ALL_MODULES.filter(m => m.key === selectedModule);

  const handleRunSimulation = () => {
    const allowed = hasPermission(simRole, simModule, simAction);
    const roleDef = ROLE_DEFINITIONS[simRole];
    let reason = '';

    if (allowed) {
      reason = `Access GRANTED: Role "${simRole}" has explicit "${simAction}" grant on module "${simModule}" as defined in the ${roleDef?.category || 'Security'} policy.`;
    } else {
      reason = `Access DENIED: Role "${simRole}" lacks "${simAction}" privilege on module "${simModule}". Enforced via Least-Privilege AAOIFI Governance standard.`;
    }

    setSimResult({ allowed, reason });
  };

  const handleExportCSV = () => {
    const headers = ['Role', 'Category', ...ALL_MODULES.map(m => m.label)];
    const rows = allRolesList.map(r => {
      const modulePerms = ALL_MODULES.map(m => {
        const perms = r.permissions[m.key] || [];
        return `"${perms.join(', ')}"`;
      });
      return [`"${r.role}"`, `"${r.category}"`, ...modulePerms].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `D8_Security_Permission_Matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Security Governance
            </span>
            <span className="text-xs text-slate-400 font-mono">Resource RBAC Matrix</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-purple-600" />
            Global Permission & Capability Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full cross-sectional audit grid mapping each user role against platform resources with CRUD and Approval capabilities.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-2 text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Matrix (CSV)</span>
          </button>
        </div>
      </div>

      {/* Interactive Permission Policy Simulator */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-purple-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-black text-white">
              Real-Time RBAC Policy Evaluation Simulator
            </h3>
          </div>
          <span className="text-[11px] font-mono text-purple-300">
            Rule Engine v2.4 (Active Guard)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Target Role</label>
            <select
              value={simRole}
              onChange={e => setSimRole(e.target.value as UserRole)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {allRolesList.map(r => (
                <option key={r.role} value={r.role}>{r.role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Resource Module</label>
            <select
              value={simModule}
              onChange={e => setSimModule(e.target.value as ResourceModule)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {ALL_MODULES.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Action Attempt</label>
            <select
              value={simAction}
              onChange={e => setSimAction(e.target.value as PermissionAction)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="create">Create (Write)</option>
              <option value="read">Read (View)</option>
              <option value="update">Update (Modify)</option>
              <option value="delete">Delete (Remove)</option>
              <option value="approve">Approve (Sign-Off)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunSimulation}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs py-2 px-4 rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Evaluate Policy</span>
            </button>
          </div>
        </div>

        {simResult && (
          <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
            simResult.allowed
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/50 border-red-500/40 text-red-200'
          }`}>
            {simResult.allowed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-black text-sm block">
                {simResult.allowed ? 'POLICY EVALUATION: ACCESS ALLOWED' : 'POLICY EVALUATION: ACCESS DENIED'}
              </span>
              <p className="mt-0.5 leading-relaxed opacity-90">{simResult.reason}</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-400 mr-1">Legend:</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">C = Create</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">R = Read</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">U = Update</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">D = Delete</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">A = Approve</span>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat === 'ALL' ? 'All Roles' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Module Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search role name in matrix..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>

          <div>
            <select
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            >
              <option value="ALL">Display All 12 Resource Modules</option>
              {ALL_MODULES.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-4 sticky left-0 bg-slate-50 dark:bg-slate-900/90 z-10 w-64">
                  Security Role & Category
                </th>
                {displayedModules.map(m => (
                  <th key={m.key} className="py-3.5 px-3 text-center min-w-[100px]">
                    <span className="block text-slate-900 dark:text-white font-bold">{m.label}</span>
                    <span className="text-[9px] font-normal text-slate-400">{m.iconDesc}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {filteredRoles.map(role => {
                const isCurrent = currentRole === role.role;
                return (
                  <tr 
                    key={role.role}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors ${
                      isCurrent ? 'bg-purple-500/5 dark:bg-purple-950/20' : ''
                    }`}
                  >
                    {/* Role Title Column (Sticky) */}
                    <td className="py-3 px-4 sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-100 dark:border-slate-700/60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900 dark:text-white truncate max-w-[180px]">
                            {role.role}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-white">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                          {role.category}
                        </span>
                      </div>
                    </td>

                    {/* Permissions for each module */}
                    {displayedModules.map(m => {
                      const perms = role.permissions[m.key] || [];
                      const hasCreate = perms.includes('create');
                      const hasRead = perms.includes('read');
                      const hasUpdate = perms.includes('update');
                      const hasDelete = perms.includes('delete');
                      const hasApprove = perms.includes('approve');

                      if (perms.length === 0) {
                        return (
                          <td key={m.key} className="py-3 px-2 text-center text-slate-300 dark:text-slate-600 font-mono text-xs">
                            —
                          </td>
                        );
                      }

                      return (
                        <td key={m.key} className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {hasCreate && (
                              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Create">
                                C
                              </span>
                            )}
                            {hasRead && (
                              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20" title="Read">
                                R
                              </span>
                            )}
                            {hasUpdate && (
                              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Update">
                                U
                              </span>
                            )}
                            {hasDelete && (
                              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20" title="Delete">
                                D
                              </span>
                            )}
                            {hasApprove && (
                              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30" title="Approve">
                                A
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
