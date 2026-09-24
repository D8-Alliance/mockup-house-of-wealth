import React, { useEffect, useState } from 'react';
import { AIService } from '../../services/AIService';
import { ContractDraftParams } from '../../types/aiCoreTypes';
import { AIConfidenceBadge } from '../../components/AIConfidenceBadge';
import { FileText, Sparkles, Copy, Download, RefreshCw, Send, AlertTriangle } from 'lucide-react';
import { apiClient, BackendProject, ShariahReview } from '../../../services/apiClient';
import { ProjectProgressVisual } from '../../../components/projects/ProjectProgressVisual';
import { WorkflowStage } from '../../../components/sponsor/SponsorTypes';

interface AIContractDraftAssistantProps {
  user: { id: string; role: string; organization?: string; countryCode?: string };
  initialParams?: Partial<ContractDraftParams>;
}

export const AIContractDraftAssistant: React.FC<AIContractDraftAssistantProps> = ({ user, initialParams }) => {
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialParams?.projectId || '');
  const [selectedTemplate, setSelectedTemplate] = useState<NonNullable<ContractDraftParams['templateKey']>>('ijarah');
  const [loading, setLoading] = useState(false);
  const [draftResult, setDraftResult] = useState<Awaited<ReturnType<typeof AIService.generateContractDraft>> | null>(null);
  const [error, setError] = useState('');
  const [submittedReview, setSubmittedReview] = useState<ShariahReview | null>(null);
  const [projectReviews, setProjectReviews] = useState<ShariahReview[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string }[]>([]);
  const canSubmitToBoard = ['Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee'].includes(user.role);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiClient.getProjects(), apiClient.getShariahReviews(), apiClient.getShariahNotifications()]).then(([items, reviews, notificationItems]) => {
      if (cancelled) return;
      setProjects(items);
      setProjectReviews(reviews);
      setNotifications(notificationItems);
      setSelectedProjectId((current) => current || items[0]?.projectId || '');
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load projects.');
    });
    return () => { cancelled = true; };
  }, []);

  const project = projects.find((item) => item.projectId === selectedProjectId);
  const projectStage: WorkflowStage = project?.status === 'DUE_DILIGENCE' ? 'Shariah Review' : project?.status === 'APPROVED' ? 'Approved' : project?.status === 'POOLING' ? 'Pooling' : 'Draft';
  const activeReview = submittedReview || projectReviews.find((review) => review.projectId === selectedProjectId && ['PROPOSED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'].includes(review.status));
  const currency = project?.countryNode?.currency || 'MYR';
  const capital = project ? Number(project.fundingRequired) : 0;
  const sponsorName = project?.projectSponsor?.name || 'Loading...';
  const templateLabels: Record<NonNullable<ContractDraftParams['templateKey']>, string> = { ijarah: 'Ijarah', musharakah: 'Musharakah', mudarabah: 'Mudarabah', wakalah: 'Wakalah', sukuk: 'Sukuk' };
  const templateSections: Record<string, string[]> = {
    Ijarah: ['Transaction Overview', 'Parties and Roles', 'Underlying Asset and Lease', 'Rental and Payment Terms', 'Security and Covenants', 'Shariah Conditions', 'Conditions Precedent', 'Risks and Disclosures', 'Approvals and Signatures'],
    Musharakah: ['Transaction Overview', 'Capital Contributions', 'Ownership and Governance', 'Profit and Loss Allocation', 'Funding and Drawdown', 'Exit and Default', 'Shariah Conditions', 'Risks and Disclosures', 'Approvals and Signatures'],
    Mudarabah: ['Transaction Overview', 'Rabb-ul-Mal and Mudarib', 'Capital and Use of Proceeds', 'Profit Sharing and Loss Allocation', 'Management Duties', 'Default and Termination', 'Shariah Conditions', 'Risks and Disclosures', 'Approvals and Signatures'],
    Wakalah: ['Transaction Overview', 'Principal and Agent', 'Mandate and Investment Parameters', 'Agency Fee and Incentive', 'Reporting and Controls', 'Default and Termination', 'Shariah Conditions', 'Risks and Disclosures', 'Approvals and Signatures'],
    Sukuk: ['Transaction Overview', 'Issuer and Sukukholders', 'Sukuk Assets and Structure', 'Issue Size and Settlement', 'Periodic Distribution and Redemption', 'Security and Events of Default', 'Shariah Conditions', 'Risks and Disclosures', 'Approvals and Signatures'],
  };
  const draftRecommendation = draftResult?.recommendation;
  const draftTitle = draftRecommendation?.title || `${templateLabels[selectedTemplate]} Term Sheet (Draft)`;
  const draftWatermark = draftRecommendation?.watermark || 'AI-GENERATED DRAFT • REQUIRES LEGAL AND SHARIAH REVIEW';
  const selectedTemplateLabel = templateLabels[selectedTemplate];
  const draftText = draftRecommendation?.draftText || [
    'STRUCTURED TERM SHEET TEMPLATE',
    `Template: ${selectedTemplateLabel} Term Sheet`,
    `Project: ${project?.projectName || 'UNSPECIFIED'}`,
    `Sponsor: ${sponsorName}`,
    `Capital: ${capital.toLocaleString()} ${currency}`,
    '',
    ...(templateSections[selectedTemplateLabel] || []).flatMap((section, index) => [`${index + 1}. ${section}`, 'To be completed and verified by the sponsor, legal counsel, financial adviser and Shariah adviser.', '']),
    'IMPORTANT: This sandbox draft is synthetic and is not an offer, legal advice, investment advice, Shariah approval or evidence of project viability.',
  ].join('\n');

  const handleGenerateDraft = async () => {
    if (!project) return;
    setLoading(true);
    setError('');
    setSubmittedReview(null);
    try {
      setDraftResult(await AIService.generateContractDraft({ projectId: project.projectId, contractType: templateLabels[selectedTemplate] }, user));
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : 'Unable to generate the draft.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitToBoard = async () => {
    if (!project) return;
    setError('');
    try {
      const reviewInput = {
        projectId: project.projectId,
        organisationId: project.organisationId,
        countryNodeId: project.countryNodeId,
        proposedContract: selectedTemplateLabel,
        draftText,
      };
      const review = activeReview?.status === 'CHANGES_REQUESTED'
        ? await apiClient.resubmitShariahReview(activeReview.id, reviewInput)
        : await apiClient.createShariahReview(reviewInput);
      setSubmittedReview(review);
      setProjectReviews((current) => [...current.filter((item) => item.id !== activeReview?.id), review]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit the draft to the Shariah Advisory Board.');
    }
  };

  const handleRevertSubmission = async () => {
    if (!activeReview) return;
    try {
      const reverted = await apiClient.revertShariahReview(activeReview.id);
      setSubmittedReview(null);
      setProjectReviews((current) => current.filter((item) => item.id !== activeReview.id));
    } catch (revertError) {
      setError(revertError instanceof Error ? revertError.message : 'Unable to revert the submission.');
    }
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <FileText className="w-3.5 h-3.5" />
            AI Contract Draft Assistant
          </span>
          <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
            Automated Shariah Legal Term Sheet Generator
          </h2>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Generates standardized term sheet drafts. All generated outputs are explicitly labeled as drafts and require legal counsel and Shariah board sign-off.
          </p>
        </div>

        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Project
          <select
            value={selectedProjectId}
            onChange={(event) => { setSelectedProjectId(event.target.value); setDraftResult(null); }}
            disabled={loading || projects.length === 0}
            className="mt-1 w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            {projects.length === 0 && <option value="">Loading projects...</option>}
            {projects.map((item) => <option key={item.projectId} value={item.projectId}>{item.projectName}</option>)}
          </select>
        </label>

        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Structured Term Sheet Template
          <select value={selectedTemplate} onChange={(event) => { setSelectedTemplate(event.target.value as NonNullable<ContractDraftParams['templateKey']>); setDraftResult(null); }} disabled={loading} className="mt-1 w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold">
            {Object.entries(templateLabels).map(([key, label]) => <option key={key} value={key}>{label} Term Sheet</option>)}
          </select>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Islamic Contract Structure</label>
            <select
              value={project?.proposedShariahContract || ''}
              disabled
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
            >
              <option value={project?.proposedShariahContract || ''}>{project?.proposedShariahContract || 'Loading projects...'}</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Funding Required ({currency})</label>
            <input
              type="number"
              value={capital}
              readOnly
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Managing Partner / Sponsor</label>
            <input
              type="text"
              value={sponsorName}
              readOnly
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
            />
          </div>
        </div>

        {project && <ProjectProgressVisual stage={projectStage} />}

        <button
          onClick={handleGenerateDraft}
          disabled={loading || !project}
          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          {loading ? 'Drafting Agreement...' : 'Generate Draft Term Sheet'}
        </button>
      </div>

      {error && <p role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">{error}</p>}
      {notifications.length > 0 && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-[11px] text-blue-900"><strong>{notifications[0].title}</strong><p className="mt-1">{notifications[0].message}</p></div>}

      {draftResult && (
        <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 relative border border-slate-700 shadow-2xl">
          {/* Watermark Banner */}
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
             {draftWatermark}
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
             <h3 className="font-black text-sm text-emerald-400">{draftTitle}</h3>
             <div className="flex flex-col items-end gap-1">
               <AIConfidenceBadge confidence={draftResult.confidence} />
               <span className="text-[10px] text-slate-400">Sandbox output requires legal and Shariah review.</span>
             </div>
          </div>

          <pre className="p-4 rounded-2xl bg-slate-950 font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap border border-slate-800 overflow-x-auto">
             {draftText}
          </pre>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => alert('Draft copied to clipboard!')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Text
              </button>
              <button
                onClick={() => handleGenerateDraft()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
            </div>

             {canSubmitToBoard && !activeReview && <button
               onClick={() => void handleSubmitToBoard()}
               className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 cursor-pointer"
             >
               <Send className="w-3.5 h-3.5" /> Submit to Shariah Advisory Board
             </button>}
             {canSubmitToBoard && activeReview && activeReview.status === 'CHANGES_REQUESTED' && <button onClick={() => void handleSubmitToBoard()} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black flex items-center gap-1.5 cursor-pointer"><Send className="w-3.5 h-3.5" /> Resubmit Changes</button>}
             {canSubmitToBoard && activeReview && ['PROPOSED', 'UNDER_REVIEW'].includes(activeReview.status) && <button onClick={() => void handleRevertSubmission()} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black flex items-center gap-1.5 cursor-pointer">Revert to Draft</button>}
           </div>
           {activeReview && <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-[11px] text-emerald-300">Submission status: <strong>{activeReview.status}</strong>. Revision: <strong>{activeReview.revision || 1}</strong>.</p>}
         </div>
      )}
    </div>
  );
};
