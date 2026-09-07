// Server-side, authoritative permission model.
//
// This mirrors the client-side UX hints (src/rbac/*) but lives on the server so
// that authorization can never be bypassed by manipulating the browser. DTOs
// returned to the client should be filtered through this evaluator.

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'disburse'
  | 'audit'
  | 'export';

export type ResourceModule =
  | 'dashboard'
  | 'assets'
  | 'contracts'
  | 'marketplace'
  | 'pooling'
  | 'ledger'
  | 'profile'
  | 'governance'
  | 'approvals'
  | 'users'
  | 'audit_logs'
  | 'reports';

// Mirrors the frontend UserRole union (kept as strings for easy interop).
export type UserRole =
  | 'Super Admin'
  | 'Country Admin'
  | 'Organization Admin'
  | 'Project Sponsor'
  | 'Project Manager'
  | 'Asset Owner'
  | 'Asset Manager'
  | 'Pool Manager'
  | 'Retail Investor'
  | 'HNWI Investor'
  | 'Institutional Investor'
  | 'Corporate Investor'
  | 'Family Office'
  | 'Portfolio Manager'
  | 'Shariah Advisor'
  | 'Shariah Reviewer'
  | 'Shariah Committee'
  | 'Compliance Officer'
  | 'KYC Officer'
  | 'KYB Officer'
  | 'AML Officer'
  | 'Risk Officer'
  | 'Fraud Analyst'
  | 'Legal Officer'
  | 'Finance Officer'
  | 'Treasury Officer'
  | 'Settlement Officer'
  | 'Reconciliation Officer'
  | 'Auditor'
  | 'Customer Support'
  | 'System Administrator'
  | 'Security Administrator'
  | 'Data Administrator'
  | 'AI Administrator'
  | 'AI Model Reviewer'
  | 'Guest';

// Canonical, ordered list of every role in the UserRole union.
export const USER_ROLES: readonly UserRole[] = [
  'Super Admin',
  'Country Admin',
  'Organization Admin',
  'Project Sponsor',
  'Project Manager',
  'Asset Owner',
  'Asset Manager',
  'Pool Manager',
  'Retail Investor',
  'HNWI Investor',
  'Institutional Investor',
  'Corporate Investor',
  'Family Office',
  'Portfolio Manager',
  'Shariah Advisor',
  'Shariah Reviewer',
  'Shariah Committee',
  'Compliance Officer',
  'KYC Officer',
  'KYB Officer',
  'AML Officer',
  'Risk Officer',
  'Fraud Analyst',
  'Legal Officer',
  'Finance Officer',
  'Treasury Officer',
  'Settlement Officer',
  'Reconciliation Officer',
  'Auditor',
  'Customer Support',
  'System Administrator',
  'Security Administrator',
  'Data Administrator',
  'AI Administrator',
  'AI Model Reviewer',
  'Guest',
] as const;

// Roles that may only be granted or revoked by a Super Admin. Country Admins and
// other admin-tier actors must never be able to escalate a user into these.
export const PRIVILEGED_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'Super Admin',
  'System Administrator',
  'Security Administrator',
  'Data Administrator',
  'AI Administrator',
]);

// Runtime enum mirror of the UserRole union so Nest pipes/validators
// (ParseEnumPipe, IsEnum) can operate on the string-literal union above.
export const UserRoleEnum: Record<UserRole, UserRole> = Object.freeze(
  Object.fromEntries(USER_ROLES.map((role) => [role, role])) as Record<UserRole, UserRole>,
);

export interface PolicyDecision {
  allowed: boolean;
  role: UserRole;
  resource: ResourceModule;
  action: PermissionAction;
  reason: string;
}

