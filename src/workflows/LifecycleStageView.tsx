import React, { createContext, useContext } from 'react';
import {
  Building, DollarSign, BookOpen, FileText, ShieldCheck, CheckCircle2, Clock, Layers, Unlock,
  Users, Coins, Award, History, XCircle, FileSignature, TrendingUp, ArrowRight, ArrowUpRight, Activity,
} from 'lucide-react';
import { Project } from '../projects/projectTypes';
import { WealthPool } from '../pooling/poolTypes';
import {
  BackendDistribution, BackendFeasibilityAssessment, BackendFundingRequest, BackendPoolAkadTerms, BackendProjectLifecycle,
} from '../services/apiClient';
import { AKAD_LABELS, AkadType } from '../services/akadApi';

/**
 * Read-only detail views for each lifecycle stage, styled like the original stage consoles
 * but filled only from server records. Nothing here changes data; the one action that moves
 * the project on is passed in as nextAction and shown on the current step only.
 */

export type Load<T> = { data: T | null; error: string | null; loading: boolean };

export interface LifecycleRecords {
  lifecycle: Load<BackendProjectLifecycle>;
  feasibility: Load<BackendFeasibilityAssessment | null>;
  akadTerms: Load<BackendPoolAkadTerms | null>;
  funding: Load<BackendFundingRequest[]>;
  distributions: Load<BackendDistribution[]>;
}

interface LifecycleStageViewProps extends LifecycleRecords {
  index: number;
  project: Project;
  pool: WealthPool | null;
}

