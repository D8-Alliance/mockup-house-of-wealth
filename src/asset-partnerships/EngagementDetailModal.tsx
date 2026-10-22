import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, Eye, FileSignature, ShieldCheck, X } from 'lucide-react';
import { formatDateTimeWithZone } from '../utils/platformTime';
import { openAgreementFor, openAgreementRecord } from '../ai/aiEngineNavigation';
import { startFromEngagement } from '../ai/features/contract/agreementPrefill';
import { apiClient, apiErrorMessage, AssetEngagement, EngagementRecord } from '../services/apiClient';
import { ASSET_TYPE_LABELS } from '../assets/assetLabels';
import { EngagementDraft, EngagementTermsFields, INPUT, LABEL } from './EngagementTermsFields';
import { AKAD_LABELS, describeTerms, ENGAGEMENT_STATUS, historyAction, nextStep, PARTY_LABELS } from './partnershipLabels';
import { ReviewChecksPanel } from './ReviewChecksPanel';
import { TermsConfirm } from './TermsConfirm';
import { draftChanges, draftStore, draftWarnings, lastReviewFlags } from './termsReview';
import { useRBAC } from '../rbac/RBACContext';

const DETAIL_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer', make: 'Make', model: 'Model', yearOfManufacture: 'Year', operatingHours: 'Operating hours', category: 'Category', requiresDoshCertificate: 'Needs JKKP certificate',
  areaValue: 'Area', areaUnit: 'Unit', landUseCategory: 'Land use', tenure: 'Tenure', mukim: 'Mukim', district: 'District', state: 'State',
  titleKind: 'Title', buildingUse: 'Use', floorArea: 'Floor area', floorAreaUnit: 'Unit', yearCompleted: 'Completed',
  serialNumber: 'Serial number', chassisNumber: 'Chassis number', registrationNumber: 'Registration', titleNumber: 'Title number', lotNumber: 'Lot',
};

const row = (label: string, value: React.ReactNode) => (
  <div><dt className="text-slate-400 font-bold">{label}</dt><dd className="text-slate-800 dark:text-slate-100 break-words">{value === undefined || value === null || value === '' ? '-' : value}</dd></div>
);

interface Props {
  engagement: AssetEngagement;
  isSuperAdmin: boolean;
  onChanged: (engagement: AssetEngagement) => void;
  onClose: () => void;
  /** Opens Agreement Generation; the agreement is filled from this partnership. */
  onOpenAgreement?: () => void;
  /** Opens the Contracts page on the partnership's agreement. */
  onOpenContracts?: () => void;
}

/** One offer or request: who, what, on which akad, its history, and the viewer's next action. */
const AGREEMENT_STEP: Record<string, string> = { DRAFT: 'draft, waiting for both sides to agree', CHANGES_REQUESTED: 'changes requested by a reviewer', LEGAL_REVIEW: 'in legal review', SHARIAH_REVIEW: 'in Shariah review', APPROVED: 'approved, waiting for both signatures', EXECUTION: 'signed by both sides' };

