import React, { useEffect, useState } from 'react';
import { BookOpen, Search, Upload } from 'lucide-react';
import { apiClient, BackendProject, BackendRagSearchResult } from '../../services/apiClient';

export const AIRagKnowledgeBase: React.FC = () => {
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState('INTERNAL_SHARIAH_POLICY');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BackendRagSearchResult[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    apiClient.getProjects()
      .then((items) => {
        setProjects(items);
        setProjectId(items[0]?.projectId || '');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load projects.'));
  }, []);

  const upload = async () => {
    if (!projectId || !title.trim() || !content.trim()) {
      setMessage('Project, title and document content are required.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await apiClient.createRagDocument({ projectId, title: title.trim(), sourceType, content });
      setTitle('');
      setContent('');
      setMessage('Document uploaded and chunked into the tenant knowledge base.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload document.');
    } finally {
      setBusy(false);
    }
  };

  const search = async () => {
    if (!projectId || !query.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      setResults(await apiClient.searchRagDocuments({ projectId, query: query.trim(), limit: 5 }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to search documents.');
    } finally {
      setBusy(false);
    }
  };

  const uploadPdf = async () => {
    if (!projectId || !file) {
      setMessage('Select a project and choose a PDF file first.');
      return;
    }
    setBusy(true);
    setMessage('Extracting PDF text and creating RAG chunks...');
    try {
      await apiClient.uploadRagPdf(projectId, file);
      setFile(null);
      setMessage('PDF uploaded and indexed in the tenant knowledge base.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-purple-600" />
          <div>
            <h2 className="font-black text-slate-900 dark:text-white">AI Knowledge Base</h2>
            <p className="text-xs text-slate-500">Upload approved Shariah policies, standards, fatwa, and contract clauses.</p>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Documents are stored in the current tenant scope. Upload only approved and licensed material.</p>
        <div className="mt-4 grid gap-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Project
            <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setResults([]); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              {projects.length === 0 && <option value="">Loading projects...</option>}
              {projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName}</option>)}
            </select>
          </label>
          <div className="rounded-xl border border-dashed border-purple-300 bg-purple-50 p-4">
            <label className="text-xs font-bold text-purple-900">Upload PDF document</label>
            <input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm" />
            <button onClick={() => void uploadPdf()} disabled={busy || !file} className="mt-3 flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Upload className="h-4 w-4" /> Upload PDF</button>
            <p className="mt-2 text-[11px] text-purple-800">Maximum 10 MB. Text-based PDFs are supported; scanned PDFs require OCR.</p>
          </div>
          <div className="border-t border-slate-200 pt-4 text-xs font-bold text-slate-500">Or paste approved text</div>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Document title" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <select value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="AAOIFI_STANDARD">AAOIFI Standard</option>
            <option value="FATWA">Fatwa</option>
            <option value="INTERNAL_SHARIAH_POLICY">Internal Shariah Policy</option>
            <option value="APPROVED_CONTRACT_TEMPLATE">Approved Contract Template</option>
            <option value="REGULATORY_GUIDANCE">Regulatory Guidance</option>
          </select>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste the approved document text here..." rows={8} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={() => void upload()} disabled={busy} className="flex w-fit items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Upload className="h-4 w-4" /> Upload to RAG</button>
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="font-black text-slate-900 dark:text-white">Search Knowledge Base</h3>
        <div className="mt-3 flex gap-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void search(); }} placeholder="Search Mudarabah profit and loss rules..." className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={() => void search()} disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"><Search className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          {results.map((result) => <article key={result.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700"><strong>{result.title}</strong><span className="ml-2 text-slate-500">{result.sourceType}</span><p className="mt-1 text-slate-600 dark:text-slate-300">{result.content}</p></article>)}
        </div>
      </div>
      {message && <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{message}</p>}
    </div>
  );
};
