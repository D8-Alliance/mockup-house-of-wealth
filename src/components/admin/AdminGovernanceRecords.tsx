import React from 'react';
import { AlertTriangle, BookOpen, Plus, ShieldAlert } from 'lucide-react';
import { apiClient, apiErrorMessage, FatwaInput, FatwaRecord, IncidentRecord, RiskInput, RiskItem } from '../../services/apiClient';
import { useRBAC } from '../../rbac/RBACContext';
import { Card, label, Status, TD, TH } from './AdminLivePlatformSections';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';
const THEAD = 'bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400';
const TABLE_WRAP = 'overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700';
const BUTTON = 'px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50';

const RISK_CATEGORIES = ['OPERATIONAL', 'FINANCIAL', 'SHARIAH', 'LEGAL', 'TECHNOLOGY', 'REPUTATIONAL', 'OTHER'];
const INCIDENT_CATEGORIES = ['SECURITY', 'OPERATIONAL', 'SHARIAH', 'COMPLIANCE', 'DATA_PROTECTION', 'OTHER'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const NEXT_INCIDENT_STATUS: Record<string, string[]> = { OPEN: ['INVESTIGATING', 'RESOLVED'], INVESTIGATING: ['RESOLVED'], RESOLVED: ['CLOSED', 'INVESTIGATING'] };
const RISK_EDITORS = ['Super Admin', 'Country Admin', 'Compliance Officer', 'Risk Officer'];
const FATWA_EDITORS = ['Super Admin', 'Shariah Committee', 'Shariah Advisor'];

/** Loads a list and reloads it after a change. */
function useList<T>(load: () => Promise<T[]>) {
  const [rows, setRows] = React.useState<T[] | null>(null);
  const [error, setError] = React.useState('');
  const reload = React.useCallback(() => { load().then(setRows).catch((cause) => setError(apiErrorMessage(cause, 'Could not be loaded.'))); }, [load]);
  React.useEffect(reload, [reload]);
  return { rows, error, setError, reload };
}

/** Super Admin records in a chosen country; everyone else in their own, so the picker shows only for Super Admin. */
const CountryPicker: React.FC<{ value: string; onChange: (value: string) => void; allowAll?: boolean }> = ({ value, onChange, allowAll }) => {
  const [countries, setCountries] = React.useState<Array<{ code: string; name: string }>>([]);
  React.useEffect(() => { apiClient.getCountryRules().then((rules) => setCountries(rules.countries)).catch(() => setCountries([])); }, []);
  return (
    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Country
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${INPUT} mt-1 font-normal`}>
        <option value="">{allowAll ? 'Every country' : 'Choose…'}</option>
        {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
      </select>
    </label>
  );
};

const scoreClass = (score: number) => (score >= 15 ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : score >= 8 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300');
const blankRisk = (): RiskInput => ({ title: '', category: 'OPERATIONAL', likelihood: 3, impact: 3, ownerName: '', mitigation: '', status: 'OPEN' });

export const LiveRiskRegister: React.FC = () => {
  const { currentRole } = useRBAC();
  const canEdit = RISK_EDITORS.includes(currentRole);
  const superAdmin = currentRole === 'Super Admin';
  const { rows, error, setError, reload } = useList<RiskItem>(apiClient.getRisks);
  const [editing, setEditing] = React.useState<{ id?: string; input: RiskInput } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try { await apiClient.saveRisk({ ...editing.input, reviewDue: editing.input.reviewDue || undefined }, editing.id); setEditing(null); reload(); } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(false); }
  };
  const set = (patch: Partial<RiskInput>) => editing && setEditing({ ...editing, input: { ...editing.input, ...patch } });

  return (
    <Card icon={<AlertTriangle className="w-5 h-5 text-purple-600" />} title="Risk Register" lead="Risks recorded by Risk and Compliance. Score = likelihood × impact (1–25); 15 and above is high. Every change is written to the audit log.">
      <Status error={error} loading={!rows} />
      {canEdit && !editing && <button type="button" onClick={() => setEditing({ input: blankRisk() })} className={`${BUTTON} flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" />Add risk</button>}
      {editing && (
        <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-500/30 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">Risk<input value={editing.input.title} onChange={(event) => set({ title: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
            {superAdmin && !editing.id && <CountryPicker value={editing.input.countryNodeId ?? ''} onChange={(value) => set({ countryNodeId: value })} />}
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Category<select value={editing.input.category} onChange={(event) => set({ category: event.target.value })} className={`${INPUT} mt-1 font-normal`}>{RISK_CATEGORIES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Likelihood (1 rare – 5 almost certain)<input type="number" min={1} max={5} value={editing.input.likelihood} onChange={(event) => set({ likelihood: Number(event.target.value) })} className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Impact (1 minor – 5 severe)<input type="number" min={1} max={5} value={editing.input.impact} onChange={(event) => set({ impact: Number(event.target.value) })} className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Owner<input value={editing.input.ownerName} onChange={(event) => set({ ownerName: event.target.value })} placeholder="Person or function responsible" className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Next review<input type="date" value={editing.input.reviewDue?.slice(0, 10) ?? ''} onChange={(event) => set({ reviewDue: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Status<select value={editing.input.status} onChange={(event) => set({ status: event.target.value })} className={`${INPUT} mt-1 font-normal`}>{['OPEN', 'MITIGATING', 'CLOSED'].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">Mitigation<textarea rows={2} value={editing.input.mitigation} onChange={(event) => set({ mitigation: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
          </div>
          <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void save()} className={BUTTON}>Save</button><button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold cursor-pointer">Cancel</button></div>
        </div>
      )}
      {rows && (rows.length === 0 ? <p className="text-xs text-slate-500">No risks recorded yet.</p> : (
        <div className={TABLE_WRAP}>
          <table className="w-full text-xs">
            <thead className={THEAD}><tr><th className={`${TH} text-left`}>Risk</th><th className={`${TH} text-left`}>Category</th><th className={`${TH} text-center`}>Score</th><th className={`${TH} text-left`}>Owner</th><th className={`${TH} text-left`}>Status</th><th className={`${TH} text-left`}>Review</th><th className={TH} /></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {rows.map((risk) => (
                <tr key={risk.id} className="align-top">
                  <td className={TD}><p className="font-bold text-slate-900 dark:text-white">{risk.title}</p>{risk.mitigation && <p className="text-slate-500">{risk.mitigation}</p>}</td>
                  <td className={TD}>{label(risk.category)}</td>
                  <td className={`${TD} text-center`}><span className={`px-2 py-0.5 rounded font-black ${scoreClass(risk.score)}`}>{risk.score}</span></td>
                  <td className={TD}>{risk.ownerName}</td>
                  <td className={TD}>{label(risk.status)}</td>
                  <td className={TD}>{risk.reviewDue ? risk.reviewDue.slice(0, 10) : '—'}</td>
                  <td className={TD}>{canEdit && <button type="button" onClick={() => setEditing({ id: risk.id, input: { title: risk.title, category: risk.category, likelihood: risk.likelihood, impact: risk.impact, ownerName: risk.ownerName, mitigation: risk.mitigation, status: risk.status, reviewDue: risk.reviewDue ?? undefined } })} className="text-purple-600 font-bold cursor-pointer">Edit</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </Card>
  );
};

const severityClass: Record<string, string> = { LOW: 'bg-slate-500/10 text-slate-600', MEDIUM: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', HIGH: 'bg-orange-500/10 text-orange-700 dark:text-orange-300', CRITICAL: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' };

export const LiveIncidents: React.FC = () => {
  const { currentRole } = useRBAC();
  const canEdit = RISK_EDITORS.includes(currentRole);
  const superAdmin = currentRole === 'Super Admin';
  const { rows, error, setError, reload } = useList<IncidentRecord>(apiClient.getIncidents);
  const [draft, setDraft] = React.useState<{ countryNodeId: string; title: string; category: string; severity: string; description: string; occurredAt: string } | null>(null);
  const [step, setStep] = React.useState<{ id: string; status: string; note: string } | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const run = async (action: () => Promise<unknown>, done: () => void) => {
    setBusy(true);
    try { await action(); done(); reload(); } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(false); }
  };

  return (
    <Card icon={<ShieldAlert className="w-5 h-5 text-purple-600" />} title="Incidents" lead="Security, operational, Shariah, compliance and data-protection incidents, with every status change and note. A personal-data breach may also need notifying to the regulator (PDPA); check with the Data Protection Officer.">
      <Status error={error} loading={!rows} />
      {canEdit && !draft && <button type="button" onClick={() => setDraft({ countryNodeId: '', title: '', category: 'OPERATIONAL', severity: 'MEDIUM', description: '', occurredAt: new Date().toISOString().slice(0, 10) })} className={`${BUTTON} flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" />Report incident</button>}
      {draft && (
        <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-500/30 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">What happened<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
            {superAdmin && <CountryPicker value={draft.countryNodeId} onChange={(value) => setDraft({ ...draft, countryNodeId: value })} />}
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={`${INPUT} mt-1 font-normal`}>{INCIDENT_CATEGORIES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Severity<select value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value })} className={`${INPUT} mt-1 font-normal`}>{SEVERITIES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">When<input type="date" value={draft.occurredAt} onChange={(event) => setDraft({ ...draft, occurredAt: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">Details<textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
          </div>
          <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void run(() => apiClient.createIncident({ ...draft, countryNodeId: draft.countryNodeId || undefined }), () => setDraft(null))} className={BUTTON}>Save</button><button type="button" onClick={() => setDraft(null)} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold cursor-pointer">Cancel</button></div>
        </div>
      )}
      {rows && (rows.length === 0 ? <p className="text-xs text-slate-500">No incidents recorded.</p> : (
        <div className="space-y-2">
          {rows.map((incident) => (
            <div key={incident.id} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => setOpen(open === incident.id ? null : incident.id)} className="text-left cursor-pointer"><span className="font-black text-slate-900 dark:text-white">{incident.title}</span> <span className="text-slate-500">· {label(incident.category)} · {incident.occurredAt.slice(0, 10)}</span></button>
                <span className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded font-black ${severityClass[incident.severity] ?? ''}`}>{label(incident.severity)}</span><span className="font-bold text-slate-600 dark:text-slate-300">{label(incident.status)}</span></span>
              </div>
              {open === incident.id && (
                <>
                  <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{incident.description}</p>
                  <ul className="space-y-0.5 text-slate-500">{incident.history.map((entry, index) => <li key={index}>{new Date(entry.at).toLocaleString()} · {label(entry.status)} · {entry.byName}: {entry.note}</li>)}</ul>
                  {canEdit && NEXT_INCIDENT_STATUS[incident.status] && (step?.id === incident.id ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select value={step.status} onChange={(event) => setStep({ ...step, status: event.target.value })} className={`${INPUT} sm:w-44`}>{NEXT_INCIDENT_STATUS[incident.status].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
                      <input value={step.note} onChange={(event) => setStep({ ...step, note: event.target.value })} placeholder={step.status === 'RESOLVED' || step.status === 'CLOSED' ? 'How it was resolved' : 'Note'} className={INPUT} />
                      <button type="button" disabled={busy || step.note.trim().length < 3} onClick={() => void run(() => apiClient.updateIncident(incident.id, { status: step.status, note: step.note }), () => setStep(null))} className={BUTTON}>Save</button>
                    </div>
                  ) : <button type="button" onClick={() => setStep({ id: incident.id, status: NEXT_INCIDENT_STATUS[incident.status][0], note: '' })} className="text-purple-600 font-bold cursor-pointer">Update status</button>)}
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
};

const blankFatwa = (): FatwaInput => ({ reference: '', title: '', issuedBy: '', issuedOn: '', topic: 'GENERAL', summary: '', sourceUrl: '', status: 'ACTIVE' });

export const LiveFatwaRepository: React.FC = () => {
  const { currentRole } = useRBAC();
  const canEdit = FATWA_EDITORS.includes(currentRole);
  const superAdmin = currentRole === 'Super Admin';
  const { rows, error, setError, reload } = useList<FatwaRecord>(apiClient.getFatwas);
  const [editing, setEditing] = React.useState<{ id?: string; input: FatwaInput } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const set = (patch: Partial<FatwaInput>) => editing && setEditing({ ...editing, input: { ...editing.input, ...patch } });
  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try { await apiClient.saveFatwa({ ...editing.input, sourceUrl: editing.input.sourceUrl || undefined, countryNodeId: editing.input.countryNodeId || undefined }, editing.id); setEditing(null); reload(); } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(false); }
  };

  return (
    <Card icon={<BookOpen className="w-5 h-5 text-purple-600" />} title="Fatwa Repository" lead="Shariah resolutions the platform relies on, recorded by the Shariah Committee or Shariah Advisor, with their issuer, date and source. A resolution replaced by a newer one is kept as Superseded.">
      <Status error={error} loading={!rows} />
      {canEdit && !editing && <button type="button" onClick={() => setEditing({ input: blankFatwa() })} className={`${BUTTON} flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" />Record resolution</button>}
      {editing && (
        <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-500/30 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Reference<input value={editing.input.reference} onChange={(event) => set({ reference: event.target.value })} placeholder="e.g. SC-2026-03" className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Topic or akad<input value={editing.input.topic} onChange={(event) => set({ topic: event.target.value })} placeholder="e.g. MUDARABAH, IJARAH, ZAKAT" className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">Title<input value={editing.input.title} onChange={(event) => set({ title: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Issued by<input value={editing.input.issuedBy} onChange={(event) => set({ issuedBy: event.target.value })} placeholder="e.g. Platform Shariah Committee" className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Issued on<input type="date" value={editing.input.issuedOn.slice(0, 10)} onChange={(event) => set({ issuedOn: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
            {superAdmin && !editing.id && <CountryPicker value={editing.input.countryNodeId ?? ''} onChange={(value) => set({ countryNodeId: value })} allowAll />}
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Source link (optional)<input value={editing.input.sourceUrl ?? ''} onChange={(event) => set({ sourceUrl: event.target.value })} placeholder="https://" className={`${INPUT} mt-1 font-normal`} /></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Status<select value={editing.input.status} onChange={(event) => set({ status: event.target.value })} className={`${INPUT} mt-1 font-normal`}>{['ACTIVE', 'SUPERSEDED'].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">Summary of the ruling<textarea rows={4} value={editing.input.summary} onChange={(event) => set({ summary: event.target.value })} className={`${INPUT} mt-1 font-normal`} /></label>
          </div>
          <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void save()} className={BUTTON}>Save</button><button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold cursor-pointer">Cancel</button></div>
        </div>
      )}
      {rows && (rows.length === 0 ? <p className="text-xs text-slate-500">No resolutions recorded yet.</p> : (
        <div className="space-y-2">
          {rows.map((fatwa) => (
            <div key={fatwa.id} className={`p-3 rounded-2xl border text-xs space-y-1 ${fatwa.status === 'SUPERSEDED' ? 'border-slate-200 dark:border-slate-700 opacity-70' : 'border-emerald-200 dark:border-emerald-500/30'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p><span className="font-mono text-slate-500">{fatwa.reference}</span> · <span className="font-black text-slate-900 dark:text-white">{fatwa.title}</span></p>
                <span className="flex items-center gap-2"><span className="font-bold text-slate-600 dark:text-slate-300">{label(fatwa.status)}</span>{canEdit && <button type="button" onClick={() => setEditing({ id: fatwa.id, input: { reference: fatwa.reference, title: fatwa.title, issuedBy: fatwa.issuedBy, issuedOn: fatwa.issuedOn, topic: fatwa.topic, summary: fatwa.summary, sourceUrl: fatwa.sourceUrl ?? '', status: fatwa.status } })} className="text-purple-600 font-bold cursor-pointer">Edit</button>}</span>
              </div>
              <p className="text-slate-500">{label(fatwa.topic)} · {fatwa.issuedBy} · {fatwa.issuedOn.slice(0, 10)}{fatwa.countryNodeId ? ` · ${fatwa.countryNodeId}` : ' · every country'}</p>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{fatwa.summary}</p>
              {fatwa.sourceUrl && <a href={fatwa.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-purple-600 font-bold">Source</a>}
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
};
