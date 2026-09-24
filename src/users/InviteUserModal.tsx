import React, { useState } from 'react';
import { UserPlus, X, Check } from 'lucide-react';
import { UserInvitationPayload } from './userTypes';
import { userService } from './userService';
import { organisationService } from '../organisations/organisationService';
import { countryNodeService } from '../countryNodes/countryNodeService';
import { useRBAC } from '../rbac/RBACContext';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvited: () => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  onInvited
}) => {
  const { currentUserId, currentRole, currentOrgId, currentCountryNode } = useRBAC();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Treasury & Capital Markets');
  const [jobTitle, setJobTitle] = useState('Senior Investment Lead');
  const [role, setRole] = useState('Project Sponsor');
  const [organisationId, setOrganisationId] = useState(currentOrgId || 'ORG-FELDA-MYS');
  const [countryNodeId, setCountryNodeId] = useState(currentCountryNode || 'CN-MYS');

  const orgs = organisationService.getAllOrganisations();
  const nodes = countryNodeService.getAllCountryNodes();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    const payload: UserInvitationPayload = {
      fullName,
      email,
      phone,
      department,
      jobTitle,
      role,
      organisationId,
      countryNodeId
    };

    userService.inviteUser(payload, currentUserId || 'SYS-ADMIN-01');
    onInvited();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Invite Organisation Personnel</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Zulkifli Ahmad"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="user@organisation.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <input
                type="text"
                placeholder="e.g. Finance & Treasury"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Job Title</label>
              <input
                type="text"
                placeholder="e.g. Project Lead"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Access Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-purple-600"
            >
              <option value="Project Sponsor">Project Sponsor / Delivery Partner</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Finance Officer">Finance Officer</option>
              <option value="Compliance Officer">Compliance Officer</option>
              <option value="Shariah Advisor">Shariah Advisor</option>
              <option value="Institutional Investor">Institutional Investor</option>
              <option value="Asset Manager">Asset Manager</option>
              <option value="Organization Admin">Organization Admin</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Organisation</label>
              <select
                value={organisationId}
                onChange={e => setOrganisationId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {orgs.map(o => (
                  <option key={o.organisationId || (o as any).id} value={o.organisationId || (o as any).id}>
                    {o.legalName || (o as any).name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Country Node</label>
              <select
                value={countryNodeId}
                onChange={e => setCountryNodeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {nodes.map(n => (
                  <option key={n.countryNodeId} value={n.countryNodeId}>
                    {n.countryName}
                  </option>
                ))}
              </select>
            </div>
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
              <span>Send Invitation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
