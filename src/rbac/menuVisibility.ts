import { UserRole } from './types';

/**
 * Header shortcuts and banners that only some roles use. Tabs are controlled by each role's
 * accessibleTabs; these cover the extra buttons that otherwise show for everyone.
 */

/** Delivery-partner (PDP) onboarding: for visitors and the roles that run projects or pools. Asset owners are a separate group and do not onboard as PDPs. */
const PDP_ONBOARDING_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['Guest', 'Project Sponsor', 'Project Manager', 'Pool Manager', 'Organization Admin']);

/** The architecture and code review report is an internal document for platform administrators. */
const CODE_REVIEW_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['Super Admin', 'System Administrator']);

export const canSeePdpOnboarding = (role: UserRole) => PDP_ONBOARDING_ROLES.has(role);
export const canSeeCodeReview = (role: UserRole) => CODE_REVIEW_ROLES.has(role);
