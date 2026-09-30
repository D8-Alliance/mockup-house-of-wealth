import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Globe2, Landmark, FolderKanban, Search, Upload, XCircle } from 'lucide-react';
import { apiClient, BackendProject, BackendRagCountry, BackendRagDocument, BackendRagSearchResult, RagEmbeddingStatus, RagScope } from '../../services/apiClient';

// Mirrors server/src/ai/rag-scope.ts. The server enforces these rules; the UI only hides options.
const SCOPE_MANAGERS: Record<RagScope, string[]> = {
  GLOBAL: ['Super Admin', 'AI Administrator'],
  COUNTRY: ['Super Admin', 'AI Administrator', 'Country Admin'],
  PROJECT: ['Super Admin', 'AI Administrator', 'Country Admin'],
};

const SCOPE_INFO: Record<RagScope, { label: string; description: string; icon: React.ReactNode; badge: string }> = {
  GLOBAL: { label: 'Global (all 9 D-8 countries)', description: 'AAOIFI standards, fatwa, and platform policy shared by every D-8 member state.', icon: <Globe2 className="h-4 w-4" />, badge: 'bg-purple-100 text-purple-800' },
  COUNTRY: { label: 'Country only', description: 'Local regulator guidance and national Shariah resolutions for one member state.', icon: <Landmark className="h-4 w-4" />, badge: 'bg-blue-100 text-blue-800' },
  PROJECT: { label: 'Project only', description: 'Documents visible only to people with access to one project.', icon: <FolderKanban className="h-4 w-4" />, badge: 'bg-emerald-100 text-emerald-800' },
};

const APPROVAL_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  REVIEWED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
};

const EMBEDDING_BADGE: Record<RagEmbeddingStatus['status'], { label: string; className: string }> = {
  COMPLETE: { label: 'Semantic search ready', className: 'bg-emerald-50 text-emerald-700' },
  PARTIAL: { label: 'Embeddings partial', className: 'bg-amber-50 text-amber-700' },
  UNAVAILABLE: { label: 'Keyword search only (embedding failed)', className: 'bg-rose-50 text-rose-700' },
  DISABLED: { label: 'Keyword search only', className: 'bg-slate-100 text-slate-600' },
};

const embeddingSummary = (embedding?: RagEmbeddingStatus) => !embedding ? '' : embedding.status === 'COMPLETE'
  ? ` ${embedding.totalChunks} chunks indexed for semantic search (${embedding.model}).`
  : embedding.status === 'DISABLED' ? ' Semantic search is not configured; keyword search will be used.'
  : ` Semantic indexing incomplete (${embedding.embeddedChunks}/${embedding.totalChunks}); it is retried on approval.`;

const pageLabel = (result: BackendRagSearchResult) => !result.pageStart ? '' : result.pageEnd && result.pageEnd !== result.pageStart ? `pp. ${result.pageStart}-${result.pageEnd}` : `p. ${result.pageStart}`;

const inputClass = 'rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900';

