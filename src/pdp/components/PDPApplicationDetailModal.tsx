import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  FileText, 
  CreditCard, 
  MessageSquare, 
  Send, 
  Download, 
  ExternalLink,
  Lock,
  RotateCcw,
  Check
} from 'lucide-react';
import { PDPApplication, PDPApplicationStatus } from '../pdpTypes';
import { pdpService } from '../pdpService';
import { useRBAC } from '../../rbac/RBACContext';

interface PDPApplicationDetailModalProps {
  application: PDPApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const PDPApplicationDetailModal: React.FC<PDPApplicationDetailModalProps> = ({
  application,
  isOpen,
  onClose,
  onRefresh
}) => {
  const { currentUserId, currentRole } = useRBAC();
  const [activeTab, setActiveTab] = useState<'entity' | 'rep' | 'ubos' | 'docs' | 'bank' | 'compliance' | 'history'>('entity');
  
  // Decision Form States
  const [decisionModal, setDecisionModal] = useState<'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'SUSPEND' | 'REACTIVATE' | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [selectedFlaggedDocs, setSelectedFlaggedDocs] = useState<string[]>([]);

  if (!isOpen || !application) return null;

  const handleApprove = () => {
    pdpService.approveApplication(application.id, currentUserId || 'COMP-ADMIN-01', currentRole, decisionComment || 'All KYB and AAOIFI criteria verified');
    setDecisionModal(null);
    if (onRefresh) onRefresh();
    onClose();
  };

  const handleReject = () => {
    if (!decisionComment) return;
    pdpService.rejectApplication(application.id, currentUserId || 'COMP-ADMIN-01', currentRole, decisionComment);
    setDecisionModal(null);
    if (onRefresh) onRefresh();
    onClose();
  };

  const handleRequestInfo = () => {
    if (!decisionComment) return;
    pdpService.requestAdditionalInfo(application.id, currentUserId || 'COMP-ADMIN-01', currentRole, decisionComment, selectedFlaggedDocs);
    setDecisionModal(null);
    if (onRefresh) onRefresh();
    onClose();
  };

  const handleSuspend = () => {
    if (!decisionComment) return;
    pdpService.suspendPDP(application.id, currentUserId || 'ADMIN-01', currentRole, decisionComment);
    setDecisionModal(null);
    if (onRefresh) onRefresh();
    onClose();
  };

  const handleReactivate = () => {
    pdpService.reactivatePDP(application.id, currentUserId || 'ADMIN-01', currentRole, decisionComment || 'Account compliance rectified');
    setDecisionModal(null);
    if (onRefresh) onRefresh();
    onClose();
  };

  const isComplianceOrAdmin = currentRole.includes('Admin') || currentRole.includes('Compliance') || currentRole.includes('Risk') || currentRole.includes('Auditor');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 relative my-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400 font-bold">{application.applicationNumber}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  application.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                  application.status === 'UNDER_REVIEW' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                  application.status === 'ADDITIONAL_INFORMATION_REQUIRED' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' :
                  application.status === 'REJECTED' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                  'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                }`}>
                  {application.status}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {application.countryName} ({application.countryCode})
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {application.organisationName || 'Draft PDP Application'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800 text-xs font-bold scrollbar-thin">
          <button
            onClick={() => setActiveTab('entity')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'entity' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Organisation Profile
          </button>
          <button
            onClick={() => setActiveTab('rep')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'rep' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Authorised Rep
          </button>
          <button
            onClick={() => setActiveTab('ubos')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'ubos' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Beneficial Owners ({application.beneficialOwners?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'docs' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Documents ({application.documents?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'bank' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Settlement Account
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'compliance' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Declarations
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'history' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Audit Trail ({application.statusHistory?.length || 0})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="min-h-[280px] text-xs">
          {activeTab === 'entity' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 font-bold block">Legal Name</span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">{application.organisationName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Trading / Brand Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{application.tradingName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Registration Number</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{application.registrationNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Entity Type</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{application.pdpType}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Business Category</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{application.businessCategory}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Tax ID Number</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{application.taxIdentificationNumber}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-bold block">Registered Address</span>
                <span className="text-slate-700 dark:text-slate-300">{application.registeredAddress}</span>
              </div>
            </div>
          )}

          {activeTab === 'rep' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 font-bold block">Full Name</span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">{application.representative?.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Position / Title</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{application.representative?.position}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Nationality</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{application.representative?.nationality}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">ID / Passport Number</span>
                <span className="font-mono font-bold text-purple-600">{application.representative?.idPassportNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Corporate Email</span>
                <span className="text-slate-800 dark:text-slate-200">{application.representative?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Mobile Phone</span>
                <span className="text-slate-800 dark:text-slate-200">{application.representative?.mobile}</span>
              </div>
            </div>
          )}

          {activeTab === 'ubos' && (
            <div className="space-y-3">
              {application.beneficialOwners?.map((ubo, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h5 className="font-extrabold text-slate-900 dark:text-white">{ubo.fullName}</h5>
                    <p className="text-[11px] text-slate-500">
                      ID: {ubo.idNumber} • Nationality: {ubo.nationality}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-purple-600 dark:text-purple-400">{ubo.ownershipPercentage}% Equity</span>
                    <div className="flex gap-1 mt-0.5 justify-end">
                      {ubo.isDirector && <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-200 dark:bg-slate-700">Director</span>}
                      {ubo.isAuthorisedSignatory && <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-600">Signatory</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-2.5">
              {application.documents?.map((doc, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <div>
                      <h5 className="font-bold text-slate-900 dark:text-white">{doc.title}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">{doc.documentType} • {doc.fileSize} • Uploaded {doc.uploadedAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      doc.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-600' :
                      doc.status === 'CORRECTION_REQUESTED' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {doc.status}
                    </span>
                    <button className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 font-bold block">Bank Name</span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">{application.bankInfo?.bankName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Account Holder Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{application.bankInfo?.accountHolderName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Account Number</span>
                <span className="font-mono font-bold text-purple-600">{application.bankInfo?.accountNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">SWIFT / BIC Code</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{application.bankInfo?.swiftBicCode}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Settlement Method</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{application.bankInfo?.settlementMethod}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Settlement Currency</span>
                <span className="font-bold text-purple-600">{application.bankInfo?.currency}</span>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>AML / CFT Statutory Compliance Declaration: Active</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Legitimate Source of Capital & Assets Certified</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>AAOIFI Shariah Governance Non-Interest Compliance Certified</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Global Sanctions (OFAC / UN) Negative List Clearance Attested</span>
              </div>
              {application.compliance?.declaredAt && (
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                  Digitally signed on {application.compliance.declaredAt} via IP {application.compliance.declaredByIp || '175.139.221.45'}
                </p>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {application.statusHistory?.map((h, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-purple-600 dark:text-purple-400">{h.previousStatus} → {h.newStatus}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{h.timestamp}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{h.reason}</p>
                  <span className="text-[10px] text-slate-500 block">Actor: {h.changedByUserId} ({h.changedByRole})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls for Admin / Compliance */}
        {isComplianceOrAdmin && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {application.status !== 'ACTIVE' && (
                <button
                  onClick={() => setDecisionModal('APPROVE')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Activate PDP</span>
                </button>
              )}

              {application.status !== 'REJECTED' && (
                <button
                  onClick={() => setDecisionModal('REJECT')}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Application</span>
                </button>
              )}

              <button
                onClick={() => setDecisionModal('REQUEST_INFO')}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Request Additional Info</span>
              </button>

              {application.status === 'ACTIVE' && (
                <button
                  onClick={() => setDecisionModal('SUSPEND')}
                  className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Lock className="w-4 h-4" />
                  <span>Suspend Account</span>
                </button>
              )}

              {application.status === 'SUSPENDED' && (
                <button
                  onClick={() => setDecisionModal('REACTIVATE')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reactivate Account</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        )}

        {/* Decision Modal Dialog */}
        {decisionModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                {decisionModal === 'APPROVE' && 'Confirm PDP Approval & Activation'}
                {decisionModal === 'REJECT' && 'Reject PDP Application'}
                {decisionModal === 'REQUEST_INFO' && 'Request Additional Information / Re-upload'}
                {decisionModal === 'SUSPEND' && 'Suspend PDP Portal Access'}
                {decisionModal === 'REACTIVATE' && 'Reactivate PDP Account'}
              </h4>

              <div className="space-y-2 text-xs">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  {decisionModal === 'APPROVE' ? 'Approval Audit Note (Optional)' : 'Reviewer Note / Reason *'}
                </label>
                <textarea
                  rows={3}
                  required={decisionModal !== 'APPROVE'}
                  placeholder="Provide detailed compliance audit findings or requested documents..."
                  value={decisionComment}
                  onChange={e => setDecisionComment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>

                {decisionModal === 'APPROVE' && (
                  <button onClick={handleApprove} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs">
                    Confirm Approval
                  </button>
                )}
                {decisionModal === 'REJECT' && (
                  <button onClick={handleReject} className="px-4 py-2 rounded-xl bg-red-600 text-white font-black text-xs">
                    Confirm Rejection
                  </button>
                )}
                {decisionModal === 'REQUEST_INFO' && (
                  <button onClick={handleRequestInfo} className="px-4 py-2 rounded-xl bg-amber-600 text-white font-black text-xs">
                    Send Request
                  </button>
                )}
                {decisionModal === 'SUSPEND' && (
                  <button onClick={handleSuspend} className="px-4 py-2 rounded-xl bg-slate-800 text-white font-black text-xs">
                    Suspend PDP
                  </button>
                )}
                {decisionModal === 'REACTIVATE' && (
                  <button onClick={handleReactivate} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs">
                    Reactivate PDP
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
