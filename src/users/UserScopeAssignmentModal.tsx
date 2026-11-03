import React, { useEffect, useState } from 'react';
import { Check, Globe, X } from 'lucide-react';
import { AppUser } from './userTypes';
import { apiClient, apiErrorMessage, OrganisationDirectoryRow } from '../services/apiClient';

interface UserScopeAssignmentModalProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

/**
 * Moves a person to another organisation. Their country is fixed at registration, so only active organisations of
 * that country are offered; all their roles move with them and the reason goes into the audit log.
 */
export const UserScopeAssignmentModal: React.FC<UserScopeAssignmentModalProps> = ({ user, isOpen, onClose, onUpdated }) => {
  const [organisations, setOrganisations] = useState<OrganisationDirectoryRow[]>([]);
  const [organisationId, setOrganisationId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    apiClient.getOrganisationDirectory().then(setOrganisations).catch(() => setOrganisations([]));
  }, [isOpen]);

  useEffect(() => {
    setOrganisationId('');
    setReason('');
    setError(null);
  }, [user]);

  if (!isOpen || !user) return null;
  const choices = organisations.filter((org) => org.countryNodeId === user.countryNodeId && org.status === 'ACTIVE' && org.id !== user.organisationId);
  const current = organisations.find((org) => org.id === user.organisationId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organisationId) return setError('Choose the new organisation.');
    if (reason.trim().length < 3) return setError('Give a reason; it is kept in the audit log.');
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.moveUserToOrganisation(user.userId, organisationId, reason.trim());
      onUpdated();
      onClose();
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The person could not be moved.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Assign Organisation</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-0.5">
          <span className="font-extrabold text-slate-900 dark:text-white block">{user.fullName}</span>
          <span className="text-slate-400 block">{user.email}</span>
          <span className="text-slate-500 block">Now: {current?.name ?? user.organisationId} · {user.countryNodeId}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Country Node</label>
            <input value={user.countryNodeId} disabled className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-500 font-mono" />
            <p className="text-[11px] text-slate-400 mt-1">A person's country is set when they register and does not change.</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">New organisation</label>
            <select value={organisationId} onChange={(event) => setOrganisationId(event.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white">
              <option value="">Select an organisation…</option>
              {choices.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
            {organisations.length > 0 && choices.length === 0 && <p className="text-[11px] text-amber-600 mt-1">No other active organisation in this country. Add one in Admin Center › Organisations.</p>}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason</label>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Joined the company as Project Manager" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white" />
          </div>

          <p className="text-[11px] text-slate-500">All of this person's roles move with them.</p>

          {error && <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 font-semibold text-red-700 dark:text-red-300">{error}</div>}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              <Check className="w-4 h-4" />
              <span>Save Assignment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
