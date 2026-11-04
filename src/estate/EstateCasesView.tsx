import React from 'react';
import { CheckCircle2, Download, FileUp, Plus, Scale, Trash2 } from 'lucide-react';
import { apiClient, apiErrorMessage, EstateCaseFile, EstateCaseStatus, EstateCaseSummary, EstateSettlementPlan } from '../services/apiClient';
import { useRBAC } from '../rbac/RBACContext';
import { formatProjectMoney } from '../components/sponsor/sponsorMoney';

const STEPS: Array<{ status: EstateCaseStatus; label: string }> = [
  { status: 'REPORTED', label: 'Reported' },
  { status: 'DEATH_VERIFIED', label: 'Death verified, account frozen' },
  { status: 'DOCUMENTS_VERIFIED', label: 'Court documents verified' },
  { status: 'PLAN_SUBMITTED', label: 'Plan waiting for approval' },
  { status: 'SETTLED', label: 'Settled' },
];
const STATUS_LABEL: Record<EstateCaseStatus, string> = { REPORTED: 'New report', REJECTED: 'Rejected', DEATH_VERIFIED: 'Death verified', DOCUMENTS_VERIFIED: 'Documents verified', PLAN_SUBMITTED: 'Plan to approve', SETTLED: 'Settled' };
const DOCUMENT_TYPES: Record<string, string> = { DEATH_CERTIFICATE: 'Death certificate', SIJIL_FARAID: 'Faraid certificate (Sijil Faraid)', PROBATE: 'Grant of probate', LETTER_OF_ADMINISTRATION: 'Letters of administration', HEIR_CONSENT: 'Heir consent', OTHER: 'Other' };
const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';
const CARD = 'bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 text-xs';
const PRIMARY = 'px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer disabled:opacity-50';
const SECONDARY = 'px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 font-bold cursor-pointer disabled:opacity-50';

type Recipient = { userId: string; name: string; sharePct: number };

