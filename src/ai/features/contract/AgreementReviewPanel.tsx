import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSignature, RefreshCw, X } from 'lucide-react';
import { AgreementAction, AgreementDetail, AgreementStatus, AgreementSummary, apiClient, apiErrorMessage } from '../../../services/apiClient';
import { formatDateTime } from '../../../utils/platformTime';

const STATUS_LABELS: Record<AgreementStatus, string> = {
  DRAFT: 'Draft',
  LEGAL_REVIEW: 'Legal review',
  SHARIAH_REVIEW: 'Shariah review',
  APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes requested',
  EXECUTION: 'Executed',
};

const STATUS_STYLES: Record<AgreementStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  LEGAL_REVIEW: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  SHARIAH_REVIEW: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  CHANGES_REQUESTED: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  EXECUTION: 'bg-emerald-600 text-white',
};

// The normal path; CHANGES_REQUESTED sends the agreement back to the drafter between steps.
const STEPS: AgreementStatus[] = ['DRAFT', 'LEGAL_REVIEW', 'SHARIAH_REVIEW', 'APPROVED', 'EXECUTION'];

const ACTION_STYLES: Record<AgreementAction, string> = {
  LEGAL_REVIEW: 'bg-blue-600 hover:bg-blue-700 text-white',
  SHARIAH_REVIEW: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  APPROVED: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  EXECUTION: 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900',
  CHANGES_REQUESTED: 'border border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/30',
};