/** Feasibility review stages behind steps 3–7, in the order the server runs them. */
export const REVIEW_STAGES: { stage: string; index: number; who: string }[] = [
  { stage: 'FINANCE_REVIEW', index: 2, who: 'Finance Officer or Country Admin' },
  { stage: 'RISK_REVIEW', index: 3, who: 'Risk Officer or Country Admin' },
  { stage: 'COMPLIANCE_REVIEW', index: 4, who: 'Compliance Officer or Country Admin' },
  { stage: 'SHARIAH_REVIEW', index: 5, who: 'Shariah Reviewer or Country Admin' },
  { stage: 'INVESTMENT_COMMITTEE_REVIEW', index: 6, who: 'Shariah Committee' },
];

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const label = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const orDash = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));
const money = (currency: string, n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : `${currency} ${Math.round(n).toLocaleString()}`;
const short = (currency: string, n: number | null | undefined) => {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${currency}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K ${currency}`;
  return `${n.toLocaleString()} ${currency}`;
};
const pctOf = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');
const akadName = (type: string) => AKAD_LABELS[type as AkadType] ?? type;

// ---------------------------------------------------------------------------
// Stage metadata
// ---------------------------------------------------------------------------

type Tone = 'blue' | 'indigo' | 'purple' | 'amber' | 'emerald' | 'sky' | 'rose' | 'teal' | 'slate';

const TONES: Record<Tone, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
};

const STAGES: { badge: string; title?: string; description: string; tone: Tone }[] = [
  { badge: 'STAGE 1: PROJECT ONBOARDING & SPECIFICATIONS', description: 'Project registered by the sponsor with its capital structure, funding need and proposed Shariah contract.', tone: 'blue' },
  { badge: 'STAGE 2: SUBMISSION FOR REVIEW', title: 'Submitted for Review', description: 'The sponsor submitted the project; its feasibility analysis then goes through the review stages.', tone: 'indigo' },
  { badge: 'STAGE 3: FINANCE REVIEW', title: 'Finance Review', description: 'Finance checks the feasibility analysis: costs, funding need and the financial assumptions.', tone: 'purple' },
  { badge: 'STAGE 4: RISK REVIEW', title: 'Risk Review', description: 'Risk rating and mitigations for the project.', tone: 'rose' },
  { badge: 'STAGE 5: COMPLIANCE REVIEW', title: 'Compliance Review', description: 'Regulatory, sanctions and AML screening of the project.', tone: 'sky' },
  { badge: 'STAGE 6: SHARIAH REVIEW', title: 'Shariah Review', description: 'Shariah review of the project structure.', tone: 'emerald' },
  { badge: 'STAGE 7: INVESTMENT COMMITTEE', title: 'Investment Committee', description: 'The Shariah Committee gives the final investment decision.', tone: 'amber' },
  { badge: 'STAGE 8: PROJECT APPROVAL', title: 'Project Approved', description: 'The project passed review and can now have a wealth pool structured under it.', tone: 'emerald' },
  { badge: 'STAGE 9: POOL STRUCTURING', description: 'The pool that will raise the funding, with its akad (Shariah contract) terms fixed as version 1.', tone: 'purple' },
  { badge: 'STAGE 10: MULTI-SIG GOVERNANCE', title: 'Multi-Signature Pool Approval', description: 'Four independent sign-offs are required before the pool can open: Shariah, compliance, risk and an authorised executive.', tone: 'purple' },
  { badge: 'STAGE 11: MARKETPLACE OPENING', title: 'Pool Open for Subscriptions', description: 'The pool is listed and eligible investors can subscribe.', tone: 'emerald' },
  { badge: 'STAGE 12: INVESTOR ORDERS', title: 'Investor Subscriptions', description: 'Investors with approved KYC accept the akad terms and place orders.', tone: 'sky' },
  { badge: 'STAGE 13: ALLOCATION & SETTLEMENT', title: 'Allocation & Settlement', description: 'A settlement officer confirms each order\'s payment, and the amount raised grows.', tone: 'teal' },
  { badge: 'STAGE 14: FUNDING DISBURSEMENT', title: 'Funding Disbursement', description: 'Raised capital is released to the project tranche by tranche.', tone: 'amber' },
  { badge: 'STAGE 15: PROJECT EXECUTION', title: 'Project Execution', description: 'Milestones and their sign-offs while the project runs.', tone: 'slate' },
  { badge: 'STAGE 16: PROFIT DISTRIBUTION', title: 'Profit Distributions', description: 'Period results shared with investors using the pool\'s fixed profit-sharing ratio.', tone: 'emerald' },
  { badge: 'STAGE 17: MATURITY & EXIT', title: 'Maturity & Exit', description: 'Final settlement when the pool reaches the end of its term.', tone: 'slate' },
];

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** The single action that moves the project to its next step; shown only on the current step. */
export interface NextAction {
  title: string;
  description: string;
  /** Button label; omit when the signed-in user can't take the step themselves. */
  buttonLabel?: string;
  onClick?: () => void;
  busy?: boolean;
  /** Shown instead of a button, e.g. who needs to act. */
  note?: string;
  error?: string | null;
}

const NextActionContext = createContext<NextAction | null>(null);

const NextActionPanel: React.FC<{ action: NextAction }> = ({ action }) => (
  <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h4 className="text-sm font-black text-purple-700 dark:text-purple-300 flex items-center gap-2">
        <ArrowRight className="w-4 h-4" />
        Next step: {action.title}
      </h4>
      <p className="text-xs text-purple-900/70 dark:text-purple-200/80 mt-1 max-w-2xl">{action.description}</p>
      {action.note && <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-2">{action.note}</p>}
      {action.error && <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-2">{action.error}</p>}
    </div>
    {action.buttonLabel && action.onClick && (
      <button
        onClick={action.onClick}
        disabled={action.busy}
        className="shrink-0 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-2 shadow-md disabled:opacity-50"
      >
        {action.busy ? 'Working…' : action.buttonLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

const StageCard: React.FC<{ index: number; title: string; status: React.ReactNode; children: React.ReactNode }> = ({ index, title, status, children }) => {
  const meta = STAGES[index];
  const nextAction = useContext(NextActionContext);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-5">
        <div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${TONES[meta.tone]}`}>{meta.badge}</span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{meta.description}</p>
        </div>
        <div className="shrink-0">{status}</div>
      </div>
      {children}
      {nextAction && <NextActionPanel action={nextAction} />}
    </div>
  );
};

const StatusPill: React.FC<{ tone: Tone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-black border ${TONES[tone]}`}>{children}</span>
);

const Section: React.FC<{ icon: React.ElementType; iconClass?: string; title: string; aside?: React.ReactNode; children: React.ReactNode }> = ({ icon: Icon, iconClass = 'text-purple-600', title, aside, children }) => (
  <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
    <div className="flex items-center justify-between gap-2">
      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconClass}`} />
        {title}
      </h4>
      {aside}
    </div>
    {children}
  </div>
);

