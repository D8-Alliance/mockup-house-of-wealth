/**
 * Who may use the AI tabs that call a role-restricted endpoint. Mirrors the @Roles lists in
 * server/src/ai/ai.controller.ts; a tab is hidden from roles the server would refuse.
 */
const SHARIAH_ANALYSIS = ['Super Admin', 'AI Administrator', 'AI Model Reviewer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee'];
const CONTRACT_ADVISOR = ['Super Admin', 'AI Administrator', 'Shariah Reviewer', 'Shariah Advisor', 'Legal Officer', 'Project Sponsor', 'Project Manager', 'Organization Admin', 'Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office'];
const DUE_DILIGENCE = ['Super Admin', 'AI Administrator', 'Compliance Officer', 'KYC Officer', 'KYB Officer', 'AML Officer', 'Risk Officer', 'Legal Officer', 'Project Sponsor', 'Project Manager', 'Organization Admin', 'Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office'];

/** POST ai/shariah/analyze, ai/contract-advisor/analyze and ai/due-diligence/analyze. */
export const AI_TAB_ROLES = {
  'shariah-assistant': SHARIAH_ANALYSIS,
  'contract-advisor': CONTRACT_ADVISOR,
  'due-diligence': DUE_DILIGENCE,
} as const;

/**
 * Reviewers (Legal, Shariah) decide on others' work; they do not draft agreements or term sheets,
 * and have no projects of their own to analyse. Their reviews are in My reviews and Shariah Board Reviews.
 */
export const REVIEWER_ONLY_ROLES = ['Legal Officer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'];
/** Drafting and analysis tools hidden from reviewers. */
export const DRAFTING_TABS = ['project-analyzer', 'contract-advisor', 'agreement-generation'];
/** Tools that still run on sample data (PENDING_ACTIVITIES item 23): hidden from reviewers, labelled Sample for others. */
export const SAMPLE_TABS = ['investment-matcher', 'portfolio-analysis', 'risk-analyzer', 'scenarios', 'pool-optimizer'];

/** Shariah reviewers and the committee decide stages of a project's feasibility review there; Legal has no stage. */
const FEASIBILITY_REVIEWERS = ['Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'];

export function hiddenAiTabs(role: string): string[] {
  if (!REVIEWER_ONLY_ROLES.includes(role)) return [];
  return [...DRAFTING_TABS.filter((tab) => !(tab === 'project-analyzer' && FEASIBILITY_REVIEWERS.includes(role))), ...SAMPLE_TABS];
}

export function canUseAiTab(tab: string, role: string): boolean {
  const allowed = (AI_TAB_ROLES as Record<string, readonly string[]>)[tab];
  return !allowed || allowed.includes(role);
}