/** Estate cases for estate officers (Country Admin and Super Admin stand in): from a death report to settlement. */
export const EstateCasesView: React.FC = () => {
  const { activeUser } = useRBAC();
  const [cases, setCases] = React.useState<EstateCaseSummary[] | null>(null);
  const [selected, setSelected] = React.useState<EstateCaseFile | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [docType, setDocType] = React.useState('SIJIL_FARAID');
  const [consent, setConsent] = React.useState({ beneficiaryId: '', heirName: '', heirRelation: '', decision: 'CONSENTED' as 'CONSENTED' | 'REFUSED' });
  const [account, setAccount] = React.useState({ provider: '', reference: '', accountHolder: '' });
  const [plan, setPlan] = React.useState<Record<string, Recipient[]>>({});
  const [search, setSearch] = React.useState<{ poolId: string; q: string; results: Array<{ id: string; name: string; email: string; kycApproved: boolean }> } | null>(null);

  const loadList = React.useCallback(() => { apiClient.getEstateCases().then(setCases).catch((cause) => { setCases([]); setError(apiErrorMessage(cause, 'Cases could not be loaded.')); }); }, []);
  React.useEffect(loadList, [loadList]);

  const open = async (id: string) => {
    setError('');
    setNote('');
    try {
      const file = await apiClient.getEstateCase(id);
      setSelected(file);
      setPlan(Object.fromEntries(file.holdings.map((holding) => [holding.poolId, (file.plan?.holdings.find((item) => item.poolId === holding.poolId)?.recipients ?? []).map((recipient) => ({ userId: recipient.userId, name: recipient.userId, sharePct: recipient.sharePct }))])));
    } catch (cause) { setError(apiErrorMessage(cause, 'The case could not be opened.')); }
  };

  const run = async (action: () => Promise<EstateCaseFile>) => {
    setBusy(true);
    setError('');
    try { setSelected(await action()); setNote(''); loadList(); } catch (cause) { setError(apiErrorMessage(cause, 'Not saved.')); } finally { setBusy(false); }
  };

  const findRecipients = async (poolId: string, q: string) => {
    setSearch({ poolId, q, results: search?.poolId === poolId ? search.results : [] });
    if (!selected || q.trim().length < 3) return;
    const results = await apiClient.findEstateRecipients(selected.id, q).catch(() => []);
    setSearch({ poolId, q, results });
  };
  const planBody = (): EstateSettlementPlan => ({ note, holdings: Object.entries(plan).map(([poolId, recipients]) => ({ poolId, recipients: recipients.map(({ userId, sharePct }) => ({ userId, sharePct })) })) });

  const statusIndex = selected ? STEPS.findIndex((step) => step.status === selected.status) : -1;
  const consentNeeded = selected?.instructions?.beneficiaries.filter((item) => item.heirConsentRequired) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2"><Scale className="w-6 h-6 text-emerald-600" />Estate Cases</h2>
        <p className="text-sm text-slate-500">Deaths reported by a member's executor or beneficiary. Verify the death, then the court documents, record any heirs' consent, open the estate's bank account for profit still due, and settle the holdings by a plan a second officer approves. Final distribution follows the faraid certificate, probate or letters of administration.</p>
      </div>
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}

      <div className={CARD}>
        {cases === null && <p className="text-slate-500">Loading…</p>}
        {cases?.length === 0 && <p className="text-slate-500">No estate case yet.</p>}
        {cases && cases.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-[10px] uppercase tracking-wider text-slate-400"><tr className="text-left"><th className="px-3 py-2">Case</th><th className="px-3 py-2">Deceased</th><th className="px-3 py-2">Date of death</th><th className="px-3 py-2">Reported by</th><th className="px-3 py-2">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {cases.map((row) => (
                  <tr key={row.id} onClick={() => void open(row.id)} className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 ${selected?.id === row.id ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''}`}>
                    <td className="px-3 py-2 font-mono">{row.caseNumber}</td>
                    <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{row.deceasedName}</td>
                    <td className="px-3 py-2">{row.dateOfDeath.slice(0, 10)}</td>
                    <td className="px-3 py-2">{row.reporterName} ({row.reporterRelation})</td>
                    <td className="px-3 py-2 font-bold">{STATUS_LABEL[row.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="space-y-4">
          <div className={CARD}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-slate-400">{selected.caseNumber}</p>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{selected.deceased?.name ?? selected.deceasedUserId}</h3>
                <p className="text-slate-500">Died {selected.dateOfDeath.slice(0, 10)} · {selected.deceased?.frozen ? 'Account frozen' : 'Account not frozen yet'} · reported by {selected.reporterName} ({selected.reporterRelation}, recorded {selected.reporterKind.toLowerCase()}){selected.reporterEmail ? ` · ${selected.reporterEmail}` : ''}{selected.reporterPhone ? ` · ${selected.reporterPhone}` : ''}</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg font-black bg-slate-100 dark:bg-slate-700">{STATUS_LABEL[selected.status]}</span>
            </div>
            {selected.status === 'REJECTED' ? <p className="text-rose-600 font-bold">Rejected: {selected.rejectedReason}</p> : (
              <ol className="flex flex-wrap gap-1.5">
                {STEPS.map((step, index) => <li key={step.status} className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${index <= statusIndex ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>{index < statusIndex ? '✓ ' : ''}{step.label}</li>)}
              </ol>
            )}
          </div>

          {/* The next step */}
          {selected.status === 'REPORTED' && (
            <div className={CARD}>
              <p className="font-black text-slate-900 dark:text-white">Check the death certificate</p>
              <p className="text-slate-500">Open the certificate below and check it against the national registration record. Verifying freezes the account: the member can no longer sign in, unpaid orders are cancelled and payouts to their bank accounts stop.</p>
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="What you checked" className={INPUT} />
              <div className="flex gap-2">
                <button type="button" disabled={busy || note.trim().length < 3} onClick={() => void run(() => apiClient.decideEstateDeath(selected.id, 'VERIFY', note))} className={PRIMARY}>Verify death</button>
                <button type="button" disabled={busy || note.trim().length < 3} onClick={() => void run(() => apiClient.decideEstateDeath(selected.id, 'REJECT', note))} className={SECONDARY}>Reject report</button>
              </div>
            </div>
          )}
          {selected.status === 'DEATH_VERIFIED' && (
            <div className={CARD}>
              <p className="font-black text-slate-900 dark:text-white">Verify the court documents</p>
              <p className="text-slate-500">Upload the faraid certificate from the Syariah court, or the grant of probate or letters of administration, then confirm.</p>
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="What you checked" className={INPUT} />
              <button type="button" disabled={busy || note.trim().length < 3} onClick={() => void run(() => apiClient.verifyEstateDocuments(selected.id, note))} className={PRIMARY}>Documents verified</button>
            </div>
          )}

          {/* Documents */}
          <div className={CARD}>
            <p className="font-black text-slate-900 dark:text-white">Documents</p>
            {selected.documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <span><strong>{DOCUMENT_TYPES[document.documentType] ?? document.documentType}</strong> · {document.fileName} · {document.uploadedBy === 'REPORTER' ? 'from the reporter' : 'uploaded by an officer'} · {document.createdAt.slice(0, 10)}</span>
                <button type="button" aria-label="Download" onClick={() => void apiClient.downloadEstateDocument(selected.id, document.id)} className="text-slate-500 hover:text-emerald-600 cursor-pointer"><Download className="w-4 h-4" /></button>
              </div>
            ))}
            {!['SETTLED', 'REJECTED'].includes(selected.status) && (
              <div className="flex flex-wrap items-center gap-2">
                <select value={docType} onChange={(event) => setDocType(event.target.value)} className={`${INPUT} sm:w-64`}>{Object.entries(DOCUMENT_TYPES).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select>
                <label className={`${SECONDARY} flex items-center gap-1.5`}><FileUp className="w-3.5 h-3.5" />Upload<input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run(() => apiClient.uploadEstateDocument(selected.id, docType, file)); }} /></label>
              </div>
            )}
          </div>

          {/* Instructions, holdings and settlement: only after the death is verified */}
          {selected.instructions && (
            <>
              <div className={CARD}>
                <p className="font-black text-slate-900 dark:text-white">The member's instructions{selected.instructions.framework ? ` (${selected.instructions.framework} framework)` : ''}</p>
                <p className="text-slate-500">A guide only: the court documents decide. Viewing them is recorded in the audit log.</p>
                {selected.instructions.executors.map((executor) => <p key={executor.id}><strong>Executor:</strong> {executor.name} · {executor.kind.replace(/_/g, ' ').toLowerCase()}{executor.relation ? ` · ${executor.relation}` : ''}{executor.identityNumberMasked ? ` · ID ${executor.identityNumberMasked}` : ''}{executor.phone ? ` · ${executor.phone}` : ''}{executor.email ? ` · ${executor.email}` : ''}</p>)}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="text-[10px] uppercase tracking-wider text-slate-400"><tr className="text-left"><th className="px-2 py-1.5">Beneficiary</th><th className="px-2 py-1.5">Relation</th><th className="px-2 py-1.5">Purpose</th><th className="px-2 py-1.5 text-right">Share</th><th className="px-2 py-1.5">Notes</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {selected.instructions.beneficiaries.map((item) => (
                        <tr key={item.id}>
                          <td className="px-2 py-1.5 font-bold">{item.name}{item.identityNumberMasked ? <span className="font-normal text-slate-400"> · {item.identityNumberMasked}</span> : null}</td>
                          <td className="px-2 py-1.5">{item.relation}</td>
                          <td className="px-2 py-1.5">{item.distributionType}</td>
                          <td className="px-2 py-1.5 text-right">{item.allocationPercent === null ? 'By faraid' : `${item.allocationPercent}%`}</td>
                          <td className="px-2 py-1.5 text-slate-500">{[item.hibahQabulStatus && `qabul ${item.hibahQabulStatus.toLowerCase()}`, item.heirConsentRequired && 'needs heirs’ consent'].filter(Boolean).join(' · ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {consentNeeded.length > 0 && (
                <div className={CARD}>
                  <p className="font-black text-slate-900 dark:text-white">Heirs&rsquo; consent to wasiyyah</p>
                  <p className="text-slate-500">These bequests hold only if the heirs agree now, after the death. Record each heir&rsquo;s answer; without consent that part follows faraid. Upload signed consents as documents.</p>
                  {selected.consents.map((item) => <p key={item.id}><CheckCircle2 className="inline w-3.5 h-3.5 mr-1 text-emerald-500" />{item.heirName} ({item.heirRelation}) {item.decision.toLowerCase()} to {consentNeeded.find((bequest) => bequest.id === item.beneficiaryId)?.name ?? 'a bequest'}</p>)}
                  {['DEATH_VERIFIED', 'DOCUMENTS_VERIFIED'].includes(selected.status) && (
                    <div className="grid sm:grid-cols-5 gap-2">
                      <select value={consent.beneficiaryId} onChange={(event) => setConsent({ ...consent, beneficiaryId: event.target.value })} className={INPUT}><option value="">Bequest…</option>{consentNeeded.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                      <input value={consent.heirName} onChange={(event) => setConsent({ ...consent, heirName: event.target.value })} placeholder="Heir's name" className={INPUT} />
                      <input value={consent.heirRelation} onChange={(event) => setConsent({ ...consent, heirRelation: event.target.value })} placeholder="Relation" className={INPUT} />
                      <select value={consent.decision} onChange={(event) => setConsent({ ...consent, decision: event.target.value as 'CONSENTED' | 'REFUSED' })} className={INPUT}><option value="CONSENTED">Consented</option><option value="REFUSED">Refused</option></select>
                      <button type="button" disabled={busy || !consent.beneficiaryId || consent.heirName.trim().length < 2 || consent.heirRelation.trim().length < 2} onClick={() => void run(async () => { const file = await apiClient.recordHeirConsent(selected.id, consent); setConsent({ beneficiaryId: '', heirName: '', heirRelation: '', decision: 'CONSENTED' }); return file; })} className={PRIMARY}>Record</button>
                    </div>
                  )}
                </div>
              )}

              <div className={CARD}>
                <p className="font-black text-slate-900 dark:text-white">Holdings</p>
                {selected.holdings.length === 0 && <p className="text-slate-500">No capital left in any pool.</p>}
                {selected.holdings.map((holding) => <p key={holding.poolId}><strong>{holding.poolName}</strong> ({holding.poolStatus.toLowerCase()}): capital {formatProjectMoney(holding.capital, holding.currency)}{holding.profitUnpaid ? ` · profit earned, not yet paid ${formatProjectMoney(holding.profitUnpaid, holding.currency)}` : ''}</p>)}
                <p className="font-bold pt-2">Estate bank account (for profit still due)</p>
                {selected.estateAccounts.length === 0 ? <p className="text-slate-500">None yet. Profit due to the deceased waits until one is added and verified by Settlement.</p> : selected.estateAccounts.map((item) => <p key={item.id}>{item.provider} {item.maskedReference} · {item.accountHolder} · {item.status === 'VERIFIED' ? 'verified' : 'waiting for Settlement to verify'}</p>)}
                {['DEATH_VERIFIED', 'DOCUMENTS_VERIFIED', 'PLAN_SUBMITTED'].includes(selected.status) && selected.estateAccounts.length === 0 && (
                  <div className="grid sm:grid-cols-4 gap-2">
                    <input value={account.provider} onChange={(event) => setAccount({ ...account, provider: event.target.value })} placeholder="Bank" className={INPUT} />
                    <input value={account.reference} onChange={(event) => setAccount({ ...account, reference: event.target.value })} placeholder="Account number" className={INPUT} />
                    <input value={account.accountHolder} onChange={(event) => setAccount({ ...account, accountHolder: event.target.value })} placeholder="Held by (estate / administrator)" className={INPUT} />
                    <button type="button" disabled={busy || !account.provider.trim() || account.reference.replace(/\D/g, '').length < 6 || account.accountHolder.trim().length < 3} onClick={() => void run(() => apiClient.addEstateAccount(selected.id, { ...account, destinationType: 'BANK_ACCOUNT' }))} className={PRIMARY}>Add account</button>
                  </div>
                )}
              </div>

              {/* Settlement plan */}
              {['DOCUMENTS_VERIFIED', 'PLAN_SUBMITTED', 'SETTLED'].includes(selected.status) && selected.holdings.length + (selected.plan?.holdings.length ?? 0) > 0 && (
                <div className={CARD}>
                  <p className="font-black text-slate-900 dark:text-white">Settlement plan</p>
                  {selected.status === 'DOCUMENTS_VERIFIED' ? (
                    <>
                      <p className="text-slate-500">For each pool, name who receives the deceased&rsquo;s capital and what share, following the court documents. Recipients need an investor account in this country with approved KYC; an heir without one registers first. They step into the same akad terms. A second officer approves the plan.</p>
                      {selected.holdings.map((holding) => {
                        const rows = plan[holding.poolId] ?? [];
                        const total = rows.reduce((sum, row) => sum + row.sharePct, 0);
                        return (
                          <div key={holding.poolId} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                            <p className="font-bold">{holding.poolName} · {formatProjectMoney(holding.capital, holding.currency)} · <span className={Math.abs(total - 100) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}>{Math.round(total * 100) / 100}% assigned</span></p>
                            {rows.map((row, index) => (
                              <div key={row.userId} className="flex items-center gap-2">
                                <span className="flex-1">{row.name} <span className="text-slate-400">{formatProjectMoney(holding.capital * (row.sharePct / 100), holding.currency)}</span></span>
                                <input type="number" min={0.01} max={100} step={0.01} value={row.sharePct} onChange={(event) => setPlan({ ...plan, [holding.poolId]: rows.map((item, at) => (at === index ? { ...item, sharePct: Number(event.target.value) } : item)) })} className={`${INPUT} w-24`} />
                                <span>%</span>
                                <button type="button" aria-label={`Remove ${row.name}`} onClick={() => setPlan({ ...plan, [holding.poolId]: rows.filter((_, at) => at !== index) })} className="text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            ))}
                            <div className="relative">
                              <input value={search?.poolId === holding.poolId ? search.q : ''} onChange={(event) => void findRecipients(holding.poolId, event.target.value)} placeholder="Add a recipient: name, email or member ID" className={INPUT} />
                              {search?.poolId === holding.poolId && search.results.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                                  {search.results.map((user) => (
                                    <button key={user.id} type="button" disabled={!user.kycApproved || rows.some((row) => row.userId === user.id)} onClick={() => { setPlan({ ...plan, [holding.poolId]: [...rows, { userId: user.id, name: user.name, sharePct: Math.max(0, Math.round((100 - total) * 100) / 100) }] }); setSearch(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                                      <Plus className="w-3.5 h-3.5" />{user.name} <span className="text-slate-400">{user.email}</span>{!user.kycApproved && <span className="text-amber-600"> · KYC not approved</span>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Basis of the plan (e.g. Sijil Faraid no. …)" className={INPUT} />
                      <button type="button" disabled={busy} onClick={() => void run(() => apiClient.submitEstatePlan(selected.id, planBody()))} className={PRIMARY}>Submit plan for approval</button>
                    </>
                  ) : (
                    <>
                      {selected.plan?.holdings.map((holding) => <p key={holding.poolId}><strong>{holding.poolId}</strong>: {holding.recipients.map((recipient) => `${recipient.userId} ${recipient.sharePct}%`).join(', ')}</p>)}
                      {selected.plan?.note && <p className="text-slate-500">{selected.plan.note}</p>}
                      {selected.status === 'PLAN_SUBMITTED' && (selected.planBy === activeUser.id ? <p className="text-amber-600 font-bold">You submitted this plan; another officer must approve it.</p> : (
                        <>
                          <p className="text-slate-500">Approving moves each holding to its recipients at once: their investments and ledger accounts are updated, and they are told.</p>
                          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Your note" className={INPUT} />
                          <div className="flex gap-2">
                            <button type="button" disabled={busy || note.trim().length < 3} onClick={() => void run(() => apiClient.decideEstatePlan(selected.id, 'APPROVE', note))} className={PRIMARY}>Approve and transfer</button>
                            <button type="button" disabled={busy || note.trim().length < 3} onClick={() => void run(() => apiClient.decideEstatePlan(selected.id, 'RETURN', note))} className={SECONDARY}>Return</button>
                          </div>
                        </>
                      ))}
                      {selected.status === 'SETTLED' && <p className="text-emerald-700 dark:text-emerald-300 font-bold">Settled {selected.settledAt?.slice(0, 10)}: holdings transferred.</p>}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <div className={CARD}>
            <p className="font-black text-slate-900 dark:text-white">History</p>
            <ul className="space-y-1 text-slate-500">{selected.history.map((entry, index) => <li key={index}>{new Date(entry.at).toLocaleString()} · {entry.action.replace(/_/g, ' ').toLowerCase()} · {entry.byName}{entry.note ? `: ${entry.note}` : ''}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
};