const Field: React.FC<{ name: string; value: React.ReactNode; sub?: React.ReactNode }> = ({ name, value, sub }) => (
  <div>
    <span className="text-slate-400 font-bold block">{name}</span>
    <span className="font-extrabold text-slate-800 dark:text-slate-200 wrap-break-word">{value}</span>
    {sub && <span className="text-[10px] text-slate-400 block">{sub}</span>}
  </div>
);

const Metric: React.FC<{ name: string; value: React.ReactNode; valueClass?: string; sub?: React.ReactNode }> = ({ name, value, valueClass = 'text-slate-900 dark:text-white', sub }) => (
  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
    <span className="text-[10px] text-slate-400 font-bold block">{name}</span>
    <span className={`text-sm font-black ${valueClass}`}>{value}</span>
    {sub && <span className="text-[10px] text-slate-400 block mt-0.5">{sub}</span>}
  </div>
);

/** Side card: when this step happened, and any note left with it. */
const RecordCard: React.FC<{ title: string; at?: string | null; by?: string | null; note?: string | null; fallback: string }> = ({ title, at, by, note, fallback }) => (
  <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/60 dark:bg-purple-950/20 space-y-3">
    <h4 className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-2">
      <History className="w-4 h-4" />
      {title}
    </h4>
    {at ? (
      <div className="space-y-2 text-xs">
        {by && <Field name="Done by" value={by} />}
        <Field name="When" value={when(at)} />
        {note ? <Field name="Note" value={<span className="italic font-semibold">"{note}"</span>} /> : null}
      </div>
    ) : (
      <p className="text-xs text-purple-900/70 dark:text-purple-200/80">{fallback}</p>
    )}
  </div>
);

const Waiting: React.FC<{ text: string }> = ({ text }) => (
  <div className="p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 flex items-center gap-2">
    <Clock className="w-4 h-4 shrink-0" />
    {text}
  </div>
);

// ---------------------------------------------------------------------------

export const LifecycleStageView: React.FC<LifecycleStageViewProps & { nextAction?: NextAction | null }> = ({ nextAction = null, ...props }) => (
  <NextActionContext.Provider value={nextAction}>
    <StageBody {...props} />
  </NextActionContext.Provider>
);