const PERMISSIONS: Record<UserRole, Partial<Record<ResourceModule, PermissionAction[]>>> = {
  'Super Admin': {
    dashboard: ['read', 'export'],
    assets: ['create', 'read', 'update', 'delete', 'approve', 'audit', 'export'],
    contracts: ['create', 'read', 'update', 'delete', 'approve', 'audit', 'export'],
    marketplace: ['create', 'read', 'update', 'delete', 'approve', 'export'],
    pooling: ['create', 'read', 'update', 'delete', 'approve', 'audit', 'export'],
    ledger: ['create', 'read', 'update', 'delete', 'audit', 'export'],
    profile: ['create', 'read', 'update', 'delete', 'export'],
    governance: ['create', 'read', 'update', 'delete', 'approve', 'audit', 'export'],
    approvals: ['create', 'read', 'update', 'delete', 'approve', 'disburse', 'audit'],
    users: ['create', 'read', 'update', 'delete', 'approve', 'audit', 'export'],
    audit_logs: ['read', 'audit', 'export'],
    reports: ['create', 'read', 'export'],
  },
  'Country Admin': {
    dashboard: ['read', 'export'],
    assets: ['create', 'read', 'update', 'approve', 'audit', 'export'],
    contracts: ['create', 'read', 'update', 'approve', 'audit', 'export'],
    marketplace: ['create', 'read', 'update', 'approve', 'export'],
    pooling: ['create', 'read', 'update', 'approve', 'audit', 'export'],
    ledger: ['read', 'audit', 'export'],
    profile: ['read', 'update'],
    governance: ['create', 'read', 'update', 'approve'],
    approvals: ['read', 'approve', 'disburse', 'audit'],
    users: ['read', 'update', 'approve', 'export'],
    audit_logs: ['read', 'audit', 'export'],
    reports: ['create', 'read', 'export'],
  },
  'Organization Admin': {
    dashboard: ['read'],
    assets: ['create', 'read', 'update', 'export'],
    contracts: ['create', 'read', 'update', 'approve'],
    marketplace: ['create', 'read', 'update'],
    pooling: ['create', 'read', 'update'],
    ledger: ['read', 'audit', 'export'],
    profile: ['read', 'update'],
    approvals: ['read', 'approve'],
    users: ['read', 'update'],
    reports: ['read', 'export'],
  },
  'Project Sponsor': {
    dashboard: ['read'],
    assets: ['read'],
    marketplace: ['read'],
    pooling: ['read'],
    profile: ['read', 'update'],
  },
  'Project Manager': {
    dashboard: ['read'],
    assets: ['create', 'read', 'update'],
    pooling: ['read'],
    profile: ['read', 'update'],
  },
  'Asset Owner': {
    dashboard: ['read'],
    assets: ['read'],
    profile: ['read', 'update'],
  },
  'Asset Manager': {
    dashboard: ['read'],
    assets: ['create', 'read', 'update'],
    profile: ['read', 'update'],
  },
  'Pool Manager': {
    dashboard: ['read'],
    pooling: ['create', 'read', 'update', 'approve'],
    marketplace: ['read'],
    profile: ['read', 'update'],
  },
  'Retail Investor': {
    dashboard: ['read'],
    marketplace: ['read'],
    pooling: ['read'],
    ledger: ['read'],
    profile: ['read', 'update'],
  },
  'HNWI Investor': {
    dashboard: ['read'],
    marketplace: ['read'],
    pooling: ['read', 'update'],
    ledger: ['read'],
    profile: ['read', 'update'],
  },
  'Institutional Investor': {
    dashboard: ['read'],
    marketplace: ['read'],
    pooling: ['read', 'update'],
    ledger: ['read', 'export'],
    profile: ['read', 'update'],
  },
  'Corporate Investor': {
    dashboard: ['read'],
    marketplace: ['read'],
    pooling: ['read', 'update'],
    ledger: ['read'],
    profile: ['read', 'update'],
  },
  'Family Office': {
    dashboard: ['read'],
    marketplace: ['read'],
    pooling: ['read', 'update'],
    profile: ['read', 'update'],
  },
  'Portfolio Manager': {
    dashboard: ['read'],
    pooling: ['read', 'update'],
    ledger: ['read'],
    profile: ['read', 'update'],
  },
  'Shariah Advisor': {
    governance: ['create', 'read', 'update', 'approve', 'audit'],
    contracts: ['read', 'audit'],
    profile: ['read', 'update'],
  },
  'Shariah Reviewer': {
    governance: ['create', 'read', 'update', 'approve', 'audit'],
    contracts: ['read', 'audit'],
    profile: ['read', 'update'],
  },
  'Shariah Committee': {
    governance: ['create', 'read', 'update', 'approve'],
    contracts: ['read'],
    profile: ['read', 'update'],
  },
  'Compliance Officer': {
    governance: ['read', 'audit'],
    users: ['read', 'update', 'approve'],
    audit_logs: ['read', 'export'],
    profile: ['read', 'update'],
  },
  'KYC Officer': {
    users: ['read', 'update', 'approve'],
    profile: ['read', 'update'],
  },
  'KYB Officer': {
    users: ['read', 'update', 'approve'],
    profile: ['read', 'update'],
  },
  'AML Officer': {
    users: ['read', 'update', 'approve'],
    audit_logs: ['read'],
    profile: ['read', 'update'],
  },
  'Risk Officer': {
    governance: ['read', 'update', 'audit'],
    profile: ['read', 'update'],
  },
  'Fraud Analyst': {
    audit_logs: ['read', 'audit', 'export'],
    users: ['read'],
    profile: ['read', 'update'],
  },
  'Legal Officer': {
    contracts: ['create', 'read', 'update', 'approve'],
    governance: ['read'],
    profile: ['read', 'update'],
  },
  'Finance Officer': {
    ledger: ['read', 'export'],
    reports: ['read', 'export'],
    pooling: ['read'],
    profile: ['read', 'update'],
  },
  'Treasury Officer': {
    ledger: ['read', 'export'],
    pooling: ['read'],
    profile: ['read', 'update'],
  },
  'Settlement Officer': {
    ledger: ['read', 'update', 'audit'],
    pooling: ['read'],
    profile: ['read', 'update'],
  },
  'Reconciliation Officer': {
    ledger: ['read', 'update', 'audit'],
    profile: ['read', 'update'],
  },
  'Auditor': {
    audit_logs: ['read', 'audit', 'export'],
    ledger: ['read', 'audit', 'export'],
    reports: ['read', 'export'],
    governance: ['read', 'audit'],
    profile: ['read', 'update'],
  },
  'Customer Support': {
    users: ['read'],
    profile: ['read', 'update'],
  },
  'System Administrator': {
    users: ['create', 'read', 'update', 'delete', 'approve', 'audit'],
    audit_logs: ['read', 'audit', 'export'],
    profile: ['read', 'update'],
  },
  'Security Administrator': {
    users: ['read', 'update', 'delete', 'approve', 'audit'],
    audit_logs: ['read', 'audit', 'export'],
    governance: ['read', 'update'],
    profile: ['read', 'update'],
  },
  'Data Administrator': {
    users: ['create', 'read', 'update', 'export'],
    audit_logs: ['read'],
    profile: ['read', 'update'],
  },
  'AI Administrator': {
    governance: ['create', 'read', 'update', 'delete', 'approve', 'audit'],
    audit_logs: ['read', 'audit', 'export'],
    reports: ['read', 'export'],
    profile: ['read', 'update'],
  },
  'AI Model Reviewer': {
    governance: ['read', 'update', 'approve', 'audit'],
    profile: ['read', 'update'],
  },
  Guest: {
    marketplace: ['read'],
    profile: ['read', 'update'],
  },
};

export class PolicyEngine {
  public evaluate(
    role: UserRole,
    resource: ResourceModule,
    action: PermissionAction,
  ): PolicyDecision {
    const allowedActions = PERMISSIONS[role]?.[resource] ?? [];
    const allowed = allowedActions.includes(action);
    return {
      allowed,
      role,
      resource,
      action,
      reason: allowed
        ? `Role "${role}" has "${action}" on "${resource}".`
        : `Role "${role}" lacks "${action}" on "${resource}".`,
    };
  }

  public can(role: UserRole, resource: ResourceModule, action: PermissionAction): boolean {
    return this.evaluate(role, resource, action).allowed;
  }

  public accessibleResources(role: UserRole): ResourceModule[] {
    const perms = PERMISSIONS[role] ?? {};
    return (Object.keys(perms) as ResourceModule[]).filter((r) => (perms[r] ?? []).length > 0);
  }
}
