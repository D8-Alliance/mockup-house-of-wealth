import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Download, Landmark, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { apiClient, CapitalSource, CoverState, CoverType, ProjectSafeguards, TakafulPolicyInput } from '../../services/apiClient';
import { formatProjectMoney } from './sponsorMoney';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';
const LABEL = 'block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1';
const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs';

const COMMITMENT_STATUS: Record<ProjectSafeguards['commitments'][number]['status'], { label: string; className: string }> = {
  PLEDGED: { label: 'Pledged', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
  EVIDENCE_SUBMITTED: { label: 'With Finance', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  EVIDENCED: { label: 'Proved', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  DEPOSITED: { label: 'Deposited', className: 'bg-emerald-600 text-white' },
  REJECTED: { label: 'Evidence not accepted', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
};
const COVER_STATE: Record<CoverState, { label: string; className: string }> = {
  COVERED: { label: 'In force', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  EXPIRING: { label: 'Ends within 30 days', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  PENDING_REVIEW: { label: 'With Risk', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  NOT_STARTED: { label: 'Not started yet', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
  INSUFFICIENT: { label: 'Sum covered too low', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  LAPSED: { label: 'Lapsed', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  MISSING: { label: 'Missing', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
};
export const COVER_TYPE_LABELS: Record<CoverType, string> = {
  ASSET_PROPERTY: 'Fire and perils (building)', MACHINERY: 'Machinery all-risk / breakdown', MOTOR: 'Motor takaful', CONTRACTORS_ALL_RISK: "Contractor's All Risk",
  PUBLIC_LIABILITY: 'Public liability', PERKESO: 'PERKESO (workers)', CROP: 'Crop takaful', KEY_PERSON: 'Key person', OTHER: 'Other cover',
};
const ASSET_COVERS: CoverType[] = ['ASSET_PROPERTY', 'MACHINERY', 'MOTOR'];
const POLICY_STATUS: Record<string, string> = { SUBMITTED: 'With Risk', VERIFIED: 'Verified', REJECTED: 'Not accepted' };
const day = (value: string) => value.slice(0, 10);
const blankPolicy: TakafulPolicyInput = { coverType: 'PUBLIC_LIABILITY', provider: '', policyNumber: '', sumCovered: 0, startDate: '', endDate: '', lossPayee: '', conventional: false };

/**
 * The sponsor's own capital (pledged, proved, deposited) and the takaful cover the project needs: the sponsor
 * keeps them up to date, Finance checks the capital and Risk the cover. Funds are released only once both are in place.
 */
export const ProjectSafeguardsPanel: React.FC<{ projectId: string; onChanged?: () => void }> = ({ projectId, onChanged }) => {
  const [data, setData] = useState<ProjectSafeguards | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pledge, setPledge] = useState<{ source: CapitalSource; partyName: string; amount: string }>({ source: 'SPONSOR_CASH', partyName: '', amount: '' });
  const [policy, setPolicy] = useState<TakafulPolicyInput>(blankPolicy);
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [flags, setFlags] = useState({ hasSiteWork: false, hasWorkers: false });

  const show = useCallback((value: ProjectSafeguards) => {
    setData(value);
    if (value.facts) setFlags({ hasSiteWork: value.facts.hasSiteWork, hasWorkers: value.facts.hasWorkers });
  }, []);
  useEffect(() => { apiClient.getProjectSafeguards(projectId).then(show).catch((cause) => setError(cause instanceof Error ? cause.message : 'Not loaded.')); }, [projectId, show]);

  const run = async (action: () => Promise<ProjectSafeguards>, after?: () => void) => {
    setBusy(true);
    setError('');
    try {
      show(await action());
      after?.();
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Not saved.');
    } finally {
      setBusy(false);
    }
  };
  const note = (key: string) => notes[key]?.trim() ?? '';
  const setNote = (key: string, value: string) => setNotes((current) => ({ ...current, [key]: value }));

  if (!data) return error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null;
  const { facts, access } = data;
  if (!facts) return null;
  const money = (amount: number) => formatProjectMoney(amount, facts.currency);
  const locked = !['DRAFT', 'DUE_DILIGENCE'].includes(data.project.status);
  const sources = [
    ...data.commitments.filter((item) => item.status !== 'REJECTED').map((item) => ({ label: `${item.partyName} (${item.source === 'SPONSOR_CASH' ? 'sponsor cash' : 'other financing'})`, amount: Number(item.amount) })),
    ...facts.inKind.map((item) => ({ label: `${item.assetName}: ${item.ownerName} (asset in kind)`, amount: item.value })),
    ...(facts.pdpCash ? [{ label: 'Delivery partner cash in Musharakah partnerships', amount: facts.pdpCash }] : []),
    { label: 'Investors (wealth pool)', amount: facts.fundingRequired },
  ];
  const uses = [{ label: 'Disbursement tranches', amount: facts.allocatedToTranches }, ...facts.rent.map((item) => ({ label: `Ijarah rent: ${item.assetName} (${item.ownerName})`, amount: item.total }))];
  const totalSources = sources.reduce((sum, item) => sum + item.amount, 0);
  const canAddPolicy = access.manage || access.assetOwner;
  const assetChoices = data.assets.filter((asset) => access.manage || asset.mine);

  return (
    <div className="space-y-4">
      {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">{error}</p>}
      {(facts.blockers.pool.length > 0 || facts.blockers.disburse.length > 0) && (
        <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 text-xs space-y-1">
          <p className="flex items-center gap-1.5 font-black text-amber-800 dark:text-amber-300"><AlertTriangle className="w-4 h-4" />Still needed</p>
          {facts.blockers.pool.map((line) => <p key={line} className="text-slate-700 dark:text-slate-300"><strong>Before the pool opens:</strong> {line}</p>)}
          {facts.blockers.disburse.map((line) => <p key={line} className="text-slate-700 dark:text-slate-300"><strong>Before funds are released:</strong> {line}</p>)}
        </div>
      )}

      <section className={CARD}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Landmark className="w-4 h-4 text-emerald-600" />Sponsor capital</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: `Minimum (${facts.capital.pct}% of ${money(facts.totalProjectCost)})`, value: facts.capital.required },
            { label: 'Pledged', value: facts.capital.pledged, hint: 'needed to submit' },
            { label: 'Proved', value: facts.capital.evidenced, hint: 'needed to open the pool' },
            { label: 'Deposited', value: facts.capital.deposited, hint: 'needed to release funds' },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[10px] uppercase font-bold text-slate-400">{item.label}</p>
              <p className={`text-sm font-black ${item.value >= facts.capital.required ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{money(item.value)}</p>
              {item.hint && <p className="text-[10px] text-slate-500">{item.hint}</p>}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {data.commitments.length === 0 && <p className="text-slate-500">No capital pledged yet.</p>}
          {data.commitments.map((item) => (
            <div key={item.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><strong>{item.partyName}</strong> · {item.source === 'SPONSOR_CASH' ? 'Sponsor cash' : 'Other financing'} · <strong>{money(Number(item.amount))}</strong></span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${COMMITMENT_STATUS[item.status].className}`}>{COMMITMENT_STATUS[item.status].label}</span>
              </div>
              {item.evidenceFileName && <button type="button" onClick={() => void apiClient.downloadCapitalEvidence(projectId, item.id)} className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"><Download className="w-3.5 h-3.5" />{item.evidenceFileName} <span className="font-mono text-slate-400">SHA-256 {item.evidenceSha256?.slice(0, 12)}…</span></button>}
              {item.depositReference && <p className="text-slate-500">Deposit reference: <strong>{item.depositReference}</strong>{item.depositedAt ? ` on ${day(item.depositedAt)}` : ''}</p>}
              {item.reviewNote && <p className="text-slate-500">Finance: {item.reviewNote}</p>}
              {access.manage && ['PLEDGED', 'REJECTED'].includes(item.status) && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />Upload bank statement or funds letter
                    <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run(() => apiClient.uploadCapitalEvidence(projectId, item.id, file)); }} />
                  </label>
                  {!locked && <button type="button" disabled={busy} onClick={() => void run(() => apiClient.removeCapital(projectId, item.id))} className="flex items-center gap-1 text-slate-500 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" />Remove</button>}
                </div>
              )}
              {access.reviewCapital && item.status === 'EVIDENCE_SUBMITTED' && (
                <div className="flex flex-wrap items-center gap-2">
                  <input value={notes[item.id] ?? ''} onChange={(event) => setNote(item.id, event.target.value)} placeholder="What the evidence shows (required)" className={`${INPUT} flex-1 min-w-[220px]`} />
                  <button type="button" disabled={busy || note(item.id).length < 3} onClick={() => void run(() => apiClient.reviewCapital(projectId, item.id, { decision: 'REJECT', note: note(item.id) }), () => setNote(item.id, ''))} className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 font-bold cursor-pointer disabled:opacity-50">Not accepted</button>
                  <button type="button" disabled={busy || note(item.id).length < 3} onClick={() => void run(() => apiClient.reviewCapital(projectId, item.id, { decision: 'VERIFY', note: note(item.id) }), () => setNote(item.id, ''))} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer disabled:opacity-50">Proved</button>
                </div>
              )}
              {access.reviewCapital && item.status === 'EVIDENCED' && (
                <div className="flex flex-wrap items-center gap-2">
                  <input value={notes[`dep-${item.id}`] ?? ''} onChange={(event) => setNote(`dep-${item.id}`, event.target.value)} placeholder="Bank reference of the credit to the project account" className={`${INPUT} flex-1 min-w-[220px]`} />
                  <button type="button" disabled={busy || note(`dep-${item.id}`).length < 3} onClick={() => void run(() => apiClient.recordCapitalDeposit(projectId, item.id, note(`dep-${item.id}`)), () => setNote(`dep-${item.id}`, ''))} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer disabled:opacity-50">Record deposit</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {access.manage && !['COMPLETED', 'REJECTED'].includes(data.project.status) && (
          <div className="grid sm:grid-cols-4 gap-2 items-end p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <label className={LABEL}>Source<select value={pledge.source} onChange={(event) => setPledge({ ...pledge, source: event.target.value as CapitalSource })} className={`${INPUT} mt-1`}><option value="SPONSOR_CASH">Sponsor cash</option><option value="OTHER_FINANCING">Other financing</option></select></label>
            <label className={LABEL}>From<input value={pledge.partyName} onChange={(event) => setPledge({ ...pledge, partyName: event.target.value })} placeholder="e.g. FELCRA Berhad" className={`${INPUT} mt-1`} /></label>
            <label className={LABEL}>Amount ({facts.currency === 'MYR' ? 'RM' : facts.currency})<input type="number" min={1} value={pledge.amount} onChange={(event) => setPledge({ ...pledge, amount: event.target.value })} placeholder={String(Math.round(facts.capital.required))} className={`${INPUT} mt-1`} /></label>
            <button type="button" disabled={busy || pledge.partyName.trim().length < 2 || !(Number(pledge.amount) > 0)} onClick={() => void run(() => apiClient.pledgeCapital(projectId, { source: pledge.source, partyName: pledge.partyName.trim(), amount: Number(pledge.amount) }), () => setPledge({ ...pledge, amount: '' }))} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer disabled:opacity-50">Pledge capital</button>
          </div>
        )}

        <details className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          <summary className="font-bold text-slate-700 dark:text-slate-200 cursor-pointer">Sources and uses</summary>
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <table className="w-full"><thead><tr className="text-[10px] uppercase text-slate-400 text-left"><th>Sources</th><th className="text-right">Amount</th></tr></thead><tbody>
              {sources.map((item) => <tr key={item.label} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1">{item.label}</td><td className="text-right">{money(item.amount)}</td></tr>)}
              <tr className="border-t border-slate-200 font-bold"><td className="py-1">Total</td><td className="text-right">{money(totalSources)}</td></tr>
            </tbody></table>
            <table className="w-full"><thead><tr className="text-[10px] uppercase text-slate-400 text-left"><th>Uses</th><th className="text-right">Amount</th></tr></thead><tbody>
              {uses.map((item) => <tr key={item.label} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1">{item.label}</td><td className="text-right">{money(item.amount)}</td></tr>)}
              <tr className="border-t border-slate-200 font-bold"><td className="py-1">Project cost</td><td className="text-right">{money(facts.totalProjectCost)}</td></tr>
            </tbody></table>
          </div>
          {totalSources < facts.totalProjectCost && <p className="mt-2 text-amber-700 dark:text-amber-400 font-semibold">The sources are {money(facts.totalProjectCost - totalSources)} short of the project cost.</p>}
        </details>
      </section>

      <section className={CARD}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><ShieldCheck className="w-4 h-4 text-emerald-600" />Takaful cover</h3>
        {access.manage && !locked && (
          <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <label className="flex items-center gap-1.5 font-semibold cursor-pointer"><input type="checkbox" checked={flags.hasSiteWork} onChange={(event) => setFlags({ ...flags, hasSiteWork: event.target.checked })} />The project has site works (clearing, construction)</label>
            <label className="flex items-center gap-1.5 font-semibold cursor-pointer"><input type="checkbox" checked={flags.hasWorkers} onChange={(event) => setFlags({ ...flags, hasWorkers: event.target.checked })} />The project employs workers</label>
            {(flags.hasSiteWork !== facts.hasSiteWork || flags.hasWorkers !== facts.hasWorkers) && <button type="button" disabled={busy} onClick={() => void run(() => apiClient.setProjectRiskFlags(projectId, flags))} className="px-3 py-1.5 rounded-xl border border-emerald-500 text-emerald-700 font-bold cursor-pointer">Save</button>}
          </div>
        )}
        {facts.cover.length === 0 ? <p className="text-slate-500">No cover is required yet. Site works, workers and assets in agreed partnerships add their cover here.</p> : (
          <table className="w-full text-left"><thead><tr className="text-[10px] uppercase text-slate-400"><th className="py-1">Required cover</th><th>Taken out by</th><th>Minimum sum</th><th>Status</th></tr></thead><tbody>
            {facts.cover.map((item) => (
              <tr key={item.key} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 font-semibold">{item.label}</td>
                <td className="text-slate-500">{item.payer}</td>
                <td>{item.minSumCovered ? money(item.minSumCovered) : '-'}</td>
                <td><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${COVER_STATE[item.state].className}`}>{COVER_STATE[item.state].label}</span>{item.coveredUntil && <span className="ml-1 text-slate-500">until {day(item.coveredUntil)}</span>}</td>
              </tr>
            ))}
          </tbody></table>
        )}

        <div className="space-y-2">
          {data.policies.map((item) => (
            <div key={item.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><strong>{COVER_TYPE_LABELS[item.coverType]}</strong>{item.assetId ? ` · ${data.assets.find((asset) => asset.assetId === item.assetId)?.name ?? item.assetId}` : ''} · {item.provider} {item.policyNumber}</span>
                <span className="text-[10px] font-black">{POLICY_STATUS[item.status]}</span>
              </div>
              <p className="text-slate-500">Covers {money(Number(item.sumCovered))} · {day(item.startDate)} to {day(item.endDate)} · claims paid to {item.lossPayee}{item.conventional ? ' · conventional insurance' : ''}</p>
              {item.conventional && item.shariahApprovalNote && <p className="text-slate-500">Shariah approval: {item.shariahApprovalNote}</p>}
              <button type="button" onClick={() => void apiClient.downloadTakafulPolicy(projectId, item.id)} className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"><Download className="w-3.5 h-3.5" />{item.fileName}</button>
              {item.reviewNote && <p className="text-slate-500">Risk: {item.reviewNote}</p>}
              {access.reviewTakaful && item.status === 'SUBMITTED' && (
                <div className="flex flex-wrap items-center gap-2">
                  <input value={notes[item.id] ?? ''} onChange={(event) => setNote(item.id, event.target.value)} placeholder="What you checked in the schedule (required)" className={`${INPUT} flex-1 min-w-[220px]`} />
                  <button type="button" disabled={busy || note(item.id).length < 3} onClick={() => void run(() => apiClient.reviewTakafulPolicy(projectId, item.id, { decision: 'REJECT', note: note(item.id) }), () => setNote(item.id, ''))} className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 font-bold cursor-pointer disabled:opacity-50">Not accepted</button>
                  <button type="button" disabled={busy || note(item.id).length < 3} onClick={() => void run(() => apiClient.reviewTakafulPolicy(projectId, item.id, { decision: 'VERIFY', note: note(item.id) }), () => setNote(item.id, ''))} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer disabled:opacity-50">Verify</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {canAddPolicy && (
          <details className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <summary className="font-bold text-slate-700 dark:text-slate-200 cursor-pointer">Add a policy</summary>
            <div className="grid sm:grid-cols-3 gap-2 mt-3">
              <label className={LABEL}>Cover<select value={policy.coverType} onChange={(event) => setPolicy({ ...policy, coverType: event.target.value as CoverType, assetId: undefined })} className={`${INPUT} mt-1`}>{(Object.keys(COVER_TYPE_LABELS) as CoverType[]).filter((type) => access.manage || ASSET_COVERS.includes(type)).map((type) => <option key={type} value={type}>{COVER_TYPE_LABELS[type]}</option>)}</select></label>
              {ASSET_COVERS.includes(policy.coverType) && <label className={LABEL}>Asset<select value={policy.assetId ?? ''} onChange={(event) => setPolicy({ ...policy, assetId: event.target.value || undefined })} className={`${INPUT} mt-1`}><option value="">Choose the asset</option>{assetChoices.map((asset) => <option key={asset.assetId} value={asset.assetId}>{asset.name}</option>)}</select></label>}
              <label className={LABEL}>Takaful operator<input value={policy.provider} onChange={(event) => setPolicy({ ...policy, provider: event.target.value })} className={`${INPUT} mt-1`} /></label>
              <label className={LABEL}>Policy number<input value={policy.policyNumber} onChange={(event) => setPolicy({ ...policy, policyNumber: event.target.value })} className={`${INPUT} mt-1`} /></label>
              <label className={LABEL}>Sum covered<input type="number" min={1} value={policy.sumCovered || ''} onChange={(event) => setPolicy({ ...policy, sumCovered: Number(event.target.value) })} className={`${INPUT} mt-1`} /></label>
              <label className={LABEL}>Contribution (premium)<input type="number" min={0} value={policy.contribution ?? ''} onChange={(event) => setPolicy({ ...policy, contribution: event.target.value === '' ? undefined : Number(event.target.value) })} className={`${INPUT} mt-1`} /></label>
              <label className={LABEL}>From<input type="date" value={policy.startDate} onChange={(event) => setPolicy({ ...policy, startDate: event.target.value })} className={`${INPUT} mt-1`} /></label>
              <label className={LABEL}>Until<input type="date" value={policy.endDate} onChange={(event) => setPolicy({ ...policy, endDate: event.target.value })} className={`${INPUT} mt-1`} /></label>
              <label className={LABEL}>Claims paid to<input value={policy.lossPayee} onChange={(event) => setPolicy({ ...policy, lossPayee: event.target.value })} placeholder="e.g. the project account" className={`${INPUT} mt-1`} /></label>
            </div>
            <label className="flex items-center gap-1.5 mt-2 font-semibold cursor-pointer"><input type="checkbox" checked={policy.conventional} onChange={(event) => setPolicy({ ...policy, conventional: event.target.checked })} />Conventional insurance (no takaful available)</label>
            {policy.conventional && <input value={policy.shariahApprovalNote ?? ''} onChange={(event) => setPolicy({ ...policy, shariahApprovalNote: event.target.value })} placeholder="Shariah adviser's written approval: who approved and when (required)" className={`${INPUT} mt-2`} />}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setPolicyFile(event.target.files?.[0] ?? null)} className="text-xs" />
              <button type="button" disabled={busy || !policyFile || !policy.provider.trim() || !policy.policyNumber.trim() || !(policy.sumCovered > 0) || !policy.startDate || !policy.endDate || !policy.lossPayee.trim() || (ASSET_COVERS.includes(policy.coverType) && !policy.assetId) || (policy.conventional && !policy.shariahApprovalNote?.trim())} onClick={() => policyFile && void run(() => apiClient.addTakafulPolicy(projectId, policy, policyFile), () => { setPolicy(blankPolicy); setPolicyFile(null); })} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer disabled:opacity-50">Submit for verification</button>
            </div>
          </details>
        )}
      </section>
    </div>
  );
};