const StageBody: React.FC<LifecycleStageViewProps> = ({ index, project, pool, lifecycle, feasibility, akadTerms, funding, distributions }) => {
  const events = lifecycle.data?.events || [];
  const statusEvent = (status: string) => [...events].reverse().find(e => e.toStatus === status);
  const c = project.currency;

  // 1. Project created
  if (index === 0) {
    return (
      <StageCard index={0} title={project.projectName} status={<StatusPill tone="amber">Status: {label(project.status)}</StatusPill>}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Section icon={Building} title="Sponsor & Organisation">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <Field name="Organisation" value={orDash(project.organisationName)} />
                <Field name="Sector" value={orDash(project.sector)} sub={project.location || undefined} />
                <Field name="Project sponsor" value={orDash(project.projectSponsorName)} />
                <Field name="Country" value={orDash(project.countryNodeId)} />
              </div>
            </Section>
            <Section icon={DollarSign} iconClass="text-emerald-600" title="Financial Architecture & Capital Ratios">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <Metric name="Total project cost" value={short(c, project.totalProjectCost)} />
                <Metric name="Sponsor equity" value={short(c, project.sponsorContribution)} valueClass="text-purple-600 dark:text-purple-400" sub={`${pctOf(project.sponsorContribution, project.totalProjectCost)} of cost`} />
                <Metric name="Funding required" value={short(c, project.fundingRequired)} valueClass="text-emerald-600 dark:text-emerald-400" sub={`${pctOf(project.fundingRequired, project.totalProjectCost)} of cost`} />
                <Metric name="Tenure" value={project.projectDurationMonths ? `${project.projectDurationMonths} months` : '—'} />
                <Metric name="Expected yield" value={project.indicativeExpectedReturn ? `${project.indicativeExpectedReturn}% p.a.` : '—'} valueClass="text-emerald-600 dark:text-emerald-400" />
              </div>
            </Section>
            {project.description && (
              <Section icon={FileText} iconClass="text-sky-600" title="Business Summary">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{project.description}</p>
              </Section>
            )}
          </div>
          <div className="space-y-5">
            <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20">
              <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Proposed Shariah Contract
              </h4>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-2">{orDash(project.proposedShariahContract)}</p>
            </div>
            <RecordCard title="Registered" at={project.createdAt} fallback="Registration date not recorded." />
          </div>
        </div>
      </StageCard>
    );
  }

  // 2. Submitted
  if (index === 1) {
    const rec = statusEvent('DUE_DILIGENCE');
    const stage = feasibility.data?.reviewStage;
    return (
      <StageCard index={1} title={STAGES[1].title!} status={<StatusPill tone="indigo">Submitted</StatusPill>}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Section icon={FileSignature} title="Submission">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <Metric name="Submitted on" value={rec ? when(rec.createdAt) : '—'} />
                <Metric name="Project status now" value={label(project.status)} valueClass="text-purple-600 dark:text-purple-400" />
                <Metric name="Feasibility review" value={feasibility.loading ? 'Loading…' : stage ? label(stage) : 'Not run yet'} />
              </div>
            </Section>
          </div>
          <RecordCard title="Submission record" at={rec?.createdAt} note={rec?.note} fallback="Submitted for review." />
        </div>
      </StageCard>
    );
  }

  // 3–7. Feasibility review stages
  const review = REVIEW_STAGES.find(r => r.index === index);
  if (review) {
    const history = (feasibility.data?.reviewHistory || []).filter(h => h.stage === review.stage);
    const current = feasibility.data?.reviewStage;
    const decided = history[history.length - 1];
    const decision = decided?.decision || decided?.status;
    const outcome =
      project.status === 'REJECTED' && current === review.stage ? { tone: 'rose' as Tone, text: 'Rejected', icon: XCircle }
      : current === review.stage ? { tone: 'amber' as Tone, text: 'In review', icon: Clock }
      : decided ? { tone: 'emerald' as Tone, text: decision ? label(decision) : 'Done', icon: CheckCircle2 }
      : { tone: 'slate' as Tone, text: 'No decision recorded', icon: Clock };
    const OutcomeIcon = outcome.icon;
    return (
      <StageCard index={index} title={STAGES[index].title!} status={<StatusPill tone={outcome.tone}>{outcome.text}</StatusPill>}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Section icon={History} title="Review History">
              {history.length === 0 ? (
                <p className="text-xs text-slate-500">{feasibility.loading ? 'Loading…' : feasibility.error ? 'The feasibility review is not available to your account.' : 'No decision recorded at this stage yet.'}</p>
              ) : (
                <ol className="relative border-l-2 border-purple-200 dark:border-purple-800 ml-1.5 space-y-4">
                  {history.map((h, i) => (
                    <li key={i} className="pl-4 text-xs">
                      <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-purple-500" />
                      <span className="font-black text-slate-900 dark:text-white">{label(h.decision || h.status || 'Reviewed')}</span>
                      <span className="block text-slate-500">{h.reviewerName || h.reviewer || 'Reviewer'}{h.reviewerRole ? ` (${h.reviewerRole})` : ''} · {when(h.date || h.at)}</span>
                      {(h.comment || h.note) && <span className="block mt-1 italic text-slate-600 dark:text-slate-300">"{h.comment || h.note}"</span>}
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>
          <div className={`p-5 rounded-2xl border ${TONES[outcome.tone]} flex flex-col items-center justify-center text-center gap-2`}>
            <OutcomeIcon className="w-10 h-10" />
            <span className="text-lg font-black">{outcome.text}</span>
            <span className="text-[11px]">Decided by: {review.who}</span>
          </div>
        </div>
      </StageCard>
    );
  }

  // 8. Project approved
  if (index === 7) {
    const rec = statusEvent('APPROVED');
    return (
      <StageCard index={7} title={STAGES[7].title!} status={<StatusPill tone="emerald">Approved</StatusPill>}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Section icon={CheckCircle2} iconClass="text-emerald-600" title="Approval">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <Metric name="Approved on" value={rec ? when(rec.createdAt) : '—'} />
                <Metric name="Project status now" value={label(project.status)} />
                <Metric name="Funding to raise" value={short(c, project.fundingRequired)} valueClass="text-emerald-600 dark:text-emerald-400" />
              </div>
            </Section>
          </div>
          <RecordCard title="Approval record" at={rec?.createdAt} note={rec?.note} fallback="The project is approved." />
        </div>
      </StageCard>
    );
  }

  // Pool stages need a pool.
  if (!pool) {
    return (
      <StageCard index={index} title={STAGES[index].title || 'Pool Structuring'} status={<StatusPill tone="amber">No pool yet</StatusPill>}>
        <Section icon={Layers} title="Wealth Pool">
          <p className="text-xs text-slate-600 dark:text-slate-300">No pool has been structured for this project yet.</p>
        </Section>
      </StageCard>
    );
  }
  const pc = pool.currency;
  const raisedPct = pool.targetAmount > 0 ? Math.min(100, Math.round((pool.amountRaised / pool.targetAmount) * 100)) : 0;

  // 9. Pool structuring
  if (index === 8) {
    const terms = akadTerms.data;
    const share = terms ? Number(terms.investorProfitSharePct) : 0;
    return (
      <StageCard index={8} title={pool.poolName} status={<StatusPill tone="purple">Pool: {label(pool.status)}</StatusPill>}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Section icon={Layers} title="Pool Parameters" aside={<span className="text-[10px] font-bold text-slate-400">{pool.poolCode}</span>}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <Metric name="Target" value={short(pc, pool.targetAmount)} valueClass="text-emerald-600 dark:text-emerald-400" />
                <Metric name="Indicative return" value={`${pool.indicativeExpectedReturn}% p.a.`} valueClass="text-emerald-600 dark:text-emerald-400" />
                <Metric name="Contract" value={orDash(pool.investmentStructure)} />
                <Metric name="Organisation" value={orDash(pool.organisationName)} />
              </div>
            </Section>
            <Section icon={BookOpen} iconClass="text-emerald-600" title="Akad Terms" aside={terms && <span className="text-[10px] font-bold text-slate-400">Version {terms.version}</span>}>
              {terms ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <Metric name="Akad" value={akadName(terms.akadType)} valueClass="text-purple-600 dark:text-purple-400" />
                    <Metric name="Investor profit share" value={`${share}%`} valueClass="text-emerald-600 dark:text-emerald-400" />
                    <Metric name="Manager share" value={`${100 - share}%`} />
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer font-bold text-purple-600">Read the full terms investors accept</summary>
                    <p className="mt-2 whitespace-pre-line text-slate-600 dark:text-slate-300 leading-relaxed">{terms.termsText}</p>
                  </details>
                </>
              ) : (
                <p className="text-xs text-slate-500">{akadTerms.loading ? 'Loading…' : akadTerms.error ? `Akad terms could not be loaded: ${akadTerms.error}` : 'No akad terms recorded.'}</p>
              )}
            </Section>
          </div>
          <RecordCard title="Structured" at={pool.createdAt} fallback="Structuring date not recorded." />
        </div>
      </StageCard>
    );
  }

  // 10. Multi-sig approval
  if (index === 9) {
    const a = pool.approvals;
    const keys: [string, string, boolean, string | undefined, string | undefined][] = [
      ['Shariah', 'Contract structure & profit ratio', a.shariahApproval, a.shariahApprovedBy, a.shariahApprovedAt],
      ['Compliance', 'KYC/KYB, sanctions & AML', a.complianceApproval, a.complianceApprovedBy, a.complianceApprovedAt],
      ['Risk', 'Likelihood & impact', a.riskApproval, a.riskApprovedBy, a.riskApprovedAt],
      ['Authorised executive', 'Final authorisation', a.authorisedApproval, a.authorisedApprovedBy, a.authorisedApprovedAt],
    ];
    const signed = keys.filter(k => k[2]).length;
    return (
      <StageCard index={9} title={STAGES[9].title!} status={<StatusPill tone={signed === 4 ? 'emerald' : 'purple'}>{signed} of 4 signatures</StatusPill>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {keys.map(([name, scope, ok, by, at], i) => (
            <div key={name} className={`p-4 rounded-2xl border ${ok ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40'}`}>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Key #{i + 1}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 ${ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                  {ok ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {ok ? 'Signed' : 'Pending'}
                </span>
              </div>
              <h5 className="text-sm font-black text-slate-900 dark:text-white mt-3">{name}</h5>
              <p className="text-[10px] text-slate-400">{scope}</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-3">{ok ? by || 'Unknown signer' : 'Not signed yet'}</p>
              {ok && <p className="text-[10px] text-slate-400">{when(at)}</p>}
            </div>
          ))}
        </div>
      </StageCard>
    );
  }

  // 11. Pool open
  if (index === 10) {
    return (
      <StageCard index={10} title={STAGES[10].title!} status={<StatusPill tone="emerald">Pool: {label(pool.status)}</StatusPill>}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Section icon={Unlock} iconClass="text-emerald-600" title="Marketplace Listing">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <Metric name="Pool status" value={label(pool.status)} valueClass="text-emerald-600 dark:text-emerald-400" />
                <Metric name="Target" value={short(pc, pool.targetAmount)} valueClass="text-emerald-600 dark:text-emerald-400" />
                <Metric name="Raised so far" value={short(pc, pool.amountRaised)} />
              </div>
            </Section>
          </div>
          <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
            <h4 className="font-black uppercase tracking-wider flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Who can see it</h4>
            <p>Investor accounts in {pool.countryNodeId} see an open pool, whichever organisation runs it. Draft and approved pools stay hidden from investors.</p>
          </div>
        </div>
      </StageCard>
    );
  }

  // 12–13. Orders, allocation and settlement
  if (index === 11 || index === 12) {
    return (
      <StageCard index={index} title={STAGES[index].title!} status={<StatusPill tone="sky">{raisedPct}% raised</StatusPill>}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Section icon={index === 11 ? Users : TrendingUp} iconClass="text-sky-600" title={index === 11 ? 'Subscription Book' : 'Capital Settled'}>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <Metric name="Settled" value={money(pc, pool.amountRaised)} valueClass="text-emerald-600 dark:text-emerald-400" />
                <Metric name="Target" value={money(pc, pool.targetAmount)} />
                <Metric name="Remaining" value={money(pc, Math.max(0, pool.targetAmount - pool.amountRaised))} />
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${raisedPct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{raisedPct}% of target</span>
              </div>
            </Section>
          </div>
          <div className="p-5 rounded-2xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/60 dark:bg-sky-950/20 text-xs text-sky-900 dark:text-sky-200 space-y-2">
            <h4 className="font-black uppercase tracking-wider flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> How this works</h4>
            <p>
              {index === 11
                ? 'Only investor roles with approved KYC can subscribe. Each investor accepts the pool\'s akad terms, and the accepted version is stored with their order.'
                : 'A settlement officer confirms each order\'s payment in the settlement queue. Only settled amounts count as raised; when the target is met the pool is marked full.'}
            </p>
          </div>
        </div>
      </StageCard>
    );
  }

  // 14. Funding disbursement
  if (index === 13) {
    const list = funding.data || [];
    const disbursed = list.filter(f => f.status === 'DISBURSED');
    const total = disbursed.reduce((sum, f) => sum + Number(f.requestedAmount), 0);
    return (
      <StageCard index={13} title={STAGES[13].title!} status={<StatusPill tone="amber">{disbursed.length} released</StatusPill>}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <Metric name="Requests" value={String(list.length)} />
          <Metric name="Released" value={String(disbursed.length)} valueClass="text-emerald-600 dark:text-emerald-400" />
          <Metric name="Released amount" value={money(c, total)} valueClass="text-emerald-600 dark:text-emerald-400" />
        </div>
        <Section icon={ArrowUpRight} iconClass="text-amber-600" title="Tranche Requests">
          {funding.error ? (
            <p className="text-xs text-slate-500">Funding requests are not available to your account.</p>
          ) : list.length === 0 ? (
            <p className="text-xs text-slate-500">{funding.loading ? 'Loading…' : 'No tranche release requested yet.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-400">
                  <tr><th className="p-2">Tranche</th><th className="p-2">Status</th><th className="p-2">Requested</th><th className="p-2">Released</th><th className="p-2 text-right">Amount</th></tr>
                </thead>
                <tbody>
                  {list.map(f => (
                    <tr key={f.fundingRequestId} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="p-2 font-bold text-slate-900 dark:text-white">{f.milestone?.title || f.purpose}</td>
                      <td className="p-2">{label(f.status)}</td>
                      <td className="p-2">{when(f.requestedAt)}</td>
                      <td className="p-2">{when(f.disbursedAt)}</td>
                      <td className="p-2 text-right font-bold">{money(f.currency, Number(f.requestedAmount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </StageCard>
    );
  }

  // 15. Project execution
  if (index === 14) {
    const milestones = lifecycle.data?.milestones || [];
    return (
      <StageCard index={14} title={STAGES[14].title!} status={<StatusPill tone="slate">Project: {label(project.status)}</StatusPill>}>
        <Section icon={Activity} iconClass="text-slate-500" title="Milestones">
          {milestones.length === 0 ? (
            <p className="text-xs text-slate-500">{lifecycle.loading ? 'Loading…' : 'No milestones recorded.'}</p>
          ) : (
            <div className="space-y-3">
              {milestones.map(m => (
                <div key={m.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{m.title}</span>
                    <span className="text-slate-500">{label(m.status)}{m.targetDate ? ` · due ${new Date(m.targetDate).toLocaleDateString()}` : ''}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, m.completionPct)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400">{m.completionPct}% complete · Shariah sign-off {m.shariahSignoff ? 'yes' : 'no'} · Auditor sign-off {m.auditorSignoff ? 'yes' : 'no'}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </StageCard>
    );
  }

  // 16. Profit distribution
  if (index === 15) {
    const list = distributions.data || [];
    const settled = list.filter(d => ['SETTLED', 'PAID', 'COMPLETED'].includes(d.status));
    const paid = settled.reduce((sum, d) => sum + Number(d.investorProfit ?? d.totalAmount), 0);
    return (
      <StageCard index={15} title={STAGES[15].title!} status={<StatusPill tone="emerald">{settled.length} settled</StatusPill>}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <Metric name="Periods recorded" value={String(list.length)} />
          <Metric name="Settled" value={String(settled.length)} valueClass="text-emerald-600 dark:text-emerald-400" />
          <Metric name="Paid to investors" value={money(pc, paid)} valueClass="text-emerald-600 dark:text-emerald-400" />
        </div>
        <Section icon={Coins} iconClass="text-emerald-600" title="Distribution Periods">
          {distributions.error ? (
            <p className="text-xs text-slate-500">Profit distributions are not available to your account.</p>
          ) : list.length === 0 ? (
            <p className="text-xs text-slate-500">{distributions.loading ? 'Loading…' : 'No profit distributions recorded yet.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-400">
                  <tr><th className="p-2">Period</th><th className="p-2">Status</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Investor profit</th></tr>
                </thead>
                <tbody>
                  {list.map(d => (
                    <tr key={d.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="p-2 font-bold text-slate-900 dark:text-white">{d.periodName}</td>
                      <td className="p-2">{label(d.status)}</td>
                      <td className="p-2 text-right">{money(d.currency, Number(d.totalAmount))}</td>
                      <td className="p-2 text-right font-bold text-emerald-600">{d.investorProfit === null || d.investorProfit === undefined ? '—' : money(d.currency, Number(d.investorProfit))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </StageCard>
    );
  }

  // 17. Maturity and exit
  return (
    <StageCard index={16} title={STAGES[16].title!} status={<StatusPill tone="slate">Pool: {label(pool.status)}</StatusPill>}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section icon={Award} iconClass="text-slate-500" title="Final Settlement">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              The pool is {label(pool.status)} and the project is {label(project.status)}.
            </p>
          </Section>
        </div>
        <Waiting text="Exit payouts are recorded through profit distributions." />
      </div>
    </StageCard>
  );
};