export const AIRagKnowledgeBase: React.FC<{ userRole?: string }> = ({ userRole = '' }) => {
  const allowedScopes = (Object.keys(SCOPE_MANAGERS) as RagScope[]).filter((scope) => SCOPE_MANAGERS[scope].includes(userRole));
  const canManageCorpus = allowedScopes.length > 0;
  const isSuperAdmin = userRole === 'Super Admin';
  const canBackfill = isSuperAdmin || userRole === 'AI Administrator';

  const [scope, setScope] = useState<RagScope>(allowedScopes.includes('COUNTRY') ? 'COUNTRY' : allowedScopes[0] || 'COUNTRY');
  const [countryNodeId, setCountryNodeId] = useState('');
  const [countries, setCountries] = useState<BackendRagCountry[]>([]);
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [uploadProjectId, setUploadProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState('INTERNAL_SHARIAH_POLICY');
  const [documentCategory, setDocumentCategory] = useState('Internal Policy');
  const [contractType, setContractType] = useState('');
  const [authority, setAuthority] = useState('');
  const [jurisdiction, setJurisdiction] = useState('International');
  const [industry, setIndustry] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [replacementFor, setReplacementFor] = useState<Record<string, string>>({});
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [documents, setDocuments] = useState<BackendRagDocument[]>([]);
  const [listScope, setListScope] = useState<RagScope | ''>('');
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});

  const [searchProjectId, setSearchProjectId] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BackendRagSearchResult[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.getProjects().then(setProjects).catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load projects.'));
    if (canManageCorpus) apiClient.getRagCountries().then(setCountries).catch(() => setCountries([]));
  }, [canManageCorpus]);

  const loadDocuments = useCallback(() => {
    if (!canManageCorpus) return;
    apiClient.listRagDocuments(listScope ? { scope: listScope } : {})
      .then(setDocuments)
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load knowledge-base documents.'));
  }, [canManageCorpus, listScope]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const metadata = () => ({
    scope,
    countryNodeId: scope === 'COUNTRY' && isSuperAdmin ? countryNodeId || undefined : undefined,
    projectId: scope === 'PROJECT' ? uploadProjectId : undefined,
    sourceType,
    documentCategory,
    contractType: contractType || undefined,
    authority: authority || undefined,
    jurisdiction,
    industry: industry || undefined,
    effectiveFrom: effectiveFrom || undefined,
  });

  const scopeReady = () => {
    if (scope === 'PROJECT' && !uploadProjectId) { setMessage('Select the project this document belongs to.'); return false; }
    if (scope === 'COUNTRY' && isSuperAdmin && !countryNodeId) { setMessage('Select the D-8 country this document applies to.'); return false; }
    return true;
  };

  const afterUpload = (label: string, document: BackendRagDocument) => {
    setMessage(`${label} saved as DRAFT in the ${SCOPE_INFO[scope].label} knowledge base (${document.chunkCount ?? 0} chunks).${embeddingSummary(document.embedding)} It becomes available to the AI after a different reviewer marks it REVIEWED and another approves it.`);
    loadDocuments();
  };

  const upload = async () => {
    if (!title.trim() || !content.trim()) { setMessage('Title and document content are required.'); return; }
    if (!scopeReady()) return;
    setBusy(true);
    setMessage('');
    try {
      const document = await apiClient.createRagDocument({ ...metadata(), title: title.trim(), content });
      setTitle('');
      setContent('');
      afterUpload('Document', document);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload document.');
    } finally {
      setBusy(false);
    }
  };

  const uploadPdf = async () => {
    if (!file) { setMessage('Choose a PDF file first.'); return; }
    if (!scopeReady()) return;
    setBusy(true);
    setMessage('Extracting PDF text, cleaning layout noise, chunking by page, and generating embeddings. Large standards can take up to a minute...');
    try {
      const document = await apiClient.uploadRagPdf(file, metadata());
      setFile(null);
      afterUpload('PDF', document);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload PDF.');
    } finally {
      setBusy(false);
    }
  };

  const review = async (document: BackendRagDocument, decision: 'REVIEWED' | 'APPROVED' | 'REJECTED') => {
    setBusy(true);
    setMessage('');
    try {
      await apiClient.reviewRagDocument(document.id, { decision, comment: reviewComment[document.id] });
      setReviewComment((current) => ({ ...current, [document.id]: '' }));
      loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to record the review decision.');
    } finally {
      setBusy(false);
    }
  };

  /** Marks a document as replaced by a newer approved version, or restores it (null). */
  const supersede = async (document: BackendRagDocument, supersededById: string | null) => {
    setBusy(true);
    setMessage('');
    try {
      await apiClient.supersedeRagDocument(document.id, supersededById);
      setReplacementFor((current) => ({ ...current, [document.id]: '' }));
      setMessage(supersededById ? `"${document.title}" is now superseded and will no longer be used by the AI. Existing citations are kept.` : `"${document.title}" is current again.`);
      loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update the document version.');
    } finally {
      setBusy(false);
    }
  };

  const replacementOptions = (document: BackendRagDocument) => documents.filter((candidate) => candidate.id !== document.id && candidate.approvalStatus === 'APPROVED' && !candidate.supersededById);

  const backfill = async () => {
    setBusy(true);
    setMessage('Rebuilding legacy chunks and generating missing embeddings...');
    try {
      const result = await apiClient.backfillRagEmbeddings();
      const rebuilt = result.rebuilt.length ? `Rebuilt ${result.rebuilt.length} legacy document(s) with page-aware chunking. ` : '';
      const embedded = !result.enabled ? 'Semantic search is not configured on the server (RAG_EMBEDDING_MODEL).' : result.documents.length
        ? `Embedded ${result.documents.length} document(s) with ${result.model}: ${result.documents.filter((doc) => doc.status === 'COMPLETE').length} complete.`
        : 'All documents already have embeddings.';
      setMessage(rebuilt + embedded);
      loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate embeddings.');
    } finally {
      setBusy(false);
    }
  };

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      setResults(await apiClient.searchRagDocuments({ projectId: searchProjectId || undefined, query: query.trim(), limit: 5 }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to search documents.');
    } finally {
      setBusy(false);
    }
  };

  const countryName = (code: string) => countries.find((country) => country.code === code)?.name || code;
  const projectName = (id?: string | null) => projects.find((project) => project.projectId === id)?.projectName || id || '';

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-purple-600" />
          <div>
            <h2 className="font-black text-slate-900 dark:text-white">AI Knowledge Base</h2>
            <p className="text-xs text-slate-500">Three access levels: Global for all 9 D-8 member states, Country for one member state, and Project for one project.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(Object.keys(SCOPE_INFO) as RagScope[]).map((key) => <div key={key} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${SCOPE_INFO[key].badge}`}>{SCOPE_INFO[key].icon}{SCOPE_INFO[key].label}</span><p className="mt-2 text-slate-500">{SCOPE_INFO[key].description}</p></div>)}
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">New documents start as DRAFT. The AI only uses a document after a different person reviews it and another person approves it.</p>

        {canManageCorpus ? <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Access level
              <select value={scope} onChange={(event) => setScope(event.target.value as RagScope)} className={`mt-1 w-full ${inputClass}`}>
                {allowedScopes.map((key) => <option key={key} value={key}>{SCOPE_INFO[key].label}</option>)}
              </select>
            </label>
            {scope === 'COUNTRY' && (isSuperAdmin
              ? <label className="text-xs font-bold text-slate-700 dark:text-slate-200">D-8 country
                  <select value={countryNodeId} onChange={(event) => setCountryNodeId(event.target.value)} className={`mt-1 w-full ${inputClass}`}>
                    <option value="">Select a member state...</option>
                    {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                  </select>
                </label>
              : <p className="self-end pb-2 text-xs text-slate-500">Applies to your own country node.</p>)}
            {scope === 'PROJECT' && <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Project
              <select value={uploadProjectId} onChange={(event) => setUploadProjectId(event.target.value)} className={`mt-1 w-full ${inputClass}`}>
                <option value="">Select a project...</option>
                {projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName}</option>)}
              </select>
            </label>}
          </div>
          <div className="rounded-xl border border-dashed border-purple-300 bg-purple-50 p-4 dark:bg-purple-950/20">
            <label className="text-xs font-bold text-purple-900 dark:text-purple-200">Upload PDF document</label>
            <input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm" />
            <button onClick={() => void uploadPdf()} disabled={busy || !file} className="mt-3 flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Upload className="h-4 w-4" /> Upload PDF</button>
            <p className="mt-2 text-[11px] text-purple-800 dark:text-purple-300">Maximum 10 MB. Text-based PDFs are supported; scanned PDFs require OCR.</p>
          </div>
          <div className="border-t border-slate-200 pt-4 text-xs font-bold text-slate-500 dark:border-slate-700">Or paste document text</div>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Document title" className={inputClass} />
          <select value={documentCategory} onChange={(event) => setDocumentCategory(event.target.value)} className={inputClass}><option>AAOIFI Standard</option><option>BNM Shariah Resolution</option><option>Fatwa</option><option>Contract Template</option><option>Legal Clause</option><option>Internal Policy</option><option>Regulatory Guidance</option></select>
          <select value={contractType} onChange={(event) => setContractType(event.target.value)} className={inputClass}><option value="">All contract types</option><option>Ijarah</option><option>Musharakah</option><option>Mudarabah</option><option>Wakalah</option><option>Sukuk</option></select>
          <input value={authority} onChange={(event) => setAuthority(event.target.value)} placeholder="Authority (e.g. AAOIFI, BNM SAC)" className={inputClass} />
          <select value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} className={inputClass}><option>International</option>{countries.map((country) => <option key={country.code}>{country.name}</option>)}</select>
          <input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Industry (e.g. Real Estate)" className={inputClass} />
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Effective from (optional — date the standard or regulation applies)
            <input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className={`mt-1 w-full ${inputClass}`} />
          </label>
          <select value={sourceType} onChange={(event) => setSourceType(event.target.value)} className={inputClass}>
            <option value="AAOIFI_STANDARD">AAOIFI Standard</option>
            <option value="FATWA">Fatwa</option>
            <option value="INTERNAL_SHARIAH_POLICY">Internal Shariah Policy</option>
            <option value="APPROVED_CONTRACT_TEMPLATE">Approved Contract Template</option>
            <option value="REGULATORY_GUIDANCE">Regulatory Guidance</option>
          </select>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste the document text here..." rows={8} className={inputClass} />
          <button onClick={() => void upload()} disabled={busy} className="flex w-fit items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Upload className="h-4 w-4" /> Save to {SCOPE_INFO[scope].label}</button>
        </div> : <p className="mt-4 text-xs text-slate-500">Knowledge-base content is managed by Super Admins, AI Administrators, and Country Admins.</p>}
      </div>

      {canManageCorpus && <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-black text-slate-900 dark:text-white">Review & Approval</h3>
          {canBackfill && <button onClick={() => void backfill()} disabled={busy} className="rounded-xl border border-purple-300 px-3 py-2 text-xs font-bold text-purple-700 disabled:opacity-50">Rebuild & embed</button>}
          <select value={listScope} onChange={(event) => setListScope(event.target.value as RagScope | '')} className={inputClass}>
            <option value="">All levels</option>
            {(Object.keys(SCOPE_INFO) as RagScope[]).map((key) => <option key={key} value={key}>{SCOPE_INFO[key].label}</option>)}
          </select>
        </div>
        <p className="mt-1 text-xs text-slate-500">DRAFT → REVIEWED → APPROVED. The uploader cannot review, and the approver must differ from the reviewer.</p>
        <div className="mt-4 space-y-3">
          {documents.length === 0 && <p className="text-xs text-slate-500">No documents at this level yet.</p>}
          {documents.map((document) => <article key={document.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-slate-900 dark:text-white">{document.title}</strong>
              <span className={`rounded-full px-2 py-0.5 font-bold ${SCOPE_INFO[document.scope].badge}`}>{document.scope === 'GLOBAL' ? 'GLOBAL · D-8' : document.scope === 'COUNTRY' ? `COUNTRY · ${countryName(document.countryNodeId)}` : `PROJECT · ${projectName(document.projectId)}`}</span>
              <span className={`rounded-full px-2 py-0.5 font-bold ${APPROVAL_BADGE[document.approvalStatus] || APPROVAL_BADGE.DRAFT}`}>{document.approvalStatus}</span>
              <span className="text-slate-500">{document.sourceType} · {document.chunkCount ?? 0} chunks{document.metadata?.source?.pageCount ? ` · ${document.metadata.source.pageCount} pages` : ''}</span>
              {document.metadata?.embedding && <span className={`rounded-full px-2 py-0.5 font-bold ${EMBEDDING_BADGE[document.metadata.embedding.status].className}`}>{EMBEDDING_BADGE[document.metadata.embedding.status].label}</span>}
            </div>
            {document.effectiveFrom && <p className="mt-1 text-slate-500">Effective from {new Date(document.effectiveFrom).toLocaleDateString()}</p>}
            {document.reviewComment && <p className="mt-1 text-slate-600 dark:text-slate-300">Comment: {document.reviewComment}</p>}
            {document.supersededById && <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-white">SUPERSEDED</span>
              <span>Replaced by <strong>{document.supersededBy?.title || 'a newer version'}</strong>{document.supersededAt ? ` on ${new Date(document.supersededAt).toLocaleDateString()}` : ''}. Not used by the AI; kept for audit and existing citations.</span>
              <button onClick={() => void supersede(document, null)} disabled={busy} className="rounded-lg border border-slate-300 px-2 py-1 font-bold disabled:opacity-50">Restore as current</button>
            </div>}
            {document.approvalStatus === 'APPROVED' && !document.supersededById && replacementOptions(document).length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2">
              <select value={replacementFor[document.id] || ''} onChange={(event) => setReplacementFor((current) => ({ ...current, [document.id]: event.target.value }))} className={`min-w-0 flex-1 ${inputClass}`}>
                <option value="">Superseded by a newer version...</option>
                {replacementOptions(document).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}{candidate.effectiveFrom ? ` (effective ${new Date(candidate.effectiveFrom).toLocaleDateString()})` : ''}</option>)}
              </select>
              <button onClick={() => void supersede(document, replacementFor[document.id])} disabled={busy || !replacementFor[document.id]} className="rounded-xl bg-slate-700 px-3 py-2 font-bold text-white disabled:opacity-50">Mark superseded</button>
            </div>}
            {['DRAFT', 'REVIEWED'].includes(document.approvalStatus) && <div className="mt-2 flex flex-wrap items-center gap-2">
              <input value={reviewComment[document.id] || ''} onChange={(event) => setReviewComment((current) => ({ ...current, [document.id]: event.target.value }))} placeholder="Review comment (optional)" className={`min-w-0 flex-1 ${inputClass}`} />
              {document.approvalStatus === 'DRAFT'
                ? <button onClick={() => void review(document, 'REVIEWED')} disabled={busy} className="rounded-xl bg-amber-500 px-3 py-2 font-bold text-white disabled:opacity-50">Mark reviewed</button>
                : <button onClick={() => void review(document, 'APPROVED')} disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" />Approve</button>}
              <button onClick={() => void review(document, 'REJECTED')} disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 font-bold text-white disabled:opacity-50"><XCircle className="h-3.5 w-3.5" />Reject</button>
            </div>}
          </article>)}
        </div>
      </div>}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="font-black text-slate-900 dark:text-white">Search Knowledge Base</h3>
        <p className="mt-1 text-xs text-slate-500">Searches approved documents only: Global + your country, plus the selected project's documents. Spelling variants (e.g. Musharakah / Musharaka) are matched automatically, and semantic search is used when embeddings are available.</p>
        <select value={searchProjectId} onChange={(event) => { setSearchProjectId(event.target.value); setResults([]); }} className={`mt-3 w-full ${inputClass}`}>
          <option value="">Global + my country</option>
          {projects.map((project) => <option key={project.projectId} value={project.projectId}>Global + country + {project.projectName}</option>)}
        </select>
        <div className="mt-3 flex gap-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void search(); }} placeholder="Search Mudarabah profit and loss rules..." className={`min-w-0 flex-1 ${inputClass}`} />
          <button onClick={() => void search()} disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"><Search className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          {results.map((result) => <article key={result.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700"><strong>{result.title}</strong><span className={`ml-2 rounded-full px-2 py-0.5 font-bold ${SCOPE_INFO[result.scope]?.badge || ''}`}>{result.scope}</span><span className="ml-2 text-slate-500">{result.sourceType}{pageLabel(result) ? ` · ${pageLabel(result)}` : ''}{result.paragraphRefs?.length ? ` · ${result.paragraphRefs.join(' ')}` : ''}</span>{result.retrieval && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{result.retrieval}</span>}<p className="mt-1 text-slate-600 dark:text-slate-300">{result.content}</p></article>)}
        </div>
      </div>
      {message && <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{message}</p>}
    </div>
  );
};
