import React, { useState } from 'react';
import { 
  UserCheck, 
  Search, 
  Filter, 
  Shield, 
  ShieldCheck, 
  Plus, 
  Users, 
  KeyRound, 
  CheckCircle2, 
  Copy, 
  Eye, 
  Edit3, 
  Layers, 
  ArrowRight, 
  ChevronRight,
  Building2,
  Lock,
  ExternalLink,
  Award,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { UserRole, RoleDefinition, ResourceModule } from '../../rbac/types';
import { ROLE_DEFINITIONS } from '../../rbac/roleDefinitions';
import { userService } from '../../users/userService';
import { useRBAC } from '../../rbac/RBACContext';

interface RoleManagementPanelProps {
  onNavigateToPermissions?: () => void;
  onNavigateToUserList?: () => void;
}

export const RoleManagementPanel: React.FC<RoleManagementPanelProps> = ({
  onNavigateToPermissions,
  onNavigateToUserList
}) => {
  const { currentRole, setRole } = useRBAC();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'table'>('cards');

  const allRolesList = Object.values(ROLE_DEFINITIONS) as RoleDefinition[];
  const allUsers = userService.getAllUsers();

  const categories = ['ALL', 'System Executive', 'Governance & Risk', 'Operational Management', 'Participant & User'];

  const filteredRoles = allRolesList.filter(role => {
    const matchesSearch = role.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          role.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          role.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || role.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getRoleUserCount = (roleName: UserRole) => {
    return allUsers.filter(u => u.primaryRole === roleName || u.assignedRoles.includes(roleName)).length;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              RBAC Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">Enterprise Access Management</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-purple-600" />
            Role Management & Policy Definitions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure system roles, operational authorities, governance privileges, accessible tabs, and assignable security scopes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToPermissions && (
            <button
              onClick={onNavigateToPermissions}
              className="px-3.5 py-2.5 rounded-xl border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Permission Matrix</span>
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Role</span>
          </button>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Defined Roles</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{allRolesList.length}</span>
            <span className="text-xs font-semibold text-emerald-600">Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">System & Governance</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {allRolesList.filter(r => r.category === 'System Executive' || r.category === 'Governance & Risk').length}
            </span>
            <span className="text-xs text-slate-400">High Privilege</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Operational Roles</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {allRolesList.filter(r => r.category === 'Operational Management').length}
            </span>
            <span className="text-xs text-slate-400">Workflow Nodes</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Active Users</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">{allUsers.length}</span>
            <span className="text-xs text-slate-400">Across 8 Nodes</span>
          </div>
        </div>
      </div>

      {/* Filter and View Toggles */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search roles, titles, descriptions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                categoryFilter === cat
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredRoles.map(role => {
          const userCount = getRoleUserCount(role.role);
          const isCurrentActive = currentRole === role.role;
          const permKeys = Object.keys(role.permissions || {}) as ResourceModule[];
          const approvalCount = role.approvalRights?.length || 0;

          return (
            <div
              key={role.role}
              className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 transition-all flex flex-col justify-between hover:shadow-md ${
                isCurrentActive 
                  ? 'border-purple-500 shadow-sm ring-1 ring-purple-500/30' 
                  : 'border-slate-200/80 dark:border-slate-700/80'
              }`}
            >
              <div>
                {/* Top Badge & Category */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border ${role.badgeColor}`}>
                    {role.role}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {role.category}
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                  {role.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {role.description}
                </p>

                {/* Permissions Summary & Accessible Tabs */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Accessible Tabs</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {role.accessibleTabs.length} Tabs
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {role.accessibleTabs.slice(0, 4).map(tab => (
                      <span key={tab} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                        {tab}
                      </span>
                    ))}
                    {role.accessibleTabs.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                        +{role.accessibleTabs.length - 4} more
                      </span>
                    )}
                  </div>

                  {approvalCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-500/20 mt-2">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{approvalCount} Approval Authority Rights</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">{userCount}</span>
                  <span>assigned</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedRole(role)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all cursor-pointer"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => setRole(role.role)}
                    disabled={isCurrentActive}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      isCurrentActive
                        ? 'bg-emerald-500 text-white cursor-default'
                        : 'bg-slate-100 hover:bg-purple-600 hover:text-white text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {isCurrentActive ? 'Active Role' : 'Switch To'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Details Modal */}
      {selectedRole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`px-3 py-1 rounded-lg text-xs font-black border ${selectedRole.badgeColor}`}>
                  {selectedRole.role}
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                  {selectedRole.title}
                </h3>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Category: {selectedRole.category}
                </span>
              </div>
              <button
                onClick={() => setSelectedRole(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              {selectedRole.description}
            </p>

            {/* Permissions Matrix for this Role */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Module Permissions Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(selectedRole.permissions || {}).map(([module, actions]) => (
                  <div key={module} className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 capitalize block mb-1">
                      {module.replace('_', ' ')}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(actions as string[]).map(act => (
                        <span
                          key={act}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            act === 'approve'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : act === 'delete'
                              ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                              : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Approval Rights */}
            {selectedRole.approvalRights && selectedRole.approvalRights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-emerald-600 tracking-wider">
                  Delegated Approval & Sign-Off Rights
                </h4>
                <div className="space-y-1.5">
                  {selectedRole.approvalRights.map((right, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{right}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Demo Person Profile */}
            <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-2xl border border-purple-500/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedRole.demoUser.avatarUrl}
                  alt={selectedRole.demoUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-purple-500/30"
                />
                <div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">
                    {selectedRole.demoUser.name}
                  </h5>
                  <p className="text-[11px] text-slate-500">{selectedRole.demoUser.organization}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setRole(selectedRole.role);
                  setSelectedRole(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition-all cursor-pointer shrink-0"
              >
                Impersonate Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                Define Custom Security Role
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Role Title Name</label>
                <input
                  type="text"
                  placeholder="e.g., Senior Sukuk Risk Analyst"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Role Category</label>
                <select className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <option value="Operational Management">Operational Management</option>
                  <option value="Governance & Risk">Governance & Risk</option>
                  <option value="Participant & User">Participant & User</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Description & Purpose</label>
                <textarea
                  rows={3}
                  placeholder="Describe the governance duties and delegation parameters..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Custom Role Draft Created successfully!');
                  setShowCreateModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-purple-600 text-white hover:bg-purple-500 shadow-md cursor-pointer"
              >
                Save Role Definition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
