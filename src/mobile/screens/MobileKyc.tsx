import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, FileUp, Hourglass, ScanFace, ShieldCheck } from 'lucide-react';
import { apiClient, apiErrorMessage, KycApplication, KycDocumentType, KycDraftInput, KycIdDocumentType, LivenessSession } from '../../services/apiClient';
import { KYC_DOCUMENT_LABELS, KYC_ID_DOCUMENT_LABELS, KYC_STATUS_LABELS, noExpiryReason, requiredKycDocuments } from '../../kyc/kycLabels';
import { MobileFaceCheck } from '../MobileFaceCheck';
import { useRBAC } from '../../rbac/RBACContext';
import { shrinkPhoto } from '../shrinkPhoto';
import { useT } from '../i18n';

type Step = 1 | 2 | 3 | 4;
const STEPS: Array<{ step: Step; label: string }> = [
  { step: 1, label: 'Details' },
  { step: 2, label: 'Documents' },
  { step: 3, label: 'Face' },
  { step: 4, label: 'Submit' },
];

/** Which camera a document is taken with; proof of address is usually a PDF, so it opens the file picker. */
const CAMERA: Partial<Record<KycDocumentType, 'environment' | 'user'>> = { ID_FRONT: 'environment', ID_BACK: 'environment', PASSPORT: 'environment', SELFIE: 'user' };

const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-base text-slate-900 dark:text-white disabled:opacity-60';
const label = 'block text-xs font-bold text-slate-500';

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
const draftPayload = (form: Required<KycDraftInput>): KycDraftInput => ({ ...form, dateOfBirth: form.dateOfBirth || undefined, idDocumentExpiry: form.idDocumentExpiry || undefined });

/**
 * Identity verification on the phone, one step at a time: details, documents from the camera, face verification,
 * then submit. The same KYC application as on the website; a KYC officer of the investor's country decides.
 */
