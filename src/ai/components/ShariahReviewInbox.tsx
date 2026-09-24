import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Download, RefreshCw, XCircle } from 'lucide-react';
import { apiClient, BackendProject, BackendProjectDocument, ShariahReview } from '../../services/apiClient';
import { ProjectProgressVisual } from '../../components/projects/ProjectProgressVisual';

interface ShariahReviewInboxProps {
  role: string;
}

const DECISION_ROLES = ['Super Admin', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee'];

export const ShariahReviewInbox: React.FC<ShariahReviewInboxProps> = ({ role }) => {
  const [reviews, setReviews] = useState<ShariahReview[]>([]);
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [documents, setDocuments] = useState<Record<string, BackendProjectDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justification, setJustification] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; createdAt: string }[]>([]);
  const canDecide = DECISION_ROLES.includes(role);

  const loadReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const [reviewItems, projectItems, notificationItems] = await Promise.all([apiClient.getCentralMalaysiaShariahReviews(), apiClient.getProjects(), apiClient.getShariahNotifications()]);
      setReviews(reviewItems);
      setProjects(projectItems);
      const documentEntries = await Promise.all(reviewItems.map(async (review) => {
        try {
          return [review.projectId, await apiClient.getProjectDocuments(review.projectId)] as const;
        } catch {
          return [review.projectId, []] as const;
        }
      }));
      setDocuments(Object.fromEntries(documentEntries));
      setNotifications(notificationItems);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Shariah reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadReviews(); }, []);

  const decide = async (review: ShariahReview, decision: 'ACCEPTED' | 'MODIFIED' | 'OVERRIDDEN' | 'REJECTED' | 'REQUEST_CHANGES') => {
    const note = justification[review.id] || '';
    if ((decision === 'MODIFIED' || decision === 'OVERRIDDEN' || decision === 'REJECTED' || decision === 'REQUEST_CHANGES') && !note.trim()) {
      setError('A justification is required for modified, overridden or rejected decisions.');
      return;
    }
    setSubmittingId(review.id);
    setError('');
    try {
      const updated = await apiClient.submitShariahDecision(review.id, { decision, justification: note });
      setReviews((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Unable to record the Shariah decision.');
    } finally {
      setSubmittingId('');
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">Shariah Advisory Board Inbox</span>
          <h2 className="mt-1 text-base font-black text-slate-900 dark:text-white">Structured term sheet reviews</h2>
          <p className="mt-1 text-[11px] text-slate-500">Review submissions, record a decision, and preserve the justification in the audit trail.</p>
        </div>
        <button onClick={() => void loadReviews()} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {notifications.length > 0 && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-900"><strong>Notifications ({notifications.length})</strong><ul className="mt-1 space-y-1">{notifications.slice(0, 5).map((item) => <li key={item.id}>• {item.title}: {item.message}</li>)}</ul></div>}

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</p>}
      {loading && <p className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-500 dark:bg-slate-900">Loading Shariah reviews...</p>}
      {!loading && reviews.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-500 dark:bg-slate-900">No Shariah submissions in the current tenant.</p>}

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="flex h-auto flex-col gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            {(() => {
              const project = review.project || projects.find((item) => item.projectId === review.projectId);
              const projectDocuments = review.project?.documents || documents[review.projectId] || [];
              return <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <button type="button" onClick={() => setExpandedReviewId((current) => current === review.id ? null : review.id)} className="text-left font-black text-slate-900 underline decoration-dotted underline-offset-4 hover:text-purple-700 dark:text-white dark:hover:text-purple-300">{project?.projectName || review.projectId}</button>
                <p className="text-[11px] text-slate-500">Project ID: <span className="font-mono">{review.projectId}</span> · Template: <strong>{review.proposedContract}</strong> · Review ID: <span className="font-mono">{review.id}</span></p>
              </div>
              <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${review.status === 'PROPOSED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{review.status}</span><span className="text-[10px] font-bold text-slate-400">{expandedReviewId === review.id ? 'Hide details' : 'View details'}</span></div>
            </div>

            {expandedReviewId === review.id && <div className="flex h-auto flex-col gap-4">
            {project && <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 sm:grid-cols-3 dark:bg-slate-800 dark:text-slate-300">
              <span>Funding: <strong>{project.countryNode?.currency || 'MYR'} {Number(project.fundingRequired).toLocaleString()}</strong></span>
              <span>Sector: <strong>{project.sector}</strong></span>
              <span>Sponsor: <strong>{project.projectSponsor?.name || 'Not available'}</strong></span>
            </div>}

            <div className="grid h-auto items-start gap-4 lg:grid-cols-2">
              <div className="flex h-auto min-h-[250px] min-w-0 flex-col overflow-visible rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-[10px] font-black uppercase tracking-wider text-purple-600">Term Sheet Submitted</p>
                <div className="mt-2 h-auto min-h-[220px] text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {(review.aiResult?.draftText || 'No draft content was attached to this submission.').split('\n').map((line, index) => <div key={`${index}-${line}`} className="break-words">{line || '\u00a0'}</div>)}
                </div>
              </div>
              <div className="flex h-auto min-h-[250px] min-w-0 flex-col overflow-visible rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Project Evidence ({projectDocuments.length})</p>
                {projectDocuments.length === 0 ? <p className="mt-2 text-[10px] text-amber-700">No project documents available for review.</p> : <ul className="mt-2 space-y-1 text-[10px] text-slate-600 dark:text-slate-300">{projectDocuments.map((document) => <li key={document.id}><button disabled={downloadingId === document.id} onClick={async () => { setDownloadingId(document.id); try { await apiClient.downloadProjectDocument(review.projectId, document.id); } catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : 'Unable to download the project document.'); } finally { setDownloadingId(''); } }} className="inline-flex items-center gap-1 text-left text-blue-700 underline hover:text-blue-900 disabled:opacity-50"><Download className="h-3 w-3" /> {document.fileName}</button> <span className="text-slate-400">({document.extractionStatus})</span></li>)}</ul>}
              </div>
            </div>
            {project && <div className="h-auto w-full shrink-0 overflow-visible"><ProjectProgressVisual stage={project.status === 'DUE_DILIGENCE' ? 'Shariah Review' : project.status === 'APPROVED' ? 'Approved' : 'Draft'} /></div>}

            {review.status === 'PROPOSED' && canDecide && <>
               <textarea value={justification[review.id] || ''} onChange={(event) => setJustification((current) => ({ ...current, [review.id]: event.target.value }))} placeholder="Justification is required for modified, overridden or rejected decisions." className="min-h-16 h-auto w-full resize-y rounded-xl border border-slate-200 bg-white p-2.5 text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
               <div className="flex flex-wrap gap-2">
                <button disabled={submittingId === review.id} onClick={() => void decide(review, 'ACCEPTED')} className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black text-white disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Accept</button>
                <button disabled={submittingId === review.id} onClick={() => void decide(review, 'MODIFIED')} className="flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-2 text-[11px] font-black text-white disabled:opacity-50"><ClipboardCheck className="h-3.5 w-3.5" /> Modify</button>
                <button disabled={submittingId === review.id} onClick={() => void decide(review, 'REJECTED')} className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-black text-white disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                <button disabled={submittingId === review.id} onClick={() => void decide(review, 'REQUEST_CHANGES')} className="flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-2 text-[11px] font-black text-white disabled:opacity-50">Request Changes</button>
              </div>
            </>}
            {review.decisions.map((decision) => <p key={decision.id} className="mt-3 border-t border-slate-200 pt-2 text-[11px] text-slate-500 dark:border-slate-700">Decision: <strong>{decision.decision}</strong> by {decision.actorRole}. {decision.justification || 'No justification provided.'}</p>)}
            </div>}
              </>;
            })()}
          </div>
        ))}
      </div>
    </div>
  );
};
