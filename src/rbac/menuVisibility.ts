import { UserRole } from './types';

/**
 * Header shortcuts and banners that only some roles use. Tabs are controlled by each role's
 * accessibleTabs; these cover the extra buttons that otherwise show for everyone.
 */

/**
 * Delivery-partner (PDP) onboarding: for visitors and organisation admins whose organisation is
 * not yet a PDP. Project Sponsors and Project Managers already act for a registered PDP, and
 * asset owners are a separate group.
 */
const PDP_ONBOARDING_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['Guest', 'Organization Admin']);

/** The architecture and code review report is an internal document for platform administrators. */
const CODE_REVIEW_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['Super Admin', 'System Administrator']);

export const canSeePdpOnboarding = (role: UserRole) => PDP_ONBOARDING_ROLES.has(role);
export const canSeeCodeReview = (role: UserRole) => CODE_REVIEW_ROLES.has(role);

/** Only investor accounts place investment orders (the backend enforces the same list). */
const INVESTOR_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office']);

export const canInvest = (role: UserRole) => INVESTOR_ROLES.has(role);

/** Delivery-partner (PDP) roles: their Contracts tab shows their pools' akad terms and obligations, not an investor portfolio. */
const DELIVERY_PARTNER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['Project Sponsor', 'Project Manager']);

export const isDeliveryPartner = (role: UserRole) => DELIVERY_PARTNER_ROLES.has(role);
