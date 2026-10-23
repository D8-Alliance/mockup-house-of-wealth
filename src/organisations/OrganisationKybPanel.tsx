import React, { useEffect, useState } from 'react';
import { BadgeCheck, Building2, ChevronDown, ChevronUp, Download, Trash2, Upload } from 'lucide-react';
import { apiClient, apiErrorMessage, OrganisationKyb, OrganisationKybDocumentType } from '../services/apiClient';
import { formatDateTimeWithZone } from '../utils/platformTime';
import { KYB_DOCUMENT_LABELS, KYB_STATUS } from './organisationKybLabels';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm';

/**
 * The organisation's registration details and business verification (KYB), kept by its own members.
 * Agreements take the registration number and address for their cover page; signing can require KYB.
 */
export const OrganisationKybPanel: React.FC = () => {
  const [kyb, setKyb] = useState<OrganisationKyb | null>(null);
  const [open, setOpen] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [documentType, setDocumentType] = useState<OrganisationKybDocumentType>('SSM_PROFILE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = (value: OrganisationKyb) => {
    setKyb(value);
    setRegistrationNumber(value.registrationNumber ?? '');
    setRegisteredAddress(value.registeredAddress ?? '');
  };
  useEffect(() => { apiClient.getMyOrganisationKyb().then((value) => { show(value); setOpen(value.kybStatus !== 'APPROVED'); }).catch(() => setKyb(null)); }, []);
  if (!kyb) return null;

  const run = async (action: () => Promise<OrganisationKyb>) => {
    setBusy(true);
    setError(null);
    try { show(await action()); } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(false); }
  };
  const status = KYB_STATUS[kyb.kybStatus] ?? KYB_STATUS.NOT_SUBMITTED;
  const detailsChanged = registrationNumber.trim() !== (kyb.registrationNumber ?? '') || registeredAddress.trim() !== (kyb.registeredAddress ?? '');

  return (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 text-xs">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3 cursor-pointer">
        <span className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white"><Building2 className="w-4 h-4 text-emerald-600" />Organisation verification (KYB): {kyb.name}</span>
        <span className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>{open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</span>
      </button>
      {!open ? null : (
        <div className="space-y-3">
          <p className="text-slate-500">Your registration number and registered address appear on the cover page of your agreements. Verification lets your organisation sign agreements where verification is required.</p>
          {kyb.kybNote && kyb.kybStatus !== 'SUBMITTED' && <p className={`p-3 rounded-xl ${kyb.kybStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}><strong>Reviewer:</strong> {kyb.kybNote}</p>}
          {kyb.kybStatus === 'APPROVED' && <p className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300"><BadgeCheck className="w-4 h-4" />Verified {kyb.kybReviewedAt ? formatDateTimeWithZone(kyb.kybReviewedAt) : ''}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="font-bold text-slate-600 dark:text-slate-300">Company registration number (SSM)
              <input value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} disabled={!kyb.canEdit} placeholder="e.g. 201901012345 (1234567-A)" className={`${INPUT} mt-1 font-normal`} />
            </label>
            <label className="font-bold text-slate-600 dark:text-slate-300">Registered address
              <textarea value={registeredAddress} onChange={(event) => setRegisteredAddress(event.target.value)} disabled={!kyb.canEdit} rows={2} placeholder="As in the SSM company profile" className={`${INPUT} mt-1 font-normal`} />
            </label>
          </div>
          {kyb.canEdit && detailsChanged && <button type="button" disabled={busy} onClick={() => void run(() => apiClient.saveOrganisationDetails({ registrationNumber, registeredAddress }))} className="px-4 py-2 rounded-xl border border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold cursor-pointer disabled:opacity-50">Save details</button>}

          <div className="space-y-1.5">
            <p className="font-bold text-slate-600 dark:text-slate-300">Documents</p>
            {kyb.kybDocuments.length === 0 && <p className="text-slate-400">None yet. The SSM company profile is required.</p>}
            {kyb.kybDocuments.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <span><strong>{KYB_DOCUMENT_LABELS[document.documentType]}</strong> · {document.fileName}</span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => void apiClient.downloadOrganisationKybDocument(kyb.id, document.id)} className="text-slate-500 hover:text-emerald-600 cursor-pointer" title="Download"><Download className="w-3.5 h-3.5" /></button>
                  {kyb.canEdit && <button type="button" disabled={busy} onClick={() => void run(() => apiClient.removeOrganisationKybDocument(document.id))} className="text-slate-500 hover:text-rose-600 cursor-pointer" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>}
                </span>
              </div>
            ))}
            {kyb.canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <select value={documentType} onChange={(event) => setDocumentType(event.target.value as OrganisationKybDocumentType)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  {(Object.keys(KYB_DOCUMENT_LABELS) as OrganisationKybDocumentType[]).map((type) => <option key={type} value={type}>{KYB_DOCUMENT_LABELS[type]}</option>)}
                </select>
                <label className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />Upload PDF, JPG or PNG
                  <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run(() => apiClient.uploadOrganisationKybDocument(documentType, file)); }} />
                </label>
              </div>
            )}
          </div>

          {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 font-bold">{error}</p>}
          {kyb.canEdit && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-slate-500">{kyb.missing.length ? `Still needed: ${kyb.missing.map((item) => (item === 'registrationNumber' ? 'registration number' : item === 'registeredAddress' ? 'registered address' : KYB_DOCUMENT_LABELS[item as OrganisationKybDocumentType] ?? item)).join(', ')}` : 'Ready to submit.'}</span>
              <button type="button" disabled={busy || kyb.missing.length > 0 || detailsChanged} onClick={() => void run(() => apiClient.submitOrganisationKyb())} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50">{kyb.kybStatus === 'NOT_SUBMITTED' ? 'Submit for verification' : 'Submit again'}</button>
            </div>
          )}
          {kyb.kybStatus === 'SUBMITTED' && <p className="text-slate-500">Submitted {kyb.kybSubmittedAt ? formatDateTimeWithZone(kyb.kybSubmittedAt) : ''}. A KYB reviewer of your country will check it; you are notified of the decision.</p>}
        </div>
      )}
    </section>
  );
};
