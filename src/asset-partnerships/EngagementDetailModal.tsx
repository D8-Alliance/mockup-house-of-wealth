import React, { useState } from 'react';
import { AlertTriangle, FileSignature, X } from 'lucide-react';
import { openAgreementFor, openAgreementRecord } from '../ai/aiEngineNavigation';
import { startFromEngagement } from '../ai/features/contract/agreementPrefill';
import { apiClient, apiErrorMessage, AssetEngagement } from '../services/apiClient';
import { ASSET_TYPE_LABELS } from '../assets/assetLabels';
import { EngagementDraft, EngagementTermsFields, INPUT, LABEL } from './EngagementTermsFields';
import { AKAD_LABELS, describeTerms, ENGAGEMENT_STATUS, historyAction, nextStep, PARTY_LABELS } from './partnershipLabels';

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
  const status = ENGAGEMENT_STATUS[engagement.status];
  const details = Object.entries(engagement.asset.details ?? {}).filter(([key, value]) => DETAIL_LABELS[key] && value !== undefined && value !== '');

  const run = async (action: () => Promise<AssetEngagement>) => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await action());
      setNote('');
      setCountering(false);
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
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">History</h3>
          <ol className="space-y-2 text-xs">
            {engagement.history.map((entry, index) => (
              <li key={index} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div><strong>{entry.byName}</strong> <span className="text-slate-400">({PARTY_LABELS[entry.party]})</span> {historyAction(entry.action)} <span className="text-slate-400">· {entry.at.slice(0, 16).replace('T', ' ')}</span></div>
                {entry.akad && entry.terms && <div className="text-slate-600 dark:text-slate-300">{AKAD_LABELS[entry.akad]}: {describeTerms(entry.akad, entry.terms)}, {entry.startDate} to {entry.endDate}</div>}
                {entry.note && <div className="text-slate-500 italic">"{entry.note}"</div>}
              </li>
            ))}
          </ol>
        </section>

        {(engagement.canRespond || engagement.canReview || engagement.canWithdraw) && (
          <section className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            {countering && <EngagementTermsFields idPrefix="counter" value={draft} onChange={setDraft} />}
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
              {engagement.canRespond && !countering && (
                <>
                  <button type="button" disabled={busy} onClick={() => void run(() => apiClient.respondAssetEngagement(engagement.id, { action: 'DECLINE', note: note || undefined }))} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50">Decline</button>
                  <button type="button" disabled={busy} onClick={() => setCountering(true)} className="px-4 py-2 rounded-xl border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer disabled:opacity-50">Counter-offer</button>
                  <button type="button" disabled={busy} onClick={() => void run(() => apiClient.respondAssetEngagement(engagement.id, { action: 'ACCEPT', note: note || undefined }))} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Accept</button>
                </>
              )}
              {engagement.canRespond && countering && (
                <>
                  <button type="button" disabled={busy} onClick={() => setCountering(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Cancel</button>
                  <button type="button" disabled={busy} onClick={() => void run(() => apiClient.respondAssetEngagement(engagement.id, { action: 'COUNTER', akad: draft.akad, terms: draft.terms, startDate: draft.startDate, endDate: draft.endDate, note: note || undefined }))} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Send counter-offer</button>
                </>
              )}
              {engagement.canReview && (
                <>
                  <button type="button" disabled={busy || note.trim().length < 3} onClick={() => void run(() => apiClient.reviewAssetEngagement(engagement.id, { decision: 'REJECT', note, ...(isSuperAdmin ? { track } : {}) }))} className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold cursor-pointer disabled:opacity-50">Reject</button>
                  <button type="button" disabled={busy || note.trim().length < 3} title="Send it back to the parties to correct the terms; both reviews start again" onClick={() => void run(() => apiClient.reviewAssetEngagement(engagement.id, { decision: 'REQUEST_CHANGES', note, ...(isSuperAdmin ? { track } : {}) }))} className="px-4 py-2 rounded-xl border border-amber-400 text-amber-700 dark:text-amber-300 text-xs font-bold cursor-pointer disabled:opacity-50">Request changes</button>
                  <button type="button" disabled={busy || note.trim().length < 3} onClick={() => void run(() => apiClient.reviewAssetEngagement(engagement.id, { decision: 'APPROVE', note, ...(isSuperAdmin ? { track } : {}) }))} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Approve</button>
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
