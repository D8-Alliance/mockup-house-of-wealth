import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ProjectMilestone } from './SponsorTypes';
import { Calendar, ShieldCheck, CheckCircle2, Plus, HandCoins, Trash2 } from 'lucide-react';
import { apiClient, BackendFundingRequest, BackendProjectMilestone } from '../../services/apiClient';
import { formatProjectMoney } from './sponsorMoney';

interface ProjectMilestoneListProps {
  projectId: string;
  initialMilestones: ProjectMilestone[];
  currency: string;
  /** The funding asked from investors; the tranches together cannot exceed it. */
  fundingRequired: number;
  /** Tranches are set before the project is approved. */
  editable: boolean;
  onChange?: (milestones: ProjectMilestone[]) => void;
  /** The project's server status: tranches are released once it is FUNDED. */
  projectStatus?: string;
  /** The project side (sponsor, project manager) asks for releases. */
  canRequestRelease?: boolean;
}

const RELEASABLE = ['FUNDED', 'EXECUTION'];

/** Where a tranche's latest release request stands, in words for the project side. */
const releaseState = (request: BackendFundingRequest | undefined): { text: string; className: string } | null => {
  if (!request) return null;
  if (request.status === 'PENDING') return { text: 'Release asked: Finance to approve', className: 'text-blue-700 dark:text-blue-300' };
  if (request.status === 'APPROVED') return { text: 'Approved: the Country Admin releases the funds', className: 'text-blue-700 dark:text-blue-300' };
  if (request.status === 'DISBURSED') return { text: `Released${request.disbursedAt ? ` on ${request.disbursedAt.slice(0, 10)}` : ''}`, className: 'text-emerald-600' };
  return { text: `Release rejected${request.decisionNote ? `: ${request.decisionNote}` : ''}`, className: 'text-rose-600' };
};

const fromServer = (milestone: BackendProjectMilestone): ProjectMilestone => ({
  id: milestone.id, title: milestone.title, targetDate: milestone.targetDate ? milestone.targetDate.slice(0, 10) : '', completionPct: milestone.completionPct, disbursementAmount: Number(milestone.disbursementAmount),
  status: milestone.status === 'RELEASED' ? 'Released' : milestone.status === 'COMPLETED' ? 'Completed' : milestone.status === 'IN_PROGRESS' ? 'In Progress' : milestone.status === 'PENDING_VERIFICATION' ? 'Pending Verification' : 'Upcoming',
  shariahSignoff: milestone.shariahSignoff, auditorSignoff: milestone.auditorSignoff,
});

