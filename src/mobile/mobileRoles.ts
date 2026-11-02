/** Administrators who manage the people of their scope from the phone: Super Admin everyone, Country Admin their country. */
export const USER_ADMIN_ROLES = ['Super Admin', 'Country Admin'];

/** Who keeps estate instructions (mirrors the roles on /estate/beneficiaries). */
export const ESTATE_ROLES = ['Retail Investor', 'HNWI Investor', 'Family Office', 'Asset Owner'];

/** Direct leasing (mirrors the server's leasing roles): owners list space, companies rent it, Legal and Shariah approve. */
export const LEASE_OWNER_ROLES = ['Asset Owner', 'Asset Manager'];
export const LEASE_TENANT_ROLES = ['Organization Admin', 'Corporate Investor', 'Project Sponsor', 'Project Manager'];
export const LEASE_REVIEWER_ROLES = ['Super Admin', 'Country Admin', 'Legal Officer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'];
export const LEASING_ROLES = [...LEASE_OWNER_ROLES, ...LEASE_TENANT_ROLES, ...LEASE_REVIEWER_ROLES];

/** Profit distribution and payouts (mirrors the server's settlement operators). */
export const SETTLEMENT_ROLES = ['Super Admin', 'Settlement Officer'];
