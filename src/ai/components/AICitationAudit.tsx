import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, Flag, Quote, RotateCcw, ShieldCheck } from 'lucide-react';
import { AiGroundingStatus, apiClient, BackendRagCountry, CitationAuditFilter, CitationAuditItem, CitationAuditPage, CitationAuditSummary, CitationReviewStatus } from '../../services/apiClient';

const GROUNDING: Record<AiGroundingStatus, { label: string; className: string; bar: string }> = {
  GROUNDED: { label: 'Grounded', className: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-500' },
  PARTIALLY_GROUNDED: { label: 'Partly grounded', className: 'bg-amber-100 text-amber-800', bar: 'bg-amber-400' },
  UNSUPPORTED: { label: 'Unsupported', className: 'bg-rose-100 text-rose-800', bar: 'bg-rose-500' },
  NO_SOURCES: { label: 'No sources', className: 'bg-slate-200 text-slate-700', bar: 'bg-slate-400' },
};

const REVIEW: Record<CitationReviewStatus, { label: string; className: string }> = {
  UNREVIEWED: { label: 'Unreviewed', className: 'bg-slate-100 text-slate-600' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800' },
  INCORRECT: { label: 'Flagged: incorrect', className: 'bg-rose-100 text-rose-800' },
  IRRELEVANT: { label: 'Flagged: irrelevant', className: 'bg-amber-100 text-amber-800' },
};

const SCOPE_BADGE: Record<string, string> = { GLOBAL: 'bg-purple-100 text-purple-800', COUNTRY: 'bg-blue-100 text-blue-800', PROJECT: 'bg-emerald-100 text-emerald-800' };
const inputClass = 'rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900';
const EMPTY_FILTER: CitationAuditFilter = { scope: '', groundingStatus: '', quoteVerified: '', reviewStatus: '', countryNodeId: '', from: '', to: '', search: '', documentId: '' };

const pages = (item: CitationAuditItem) => !item.pageStart ? '' : item.pageEnd && item.pageEnd !== item.pageStart ? `pp. ${item.pageStart}-${item.pageEnd}` : `p. ${item.pageStart}`;

export const AICitationAudit: React.FC<{ userRole: string }> = ({ userRole }) => {
  const isSuperAdmin = userRole === 'Super Admin';
  const [filter, setFilter] = useState<CitationAuditFilter>(EMPTY_FILTER);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CitationAuditPage | null>(null);
  const [summary, setSummary] = useState<CitationAuditSummary | null>(null);
  const [countries, setCountries] = useState<BackendRagCountry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isSuperAdmin) apiClient.getRagCountries().then(setCountries).catch(() => setCountries([]));
  }, [isSuperAdmin]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [list, stats] = await Promise.all([
        apiClient.listCitations({ ...filter, page, pageSize: 20 }),
        apiClient.getCitationSummary({ countryNodeId: filter.countryNodeId, from: filter.from, to: filter.to }),
      ]);
      setData(list);
      setSummary(stats);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load the citation audit.');
    } finally {
      setBusy(false);
    }
  }, [filter, page]);

  useEffect(() => { void load(); }, [load]);

  const update = (patch: Partial<CitationAuditFilter>) => { setPage(1); setFilter((current) => ({ ...current, ...patch })); };

  const review = async (item: CitationAuditItem, status: CitationReviewStatus) => {
    setBusy(true);
    setMessage('');
    try {
      await apiClient.reviewCitation(item.id, { status, comment: comment[item.id] });
      setComment((current) => ({ ...current, [item.id]: '' }));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to record the review.');
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setBusy(true);
    try {
      const rows = await apiClient.exportCitationsCsv(filter);
      setMessage(`Exported ${rows} citation(s) to CSV${rows >= 5000 ? ' (limit reached — narrow the filters for a complete export)' : ''}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to export citations.');
    } finally {
      setBusy(false);
    }
  };

  const groundingTotal = summary ? Object.values(summary.grounding).reduce((total, value) => total + value, 0) : 0;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
            <div>
              <h2 className="font-black text-slate-900 dark:text-white">Citation Audit</h2>
              <p className="text-xs text-slate-500">Sources cited by AI assistant answers, their verification, and human review. {isSuperAdmin ? 'All D-8 countries.' : 'Your country only.'} Every access is logged.</p>
            </div>
          </div>
          <button onClick={() => void exportCsv()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-slate-700"><Download className="h-3.5 w-3.5" /> Export CSV</button>
        </div>

        {/* Quality summary */}
        {summary && <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI answers</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{summary.totalAnswers}</p>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              {(Object.keys(GROUNDING) as AiGroundingStatus[]).map((status) => groundingTotal ? <div key={status} className={GROUNDING[status].bar} style={{ width: `${(summary.grounding[status] / groundingTotal) * 100}%` }} title={`${GROUNDING[status].label}: ${summary.grounding[status]}`} /> : null)}
            </div>
            <div className="mt-2 space-y-0.5 text-[10px]">
              {(Object.keys(GROUNDING) as AiGroundingStatus[]).map((status) => (
                <button key={status} onClick={() => update({ groundingStatus: filter.groundingStatus === status ? '' : status })} className={`flex w-full justify-between rounded px-1 ${filter.groundingStatus === status ? 'bg-purple-50 font-bold dark:bg-purple-900/40' : ''}`}>
                  <span className="text-slate-600 dark:text-slate-300">{GROUNDING[status].label}</span>
                  <span className="text-slate-900 dark:text-white">{summary.grounding[status]}{groundingTotal ? ` (${Math.round((summary.grounding[status] / groundingTotal) * 100)}%)` : ''}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Citations</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{summary.totalCitations}</p>
            <button onClick={() => update({ quoteVerified: filter.quoteVerified === 'false' ? '' : 'false' })} className={`mt-2 flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] ${filter.quoteVerified === 'false' ? 'bg-amber-100 font-bold' : 'bg-amber-50'} text-amber-800`}>
              <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Unverified quotes</span><span>{summary.unverifiedQuotes}</span>
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Human review</span>
            <div className="mt-1 space-y-0.5 text-[11px]">
              {(Object.keys(REVIEW) as CitationReviewStatus[]).map((status) => (
                <button key={status} onClick={() => update({ reviewStatus: filter.reviewStatus === status ? '' : status })} className={`flex w-full justify-between rounded px-1 py-0.5 ${filter.reviewStatus === status ? 'bg-purple-50 font-bold dark:bg-purple-900/40' : ''}`}>
                  <span className="text-slate-600 dark:text-slate-300">{REVIEW[status].label}</span><span className="text-slate-900 dark:text-white">{summary.reviews[status]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Most cited documents</span>
            <div className="mt-1 space-y-1 text-[11px]">
              {summary.topDocuments.length === 0 && <p className="text-slate-500">No citations yet.</p>}
              {summary.topDocuments.slice(0, 5).map((document) => (
                <button key={document.documentId ?? document.title} disabled={!document.documentId} onClick={() => update({ documentId: filter.documentId === document.documentId ? '' : document.documentId ?? '' })} className={`flex w-full items-center justify-between gap-2 rounded px-1 text-left ${filter.documentId === document.documentId ? 'bg-purple-50 font-bold dark:bg-purple-900/40' : ''}`}>
                  <span className="truncate text-slate-700 dark:text-slate-200">{document.title}{document.superseded ? ' (superseded)' : ''}</span>
                  <span className="shrink-0 text-slate-500">{document.answers} ans.</span>
                </button>
              ))}
            </div>
          </div>
        </div>}

        {/* Filters */}
        <div className="mt-5 flex flex-wrap items-end gap-2">
          {isSuperAdmin && <select value={filter.countryNodeId} onChange={(event) => update({ countryNodeId: event.target.value })} className={inputClass}>
            <option value="">All countries</option>
            {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
          </select>}
          <select value={filter.scope} onChange={(event) => update({ scope: event.target.value as CitationAuditFilter['scope'] })} className={inputClass}>
            <option value="">All levels</option><option value="GLOBAL">Global</option><option value="COUNTRY">Country</option><option value="PROJECT">Project</option>
          </select>
          <select value={filter.groundingStatus} onChange={(event) => update({ groundingStatus: event.target.value as CitationAuditFilter['groundingStatus'] })} className={inputClass}>
            <option value="">Any grounding</option>{(Object.keys(GROUNDING) as AiGroundingStatus[]).map((status) => <option key={status} value={status}>{GROUNDING[status].label}</option>)}
          </select>
          <select value={filter.quoteVerified} onChange={(event) => update({ quoteVerified: event.target.value as CitationAuditFilter['quoteVerified'] })} className={inputClass}>
            <option value="">Any quote</option><option value="true">Quote verified</option><option value="false">Quote not found</option>
          </select>
          <select value={filter.reviewStatus} onChange={(event) => update({ reviewStatus: event.target.value as CitationAuditFilter['reviewStatus'] })} className={inputClass}>
            <option value="">Any review</option>{(Object.keys(REVIEW) as CitationReviewStatus[]).map((status) => <option key={status} value={status}>{REVIEW[status].label}</option>)}
          </select>
          <label className="text-[10px] font-bold text-slate-500">From <input type="date" value={filter.from} onChange={(event) => update({ from: event.target.value })} className={`block ${inputClass}`} /></label>
          <label className="text-[10px] font-bold text-slate-500">To <input type="date" value={filter.to} onChange={(event) => update({ to: event.target.value })} className={`block ${inputClass}`} /></label>
          <input value={filter.search} onChange={(event) => update({ search: event.target.value })} placeholder="Document title..." className={`min-w-[140px] flex-1 ${inputClass}`} />
          <button onClick={() => { setPage(1); setFilter(EMPTY_FILTER); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"><RotateCcw className="h-3 w-3" /> Reset</button>
        </div>
        {filter.documentId && <p className="mt-2 text-[11px] text-purple-700">Showing one document only. <button onClick={() => update({ documentId: '' })} className="underline">Show all</button></p>}
        {message && <p className="mt-3 rounded-xl bg-slate-100 p-2.5 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">{message}</p>}
      </div>

      {/* Citations */}
      <div className="space-y-3">
        {data && data.items.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No citations match these filters. Citations appear here once users receive sourced answers from the AI Assistant.</p>}
        {data?.items.map((item) => {
          const open = expanded === item.id;
          const reviewStatus = item.reviewStatus || 'UNREVIEWED';
          return (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="text-slate-500">{new Date(item.answerCreatedAt).toLocaleString()}</span>
                <span className="font-mono text-slate-500">{item.countryNodeId}</span>
                {item.groundingStatus && <span className={`rounded-full px-2 py-0.5 font-bold ${GROUNDING[item.groundingStatus].className}`}>{GROUNDING[item.groundingStatus].label}</span>}
                <span className={`rounded-full px-2 py-0.5 font-bold ${REVIEW[reviewStatus].className}`}>{REVIEW[reviewStatus].label}</span>
                {item.confidence?.scorePercent !== undefined && <span className="text-slate-500">Confidence {item.confidence.scorePercent}%</span>}
              </div>
              <p className="mt-2 font-bold text-slate-900 dark:text-white">Q: {item.question || '(question not recorded)'}</p>
              <button onClick={() => setExpanded(open ? null : item.id)} className="mt-1 flex w-full items-start gap-1 text-left text-slate-600 dark:text-slate-300">
                {open ? <ChevronUp className="mt-0.5 h-3 w-3 shrink-0" /> : <ChevronDown className="mt-0.5 h-3 w-3 shrink-0" />}
                <span className={open ? 'whitespace-pre-wrap' : 'line-clamp-2'}>A: {item.answer}</span>
              </button>

              <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-purple-100 px-1 font-bold text-purple-700">[{item.marker}]</span>
                  <strong className="text-slate-800 dark:text-slate-100">{item.documentTitle}</strong>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${SCOPE_BADGE[item.scope] || 'bg-slate-100'}`}>{item.scope}</span>
                  {pages(item) && <span className="text-slate-500">{pages(item)}</span>}
                  {item.paragraphRefs?.length ? <span className="text-slate-500">{item.paragraphRefs.join(' ')}</span> : null}
                  {item.documentStatus === 'SUPERSEDED' && <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-white">SUPERSEDED</span>}
                  {item.documentStatus === 'DELETED' && <span className="rounded-full bg-rose-700 px-1.5 py-0.5 text-[10px] font-bold text-white">DOCUMENT DELETED</span>}
                </div>
                {item.quote
                  ? <p className={`mt-1.5 flex items-start gap-1 italic ${item.quoteVerified ? 'text-slate-600 dark:text-slate-300' : 'text-amber-700'}`}><Quote className="mt-0.5 h-3 w-3 shrink-0" />“{item.quote}” <span className="not-italic">{item.quoteVerified ? <span className="text-emerald-700"><CheckCircle2 className="inline h-3 w-3" /> found in source</span> : '(not found verbatim in the source)'}</span></p>
                  : <p className="mt-1.5 text-slate-400">No quote provided by the model.</p>}
                {open && <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">{item.excerpt}</p>}
              </div>

              {item.reviewComment && <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300"><strong>Reviewer:</strong> {item.reviewComment} {item.reviewedAt ? <span className="text-slate-400">({new Date(item.reviewedAt).toLocaleString()})</span> : null}</p>}
              {data.canReview && <div className="mt-3 flex flex-wrap items-center gap-2">
                <input value={comment[item.id] || ''} onChange={(event) => setComment((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Review comment (required when flagging)" className={`min-w-0 flex-1 ${inputClass}`} />
                <button onClick={() => void review(item, 'CONFIRMED')} disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-3 w-3" /> Confirm</button>
                <button onClick={() => void review(item, 'INCORRECT')} disabled={busy || !comment[item.id]?.trim()} className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"><Flag className="h-3 w-3" /> Incorrect</button>
                <button onClick={() => void review(item, 'IRRELEVANT')} disabled={busy || !comment[item.id]?.trim()} className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"><Flag className="h-3 w-3" /> Irrelevant</button>
                {reviewStatus !== 'UNREVIEWED' && <button onClick={() => void review(item, 'UNREVIEWED')} disabled={busy} className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300">Clear review</button>}
              </div>}
            </article>
          );
        })}
      </div>

      {data && data.total > data.pageSize && <div className="flex items-center justify-center gap-3 text-xs">
        <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || busy} className="rounded-xl border border-slate-300 px-3 py-1.5 font-bold disabled:opacity-40 dark:border-slate-600">Previous</button>
        <span className="text-slate-500">Page {page} of {totalPages} · {data.total} citations</span>
        <button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages || busy} className="rounded-xl border border-slate-300 px-3 py-1.5 font-bold disabled:opacity-40 dark:border-slate-600">Next</button>
      </div>}
    </div>
  );
};