/** The project's governance steps and the tranches in which investors' funds are released. */
export const ProjectMilestoneList: React.FC<ProjectMilestoneListProps> = ({ projectId, initialMilestones, currency, fundingRequired, editable, onChange, projectStatus, canRequestRelease = false }) => {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(initialMilestones);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneAmount, setNewMilestoneAmount] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [saving, setSaving] = useState(false);
  // A second click before the first save returns must not add the tranche twice.
  const submitting = useRef(false);
  const [removing, setRemoving] = useState('');
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<BackendFundingRequest[]>([]);
  const [releaseBusy, setReleaseBusy] = useState('');
  const [releaseError, setReleaseError] = useState('');
  const releasable = RELEASABLE.includes(projectStatus ?? '');

  // Release requests are visible to the project side; others simply see the tranches.
  const loadRequests = useCallback(() => {
    if (!releasable) return;
    apiClient.getFundingRequests(projectId).then(setRequests).catch(() => setRequests([]));
  }, [projectId, releasable]);
  useEffect(loadRequests, [loadRequests]);
  // Newest first from the server, so the first match is the tranche's latest request.
  const latestFor = (milestoneId: string) => requests.find((request) => request.milestoneId === milestoneId);

  const askForRelease = async (milestoneId: string) => {
    setReleaseBusy(milestoneId);
    setReleaseError('');
    try {
      await apiClient.requestTrancheRelease(projectId, milestoneId);
      loadRequests();
    } catch (cause) {
      setReleaseError(cause instanceof Error ? cause.message : 'The release was not requested.');
    } finally {
      setReleaseBusy('');
    }
  };

  const allocated = milestones.reduce((sum, m) => sum + m.disbursementAmount, 0);
  const remaining = Math.max(0, fundingRequired - allocated);

  const handleAddMilestone = async () => {
    const amount = Number(newMilestoneAmount);
    if (newMilestoneTitle.trim().length < 3) return setError('Say what the funds are released for.');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter the amount released at this tranche.');
    if (amount > remaining) return setError(`Only ${formatProjectMoney(remaining, currency)} of the funding is left to allocate.`);
    if (!newMilestoneDate) return setError('Choose the target date of the tranche.');
    if (submitting.current) return;
    submitting.current = true;
    setError('');
    setSaving(true);
    try {
      const created = await apiClient.createProjectMilestone(projectId, { title: newMilestoneTitle.trim(), targetDate: newMilestoneDate, disbursementAmount: amount });
      const next = [...milestones, fromServer(created)];
      setMilestones(next);
      onChange?.(next);
      setNewMilestoneTitle('');
      setNewMilestoneAmount('');
      setNewMilestoneDate('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The tranche was not saved.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const handleRemove = async (milestone: ProjectMilestone) => {
    if (!window.confirm(`Remove the tranche "${milestone.title}" (${formatProjectMoney(milestone.disbursementAmount, currency)})?`)) return;
    setRemoving(milestone.id);
    setError('');
    try {
      await apiClient.deleteProjectMilestone(projectId, milestone.id);
      const next = milestones.filter((m) => m.id !== milestone.id);
      setMilestones(next);
      onChange?.(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The tranche was not removed.');
    } finally {
      setRemoving('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Milestones and disbursement tranches</h3>
        <span className="text-xs text-slate-500">Allocated {formatProjectMoney(allocated, currency)} of {formatProjectMoney(fundingRequired, currency)} · <strong className={remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}>{formatProjectMoney(remaining, currency)} unallocated</strong></span>
      </div>

      <div className="space-y-3">
        {milestones.map((m, index) => (
          <div key={m.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-500">M{index + 1}</span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{m.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  m.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {m.status}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.disbursementAmount > 0 ? formatProjectMoney(m.disbursementAmount, currency) : 'No release'}</span>
                {editable && m.disbursementAmount > 0 && (
                  <button type="button" onClick={() => void handleRemove(m)} disabled={removing === m.id} title="Remove this tranche" aria-label={`Remove tranche ${m.title}`} className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Target: {m.targetDate || 'No date set'}</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className={`w-3.5 h-3.5 ${m.shariahSignoff ? 'text-emerald-500' : 'text-slate-400'}`} />
                Shariah: {m.shariahSignoff ? 'Verified' : 'Pending'}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className={`w-3.5 h-3.5 ${m.auditorSignoff ? 'text-emerald-500' : 'text-slate-400'}`} />
                Audit: {m.auditorSignoff ? 'Passed' : 'Pending'}
              </span>
            </div>

            {releasable && m.disbursementAmount > 0 && (() => {
              const latest = latestFor(m.id);
              const state = releaseState(latest);
              const canAsk = canRequestRelease && (!latest || latest.status === 'REJECTED');
              return (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-700 pt-2 text-[11px]">
                  <span className={`flex items-center gap-1 font-bold ${state?.className ?? 'text-slate-500'}`}><HandCoins className="w-3.5 h-3.5" />{state?.text ?? 'Not yet asked for'}</span>
                  {canAsk && (
                    <button type="button" disabled={releaseBusy === m.id} onClick={() => void askForRelease(m.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 font-black text-white disabled:opacity-50 cursor-pointer">
                      {releaseBusy === m.id ? 'Asking…' : latest ? 'Ask again' : 'Ask for release'}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
      {releaseError && <p className="text-xs font-bold text-rose-600">{releaseError}</p>}
      {canRequestRelease && !releasable && milestones.some((m) => m.disbursementAmount > 0) && (projectStatus ?? '') !== 'DRAFT' && (projectStatus ?? '') !== 'DUE_DILIGENCE' && (
        <p className="text-[11px] text-slate-500">Tranche releases open once the pool has raised the funding required (the project becomes FUNDED).</p>
      )}

      {editable ? (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
          <p className="mb-1 text-xs font-black uppercase tracking-wide text-amber-800 dark:text-amber-300">Add a disbursement tranche</p>
          <p className="mb-3 text-[11px] text-slate-500">What investors' funds are released for, when, and how much. Together the tranches cannot exceed the funding required.</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Released for
              <input type="text" value={newMilestoneTitle} onChange={(e) => setNewMilestoneTitle(e.target.value)} placeholder="e.g. Land clearing and terracing" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
            <label className="w-full text-[11px] font-bold text-slate-600 dark:text-slate-300 sm:w-40">
              Amount ({currency === 'MYR' ? 'RM' : currency})
              <input type="number" min={1} value={newMilestoneAmount} onChange={(e) => setNewMilestoneAmount(e.target.value)} placeholder={String(Math.round(remaining))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
            <label className="w-full text-[11px] font-bold text-slate-600 dark:text-slate-300 sm:w-40">
              Target date
              <input type="date" value={newMilestoneDate} onChange={(e) => setNewMilestoneDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
            <button type="button" onClick={() => void handleAddMilestone()} disabled={saving || remaining <= 0} className="flex items-center justify-center gap-1 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-amber-600 disabled:opacity-50 cursor-pointer">
              <Plus className="w-4 h-4" /> {saving ? 'Saving…' : 'Add tranche'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">Tranches are fixed once the project is approved. A Country Admin can reopen the project to change them.</p>
      )}
    </div>
  );
};
