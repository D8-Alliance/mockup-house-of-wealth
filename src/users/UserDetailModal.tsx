import React from 'react';
import { AppUser } from './userTypes';
import { X, Shield, Key, History, Mail, Phone, Building2, UserCheck, CheckCircle2 } from 'lucide-react';
import { auditLogger } from '../audit/auditLogger';

interface UserDetailModalProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  isOpen,
  onClose
}) => {
  if (!isOpen || !user) return null;

  const userId = user.userId || (user as any).id;
  const fullName = user.fullName || (user as any).name;
  const photo = user.profilePhoto || (user as any).avatarUrl;
  const userAuditEvents = auditLogger.filterEvents({ userId });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">User Profile & Access Record</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
          <img src={photo} alt={fullName} className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/30" />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{fullName}</h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600">
                {user.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">{user.email} • {user.jobTitle || 'Personnel'}</p>
            <p className="text-[10px] font-mono text-purple-600 dark:text-purple-400 mt-0.5">
              ID: {userId} • Org: {user.organisationId} ({user.countryNodeId})
            </p>
          </div>
        </div>

        {/* Assigned Roles */}
        <div className="space-y-2 text-xs">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider text-slate-400">
            Assigned Access Roles ({user.assignedRoles.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {user.assignedRoles.map(r => (
              <span key={r} className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 font-extrabold border border-purple-500/20">
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Role Assignment History */}
        <div className="space-y-2 text-xs">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
            <History className="w-3.5 h-3.5 text-purple-600" />
            <span>Role Audit & Assignment History</span>
          </h4>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {user.roleHistory && user.roleHistory.length > 0 ? (
              user.roleHistory.map(rh => (
                <div key={rh.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span>{rh.oldRole} → {rh.newRole}</span>
                    <span className="text-[10px] text-slate-400">{new Date(rh.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">{rh.reason}</p>
                  <p className="text-[9px] text-slate-400 font-mono">By: {rh.performedBy}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-400 italic text-[11px]">No previous role changes recorded.</p>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
