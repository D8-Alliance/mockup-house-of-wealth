import React, { useState } from 'react';
import { ShieldCheck, X, Check, AlertTriangle, FileText, MessageSquare } from 'lucide-react';
import { Organisation, OrganisationVerificationStatus } from './organisationTypes';
import { organisationService } from './organisationService';
import { useRBAC } from '../rbac/RBACContext';

interface OrganisationVerificationModalProps {
  organisation: Organisation | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const OrganisationVerificationModal: React.FC<OrganisationVerificationModalProps> = ({
  organisation,
  isOpen,
  onClose,
  onUpdated
}) => {
  const { currentUserId } = useRBAC();
  const [comment, setComment] = useState('');
  const [verificationAction, setVerificationAction] = useState<OrganisationVerificationStatus>('VERIFIED');

  if (!isOpen || !organisation) return null;

  const handleAction = (status: OrganisationVerificationStatus) => {
    organisationService.updateVerificationStatus(
      organisation.organisationId || (organisation as any).id,
      status,
      currentUserId || 'SYS-ADMIN-01',
      comment || `KYB Review status changed to ${status}.`
    );
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">KYB Verification Review</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                {organisation.legalName || (organisation as any).name}
              </h4>
              <p className="text-slate-500">{organisation.organisationType || (organisation as any).type} • Reg: {organisation.registrationNumber}</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">
              {organisation.verificationStatus}
            </span>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <label className="block font-bold text-slate-700 dark:text-slate-300">Reviewer Notes & Justification</label>
          <textarea
            rows={3}
            placeholder="Add comments regarding statutory registration checks, corporate identity, or required documents..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
          <button
            onClick={() => handleAction('VERIFIED')}
            className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Approve & Verify</span>
          </button>

          <button
            onClick={() => handleAction('UNDER_REVIEW')}
            className="px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center justify-center gap-1 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Request Info</span>
          </button>

          <button
            onClick={() => handleAction('REJECTED')}
            className="px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center justify-center gap-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Reject</span>
          </button>
        </div>
      </div>
    </div>
  );
};
