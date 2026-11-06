import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { apiClient, apiErrorMessage, KycApplication, KycDecision, KycLevel, KycQueueItem, KycReviewableStatus } from '../../services/apiClient';
import { KYC_DOCUMENT_LABELS, KYC_ID_DOCUMENT_LABELS, KYC_LEVEL_LABELS, KYC_STATUS_LABELS, KYC_STATUS_STYLES } from '../../kyc/kycLabels';
import { KycChecksPanel } from '../../kyc/KycChecksPanel';
import { KycLivenessReviewPanel } from '../../kyc/KycLivenessReviewPanel';
import { useT } from '../i18n';

const FILTERS: KycReviewableStatus[] = ['SUBMITTED', 'RESUBMISSION_REQUIRED', 'APPROVED', 'REJECTED'];
const DECISIONS: Array<{ value: KycDecision; label: string }> = [
  { value: 'APPROVED', label: 'Approve' },
  { value: 'RESUBMISSION_REQUIRED', label: 'Ask for changes' },
  { value: 'REJECTED', label: 'Reject' },
];
const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4';
const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-sm text-slate-900 dark:text-white';

/** KYC officers and compliance decide identity applications from the phone: the same checks, safeguards and audit as the web queue. */
export const MobileKycReview: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { t, serverText } = useT();
  const [filter, setFilter] = useState<KycReviewableStatus>('SUBMITTED');
  const [items, setItems] = useState<KycQueueItem[] | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const load = useCallback(() => {
    setError('');
    setItems(null);
    apiClient.getKycQueue(filter).then(setItems).catch((cause) => { setItems([]); setError(apiErrorMessage(cause, t('The KYC queue could not be loaded.'))); });
  }, [filter, t]);
  useEffect(load, [load]);

  if (openId) return <KycReviewDetail id={openId} onBack={() => { setOpenId(null); load(); }} />;

  return (
    <div className="space-y-4">
      {onBack && <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Back')}</button>}
      <div>
        <h1 className="text-lg font-black">{t('Identity reviews (KYC)')}</h1>
        <p className="text-xs text-slate-500">{t('Applications in your country. Your decision is recorded with your name.')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2" role="tablist">
        {FILTERS.map(status => <button key={status} type="button" role="tab" aria-selected={filter === status} onClick={() => setFilter(status)} className={`py-2 px-1 rounded-xl text-xs font-black border ${filter === status ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>{t(KYC_STATUS_LABELS[status])}</button>)}
      </div>
      <button type="button" onClick={load} className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400"><RefreshCw className="w-3.5 h-3.5" />{t('Refresh')}</button>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{serverText(error)}</p>}
      {!items && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {items?.length === 0 && !error && <p className="text-xs text-slate-500">{t('No application here.')}</p>}
      {items?.map(item => (
        <button key={item.id} type="button" onClick={() => setOpenId(item.id)} className={`${card} w-full text-left flex items-center gap-3`}>
          <span className="min-w-0 flex-1 space-y-1">
            <span className="block text-sm font-black">{item.fullName}</span>
            <span className="block text-[11px] text-slate-500 break-all">{item.userEmail} · <span className="font-mono">{item.applicationNumber}</span></span>
            <span className="block text-[11px] text-slate-500">{item.nationality} · {item.idDocumentType ? t(KYC_ID_DOCUMENT_LABELS[item.idDocumentType]) : '-'} <span className="font-mono">{item.idDocumentNumberMasked}</span> · {t('{count} file(s)', { count: item.documentCount })}</span>
            {(item.checkRecommendation === 'ATTENTION' || item.checkRecommendation === 'ADVERSE') && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${item.checkRecommendation === 'ADVERSE' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}><AlertTriangle className="w-3 h-3" />{item.checkRecommendation === 'ADVERSE' ? t('Failed check') : t('Check issues')}</span>
            )}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      ))}
    </div>
  );
};

const KycReviewDetail: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const { t, serverText } = useT();
  const [application, setApplication] = useState<KycApplication | null>(null);
  const [error, setError] = useState('');
  const [decision, setDecision] = useState<KycDecision>('APPROVED');
  const [kycLevel, setKycLevel] = useState<KycLevel>('LEVEL_1');
  const [comment, setComment] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { apiClient.getKycApplicationForReview(id).then(setApplication).catch((cause) => setError(apiErrorMessage(cause, t('The application could not be opened.')))); }, [id, t]);

  const back = <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Identity reviews (KYC)')}</button>;
  const problem = error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{serverText(error)}</p>;
  if (!application) return <div className="space-y-4">{back}{problem || <p className="text-sm text-slate-500">{t('Loading...')}</p>}</div>;

  // Approval safeguards, as on the web queue and in KycService.assertApprovable on the server.
  const latestRound = (application.checks ?? []).reduce((max, check) => Math.max(max, check.round), 0);
  const latest = (application.checks ?? []).filter(check => check.round === latestRound && !check.shadow);
  const failed = latest.filter(check => check.status === 'FAIL');
  const needsOverride = failed.length > 0 || application.checkRecommendation === 'ADVERSE';
  const hasWarnings = !needsOverride && (application.checkRecommendation !== 'CLEAR' || latest.some(check => check.status !== 'PASS'));
  const blocked = decision === 'APPROVED' && (needsOverride ? overrideReason.trim().length < 15 : hasWarnings && !acknowledged);

  const record = async () => {
    setSaving(true);
    setError('');
    const approving = decision === 'APPROVED';
    try {
      setApplication(await apiClient.reviewKycApplication(application.id, { decision, comment, kycLevel: approving ? kycLevel : undefined, acknowledgeWarnings: approving && hasWarnings ? acknowledged : undefined, overrideReason: approving && needsOverride ? overrideReason.trim() : undefined }));
    } catch (cause) { setError(apiErrorMessage(cause, t('The decision could not be saved.'))); } finally { setSaving(false); }
  };
  const row = (label: string, value: React.ReactNode) => <div className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500">{label}</dt><dd className="font-bold text-right break-words min-w-0">{value}</dd></div>;

  return (
    <div className="space-y-4">
      {back}
      <div>
        <h1 className="text-lg font-black">{application.fullName}</h1>
        <p className="text-[11px] text-slate-500 break-all"><span className="font-mono">{application.applicationNumber}</span> · {application.userEmail}</p>
        <span className={`inline-block mt-1 text-[10px] font-black rounded-full px-2 py-0.5 ${KYC_STATUS_STYLES[application.status]}`}>{t(KYC_STATUS_LABELS[application.status])}</span>
      </div>
      <section className={card}>
        <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {row(t('Date of birth'), application.dateOfBirth ? application.dateOfBirth.slice(0, 10) : '-')}
          {row(t('Nationality'), application.nationality)}
          {row(t('Identity document'), <>{application.idDocumentType ? t(KYC_ID_DOCUMENT_LABELS[application.idDocumentType]) : '-'} · <span className="font-mono">{application.idDocumentNumber}</span></>)}
          {row(t('Document expiry'), application.idDocumentExpiry ? application.idDocumentExpiry.slice(0, 10) : '-')}
          {row(t('Address'), <span className="whitespace-pre-line">{application.residentialAddress}</span>)}
        </dl>
      </section>
      <section className={card}><KycChecksPanel application={application} onUpdated={setApplication} /></section>
      <section className={card}><KycLivenessReviewPanel applicationId={application.id} /></section>
      <section className={`${card} space-y-2`}>
        <h2 className="text-sm font-black">{t('Documents')}</h2>
        {application.documents.map(document => (
          <div key={document.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0">{t(KYC_DOCUMENT_LABELS[document.documentType])}</span>
            <button type="button" onClick={() => void apiClient.downloadKycDocumentForReview(application.id, document.id).catch((cause) => setError(apiErrorMessage(cause, t('The file is unavailable.'))))} className="shrink-0 font-black text-emerald-700 dark:text-emerald-400">{t('Open')}</button>
          </div>
        ))}
      </section>
      {(application.reviews?.length ?? 0) > 0 && (
        <section className={`${card} space-y-2`}>
          <h2 className="text-sm font-black">{t('History')}</h2>
          {application.reviews!.map(review => (
            <div key={review.id} className="text-xs">
              <p className="font-bold">{t(DECISIONS.find(item => item.value === review.decision)?.label ?? review.decision)}{review.kycLevel ? ` (${t(KYC_LEVEL_LABELS[review.kycLevel])})` : ''} · {review.reviewerRole}</p>
              <p className="text-[11px] text-slate-500">{new Date(review.createdAt).toLocaleString()}</p>
              <p className="text-[11px] italic">“{review.comment}”</p>
            </div>
          ))}
        </section>
      )}
      {problem}
      {application.status === 'SUBMITTED' && (
        <section className={`${card} space-y-3`}>
          <h2 className="text-sm font-black">{t('Your decision')}</h2>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('Your decision')}>
            {DECISIONS.map(item => <button key={item.value} type="button" role="radio" aria-checked={decision === item.value} onClick={() => setDecision(item.value)} className={`py-2 px-1 rounded-xl text-xs font-black border ${decision === item.value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>{t(item.label)}</button>)}
          </div>
          {decision === 'APPROVED' && <label className="block text-xs font-bold text-slate-500">{t('KYC level')}<select value={kycLevel} onChange={(event) => setKycLevel(event.target.value as KycLevel)} className={input}>{(Object.keys(KYC_LEVEL_LABELS) as KycLevel[]).map(level => <option key={level} value={level}>{t(KYC_LEVEL_LABELS[level])}</option>)}</select></label>}
          {decision === 'APPROVED' && needsOverride && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 space-y-1">
              <p className="text-xs font-black text-rose-700 dark:text-rose-300">{t('Automated checks failed. To approve anyway, say why.')}</p>
              <textarea rows={3} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder={t('Why approve anyway? (at least 15 characters, kept in the audit trail)')} className={input} />
            </div>
          )}
          {decision === 'APPROVED' && hasWarnings && (
            <label className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-0.5 w-4 h-4" /><span>{t('I have checked the issues raised by the automated checks and the documents support approval.')}</span></label>
          )}
          <textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t('Reason for the decision (required, shown to the applicant)')} className={input} />
          <button type="button" disabled={saving || comment.trim().length < 5 || blocked} onClick={() => void record()} className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? t('Saving...') : t('Record decision')}</button>
        </section>
      )}
    </div>
  );
};