export const MobileKyc: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // The person's country as the server knows it (from their role), not the sign-in token, which may not carry it.
  const { currentCountryNode } = useRBAC();
  const { t } = useT();
  const [application, setApplication] = useState<KycApplication | null | undefined>(undefined);
  const [form, setForm] = useState(() => toForm(null));
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [liveness, setLiveness] = useState<LivenessSession | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    apiClient.getMyKyc().then((loaded) => { setApplication(loaded); setForm(toForm(loaded)); }).catch((cause) => { setApplication(null); setError(apiErrorMessage(cause, t('Your KYC could not be loaded.'))); });
    apiClient.getMyLiveness().then(setLiveness).catch(() => setLiveness(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const status = application?.status;
  const editable = application !== undefined && (!application || status === 'DRAFT' || status === 'RESUBMISSION_REQUIRED');
  const required = requiredKycDocuments(form.idDocumentType);
  const uploaded = new Map((application?.documents ?? []).map((document) => [document.documentType, document]));
  const countryNodeId = application?.countryNodeId || currentCountryNode;
  const expiryNotNeeded = noExpiryReason(countryNodeId, form.idDocumentType, form.dateOfBirth || undefined);
  // Texts built by the shared rules and the server, shown in the chosen language.
  const expiryText = (reason: string) => {
    const none = reason.match(/^Not needed: the (.+) has no expiry date$/);
    if (none) return t('Not needed: the {card} has no expiry date', { card: none[1] });
    const permanent = reason.match(/^Not needed: the (.+) is permanent from age (\d+)$/);
    if (permanent) return t('Not needed: the {card} is permanent from age {age}', { card: permanent[1], age: permanent[2] });
    return reason;
  };
  const gapText = (gap: string) => {
    const document = gap.match(/^Document: (\w+)$/);
    if (document) return t(KYC_DOCUMENT_LABELS[document[1] as KycDocumentType] ?? document[1]);
    const age = gap.match(/^Applicant must be at least (\d+) years old$/);
    if (age) return t('Applicant must be at least {age} years old', { age: age[1] });
    return t(gap);
  };
  const detailsComplete = form.fullName.trim() && form.dateOfBirth && form.nationality.trim() && form.idDocumentNumber.trim() && form.residentialAddress.trim() && (expiryNotNeeded || form.idDocumentExpiry);

  const run = async (name: string, action: () => Promise<KycApplication | null>, after?: () => void) => {
    setBusy(name);
    setError('');
    try {
      const result = await action();
      setApplication(result);
      after?.();
    } catch (cause) {
      setError(apiErrorMessage(cause, t('That did not go through. Please try again.')));
    } finally {
      setBusy('');
    }
  };

  const saveDetails = () => run('save', () => apiClient.saveMyKycDraft(draftPayload(form)), () => setStep(2));
  const upload = (documentType: KycDocumentType, file: File | undefined) => {
    if (!file) return;
    void run(documentType, async () => {
      await apiClient.saveMyKycDraft(draftPayload(form));
      await apiClient.uploadMyKycDocument(documentType, await shrinkPhoto(file));
      return apiClient.getMyKyc();
    });
  };
  const submit = () => run('submit', async () => {
    await apiClient.saveMyKycDraft(draftPayload(form));
    return apiClient.submitMyKyc();
  });
  const startNew = () => run('new', () => apiClient.saveMyKycDraft({}), () => { setForm(toForm(null)); setStep(1); });

  const header = (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Home')}</button>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-black flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" />{t('Verify your identity')}</h1>
        {application && <span className="text-[11px] font-mono text-slate-400">{application.applicationNumber}</span>}
      </div>
    </div>
  );

  if (application === undefined) return <div className="space-y-4">{header}<p className="text-sm text-slate-500">{t('Loading...')}</p></div>;

  // Not editable: under review, verified, or rejected.
  if (!editable) {
    return (
      <div className="space-y-4">
        {header}
        {status === 'SUBMITTED' && (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2 text-center">
            <Hourglass className="w-10 h-10 mx-auto text-amber-500" />
            <p className="text-base font-black">{t(KYC_STATUS_LABELS.SUBMITTED)}</p>
            <p className="text-xs text-slate-500">{t('A KYC officer in your country is checking your details and documents. You will be notified when they decide.')}</p>
          </section>
        )}
        {status === 'APPROVED' && (
          <section className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-5 space-y-2 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
            <p className="text-base font-black">{t(KYC_STATUS_LABELS.APPROVED)}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{t('You can invest in open pools.')}</p>
          </section>
        )}
        {status === 'REJECTED' && (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 p-5 space-y-3">
            <p className="text-base font-black text-rose-700 dark:text-rose-300">{t(KYC_STATUS_LABELS.REJECTED)}</p>
            {application?.reviewComment && <p className="text-xs text-slate-600 dark:text-slate-300"><span className="font-bold">{t('Reviewer:')}</span> {application.reviewComment}</p>}
            <button type="button" disabled={!!busy} onClick={() => void startNew()} className="w-full py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black disabled:opacity-50">{t('Start a new application')}</button>
          </section>
        )}
        {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      <ol className="grid grid-cols-4 gap-1.5" aria-label={t('Steps')}>
        {STEPS.map(item => (
          <li key={item.step}>
            <button type="button" onClick={() => setStep(item.step)} aria-current={step === item.step ? 'step' : undefined} className="w-full text-center">
              <span className={`block h-1.5 rounded-full ${item.step <= step ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
              <span className={`block mt-1 text-[11px] font-bold ${step === item.step ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>{t(item.label)}</span>
            </button>
          </li>
        ))}
      </ol>

      {status === 'RESUBMISSION_REQUIRED' && application?.reviewComment && (
        <p className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3 text-xs text-amber-900 dark:text-amber-200 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span><span className="font-bold">{t('The officer asks:')}</span> {application.reviewComment}</span></p>
      )}
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}

      {step === 1 && (
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <p className="text-xs text-slate-500">{t('As written on your identity document.')}</p>
          <label className={label}>{t('Full name')}<input className={input} autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
          <label className={label}>{t('Date of birth')}<input type="date" className={input} value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></label>
          <label className={label}>{t('Nationality')}<input className={input} value={form.nationality} onChange={(event) => setForm({ ...form, nationality: event.target.value })} /></label>
          <label className={label}>{t('Identity document')}
            <select className={input} value={form.idDocumentType} onChange={(event) => setForm({ ...form, idDocumentType: event.target.value as KycIdDocumentType })}>
              {(Object.keys(KYC_ID_DOCUMENT_LABELS) as KycIdDocumentType[]).map((type) => <option key={type} value={type}>{t(KYC_ID_DOCUMENT_LABELS[type])}</option>)}
            </select>
          </label>
          <label className={label}>{t('Document number')}<input className={input} value={form.idDocumentNumber} onChange={(event) => setForm({ ...form, idDocumentNumber: event.target.value })} /></label>
          {expiryNotNeeded
            ? <p className="text-xs text-slate-500">{t('Expiry date:')} {expiryText(expiryNotNeeded)}</p>
            : <label className={label}>{t('Document expiry date')}<input type="date" className={input} value={form.idDocumentExpiry} onChange={(event) => setForm({ ...form, idDocumentExpiry: event.target.value })} /></label>}
          <label className={label}>{t('Residential address')}<textarea rows={3} className={input} autoComplete="street-address" value={form.residentialAddress} onChange={(event) => setForm({ ...form, residentialAddress: event.target.value })} /></label>
          <button type="button" disabled={!!busy || !detailsComplete} onClick={() => void saveDetails()} className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-black disabled:opacity-50">{busy === 'save' ? t('Saving...') : t('Save and continue')}</button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <p className="text-xs text-slate-500">{t('Take each photo in good light, with the whole card in the frame and no glare. Photos are made smaller on your phone before they are sent.')}</p>
          {required.map(documentType => {
            const document = uploaded.get(documentType);
            const camera = CAMERA[documentType];
            return (
              <article key={documentType} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black">{t(KYC_DOCUMENT_LABELS[documentType])}</p>
                  {document ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-label={t('Uploaded')} /> : null}
                </div>
                {document && <p className="text-xs text-slate-500 truncate">{document.fileName}</p>}
                <div className="grid grid-cols-2 gap-2">
                  {camera && (
                    <label className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black ${busy ? 'opacity-50' : ''} ${document ? 'bg-slate-100 dark:bg-slate-800' : 'bg-emerald-600 text-white'}`}>
                      <Camera className="w-4 h-4" />{busy === documentType ? t('Sending...') : document ? t('Retake') : t('Take photo')}
                      <input type="file" accept="image/*" capture={camera} className="hidden" disabled={!!busy} onChange={(event) => { upload(documentType, event.target.files?.[0]); event.target.value = ''; }} />
                    </label>
                  )}
                  <label className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black border border-slate-300 dark:border-slate-600 ${camera ? '' : 'col-span-2'} ${busy ? 'opacity-50' : ''}`}>
                    <FileUp className="w-4 h-4" />{!camera && busy === documentType ? t('Sending...') : t('Choose file')}
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/*,application/pdf" className="hidden" disabled={!!busy} onChange={(event) => { upload(documentType, event.target.files?.[0]); event.target.value = ''; }} />
                  </label>
                </div>
              </article>
            );
          })}
          <button type="button" disabled={!!busy || required.some(type => !uploaded.has(type))} onClick={() => setStep(3)} className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-black disabled:opacity-50">{t('Continue')}</button>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          {!capturing && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-sm">
              <p className="font-black flex items-center gap-2"><ScanFace className="w-5 h-5 text-purple-600" />{t('Face verification')}</p>
              {liveness?.status === 'PASSED'
                ? <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{t('Completed')}</p>
                : <p className="text-xs text-slate-500">{t('Confirms you are a real person and match the photo on your identity card. Hold the phone at eye level and follow the prompts; it takes about a minute.')}</p>}
              {liveness && liveness.status !== 'PASSED' && liveness.status !== 'IN_PROGRESS' && <p className="text-xs font-bold text-rose-600">{t('Not completed ({status}). Please try again.', { status: liveness.status.toLowerCase() })}</p>}
              <button type="button" onClick={() => setCapturing(true)} className="w-full py-3 rounded-2xl bg-purple-600 text-white text-sm font-black">{liveness?.status === 'PASSED' ? t('Do it again') : t('Start face verification')}</button>
            </div>
          )}
          {capturing && (
            <MobileFaceCheck
              onFinished={(session) => { setLiveness(session); setCapturing(false); void apiClient.getMyKyc().then(setApplication).catch(() => undefined); }}
              onCancel={() => { setCapturing(false); void apiClient.getMyLiveness().then(setLiveness).catch(() => undefined); }}
            />
          )}
          {!capturing && <button type="button" onClick={() => setStep(4)} className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-black">{t('Continue')}</button>}
        </section>
      )}

      {step === 4 && (
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-sm">
          <p className="font-black">{t('Check and submit')}</p>
          <dl className="text-xs space-y-1.5">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('Name')}</dt><dd className="font-bold text-right">{form.fullName || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('Document')}</dt><dd className="font-bold text-right">{t(KYC_ID_DOCUMENT_LABELS[form.idDocumentType])} {form.idDocumentNumber}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('Documents')}</dt><dd className="font-bold text-right">{t('{done} of {total} uploaded', { done: required.filter(type => uploaded.has(type)).length, total: required.length })}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('Face verification')}</dt><dd className="font-bold text-right">{liveness?.status === 'PASSED' ? t('Completed') : t('Not done')}</dd></div>
          </dl>
          {application?.missing && application.missing.length > 0 && (
            <p className="text-xs text-amber-800 dark:text-amber-300 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3">{t('Still needed: {items}.', { items: application.missing.map(gapText).join(', ') })}</p>
          )}
          <p className="text-[11px] text-slate-500">{t('A KYC officer in your country reviews your application. Your documents are used only to verify your identity.')}</p>
          {/* The server lists what is still missing; until it is empty the application cannot be submitted. */}
          <button type="button" disabled={!!busy || (application?.missing?.length ?? 0) > 0} onClick={() => void submit()} className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-black disabled:opacity-50">
            {busy === 'submit' ? t('Submitting...') : status === 'RESUBMISSION_REQUIRED' ? t('Resubmit for review') : t('Submit for review')}
          </button>
        </section>
      )}
    </div>
  );
};
