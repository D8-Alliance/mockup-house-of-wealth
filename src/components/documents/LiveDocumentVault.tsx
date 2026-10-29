import React from 'react';
import { Download, FileText, RefreshCw, Search } from 'lucide-react';
import { apiClient, VaultDocumentRow } from '../../services/apiClient';

const size = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Project documents in the viewer's scope, from the database; each downloads through the project's own route. */
export const LiveDocumentVault: React.FC = () => {
  const [documents, setDocuments] = React.useState<VaultDocumentRow[] | null>(null);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [downloading, setDownloading] = React.useState('');

  const load = React.useCallback(() => {
    setError('');
    void apiClient.getDocumentVault()
      .then(setDocuments)
      .catch((cause) => { setDocuments([]); setError(cause instanceof Error ? cause.message : 'The documents could not be loaded.'); });
  }, []);
  React.useEffect(load, [load]);

  const download = async (row: VaultDocumentRow) => {
    setDownloading(row.id);
    setError('');
    try {
      await apiClient.downloadProjectDocument(row.projectId, row.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The document could not be downloaded.');
    } finally {
      setDownloading('');
    }
  };

  const needle = query.trim().toLowerCase();
  const shown = (documents ?? []).filter(row => !needle || `${row.fileName} ${row.project.projectName} ${row.project.projectCode}`.toLowerCase().includes(needle));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 mb-2 border border-blue-500/20">Document Vault</span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Project Documents</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Evidence and project files uploaded to the platform, in your scope. Each file keeps the SHA-256 recorded at upload.</p>
        </div>
        <button type="button" onClick={load} className="self-start md:self-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search file or project..." className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" />
      </div>

      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {!documents && <p className="px-5 py-4 text-xs text-slate-500">Loading documents...</p>}
        {documents && shown.length === 0 && !error && <p className="px-5 py-6 text-xs text-slate-500">{needle ? 'No document matches the search.' : 'No project document has been uploaded yet.'}</p>}
        {shown.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400">
                <tr className="text-left">
                  <th className="px-5 py-3 font-black">File</th>
                  <th className="px-5 py-3 font-black">Project</th>
                  <th className="px-5 py-3 font-black">Uploaded</th>
                  <th className="px-5 py-3 font-black">Size</th>
                  <th className="px-5 py-3 font-black">Text</th>
                  <th className="px-5 py-3 font-black text-right">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {shown.map(row => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-white"><span className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500 shrink-0" />{row.fileName}</span></td>
                    <td className="px-5 py-3">{row.project.projectName} <span className="font-mono text-slate-400">{row.project.projectCode}</span></td>
                    <td className="px-5 py-3 whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{size(row.fileSize)}</td>
                    <td className="px-5 py-3">{row.extractionStatus === 'EXTRACTED' ? 'Read' : row.extractionStatus.charAt(0) + row.extractionStatus.slice(1).toLowerCase()}</td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" disabled={downloading === row.id} onClick={() => void download(row)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer">
                        <Download className="w-3.5 h-3.5" /> {downloading === row.id ? 'Downloading...' : 'Download'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
