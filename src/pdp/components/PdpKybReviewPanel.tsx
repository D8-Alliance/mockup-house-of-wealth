import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { apiClient, apiErrorMessage, PdpKybDecision } from '../../services/apiClient';
import { PDPApplication } from '../pdpTypes';
import { ModalPortal } from '../../components/ModalPortal';
import { formatDateTime } from '../../utils/platformTime';

const FILTERS: Array<{ value: string; label: string }> = [
  { value: 'SUBMITTED', label: 'To review' },
  { value: 'ADDITIONAL_INFORMATION_REQUIRED', label: 'Information requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: 'bg-amber-500/10 text-amber-700',
  UNDER_REVIEW: 'bg-amber-500/10 text-amber-700',
  ADDITIONAL_INFORMATION_REQUIRED: 'bg-sky-500/10 text-sky-700',
  APPROVED: 'bg-emerald-500/10 text-emerald-700',
  ACTIVE: 'bg-emerald-500/10 text-emerald-700',
  REJECTED: 'bg-rose-500/10 text-rose-700',
};
const STATUS_LABEL: Record<string, string> = { ADDITIONAL_INFORMATION_REQUIRED: 'Information requested' };

const DECISIONS: Array<{ value: PdpKybDecision; label: string; hint: string }> = [
  { value: 'APPROVED', label: 'Approve', hint: 'Why the entity, its owners and its bank account check out.' },
  { value: 'REQUEST_INFO', label: 'Request information', hint: 'What the applicant must correct or upload. They see this note.' },
  { value: 'REJECTED', label: 'Reject', hint: 'Why the application cannot go ahead. The applicant sees this note.' },
];

const DECLARATIONS: Array<[keyof PDPApplication['compliance'], string]> = [
  ['amlCftDeclaration', 'AML/CFT'],
  ['sourceOfFundsDeclaration', 'Source of funds'],
  ['beneficialOwnershipAccurate', 'Beneficial ownership accurate'],
  ['sanctionsNonMatchDeclared', 'Not on sanctions lists'],
  ['regulatoryComplianceAgreed', 'Regulatory compliance'],
  ['shariahComplianceAttested', 'Shariah compliance'],
  ['termsAndConditionsAccepted', 'Terms accepted'],
  ['privacyConsentGranted', 'Privacy consent'],
];

const isOpen = (status: string) => status === 'SUBMITTED' || status === 'UNDER_REVIEW';

/** What a reviewer should look at twice before deciding; the decision itself stays with the reviewer. */
export function reviewPoints(app: PDPApplication): string[] {
  const points: string[] = [];
  const owners = app.beneficialOwners ?? [];
  const total = owners.reduce((sum, owner) => sum + (Number(owner.ownershipPercentage) || 0), 0);
  if (app.pdpType !== 'Individual' && !owners.length) points.push('No beneficial owners are listed.');
  else if (owners.length && Math.abs(total - 100) > 0.5) points.push(`Beneficial ownership adds up to ${total}%, not 100%.`);
  const peps = owners.filter((owner) => owner.pepStatus);
  if (peps.length) points.push(`${peps.map((owner) => owner.fullName).join(', ')} declared as politically exposed: enhanced due diligence is needed.`);
  if (!app.registrationNumber?.trim()) points.push('No company registration number.');
  if (app.bankInfo?.accountHolderName && app.organisationName && app.bankInfo.accountHolderName.trim().toLowerCase() !== app.organisationName.trim().toLowerCase()) points.push(`The bank account holder (${app.bankInfo.accountHolderName}) is not the applicant's name.`);
  const missingDocs = (app.documents ?? []).filter((doc) => doc.required && (!doc.title || doc.fileSize === 'Not uploaded'));
  if (missingDocs.length) points.push(`Required documents not provided: ${missingDocs.map((doc) => doc.documentType).join(', ')}.`);
  return points;
}

/** KYB reviewers vet applications to become a project delivery partner, from /pdp/applications. */
export const PdpKybReviewPanel: React.FC = () => {
  const [filter, setFilter] = useState('SUBMITTED');
  const [items, setItems] = useState<PDPApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PDPApplication | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    apiClient.getPdpReviewQueue(filter)
      .then(setItems)
      .catch((cause) => setError(apiErrorMessage(cause, 'The PDP applications could not be loaded.')))
      .finally(() => setLoading(false));
  }, [filter]);
  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">PDP applications (KYB)</h3>
              <p className="text-xs text-slate-500">Companies applying to deliver projects. Check the entity, its owners and bank account, then approve, ask for more information or reject. You cannot review your own organisation.</p>
            </div>
          </div>
          <button type="button" onClick={load} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${filter === item.value ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300'}`}>{item.label}</button>
          ))}
        </div>
        {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">{error}</p>}
        {!loading && !error && !items.length && <p className="p-6 text-center text-xs text-slate-400">No applications here.</p>}
        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-slate-400"><th className="py-2 pr-3">Application</th><th className="pr-3">Organisation</th><th className="pr-3">Type</th><th className="pr-3">Submitted</th><th className="pr-3">Status</th><th className="pr-3">Points</th><th /></tr>
              </thead>
              <tbody>
                {items.map((app) => {
                  const points = reviewPoints(app).length;
                  return (
                    <tr key={app.id} className="border-t border-slate-100 dark:border-slate-700">
                      <td className="py-2.5 pr-3 font-mono">{app.applicationNumber}</td>
                      <td className="pr-3"><div className="font-bold text-slate-900 dark:text-white">{app.organisationName}</div><div className="text-slate-400">{app.registrationNumber || 'No registration no.'} · {app.countryCode}</div></td>
                      <td className="pr-3">{app.pdpType}</td>
                      <td className="pr-3 whitespace-nowrap">{app.submittedAt ? formatDateTime(app.submittedAt) : '-'}</td>
                      <td className="pr-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${STATUS_STYLE[app.status] ?? 'bg-slate-100 text-slate-600'}`}>{STATUS_LABEL[app.status] ?? app.status}</span></td>
                      <td className="pr-3">{points ? <span className="text-amber-700 font-bold">{points} to check</span> : <span className="text-emerald-600">None</span>}</td>
                      <td><button type="button" onClick={() => setSelected(app)} className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold cursor-pointer">{isOpen(app.status) ? 'Review' : 'Open'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <ModalPortal>
          <PdpReviewModal application={selected} onClose={() => setSelected(null)} onDecided={(app) => { setSelected(null); setItems((current) => current.map((item) => (item.id === app.id ? app : item))); load(); }} />
        </ModalPortal>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
    <p className="text-[10px] font-black uppercase text-slate-400">{title}</p>
    {children}
  </div>
);
const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <p className="text-xs"><span className="text-slate-500">{label}: </span><span className="font-semibold text-slate-900 dark:text-white">{value || '-'}</span></p>
);

const PdpReviewModal: React.FC<{ application: PDPApplication; onClose: () => void; onDecided: (app: PDPApplication) => void }> = ({ application: app, onClose, onDecided }) => {
  const [decision, setDecision] = useState<PdpKybDecision>('APPROVED');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const points = reviewPoints(app);
  const open = isOpen(app.status);

  const decide = async () => {
    if (!note.trim()) { setError('Write the reason for your decision.'); return; }
    setSaving(true);
    setError('');
    try {
      onDecided(await apiClient.reviewPdpApplication(app.id, decision, note.trim()));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The decision was not saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{app.organisationName}</h2>
            <p className="text-xs text-slate-500">{app.applicationNumber} · {app.pdpType} · {app.countryName} · applicant {app.userEmail}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" title="Close"><X className="w-5 h-5" /></button>
        </div>

        {points.length > 0 ? (
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs space-y-1">
            <p className="font-black flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Check before deciding</p>
            <ul className="list-disc pl-5">{points.map((point) => <li key={point}>{point}</li>)}</ul>
          </div>
        ) : <p className="p-3 rounded-xl bg-emerald-500/10 text-emerald-700 text-xs font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />No automatic points. Still verify the registration with the company registry (e.g. SSM).</p>}

        <div className="grid md:grid-cols-2 gap-3">
          <Section title="Entity">
            <Row label="Registered name" value={app.organisationName} />
            <Row label="Trading name" value={app.tradingName} />
            <Row label="Registration no." value={app.registrationNumber} />
            <Row label="Tax ID" value={app.taxIdentificationNumber} />
            <Row label="Incorporated" value={app.dateOfIncorporation} />
            <Row label="Business category" value={app.businessCategory} />
            <Row label="Registered address" value={app.registeredAddress} />
            <Row label="Website" value={app.website} />
          </Section>
          <Section title="Authorised representative">
            <Row label="Name" value={app.representative?.fullName} />
            <Row label="Position" value={app.representative?.position} />
            <Row label="ID / passport" value={app.representative?.idPassportNumber} />
            <Row label="Nationality" value={app.representative?.nationality} />
            <Row label="Email" value={app.representative?.email} />
          </Section>
          <Section title="Beneficial owners">
            {(app.beneficialOwners ?? []).length ? (app.beneficialOwners ?? []).map((owner) => (
              <p key={owner.id} className="text-xs"><span className="font-bold text-slate-900 dark:text-white">{owner.fullName}</span> · {owner.ownershipPercentage}% · {owner.nationality}{owner.isDirector ? ' · director' : ''}{owner.pepStatus ? <span className="ml-1 px-1.5 rounded bg-rose-500/10 text-rose-600 font-black">PEP</span> : null}</p>
            )) : <p className="text-xs text-slate-400">None listed.</p>}
          </Section>
          <Section title="Settlement bank account">
            <Row label="Bank" value={app.bankInfo?.bankName} />
            <Row label="Account holder" value={app.bankInfo?.accountHolderName} />
            <Row label="Account no." value={app.bankInfo?.accountNumber} />
            <Row label="SWIFT/BIC" value={app.bankInfo?.swiftBicCode} />
            <Row label="Currency" value={app.bankInfo?.currency} />
          </Section>
          <Section title="Documents declared">
            {(app.documents ?? []).length ? (app.documents ?? []).map((doc) => (
              <p key={doc.id} className="text-xs"><span className="font-semibold">{doc.documentType}</span>: {doc.title || '-'} <span className="text-slate-400">({doc.fileSize || 'no file'})</span></p>
            )) : <p className="text-xs text-slate-400">None.</p>}
            <p className="text-[11px] text-slate-400">The registration form records the document names; ask for the files under "Request information" if they are not with you.</p>
          </Section>
          <Section title="Declarations">
            <div className="grid grid-cols-2 gap-1">
              {DECLARATIONS.map(([key, label]) => <p key={key} className={`text-xs ${app.compliance?.[key] ? 'text-emerald-700' : 'text-rose-600 font-bold'}`}>{app.compliance?.[key] ? '✓' : '✗'} {label}</p>)}
            </div>
          </Section>
        </div>

        {(app.reviewHistory ?? []).length > 0 && (
          <Section title="History">
            {(app.reviewHistory ?? []).map((entry) => (
              <p key={`${entry.at}-${entry.action}`} className="text-xs"><span className="text-slate-400">{formatDateTime(entry.at)}</span> · <span className="font-bold">{entry.action.replace(/_/g, ' ').toLowerCase()}</span> by {entry.byName} ({entry.role}){entry.note ? `: ${entry.note}` : ''}</p>
            ))}
          </Section>
        )}

        {open ? (
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-wrap gap-2">
              {DECISIONS.map((item) => (
                <button key={item.value} type="button" onClick={() => setDecision(item.value)} className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${decision === item.value ? (item.value === 'APPROVED' ? 'bg-emerald-600 text-white' : item.value === 'REJECTED' ? 'bg-rose-600 text-white' : 'bg-sky-600 text-white') : 'bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300'}`}>{item.label}</button>
              ))}
            </div>
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder={DECISIONS.find((item) => item.value === decision)?.hint} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs" />
            {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
            <div className="flex justify-end"><button type="button" disabled={saving} onClick={() => void decide()} className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold cursor-pointer disabled:opacity-50">{saving ? 'Saving…' : 'Save decision'}</button></div>
          </div>
        ) : (
          <p className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-300">{STATUS_LABEL[app.status] ?? app.status}{app.reviewNote ? `: ${app.reviewNote}` : ''}{app.status === 'ADDITIONAL_INFORMATION_REQUIRED' ? ' Waiting for the applicant to correct and resubmit.' : ''}</p>
        )}
      </div>
    </div>
  );
};
