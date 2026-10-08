import { UserRole } from '../policy/permissions';

/**
 * Roles that use AI as part of operating or governing the platform, not as a paid
 * member service, so they are never charged AI credits or limited by a membership plan.
 * The exemption follows the ACTIVE role: the same person acting as an investor pays.
 * Every exempt use is still recorded (AiUsageTransaction with status EXEMPT, 0 credits)
 * and audited, so usage stays visible.
 * Groups follow the role categories in src/rbac/roles/*.ts.
 */
export const AI_CREDIT_EXEMPT_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  // System Executive: all administrators
  'Super Admin',
  'Country Admin',
  'System Administrator',
  'Security Administrator',
  'Data Administrator',
  'AI Administrator',
  // Operational Management roles exempted individually: the organisation administrator, and
  // customer support, who use AI to answer members' questions.
  'Organization Admin',
  'Customer Support',
  // Governance & Risk: the whole category
  'Shariah Reviewer',
  'Shariah Advisor',
  'Shariah Committee',
  'Compliance Officer',
  'KYC Officer',
  'KYB Officer',
  'AML Officer',
  'Risk Officer',
  'Fraud Analyst',
  'Legal Officer',
  'Auditor',
  'AI Model Reviewer',
]);

export function isAiCreditExempt(role: string): boolean {
  return AI_CREDIT_EXEMPT_ROLES.has(role as UserRole);
}
