import React, { useState } from 'react';
import { Users, Search, Filter, UserPlus, Shield, CheckCircle2, AlertTriangle, Key, Lock, Eye, ChevronRight, UserCheck } from 'lucide-react';
import { AppUser, UserAccountStatus } from './userTypes';
import { userService } from './userService';
import { useRBAC } from '../rbac/RBACContext';

interface UserListProps {
  onSelectUser: (user: AppUser) => void;
  onOpenInviteModal: () => void;
  onOpenRoleAssignmentModal: (user: AppUser) => void;
}

export const UserList: React.FC<UserListProps> = ({
  onSelectUser,
  onOpenInviteModal,
  onOpenRoleAssignmentModal
}) => {
  const { currentRole, currentCountryNode, currentOrgId, currentUserId } = useRBAC();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [mfaFilter, setMfaFilter] = useState<string>('ALL');

  const allUsers = userService.getAllUsers();

  // Tenant scoping check!
  const scopedUsers = allUsers.filter(user => {
    if (currentRole === 'Super Admin' || currentRole === 'Security Administrator' || currentRole === 'System Administrator') {
      return true;
    }
    if (currentRole === 'Country Admin') {
      return user.countryNodeId === currentCountryNode;
    }
    // Org Admin & others: see own organisation
    return user.organisationId === currentOrgId;
  });

  const filteredUsers = scopedUsers.filter(user => {
    const name = user.fullName || (user as any).name || '';
    const email = user.email || '';
    const id = user.userId || (user as any).id || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
    const matchesRole = roleFilter === 'ALL' || user.primaryRole === roleFilter || user.assignedRoles.includes(roleFilter);
    const matchesMfa = mfaFilter === 'ALL' || (mfaFilter === 'ENABLED' ? user.mfaEnabled : !user.mfaEnabled);
    return matchesSearch && matchesStatus && matchesRole && matchesMfa;
  });

  const handleStatusChange = (userId: string, newStatus: UserAccountStatus) => {
    userService.updateUserStatus(userId, newStatus, currentUserId || 'SYS-ADMIN-01');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Identity & Access Management
            </span>
            <span className="text-xs text-slate-400 font-mono">Multi-Role Persona Control</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" />
            Organisation User Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authorized users, role assignments, multi-role privileges, status enforcement, and MFA security.
          </p>
        </div>

        <button
          onClick={onOpenInviteModal}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow cursor-pointer transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite New User</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search name, email, user ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        >
          <option value="ALL">All Account Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="LOCKED">LOCKED</option>
          <option value="DEACTIVATED">DEACTIVATED</option>
        </select>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-white dark:bg-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        >
          <option value="ALL">All Roles</option>
          <option value="Project Sponsor">Project Sponsor</option>
          <option value="Project Manager">Project Manager</option>
          <option value="Finance Officer">Finance Officer</option>
          <option value="Compliance Officer">Compliance Officer</option>
          <option value="Shariah Advisor">Shariah Advisor</option>
          <option value="Institutional Investor">Institutional Investor</option>
          <option value="Asset Manager">Asset Manager</option>
        </select>

        <select
          value={mfaFilter}
          onChange={e => setMfaFilter(e.target.value)}
          className="bg-white dark:bg-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        >
          <option value="ALL">All MFA States</option>
          <option value="ENABLED">MFA Enabled</option>
          <option value="DISABLED">MFA Disabled</option>
        </select>
      </div>

      {/* Table View */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                <th className="p-4">User Info</th>
                <th className="p-4">Organisation</th>
                <th className="p-4">Assigned Roles</th>
                <th className="p-4">MFA</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredUsers.map(u => {
                const userId = u.userId || (u as any).id;
                const fullName = u.fullName || (u as any).name;
                const photo = u.profilePhoto || (u as any).avatarUrl;
                const rolesCount = u.assignedRoles.length;

                return (
                  <tr key={userId} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectUser(u)}>
                        <img src={photo} alt={fullName} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white block hover:text-purple-600 transition-colors">
                            {fullName}
                          </span>
                          <span className="text-[10px] text-slate-400">{u.email} • {u.jobTitle || 'Team Member'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                      <span className="font-bold block text-slate-800 dark:text-slate-200">{u.organisationId}</span>
                      <span className="text-[10px] text-slate-400">{u.countryNodeId}</span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 items-center">
                        {u.assignedRoles.map(r => (
                          <span key={r} className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                            {r}
                          </span>
                        ))}
                        {rolesCount > 1 && (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {rolesCount} Active Roles
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.mfaEnabled || u.mfaStatus === 'Enforced' || u.mfaStatus === 'Enabled'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {u.mfaEnabled ? 'Enabled' : u.mfaStatus}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                        u.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => onOpenRoleAssignmentModal(u)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] cursor-pointer"
                        title="Manage Role Assignment"
                      >
                        Manage Roles
                      </button>

                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleStatusChange(userId, 'SUSPENDED')}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-bold text-[10px] cursor-pointer"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(userId, 'ACTIVE')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold text-[10px] cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                    </td>
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