const StatusChip: React.FC<{ status: AgreementStatus }> = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT}`}>{STATUS_LABELS[status] ?? status}</span>
);

/**
 * Drafting organisations submit and execute; Legal Officers and Shariah reviewers of the country
 * decide. The server decides who may do what (agreement-review-rules.ts) and sends the allowed
 * actions with each agreement, so this panel only shows buttons the person can actually use.
 */
export const AgreementReviewPanel: React.FC = () => {
  const [items, setItems] = useState<AgreementSummary[]>([]);
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AgreementDetail | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<AgreementAction | null>(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await apiClient.listAgreements());
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Unable to load agreements.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const open = async (id: string) => {
    setActionError('');
    setNote('');
    try {
      setSelected(await apiClient.getAgreement(id));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Unable to open the agreement.'));
    }
  };

  const decide = async (action: AgreementAction) => {
    if (!selected) return;
    if (action === 'CHANGES_REQUESTED' && !note.trim()) {
      setActionError('Write what must change before requesting changes.');
      return;
    }
    setSaving(action);
    setActionError('');
    try {
      await apiClient.reviewAgreement(selected.id, { reviewStatus: action, note: note.trim() || undefined });
      setNote('');
      await Promise.all([load(), open(selected.id)]);
    } catch (cause) {
      setActionError(apiErrorMessage(cause, 'The decision could not be saved.'));
    } finally {
      setSaving(null);
    }
  };

  const visible = filter === 'mine' ? items.filter((item) => item.availableActions.length > 0) : items;
  const version = selected?.versions[0];
  const clauseCount = version?.content.approvedClauseIds?.length ?? 0;
  const ruleCount = version?.content.shariahRuleIds?.length ?? 0;
  const stepIndex = selected ? STEPS.indexOf(selected.status === 'CHANGES_REQUESTED' ? 'DRAFT' : selected.status) : -1;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"><FileSignature className="w-5 h-5" /></div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Islamic Finance Agreements</h3>
            <p className="text-xs text-slate-500">Draft → Legal review → Shariah review → Approved → Executed. Create drafts in AI Wealth Engine → Agreement Generation.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([['mine', 'Needs my action'], ['all', 'All I can see']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`px-3 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${filter === value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
              {label}{value === 'mine' ? ` (${items.filter((item) => item.availableActions.length > 0).length})` : ''}
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
              <th className="py-2.5 px-3">Agreement</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Updated</th>
              <th className="py-2.5 px-3">Your next step</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id} onClick={() => void open(item.id)} className={`border-b border-slate-100 dark:border-slate-700/60 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 ${selected?.id === item.id ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''}`}>
                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-200">{item.contractNumber}</td>
                <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">{item.title || item.contractType}</td>
                <td className="py-2.5 px-3"><StatusChip status={item.status} /></td>
                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatDateTime(item.updatedAt)}</td>
                <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">{item.availableActions.map((action) => action.label).join(' / ') || '—'}</td>
              </tr>
            ))}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={5} className="py-6 px-3 text-center text-slate-500">{filter === 'mine' ? 'Nothing is waiting for you. Switch to "All I can see" to view other agreements.' : 'No agreements yet. Drafts created in Agreement Generation appear here.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">{selected.title}</h4>
                <StatusChip status={selected.status} />
              </div>
              <p className="text-xs text-slate-500 font-mono">{selected.contractNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => void apiClient.downloadAgreement(selected.id, 'pdf')} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"><Download className="w-3.5 h-3.5" /> PDF</button>
              <button type="button" onClick={() => void apiClient.downloadAgreement(selected.id, 'docx')} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"><Download className="w-3.5 h-3.5" /> Word</button>
              <button type="button" onClick={() => setSelected(null)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer" title="Close"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <ol className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            {STEPS.map((step, index) => (
              <li key={step} className={`flex items-center gap-2 ${index <= stepIndex ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${index <= stepIndex ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>{index + 1}</span>
                {STATUS_LABELS[step]}
                {index < STEPS.length - 1 && <span className="text-slate-300">→</span>}
              </li>
            ))}
          </ol>
          {selected.status === 'CHANGES_REQUESTED' && <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Changes were requested. The drafting organisation resubmits it for legal review.</p>}

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3">
              <div className="text-slate-500 font-bold">Compliance check</div>
              <div className="font-extrabold text-slate-900 dark:text-white">{selected.complianceReport?.status ?? '—'}</div>
              {(selected.complianceReport?.checks ?? []).filter((check) => !check.pass).map((check) => <div key={check.key} className="text-rose-600 dark:text-rose-300">Missing: {check.label}</div>)}
            </div>
            <div className={`rounded-xl p-3 ${clauseCount ? 'bg-slate-50 dark:bg-slate-900/50' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
              <div className="text-slate-500 font-bold">Approved clauses used</div>
              <div className="font-extrabold text-slate-900 dark:text-white">{clauseCount}</div>
              {!clauseCount && <div className="text-amber-700 dark:text-amber-300">Legal approval needs at least one.</div>}
            </div>
            <div className={`rounded-xl p-3 ${ruleCount ? 'bg-slate-50 dark:bg-slate-900/50' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
              <div className="text-slate-500 font-bold">Shariah rules applied</div>
              <div className="font-extrabold text-slate-900 dark:text-white">{ruleCount}</div>
              {!ruleCount && <div className="text-amber-700 dark:text-amber-300">Shariah approval needs at least one.</div>}
            </div>
          </div>

          <details className="rounded-xl border border-slate-200 dark:border-slate-700">
            <summary className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">Read the agreement text ({version?.content.sections?.length ?? 0} sections)</summary>
            <div className="px-4 pb-4 space-y-3 max-h-96 overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
              {(version?.content.sections ?? []).map((section) => (
                <div key={section.number}>
                  <div className="font-extrabold text-slate-900 dark:text-white">{section.number}. {section.title}</div>
                  {section.paragraphs.map((paragraph, index) => <p key={index} className="mt-1">{paragraph}</p>)}
                </div>
              ))}
            </div>
          </details>

          {selected.availableActions.length > 0 ? (
            <div className="space-y-2">
              <label htmlFor="agreement-review-note" className="block text-xs font-bold text-slate-600 dark:text-slate-300">Note for the record {selected.availableActions.some((item) => item.action === 'CHANGES_REQUESTED') && <span className="font-normal text-slate-500">(required when requesting changes)</span>}</label>
              <textarea id="agreement-review-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white" placeholder="What you checked, or what must change" />
              {actionError && <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold"><AlertTriangle className="w-4 h-4 shrink-0" />{actionError}</div>}
              <div className="flex flex-wrap gap-2">
                {selected.availableActions.map((item) => (
                  <button key={item.action} type="button" disabled={saving !== null} onClick={() => void decide(item.action)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60 ${ACTION_STYLES[item.action]}`}>
                    {item.action !== 'CHANGES_REQUESTED' && <CheckCircle2 className="w-4 h-4" />}
                    {saving === item.action ? 'Saving…' : item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No action for you at this stage. Each step is taken by a different person: the drafting organisation submits and executes, a Legal Officer gives the legal decision and a Shariah reviewer gives the Shariah decision.</p>
          )}

          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">History</div>
            <ul className="space-y-1.5 text-xs">
              {selected.events.map((event) => (
                <li key={event.id} className="flex flex-wrap gap-x-2 text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400 whitespace-nowrap">{formatDateTime(event.createdAt)}</span>
                  <span className="font-semibold">{event.toStatus ? STATUS_LABELS[event.toStatus as AgreementStatus] ?? event.toStatus : event.eventType}</span>
                  <span>by {event.actorId}{event.metadata?.role ? ` (${event.metadata.role})` : ''}</span>
                  {event.metadata?.note && <span className="italic">“{event.metadata.note}”</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
