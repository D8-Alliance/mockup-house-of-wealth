import React, { useState } from 'react';
import { AppUser } from './userTypes';
import { Shield, X, Check, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useRBAC } from '../rbac/RBACContext';
import { apiClient } from '../services/apiClient';

interface RoleAssignmentModalProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const AVAILABLE_ROLES = [
  'Project Sponsor',
  'Project Manager',
  'Finance Officer',
  'Compliance Officer',
  'Shariah Advisor',
  'Shariah Reviewer',
  'Institutional Investor',
  'Asset Manager',
  'Asset Owner',
  'Organization Admin',
  'Country Admin',
  'Super Admin'
];

export const RoleAssignmentModal: React.FC<RoleAssignmentModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdated
}) => {
  const { currentOrgId, currentCountryNode } = useRBAC();
  const [selectedPrimary, setSelectedPrimary] = useState<string>(user?.primaryRole || 'Project Sponsor');
  const [assignedRoles, setAssignedRoles] = useState<string[]>(user?.assignedRoles || ['Project Sponsor']);
  const [reason, setReason] = useState('');

  if (!isOpen || !user) return null;

  const handleToggleRole = (role: string) => {
    if (assignedRoles.includes(role)) {
      if (assignedRoles.length === 1) return; // Must have at least one
      const updated = assignedRoles.filter(r => r !== role);
      setAssignedRoles(updated);
      if (selectedPrimary === role) {
        setSelectedPrimary(updated[0]);
      }
    } else {
      setAssignedRoles([...assignedRoles, role]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    const userId = user.userId || (user as any).id;
    const organisationId = user.organisationId || currentOrgId;
    const countryNodeId = user.countryNodeId || currentCountryNode;
    try {
      const currentRoles = user.assignedRoles || [];
      await Promise.all([
        ...assignedRoles
          .filter(role => !currentRoles.includes(role))
          .map(role => apiClient.assignRole(userId, role, organisationId, countryNodeId)),
        ...currentRoles
          .filter(role => !assignedRoles.includes(role))
          .map(role => apiClient.revokeRole(userId, role, organisationId, countryNodeId)),
      ]);
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Role assignment failed', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Role & Privilege Management</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
          <span className="font-extrabold text-slate-900 dark:text-white block">{user.fullName || (user as any).name}</span>
          <span className="text-slate-400">{user.email} • Org: {user.organisationId}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Assign Active Roles (Multi-Role Privileges)</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
              {AVAILABLE_ROLES.map(r => {
                const isAssigned = assignedRoles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleToggleRole(r)}
                    className={`p-2 rounded-xl text-left font-bold flex items-center justify-between border cursor-pointer transition-all ${
                      isAssigned
                        ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="truncate">{r}</span>
                    {isAssigned && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Role Persona</label>
            <select
              value={selectedPrimary}
              onChange={e => setSelectedPrimary(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
            >
              {assignedRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Audit Justification & Reason</label>
            <textarea
              required
              rows={2}
              placeholder="State clear operational reason for role modification..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save & Log Audit Event</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
