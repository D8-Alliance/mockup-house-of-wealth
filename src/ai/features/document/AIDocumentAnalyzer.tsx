import React, { useEffect, useState } from 'react';
import { AIConfidenceBadge } from '../../components/AIConfidenceBadge';
import { FileText, Sparkles, Calendar, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { apiClient, BackendDocumentAnalysis, BackendProject, BackendProjectDocument } from '../../../services/apiClient';

export const AIDocumentAnalyzer: React.FC = () => {
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [projectId, setProjectId] = useState('');
  const [documents, setDocuments] = useState<BackendProjectDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<BackendDocumentAnalysis | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { apiClient.getProjects().then((items) => { setProjects(items); if (items[0]) setProjectId(items[0].projectId); }).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load projects.')); }, []);
  useEffect(() => { if (!projectId) return; apiClient.getProjectDocuments(projectId).then((items) => { setDocuments(items); setSelectedDoc(items[0]?.id || ''); setResult(null); }).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load documents.')); }, [projectId]);
  const handleAnalyzeDoc = async () => {
    if (!projectId || !selectedDoc) return;
    setAnalyzing(true); setError('');
    try { setResult(await apiClient.analyzeProjectDocument(projectId, selectedDoc)); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to analyze document.'); } finally { setAnalyzing(false); }
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <FileText className="w-3.5 h-3.5" />
            AI Document OCR & Intelligence Extractor
          </span>
          <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
            Automated Document Legal Term & Financial Extraction
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="flex-grow p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold">
            <option value="">Select project</option>
            {projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName}</option>)}
          </select>
          <select
            value={selectedDoc}
            onChange={e => setSelectedDoc(e.target.value)}
            className="flex-grow p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="">Select document</option>
            {documents.map((document) => <option key={document.id} value={document.id}>{document.fileName}</option>)}
          </select>

          <button
            onClick={handleAnalyzeDoc}
            disabled={analyzing}
            className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            {analyzing ? 'Extracting Text...' : 'Analyze Document'}
          </button>
        </div>
        {error && <p className="text-rose-600 font-semibold">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white">
            <h3 className="font-black text-sm text-purple-300">Extraction Results: {result.documentName}</h3>
            <AIConfidenceBadge confidence={result.confidence} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Users className="w-4 h-4 text-emerald-600" /> Identified Parties
              </span>
              <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300">
                 {result.parties.length ? result.parties.map((p, idx) => <li key={idx}>{p}</li>) : <li>No parties detected in extracted text.</li>}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Calendar className="w-4 h-4 text-blue-600" /> Key Dates
              </span>
              <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300">
                 {result.importantDates.length ? result.importantDates.map((d, idx) => <li key={idx}>{d}</li>) : <li>No dates detected in extracted text.</li>}
              </ul>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]"><DollarSign className="w-4 h-4 text-emerald-600" /> Extracted Figures</span>
              <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300">{result.extractedFigures.length ? result.extractedFigures.map((figure, idx) => <li key={idx}>{figure}</li>) : <li>No figures detected in extracted text.</li>}</ul>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]"><AlertTriangle className="w-4 h-4 text-amber-600" /> Key Terms</span>
              <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300">{result.keyTerms.length ? result.keyTerms.map((term, idx) => <li key={idx}>{term}</li>) : <li>No recognised terms detected.</li>}</ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
