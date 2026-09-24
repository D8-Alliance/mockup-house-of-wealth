import React, { useEffect, useState } from 'react';
import { AIRiskAlert } from '../../components/AIRiskAlert';
import { AIConfidenceBadge } from '../../components/AIConfidenceBadge';
import { ShieldCheck, Sparkles, FileSearch, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiClient, BackendDueDiligenceScan, BackendProject } from '../../../services/apiClient';

export const AIDueDiligenceAssistant: React.FC<{ user: any }> = () => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [projectId, setProjectId] = useState('');
  const [scan, setScan] = useState<BackendDueDiligenceScan | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { apiClient.getProjects().then((items) => { setProjects(items); if (items[0]) setProjectId(items[0].projectId); }).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load projects.')); }, []);
  useEffect(() => { if (projectId) apiClient.getLatestProjectDueDiligence(projectId).then(setScan).catch(() => setScan(null)); }, [projectId]);
  const handleScanDD = async () => {
    if (!projectId) return;
    setLoading(true); setError('');
    try { setScan(await apiClient.runProjectDueDiligence(projectId)); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to run due diligence scan.'); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <ShieldCheck className="w-3.5 h-3.5" />
              AI Due Diligence & AML Scanner
            </span>
            <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
              Automated Due Diligence Checklist & Anomaly Detection
            </h2>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Scans submitted files for missing documentation, inconsistent financial disclosures, and potential AML/KYC risk indicators.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="max-w-[260px] p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-xs">
            <option value="">Select project</option>
            {projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName}</option>)}
          </select>
          <button
            onClick={handleScanDD}
            disabled={loading || !projectId}
            className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-lg shadow-rose-600/20 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-rose-200" />
            {loading ? 'Scanning Documents...' : 'Run Due Diligence Scan'}
          </button>
          </div>
        </div>
        {error && <p className="text-rose-600 font-semibold">{error}</p>}
      </div>

      {scan && (
        <div className="space-y-6">
          {/* Missing Checklist Items */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-amber-500" />
              Missing Critical Documentation ({scan.missingDocuments.length} Required Items)
            </h3>
            <ul className="space-y-2">
              {scan.missingDocuments.map((mf, idx) => (
                <li key={idx} className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold flex items-center justify-between">
                   <span>{mf.title}</span>
                  <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 font-black">Missing</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Anomaly Alerts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white">
              <h3 className="font-black text-sm text-rose-400">Potential Anomalies Requiring Human Investigation</h3>
               <AIConfidenceBadge confidence={{ level: scan.confidenceScore >= 70 ? 'MEDIUM' : 'LOW', scorePercent: scan.confidenceScore, disclaimer: 'AI alerts indicate items requiring compliance officer verification.' }} />
            </div>

            <div className="grid grid-cols-1 gap-3">
               {scan.findings.map((a, idx) => (
                <AIRiskAlert
                  key={idx}
                  title={a.title}
                  description={a.description}
                  severity={a.severity}
                  mitigation={a.mitigation}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
