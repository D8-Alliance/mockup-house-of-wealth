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

export function canUseAiTab(tab: string, role: string): boolean {
  const allowed = (AI_TAB_ROLES as Record<string, readonly string[]>)[tab];
  return !allowed || allowed.includes(role);
}
