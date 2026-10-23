import React, { useState } from 'react';
import { ProjectMilestone } from './SponsorTypes';
import { Calendar, ShieldCheck, CheckCircle2, Plus } from 'lucide-react';
import { apiClient, BackendProjectMilestone } from '../../services/apiClient';
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
}

const fromServer = (milestone: BackendProjectMilestone): ProjectMilestone => ({
  id: milestone.id, title: milestone.title, targetDate: milestone.targetDate ? milestone.targetDate.slice(0, 10) : '', completionPct: milestone.completionPct, disbursementAmount: Number(milestone.disbursementAmount),
  status: milestone.status === 'COMPLETED' ? 'Completed' : milestone.status === 'IN_PROGRESS' ? 'In Progress' : milestone.status === 'PENDING_VERIFICATION' ? 'Pending Verification' : 'Upcoming',
  shariahSignoff: milestone.shariahSignoff, auditorSignoff: milestone.auditorSignoff,
});

/** The project's governance steps and the tranches in which investors' funds are released. */
export const ProjectMilestoneList: React.FC<ProjectMilestoneListProps> = ({ projectId, initialMilestones, currency, fundingRequired, editable, onChange }) => {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(initialMilestones);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneAmount, setNewMilestoneAmount] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allocated = milestones.reduce((sum, m) => sum + m.disbursementAmount, 0);
  const remaining = Math.max(0, fundingRequired - allocated);

  const handleAddMilestone = async () => {
    const amount = Number(newMilestoneAmount);
    if (newMilestoneTitle.trim().length < 3) return setError('Say what the funds are released for.');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter the amount released at this tranche.');
    if (amount > remaining) return setError(`Only ${formatProjectMoney(remaining, currency)} of the funding is left to allocate.`);
    if (!newMilestoneDate) return setError('Choose the target date of the tranche.');
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
      setSaving(false);
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
          </div>
        ))}
      </div>

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
