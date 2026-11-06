import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { AgreementAction, AgreementDetail, AgreementStatus, AgreementSummary, apiClient, apiErrorMessage } from '../../services/apiClient';
import { AgreementChecksPanel } from '../../ai/features/contract/AgreementChecksPanel';
import { AgreementSignals, agreementOverrideGrounds, overrideReasonMissing } from '../../ai/features/contract/agreementOverride';
import { useT } from '../i18n';

const STATUS_LABEL: Record<AgreementStatus, string> = {
  DRAFT: 'Draft', LEGAL_REVIEW: 'Legal review', SHARIAH_REVIEW: 'Shariah review', APPROVED: 'Approved', CHANGES_REQUESTED: 'Changes requested', EXECUTION: 'Signed by both sides',
};
const PARTY_LABEL: Record<string, string> = { OWNER: 'Asset owner', PDP: 'Delivery partner', TENANT: 'Tenant' };
/** The server's button labels, for the reviewers' steps. */
const ACTION_LABEL: Partial<Record<AgreementAction, string>> = { SHARIAH_REVIEW: 'Legal approved: send to Shariah review', APPROVED: 'Shariah approved', CHANGES_REQUESTED: 'Ask for changes' };
const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4';
const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-sm text-slate-900 dark:text-white';
const primary = 'w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-50';
const secondary = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 py-3 text-sm font-black disabled:opacity-50';

/**
 * Legal and Shariah reviewers decide agreements from the phone, lease agreements among them: the text, the checks,
 * the AI scan and the reasoned override are the same as on the web portal. The server sends what the reviewer may do.
 */
