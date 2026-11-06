/** Administrators who manage the people of their scope from the phone: Super Admin everyone, Country Admin their country. */
export const USER_ADMIN_ROLES = ['Super Admin', 'Country Admin'];

/** Who keeps estate instructions (mirrors the roles on /estate/beneficiaries). */
export const ESTATE_ROLES = ['Retail Investor', 'HNWI Investor', 'Family Office', 'Asset Owner'];

/** Direct leasing (mirrors the server's leasing roles): owners list space, companies rent it, Legal and Shariah approve. */
export const LEASE_OWNER_ROLES = ['Asset Owner', 'Asset Manager'];
/** Who registers assets (mirrors the server's asset owner roles). */
export const ASSET_OWNER_ROLES = ['Asset Owner', 'Asset Manager'];
export const LEASE_TENANT_ROLES = ['Organization Admin', 'Corporate Investor', 'Project Sponsor', 'Project Manager'];
export const LEASE_REVIEWER_ROLES = ['Super Admin', 'Country Admin', 'Legal Officer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'];
export const LEASING_ROLES = [...LEASE_OWNER_ROLES, ...LEASE_TENANT_ROLES, ...LEASE_REVIEWER_ROLES];

/** Who decides identity applications (mirrors the roles on /kyc/applications). */
export const KYC_REVIEW_ROLES = ['Super Admin', 'Country Admin', 'KYC Officer', 'Compliance Officer'];
/** Who gives the Legal and Shariah decisions on agreements (mirrors LEGAL_ROLES and SHARIAH_ROLES on the server). */
export const AGREEMENT_REVIEW_ROLES = ['Legal Officer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'];

/** Profit distribution and payouts (mirrors the server's settlement operators). */
export const SETTLEMENT_ROLES = ['Super Admin', 'Settlement Officer'];

/** The delivery partner's people, who follow their projects, tranches and quarterly reports. */
export const SPONSOR_ROLES = ['Project Sponsor', 'Project Manager', 'Organization Admin'];

/**
 * Who may read pools (mirrors "pooling: read" in server/src/policy/permissions.ts). Asset owners, reviewers and
 * other staff do not: for them the Pools tab would only show the server's refusal.
 */
export const POOL_VIEW_ROLES = [
  'Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager', 'Pool Manager',
  'Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office', 'Portfolio Manager',
  'Finance Officer', 'Treasury Officer', 'Settlement Officer',
];
