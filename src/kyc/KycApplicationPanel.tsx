import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileCheck, RefreshCw, ScanFace, Send, ShieldCheck, Upload } from 'lucide-react';
import { apiClient, apiErrorMessage, KycApplication, KycDocumentType, KycDraftInput, KycIdDocumentType, LivenessSession } from '../services/apiClient';
import { KycLivenessCapture } from './KycLivenessCapture';
import { formatDateTime } from '../utils/platformTime';
import { KYC_DOCUMENT_LABELS, KYC_ID_DOCUMENT_LABELS, KYC_LEVEL_LABELS, KYC_STATUS_LABELS, KYC_STATUS_STYLES, requiredKycDocuments } from './kycLabels';

interface KycApplicationPanelProps {
  application: KycApplication | null;
  loading: boolean;
  onChange: (application: KycApplication | null) => void;
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white disabled:opacity-60';

function toForm(application: KycApplication | null): Required<KycDraftInput> {
  return {
    fullName: application?.fullName ?? '',
    dateOfBirth: application?.dateOfBirth ? application.dateOfBirth.slice(0, 10) : '',
    nationality: application?.nationality ?? '',
    idDocumentType: (application?.idDocumentType || 'NATIONAL_ID') as KycIdDocumentType,
    idDocumentNumber: application?.idDocumentNumber ?? '',
    idDocumentExpiry: application?.idDocumentExpiry ? application.idDocumentExpiry.slice(0, 10) : '',
    residentialAddress: application?.residentialAddress ?? '',
  };
}

// Empty date inputs are omitted rather than sent as invalid dates.
const draftPayload = (form: Required<KycDraftInput>): KycDraftInput => ({ ...form, dateOfBirth: form.dateOfBirth || undefined, idDocumentExpiry: form.idDocumentExpiry || undefined });

/** Applicant view: fill in identity details, upload documents and submit for manual review. */
export const KycApplicationPanel: React.FC<KycApplicationPanelProps> = ({ application, loading, onChange }) => {
  const [form, setForm] = useState(() => toForm(application));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { setForm(toForm(application)); }, [application]);

  // Latest camera face verification (prototype); optional unless the server sets KYC_REQUIRE_LIVENESS.
  const [liveness, setLiveness] = useState<LivenessSession | null>(null);
  const [capturing, setCapturing] = useState(false);
  useEffect(() => {
    apiClient.getMyLiveness().then(setLiveness).catch(() => setLiveness(null));
  }, [application?.id]);

  const status = application?.status;
  const editable = !application || status === 'DRAFT' || status === 'RESUBMISSION_REQUIRED';
  const canStartNew = status === 'REJECTED';
  const required = requiredKycDocuments(form.idDocumentType);
  const uploaded = new Map((application?.documents ?? []).map((document) => [document.documentType, document]));