export const EngagementDetailModal: React.FC<Props> = ({ engagement, isSuperAdmin, onChanged, onClose, onOpenAgreement, onOpenContracts }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [countering, setCountering] = useState(false);
  const [draft, setDraft] = useState<EngagementDraft>({ akad: engagement.akad, terms: { ...engagement.terms }, startDate: engagement.startDate, endDate: engagement.endDate });
  const [track, setTrack] = useState<'LEGAL' | 'SHARIAH'>(engagement.legalApprovedAt ? 'SHARIAH' : 'LEGAL');
  const { currentRole } = useRBAC();
  // After a reviewer asks for changes, the side whose turn it is corrects the terms; accepting them unchanged is refused.
  const changesRequested = engagement.status === 'PROPOSED' && Boolean(engagement.history[engagement.history.length - 1]?.action?.endsWith('_CHANGES_REQUESTED'));
  // A counter-offer is reviewed before it is sent, and can be saved on this device without sending.
  const [confirming, setConfirming] = useState(false);
  // Accepting shows the exact terms and asks the party to confirm them for its organisation.
  const [accepting, setAccepting] = useState(false);
  const [acceptConfirmed, setAcceptConfirmed] = useState(false);
  const [aiRunId, setAiRunId] = useState<string | null>(null);
  // Approving despite failed checks, an AI suggestion to change or reject, or a note that reads as a refusal needs a reason.
  const [signals, setSignals] = useState<{ failed: string[]; aiSuggested: string | null }>({ failed: [], aiSuggested: null });
  const [overrideReason, setOverrideReason] = useState('');
  const overrideGrounds = [
    ...(signals.failed.length ? [`${signals.failed.length} check${signals.failed.length > 1 ? 's' : ''} failed: ${signals.failed.join(', ')}`] : []),
    ...(aiRunId && signals.aiSuggested && signals.aiSuggested !== 'APPROVE' ? [`the AI review assistant suggested ${signals.aiSuggested === 'REJECT' ? 'rejecting' : 'asking for changes'}`] : []),
    ...(/\b(cannot|can ?not|could not|should not|not) be approved\b|\btidak (boleh |dapat )?(di)?lulus/i.test(note) ? ['your review note reads as a refusal'] : []),
  ];
  const overrideMissing = overrideGrounds.length > 0 && overrideReason.trim().length < 10;
  const [record, setRecord] = useState<EngagementRecord | null>(null);
  const myOrganisation = engagement.myParty === 'OWNER' ? engagement.ownerOrganisationName : engagement.project.organisationName;
  // A party opening the partnership after the other side changed it is recorded; the history is checked against the audit log.
  useEffect(() => {
    if (engagement.myParty) void apiClient.markEngagementSeen(engagement.id).catch(() => undefined);
    apiClient.getEngagementRecord(engagement.id).then(setRecord).catch(() => setRecord(null));
  }, [engagement.id, engagement.updatedAt, engagement.myParty]);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const current = { akad: engagement.akad, terms: { ...engagement.terms }, startDate: engagement.startDate, endDate: engagement.endDate };
  const startCounter = () => {
    const saved = draftStore.load(engagement.id);
    if (saved) { setDraft(saved.draft); setNote(saved.note); setDraftNotice(`Your saved draft from ${saved.savedAt.slice(0, 16).replace('T', ' ')} is restored.`); }
    setCountering(true);
  };
  const saveDraft = () => setDraftNotice(draftStore.save(engagement.id, { draft, note, savedAt: new Date().toISOString() }) ? 'Draft saved on this device. Nothing was sent; the other side does not see it.' : 'This browser could not save the draft.');
  const discardDraft = () => { draftStore.clear(engagement.id); setDraft(current); setNote(''); setDraftNotice('Saved draft discarded.'); };
  // The checks open on the reviewer's own track; a Super Admin sees the one still to sign.
  const reviewerTrack: 'LEGAL' | 'SHARIAH' = ['Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'].includes(currentRole) ? 'SHARIAH' : currentRole === 'Super Admin' ? track : 'LEGAL';
  const status = ENGAGEMENT_STATUS[engagement.status];
  const details = Object.entries(engagement.asset.details ?? {}).filter(([key, value]) => DETAIL_LABELS[key] && value !== undefined && value !== '');

  const run = async (action: () => Promise<AssetEngagement>) => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await action());
      setNote('');
      setCountering(false);
      setConfirming(false);
      setDraftNotice(null);
      setAccepting(false);
      setAcceptConfirmed(false);
      setAiRunId(null);
      setOverrideReason('');
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The change was not saved.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
        <div className="flex justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{engagement.asset.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
            </div>
            <p className="text-xs text-slate-500">
              {engagement.direction === 'OFFER' ? 'Offered by the asset owner' : 'Requested by the delivery partner'} for <strong>{engagement.project.projectName}</strong> ({engagement.project.organisationName}) · <span className="font-mono">{engagement.id}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" title="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className={`p-3 rounded-xl text-xs font-bold ${engagement.canRespond || engagement.canReview ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300'}`}>{nextStep(engagement)}</div>

        <section className="space-y-2">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Agreed so far</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {row('Akad', AKAD_LABELS[engagement.akad])}
            {row('Period', `${engagement.startDate} to ${engagement.endDate}`)}
            <div className="sm:col-span-2">{row('Terms', describeTerms(engagement.akad, engagement.terms))}</div>
            {engagement.need && row('Project need', `${engagement.need.title} (${engagement.need.quantity} needed)`)}
            {row('Legal approval', engagement.legalApprovedAt ? engagement.legalApprovedAt.slice(0, 10) : 'Not yet')}
            {row('Shariah approval', engagement.shariahApprovedAt ? engagement.shariahApprovedAt.slice(0, 10) : 'Not yet')}
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">The asset</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {row('Type', ASSET_TYPE_LABELS[engagement.asset.assetType])}
            {row('Owner', engagement.ownerOrganisationName ?? 'Shown once the owner accepts')}
            {row('Area', engagement.asset.region)}
            {details.map(([key, value]) => <React.Fragment key={key}>{row(DETAIL_LABELS[key], typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value))}</React.Fragment>)}
            {engagement.asset.titleReference !== undefined && row('Title / registration', engagement.asset.titleReference)}
            {engagement.asset.location !== undefined && row('Location', engagement.asset.location)}
          </dl>
          {engagement.asset.isEncumbered && (
            <p className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs"><AlertTriangle className="w-4 h-4 shrink-0" />The asset is charged or under financing{engagement.asset.encumbranceNote ? `: ${engagement.asset.encumbranceNote}` : ''}. The financier's consent is needed before it is leased or contributed.</p>
          )}
          {engagement.myParty === 'PDP' && engagement.status !== 'APPROVED' && <p className="text-[11px] text-slate-400">Title, lot, chassis and serial numbers are shown once Legal and Shariah approve.</p>}
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">History</h3>
            <button type="button" onClick={() => void apiClient.downloadEngagementRecord(engagement.id).catch((cause) => setError(apiErrorMessage(cause, 'The record could not be downloaded.')))} className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"><Download className="w-3.5 h-3.5" />Download record (PDF)</button>
          </div>
          {record && <p className="text-[10px] text-slate-400">Each step is also written to the platform's audit log, which cannot be changed. Times are local. Record fingerprint {record.fingerprint.slice(0, 16)}…</p>}
          <ol className="space-y-2 text-xs">
            {engagement.history.map((entry, index) => (
              <li key={index} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><strong>{entry.byName}</strong> <span className="text-slate-400">({PARTY_LABELS[entry.party]})</span> {historyAction(entry.action)} <span className="text-slate-400">· {formatDateTimeWithZone(entry.at)}</span></div>
                  {record?.entries[index] && (record.entries[index].verification === 'VERIFIED'
                    ? <span title={`SHA-256 ${record.entries[index].hash}`} className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" />Verified</span>
                    : record.entries[index].verification === 'MISMATCH'
                      ? <span className="text-[10px] font-black text-rose-600">Does not match the audit log</span>
                      : <span className="text-[10px] text-slate-400" title="Recorded before entries were fingerprinted">Earlier record</span>)}
                </div>
                {entry.akad && entry.terms && <div className="text-slate-600 dark:text-slate-300">{AKAD_LABELS[entry.akad]}: {describeTerms(entry.akad, entry.terms)}, {entry.startDate} to {entry.endDate}</div>}
                {entry.note && <div className="text-slate-500 italic">"{entry.note}"</div>}
                {entry.statement && <div className="text-emerald-700 dark:text-emerald-300 font-semibold">{entry.statement}</div>}
                {entry.aiAssisted && <div className="text-[11px] text-purple-700 dark:text-purple-300">Review note drafted with the AI review assistant, then confirmed by the reviewer.</div>}
                {entry.override && <div className="mt-1 p-2 rounded-lg bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-300"><strong>Approved despite:</strong> {entry.override.grounds.join('; ')}. <strong>Reason given:</strong> {entry.override.reason}</div>}
                {entry.documents && entry.documents.length > 0 && <details className="text-[11px] text-slate-500"><summary className="cursor-pointer">{entry.documents.length} document{entry.documents.length > 1 ? 's' : ''} on file when decided</summary><ul className="pl-4 list-disc">{entry.documents.map((document) => <li key={document.sha256}>{document.type.replace(/_/g, ' ').toLowerCase()}: {document.fileName} <span className="font-mono">SHA-256 {document.sha256.slice(0, 12)}…</span></li>)}</ul></details>}
                {record?.views.filter((seen) => seen.entryIndex === index).map((seen) => <div key={seen.at} className="mt-1 text-[11px] text-slate-400 flex items-center gap-1"><Eye className="w-3 h-3" />Seen by {seen.byName} · {formatDateTimeWithZone(seen.at)}</div>)}
                {entry.checks && (entry.checks.fail.length > 0 || entry.checks.warn.length > 0) && <div className="mt-1 text-[11px] text-slate-500">Checks when decided: {entry.checks.fail.length ? <span className="text-rose-600">failed: {entry.checks.fail.join(', ')}</span> : null}{entry.checks.fail.length && entry.checks.warn.length ? '; ' : ''}{entry.checks.warn.length ? <span className="text-amber-700">to confirm: {entry.checks.warn.join(', ')}</span> : null}</div>}
              </li>
            ))}
          </ol>
        </section>

        {engagement.canReview && <ReviewChecksPanel engagementId={engagement.id} defaultTrack={reviewerTrack} onUseNote={(text, runId) => { setNote(text); setAiRunId(runId); }} onSignals={setSignals} />}

        {(engagement.canRespond || engagement.canReview || engagement.canWithdraw) && (
          <section className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            {countering && draftNotice && <p className="p-2.5 rounded-xl bg-sky-500/10 text-sky-800 dark:text-sky-300 text-xs flex flex-wrap items-center justify-between gap-2"><span>{draftNotice}</span>{draftStore.load(engagement.id) && <button type="button" onClick={discardDraft} className="font-bold hover:underline cursor-pointer">Discard saved draft</button>}</p>}
            {countering && !confirming && <EngagementTermsFields idPrefix="counter" value={draft} onChange={setDraft} />}
            {countering && confirming && (
              <TermsConfirm
                title="Check your counter-offer before sending"
                changes={draftChanges(current, draft)}
                warnings={draftWarnings(draft, { assetValue: engagement.asset.estimatedValue, flagged: changesRequested ? lastReviewFlags(engagement.history) : [] })}
                busy={busy}
                confirmLabel="Confirm and send"
                onBack={() => setConfirming(false)}
                onConfirm={() => void run(async () => { const sent = await apiClient.respondAssetEngagement(engagement.id, { action: 'COUNTER', akad: draft.akad, terms: draft.terms, startDate: draft.startDate, endDate: draft.endDate, note: note || undefined }); draftStore.clear(engagement.id); return sent; })}
              />
            )}
            <div>
              <label htmlFor="engagement-note" className={LABEL}>{engagement.canReview ? 'Review note (required)' : 'Message (optional)'}</label>
              <textarea id="engagement-note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} />
            </div>
            {engagement.canReview && isSuperAdmin && (
              <div>
                <label htmlFor="engagement-track" className={LABEL}>Sign as</label>
                <select id="engagement-track" value={track} onChange={(e) => setTrack(e.target.value as 'LEGAL' | 'SHARIAH')} className={`${INPUT} cursor-pointer`}>
                  {!engagement.legalApprovedAt && <option value="LEGAL">Legal approval</option>}
                  {!engagement.shariahApprovedAt && <option value="SHARIAH">Shariah approval</option>}
                </select>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {engagement.canWithdraw && <button type="button" disabled={busy} onClick={() => window.confirm('Withdraw from this partnership?') && void run(() => apiClient.withdrawAssetEngagement(engagement.id, note || undefined))} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-50">Withdraw</button>}
              {engagement.canRespond && !countering && changesRequested && <p className="w-full text-xs font-bold text-amber-700 dark:text-amber-300">A reviewer asked for changes (see History). Use Counter-offer to send corrected terms; the other side then accepts them and the review starts again.</p>}
              {engagement.canRespond && !countering && accepting && (
                <div className="w-full p-4 rounded-2xl border border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/10 space-y-2 text-xs">
                  <p className="font-black text-slate-800 dark:text-slate-100">You are accepting these terms</p>
                  <p className="text-slate-700 dark:text-slate-200">{AKAD_LABELS[engagement.akad]}: {describeTerms(engagement.akad, engagement.terms)}, {engagement.startDate} to {engagement.endDate}.</p>
                  <label className="flex items-start gap-2 text-slate-700 dark:text-slate-200"><input type="checkbox" checked={acceptConfirmed} onChange={(e) => setAcceptConfirmed(e.target.checked)} className="mt-0.5" />I have read these terms and accept them on behalf of {myOrganisation ?? 'my organisation'}. They then go to Legal and Shariah review.</label>
                  <p className="text-[10px] text-slate-400">Your acceptance, the time and a fingerprint of these exact terms are recorded. If the terms change before you confirm, the acceptance is refused.</p>
                  <div className="flex justify-end gap-2">
                    <button type="button" disabled={busy} onClick={() => { setAccepting(false); setAcceptConfirmed(false); }} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Back</button>
                    <button type="button" disabled={busy || !acceptConfirmed} onClick={() => void run(() => apiClient.respondAssetEngagement(engagement.id, { action: 'ACCEPT', note: note || undefined, termsHash: engagement.termsHash, confirmed: true }))} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">{busy ? 'Accepting…' : 'Confirm acceptance'}</button>
                  </div>
                </div>
              )}
              {engagement.canRespond && !countering && !accepting && (
                <>
                  <button type="button" disabled={busy} onClick={() => void run(() => apiClient.respondAssetEngagement(engagement.id, { action: 'DECLINE', note: note || undefined }))} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50">Decline</button>
                  <button type="button" disabled={busy} onClick={startCounter} className="px-4 py-2 rounded-xl border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer disabled:opacity-50">Counter-offer</button>
                  {!changesRequested && <button type="button" disabled={busy} onClick={() => setAccepting(true)} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Accept</button>}
                </>
              )}
              {engagement.canRespond && countering && !confirming && (
                <>
                  <button type="button" disabled={busy} onClick={() => { setCountering(false); setDraftNotice(null); }} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Cancel</button>
                  <button type="button" disabled={busy} onClick={saveDraft} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">Save draft</button>
                  <button type="button" disabled={busy} onClick={() => setConfirming(true)} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Review and send</button>
                </>
              )}
              {engagement.canReview && overrideGrounds.length > 0 && (
                <div className="w-full p-3 rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 text-xs space-y-1.5">
                  <p className="font-bold text-amber-800 dark:text-amber-300">To approve, give your reason: {overrideGrounds.join('; ')}.</p>
                  <textarea rows={2} maxLength={1000} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Why you approve anyway (recorded with your decision and shown to both parties)" className={INPUT} />
                  <p className="text-[10px] text-slate-500">Not needed to ask for changes or to reject. If your note says it cannot be approved, consider Request changes instead.</p>
                </div>
              )}
              {engagement.canReview && (
                <>
                  <button type="button" disabled={busy || note.trim().length < 3} onClick={() => void run(() => apiClient.reviewAssetEngagement(engagement.id, { decision: 'REJECT', note, ...(isSuperAdmin ? { track } : {}), ...(aiRunId ? { aiRunId } : {}) }))} className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold cursor-pointer disabled:opacity-50">Reject</button>
                  <button type="button" disabled={busy || note.trim().length < 3} title="Send it back to the parties to correct the terms; both reviews start again" onClick={() => void run(() => apiClient.reviewAssetEngagement(engagement.id, { decision: 'REQUEST_CHANGES', note, ...(isSuperAdmin ? { track } : {}), ...(aiRunId ? { aiRunId } : {}) }))} className="px-4 py-2 rounded-xl border border-amber-400 text-amber-700 dark:text-amber-300 text-xs font-bold cursor-pointer disabled:opacity-50">Request changes</button>
                  <button type="button" disabled={busy || note.trim().length < 3 || overrideMissing} onClick={() => void run(() => apiClient.reviewAssetEngagement(engagement.id, { decision: 'APPROVE', note, ...(isSuperAdmin ? { track } : {}), ...(aiRunId ? { aiRunId } : {}), ...(overrideGrounds.length ? { overrideReason: overrideReason.trim() } : {}) }))} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Approve</button>
                </>
              )}
            </div>
          </section>
        )}
        {engagement.status === 'APPROVED' && (
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2">
            <span>{engagement.agreement ? <>Approved. Agreement <strong>{engagement.agreement.contractNumber}</strong>: {AGREEMENT_STEP[engagement.agreement.status] ?? engagement.agreement.status}. One agreement for both sides: each side agrees to the same version, then both sign.</> : 'Approved. The asset is committed to this project for the period. Either side drafts the one agreement; the other side then agrees or drafts a revision.'}</span>
            <span className="flex flex-wrap gap-2">
              {engagement.agreement && onOpenContracts && (
                <button type="button" onClick={() => { openAgreementRecord(engagement.agreement!.id); onOpenContracts(); }} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"><FileSignature className="w-3.5 h-3.5" />Open the agreement</button>
              )}
              {engagement.myParty && onOpenAgreement && (!engagement.agreement || engagement.agreement.status === 'DRAFT' || engagement.agreement.status === 'CHANGES_REQUESTED') && (
                <button type="button" onClick={() => { openAgreementFor({ ...startFromEngagement(engagement), engagementId: engagement.id }); onOpenAgreement(); }} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${engagement.agreement ? 'border border-emerald-600 text-emerald-700 dark:text-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}><FileSignature className="w-3.5 h-3.5" />{engagement.agreement ? 'Draft a revision' : `Draft the ${AKAD_LABELS[engagement.akad]} agreement`}</button>
              )}
            </span>
          </div>
        )}
        {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">{error}</p>}
      </div>
    </div>
  );
};