export const MobileAgreementReview: React.FC = () => {
  const { t, serverText } = useT();
  const [items, setItems] = useState<AgreementSummary[] | null>(null);
  const [error, setError] = useState('');
  const [mine, setMine] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const load = useCallback(() => {
    setError('');
    setItems(null);
    apiClient.listAgreements().then(setItems).catch((cause) => { setItems([]); setError(apiErrorMessage(cause, t('Agreements could not be loaded.'))); });
  }, [t]);
  useEffect(load, [load]);

  if (openId) return <AgreementReviewDetail id={openId} onBack={() => { setOpenId(null); load(); }} />;
  const waiting = (items ?? []).filter(item => item.availableActions.length > 0);
  const shown = mine ? waiting : items ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black">{t('Agreement reviews')}</h1>
        <p className="text-xs text-slate-500">{t('Read each agreement, then give your decision. Lease terms are reviewed under Leasing.')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={mine} onClick={() => setMine(true)} className={`py-2 px-1 rounded-xl text-xs font-black border ${mine ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>{t('Waiting for you ({count})', { count: waiting.length })}</button>
        <button type="button" role="tab" aria-selected={!mine} onClick={() => setMine(false)} className={`py-2 px-1 rounded-xl text-xs font-black border ${!mine ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>{t('All I can see')}</button>
      </div>
      <button type="button" onClick={load} className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400"><RefreshCw className="w-3.5 h-3.5" />{t('Refresh')}</button>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{serverText(error)}</p>}
      {!items && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {items && shown.length === 0 && !error && <p className="text-xs text-slate-500">{mine ? t('Nothing is waiting for you.') : t('No agreement yet.')}</p>}
      {shown.map(item => (
        <button key={item.id} type="button" onClick={() => setOpenId(item.id)} className={`${card} w-full text-left flex items-center gap-3`}>
          <span className="min-w-0 flex-1 space-y-1">
            <span className="block text-sm font-black">{item.title || item.contractType}</span>
            <span className="block text-[11px] text-slate-500 font-mono">{item.contractNumber}</span>
            <span className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-300">{t(STATUS_LABEL[item.status] ?? item.status)}</span>
              {item.availableActions.length > 0 && <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-amber-400 text-emerald-950">{t('Your turn')}</span>}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      ))}
    </div>
  );
};

const AgreementReviewDetail: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const { t, serverText, locale } = useT();
  const [agreement, setAgreement] = useState<AgreementDetail | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [aiRunId, setAiRunId] = useState<string | null>(null);
  const [signals, setSignals] = useState<AgreementSignals>({ failed: [], highGaps: 0 });
  const [overrideReason, setOverrideReason] = useState('');
  const [saving, setSaving] = useState<AgreementAction | null>(null);
  const load = useCallback(() => apiClient.getAgreement(id).then(setAgreement).catch((cause) => setError(apiErrorMessage(cause, t('The agreement could not be loaded.')))), [id, t]);
  useEffect(() => { void load(); }, [load]);

  const back = <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Agreement reviews')}</button>;
  const problem = error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{serverText(error)}</p>;
  if (!agreement) return <div className="space-y-4">{back}{problem || <p className="text-sm text-slate-500">{t('Loading...')}</p>}</div>;

  const latest = agreement.latestVersion ?? agreement.versions[0]?.version ?? 1;
  const version = agreement.versions[0];
  const actions = agreement.availableActions;
  const canApprove = actions.some(item => item.action === 'SHARIAH_REVIEW' || item.action === 'APPROVED');
  const grounds = agreementOverrideGrounds(canApprove, signals, aiRunId, note);
  const missing = overrideReasonMissing(grounds, overrideReason);
  const clauses = version?.content.approvedClauseIds?.length ?? 0;
  const rules = version?.content.shariahRuleIds?.length ?? 0;
  const failing = (agreement.complianceReport?.checks ?? []).filter(check => !check.pass);

  const decide = async (action: AgreementAction) => {
    if (action === 'CHANGES_REQUESTED' && !note.trim()) { setError(t('Write what must change before asking for changes.')); return; }
    const approving = action === 'SHARIAH_REVIEW' || action === 'APPROVED';
    setSaving(action);
    setError('');
    try {
      await apiClient.reviewAgreement(agreement.id, { reviewStatus: action, note: note.trim() || undefined, ...(aiRunId ? { aiRunId } : {}), ...(approving && grounds.length ? { overrideReason: overrideReason.trim() } : {}) });
      setNote('');
      setAiRunId(null);
      setOverrideReason('');
      await load();
    } catch (cause) { setError(apiErrorMessage(cause, t('The decision could not be saved.'))); } finally { setSaving(null); }
  };

  return (
    <div className="space-y-4">
      {back}
      <div>
        <h1 className="text-lg font-black">{agreement.title || agreement.contractType}</h1>
        <p className="text-[11px] text-slate-500"><span className="font-mono">{agreement.contractNumber}</span> · {t('version {version}', { version: latest })}</p>
        <span className="inline-block mt-1 text-[10px] font-black rounded-full px-2 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-300">{t(STATUS_LABEL[agreement.status] ?? agreement.status)}</span>
      </div>

      {(agreement.parties ?? []).filter(party => party.role).length > 0 && (
        <section className={`${card} space-y-1`}>
          <h2 className="text-sm font-black">{t('Parties')}</h2>
          {agreement.parties!.filter(party => party.role).map(party => <p key={party.displayName} className="text-xs"><span className="text-slate-500">{t(PARTY_LABEL[party.role ?? ''] ?? party.role ?? '')}: </span><span className="font-bold">{party.displayName}</span></p>)}
        </section>
      )}

      <section className={`${card} space-y-1 text-xs`}>
        <h2 className="text-sm font-black">{t('Before you decide')}</h2>
        <p>{t('Compliance check')}: <span className="font-bold">{agreement.complianceReport?.status ?? '-'}</span></p>
        {failing.map(check => <p key={check.key} className="text-rose-700 dark:text-rose-300">{t('Missing: {item}', { item: check.label })}</p>)}
        <p className={clauses ? '' : 'text-amber-700 dark:text-amber-300'}>{t('Approved clauses used')}: <span className="font-bold">{clauses}</span>{clauses ? '' : ` · ${t('Legal approval needs at least one.')}`}</p>
        <p className={rules ? '' : 'text-amber-700 dark:text-amber-300'}>{t('Shariah rules applied')}: <span className="font-bold">{rules}</span>{rules ? '' : ` · ${t('Shariah approval needs at least one.')}`}</p>
      </section>

      {agreement.status !== 'APPROVED' && agreement.status !== 'EXECUTION' && <AgreementChecksPanel agreementId={agreement.id} version={latest} onUseNote={actions.length > 0 ? (text, runId) => { setNote(text); setAiRunId(runId); } : undefined} onSignals={setSignals} />}

      <button type="button" onClick={() => void apiClient.downloadAgreement(agreement.id, 'pdf').catch((cause) => setError(apiErrorMessage(cause, t('The file is unavailable.'))))} className={secondary}>{t('Read the agreement (PDF)')}</button>
      <details className={`${card} text-xs`}>
        <summary className="font-black">{t('Read the text here ({count} sections)', { count: version?.content.sections?.length ?? 0 })}</summary>
        <div className="mt-3 space-y-3">
          {(version?.content.sections ?? []).map(section => (
            <div key={section.number}>
              <p className="font-black">{section.number}. {section.title}</p>
              {section.paragraphs.map((paragraph, index) => <p key={index} className="mt-1 text-slate-600 dark:text-slate-300">{paragraph}</p>)}
            </div>
          ))}
        </div>
      </details>

      {problem}
      {actions.length > 0 ? (
        <section className={`${card} space-y-3`}>
          <h2 className="text-sm font-black">{t('Your decision')}</h2>
          <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('Note for the record (required to ask for changes)')} className={input} />
          {grounds.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 space-y-1 text-xs">
              <p className="font-bold text-amber-800 dark:text-amber-200">{t('To approve, give your reason: {grounds}.', { grounds: grounds.map(serverText).join('; ') })}</p>
              <textarea rows={2} maxLength={1000} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder={t('Why you approve anyway (recorded with your decision)')} className={input} />
            </div>
          )}
          {actions.map(item => (
            <button key={item.action} type="button" disabled={saving !== null || ((item.action === 'SHARIAH_REVIEW' || item.action === 'APPROVED') && missing)} onClick={() => void decide(item.action)} className={item.action === 'CHANGES_REQUESTED' ? secondary : primary}>{saving === item.action ? t('Saving...') : t(ACTION_LABEL[item.action] ?? item.label)}</button>
          ))}
        </section>
      ) : <p className="text-xs text-slate-500">{t('No action for you at this stage. Legal and Shariah decide in turn, each by a different person outside the parties.')}</p>}

      <section className={`${card} space-y-2`}>
        <h2 className="text-sm font-black">{t('History')}</h2>
        <ol className="space-y-2">
          {agreement.events.map(event => (
            <li key={event.id} className="text-xs">
              <p className="font-bold">{event.toStatus ? t(STATUS_LABEL[event.toStatus as AgreementStatus] ?? event.toStatus) : event.eventType} · {event.metadata?.byName ?? event.actorId}</p>
              <p className="text-[11px] text-slate-500">{new Date(event.createdAt).toLocaleString(locale)}</p>
              {event.metadata?.note && <p className="text-[11px] italic">“{event.metadata.note}”</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};
