import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { apiClient, apiErrorMessage, KycApplication, KycDecision, KycLevel, KycQueueItem, KycReviewableStatus } from '../services/apiClient';
import { KYC_DOCUMENT_LABELS, KYC_ID_DOCUMENT_LABELS, KYC_LEVEL_LABELS, KYC_STATUS_LABELS, KYC_STATUS_STYLES } from './kycLabels';
import { KycChecksPanel } from './KycChecksPanel';

const FILTERS: KycReviewableStatus[] = ['SUBMITTED', 'RESUBMISSION_REQUIRED', 'APPROVED', 'REJECTED'];
const DECISIONS: Array<{ value: KycDecision; label: string }> = [
  { value: 'APPROVED', label: 'Approve' },
  { value: 'RESUBMISSION_REQUIRED', label: 'Request changes' },
  { value: 'REJECTED', label: 'Reject' },
];

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : '-');

/** KYC officer queue backed by /kyc/applications; decisions are recorded server-side with an audit trail. */
export const KycReviewQueue: React.FC = () => {
  const [filter, setFilter] = useState<KycReviewableStatus>('SUBMITTED');
  const [items, setItems] = useState<KycQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<KycApplication | null>(null);
  const [decision, setDecision] = useState<KycDecision>('APPROVED');
  const [kycLevel, setKycLevel] = useState<KycLevel>('LEVEL_1');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await apiClient.getKycQueue(filter));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Unable to load the KYC queue.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const open = async (id: string) => {
    setReviewError('');
    setComment('');
    setDecision('APPROVED');
    setKycLevel('LEVEL_1');
    try {
      setSelected(await apiClient.getKycApplicationForReview(id));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Unable to open the application.'));
    }
  };

  const submitReview = async () => {
    if (!selected) return;
    setSaving(true);
    setReviewError('');
    try {
      setSelected(await apiClient.reviewKycApplication(selected.id, { decision, comment, kycLevel: decision === 'APPROVED' ? kycLevel : undefined }));
      await load();
    } catch (cause) {
      setReviewError(apiErrorMessage(cause, 'The decision could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">KYC Individual Verification Queue</h3>
          <p className="text-xs text-slate-500">Manual review of identity documents submitted in your country node.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((status) => (
            <button key={status} type="button" onClick={() => setFilter(status)} className={`px-3 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${filter === status ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
              {KYC_STATUS_LABELS[status]}
            </button>
          ))}
          <button type="button" onClick={() => void load()} className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/60 font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60 text-[11px]">
              <th className="p-3.5">Ref ID</th>
              <th className="p-3.5">Full Name</th>
              <th className="p-3.5">Nationality</th>
              <th className="p-3.5">Document</th>
              <th className="p-3.5">Submitted</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-slate-400">No applications with status "{KYC_STATUS_LABELS[filter]}".</td></tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                <td className="p-3.5 font-bold font-mono text-purple-600">{item.applicationNumber}</td>
                <td className="p-3.5">
                  <div className="font-bold text-slate-900 dark:text-white">{item.fullName}</div>
                  <div className="text-slate-400">{item.userEmail}</div>
                </td>
                <td className="p-3.5 text-slate-600 dark:text-slate-300">{item.nationality}</td>
                <td className="p-3.5 text-slate-500">
                  {item.idDocumentType ? KYC_ID_DOCUMENT_LABELS[item.idDocumentType] : '-'} <span className="font-mono">{item.idDocumentNumberMasked}</span>
                  <div className="text-slate-400">{item.documentCount} file(s)</div>
                </td>
                <td className="p-3.5 text-slate-500">{formatDate(item.submittedAt)}</td>
                <td className="p-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${KYC_STATUS_STYLES[item.status]}`}>
                    {KYC_STATUS_LABELS[item.status]}{item.kycLevel ? ` · ${KYC_LEVEL_LABELS[item.kycLevel]}` : ''}
                  </span>
                </td>
                <td className="p-3.5 text-right">
                  <button type="button" onClick={() => void open(item.id)} className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-extrabold text-[11px] shadow cursor-pointer hover:bg-purple-500">
                    {item.status === 'SUBMITTED' ? 'Review' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-start gap-3">
              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">{selected.fullName}</h4>
                <p className="text-xs text-slate-500 font-mono">{selected.applicationNumber} · {selected.userEmail}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div><dt className="text-slate-400 font-bold">Date of birth</dt><dd className="text-slate-800 dark:text-slate-100">{selected.dateOfBirth ? selected.dateOfBirth.slice(0, 10) : '-'}</dd></div>
              <div><dt className="text-slate-400 font-bold">Nationality</dt><dd className="text-slate-800 dark:text-slate-100">{selected.nationality}</dd></div>
              <div><dt className="text-slate-400 font-bold">Identity document</dt><dd className="text-slate-800 dark:text-slate-100">{selected.idDocumentType ? KYC_ID_DOCUMENT_LABELS[selected.idDocumentType] : '-'} · <span className="font-mono">{selected.idDocumentNumber}</span></dd></div>
              <div><dt className="text-slate-400 font-bold">Document expiry</dt><dd className="text-slate-800 dark:text-slate-100">{selected.idDocumentExpiry ? selected.idDocumentExpiry.slice(0, 10) : '-'}</dd></div>
              <div><dt className="text-slate-400 font-bold">Status</dt><dd><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${KYC_STATUS_STYLES[selected.status]}`}>{KYC_STATUS_LABELS[selected.status]}</span></dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-400 font-bold">Residential address</dt><dd className="text-slate-800 dark:text-slate-100 whitespace-pre-line">{selected.residentialAddress}</dd></div>
            </dl>

            <KycChecksPanel application={selected} onUpdated={setSelected} />

            <div className="space-y-2">
              <h5 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Documents</h5>
              {selected.documents.map((document) => (
                <div key={document.id} className="flex justify-between items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100">{KYC_DOCUMENT_LABELS[document.documentType]}</div>
                    <div className="text-slate-400 font-mono text-[10px]" title="SHA-256 recorded at upload">SHA-256 {document.sha256.slice(0, 16)}...</div>
                  </div>
                  <button type="button" onClick={() => void apiClient.downloadKycDocumentForReview(selected.id, document.id).catch((cause) => setReviewError(apiErrorMessage(cause, 'File is unavailable.')))} className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer">Open</button>
                </div>
              ))}
            </div>

            {selected.reviews && selected.reviews.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Review history</h5>
                {selected.reviews.map((review) => (
                  <div key={review.id} className="text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <span className="font-bold">{DECISIONS.find((item) => item.value === review.decision)?.label}</span>
                    {review.kycLevel ? ` (${KYC_LEVEL_LABELS[review.kycLevel]})` : ''} · {review.reviewerRole} · {formatDate(review.createdAt)}
                    <div className="text-slate-500">{review.comment}</div>
                  </div>
                ))}
              </div>
            )}

            {selected.status === 'SUBMITTED' && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex flex-wrap gap-2">
                  {DECISIONS.map((item) => (
                    <button key={item.value} type="button" onClick={() => setDecision(item.value)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${decision === item.value ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{item.label}</button>
                  ))}
                  {decision === 'APPROVED' && (
                    <select value={kycLevel} onChange={(event) => setKycLevel(event.target.value as KycLevel)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs">
                      {(Object.keys(KYC_LEVEL_LABELS) as KycLevel[]).map((level) => <option key={level} value={level}>{KYC_LEVEL_LABELS[level]}</option>)}
                    </select>
                  )}
                </div>
                <textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Reason for the decision (required, shown to the applicant)" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" />
                {reviewError && <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">{reviewError}</div>}
                <div className="flex justify-end">
                  <button type="button" disabled={saving || comment.trim().length < 5} onClick={() => void submitReview()} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50">
                    {saving ? 'Saving...' : 'Record decision'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