  const run = async (label: string, action: () => Promise<KycApplication | null>, success: string) => {
    setBusy(label);
    setError('');
    setNotice('');
    try {
      const result = await action();
      onChange(result);
      setNotice(success);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The request failed. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const saveDraft = () => run('save', () => apiClient.saveMyKycDraft(draftPayload(form)), 'Details saved.');

  const upload = (documentType: KycDocumentType, file: File | undefined) => {
    if (!file) return;
    void run(documentType, async () => {
      // Save first so the upload always lands on an existing, up-to-date draft.
      await apiClient.saveMyKycDraft(draftPayload(form));
      await apiClient.uploadMyKycDocument(documentType, file);
      return apiClient.getMyKyc();
    }, `${KYC_DOCUMENT_LABELS[documentType]} uploaded.`);
  };

  const submit = () => run('submit', async () => {
    await apiClient.saveMyKycDraft(draftPayload(form));
    return apiClient.submitMyKyc();
  }, 'Submitted. A KYC officer will review your application.');

  const startNew = () => run('new', () => apiClient.saveMyKycDraft({}), 'A new application has been started.');

  if (loading) {
    return <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 text-sm text-slate-500">Loading KYC status...</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Identity Verification (KYC)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Your details and documents are reviewed manually by a KYC officer in your country.</p>
        </div>
        <div className="flex items-center gap-2">
          {application && <span className="text-[11px] font-mono text-slate-400">{application.applicationNumber}</span>}
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${status ? KYC_STATUS_STYLES[status] : KYC_STATUS_STYLES.DRAFT}`}>
            {status ? KYC_STATUS_LABELS[status] : 'Not started'}
            {status === 'APPROVED' && application?.kycLevel ? ` · ${KYC_LEVEL_LABELS[application.kycLevel]}` : ''}
          </span>
        </div>
      </div>

      {application?.reviewComment && (status === 'RESUBMISSION_REQUIRED' || status === 'REJECTED') && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <div><span className="font-bold">Reviewer comment:</span> {application.reviewComment}</div>
        </div>
      )}
      {status === 'SUBMITTED' && <p className="text-xs text-slate-500">Your application is under review and cannot be changed until the officer decides.</p>}
      {error && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">{error}</div>}
      {notice && <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{notice}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>Full name (as on your ID)</span>
          <input className={inputClass} value={form.fullName} disabled={!editable} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
        </label>
        <label className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>Date of birth</span>
          <input type="date" className={inputClass} value={form.dateOfBirth} disabled={!editable} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
        </label>
        <label className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>Nationality</span>
          <input className={inputClass} value={form.nationality} disabled={!editable} onChange={(event) => setForm({ ...form, nationality: event.target.value })} />
        </label>
        <label className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>Identity document</span>
          <select className={inputClass} value={form.idDocumentType} disabled={!editable} onChange={(event) => setForm({ ...form, idDocumentType: event.target.value as KycIdDocumentType })}>
            {(Object.keys(KYC_ID_DOCUMENT_LABELS) as KycIdDocumentType[]).map((type) => <option key={type} value={type}>{KYC_ID_DOCUMENT_LABELS[type]}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>Document number</span>
          <input className={inputClass} value={form.idDocumentNumber} disabled={!editable} onChange={(event) => setForm({ ...form, idDocumentNumber: event.target.value })} />
        </label>
        <label className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>Document expiry date</span>
          <input type="date" className={inputClass} value={form.idDocumentExpiry} disabled={!editable} onChange={(event) => setForm({ ...form, idDocumentExpiry: event.target.value })} />
        </label>
        <label className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 md:col-span-2">
          <span>Residential address</span>
          <textarea rows={2} className={inputClass} value={form.residentialAddress} disabled={!editable} onChange={(event) => setForm({ ...form, residentialAddress: event.target.value })} />
        </label>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2"><FileCheck className="w-4 h-4 text-emerald-500" />Documents (JPG, PNG or PDF, max 10 MB)</h4>
        {required.map((documentType) => {
          const document = uploaded.get(documentType);
          return (
            <div key={documentType} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-100">{KYC_DOCUMENT_LABELS[documentType]}</div>
                {document
                  ? <button type="button" className="text-emerald-600 hover:underline cursor-pointer" onClick={() => void apiClient.downloadMyKycDocument(document.id).catch((cause) => setError(apiErrorMessage(cause, 'File is unavailable.')))}>{document.fileName}</button>
                  : <span className="text-slate-400">Not uploaded</span>}
              </div>
              {editable && (
                <label className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer ${document ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-emerald-600 text-white'}`}>
                  {busy === documentType ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{document ? 'Replace' : 'Upload'}</span>
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" disabled={busy !== null} onChange={(event) => { upload(documentType, event.target.files?.[0]); event.target.value = ''; }} />
                </label>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2"><ScanFace className="w-4 h-4 text-purple-500" />Face verification (camera)</h4>
        {!capturing && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              {liveness?.status === 'PASSED'
                ? <span className="font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Completed {formatDateTime(liveness.completedAt)}</span>
                : liveness && liveness.status !== 'IN_PROGRESS'
                  ? <span className="font-bold text-rose-600">Not completed ({liveness.status.toLowerCase()}). Please try again.</span>
                  : <span className="text-slate-500">Confirms you are a real person and match the photo on your ID card. Takes about a minute.</span>}
            </div>
            {editable && application && (
              <button type="button" onClick={() => setCapturing(true)} className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0">
                <ScanFace className="w-3.5 h-3.5" />{liveness?.status === 'PASSED' ? 'Redo' : 'Start face verification'}
              </button>
            )}
          </div>
        )}
        {capturing && (
          <KycLivenessCapture
            onFinished={(session) => { setLiveness(session); void apiClient.getMyKyc().then(onChange).catch(() => undefined); }}
            onCancel={() => { setCapturing(false); void apiClient.getMyLiveness().then(setLiveness).catch(() => undefined); }}
          />
        )}
      </div>

      {editable && application?.missing && application.missing.length > 0 && (
        <p className="text-[11px] text-slate-500">Still needed before you can submit: {application.missing.join(', ')}.</p>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        {editable && (
          <>
            <button type="button" disabled={busy !== null} onClick={() => void saveDraft()} className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer disabled:opacity-50">
              {busy === 'save' ? 'Saving...' : 'Save details'}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => void submit()} className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <Send className="w-3.5 h-3.5" />
              {busy === 'submit' ? 'Submitting...' : status === 'RESUBMISSION_REQUIRED' ? 'Resubmit for review' : 'Submit for review'}
            </button>
          </>
        )}
        {canStartNew && (
          <button type="button" disabled={busy !== null} onClick={() => void startNew()} className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Start a new application</button>
        )}
      </div>
    </div>
  );
};
