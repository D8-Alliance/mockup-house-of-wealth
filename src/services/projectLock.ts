// Mirrors server/src/projects/project-lock.ts. After a final decision, actions that would
// change it (feasibility re-runs, evidence changes, contract structuring) are locked until a
// Country Admin reopens the project.
export const LOCKED_PROJECT_STATUSES = ['APPROVED', 'FUNDING_OPEN', 'POOLING', 'FUNDED', 'EXECUTION', 'PROFIT_DISTRIBUTION', 'COMPLETED', 'REJECTED'];
export const REOPENABLE_PROJECT_STATUSES = ['APPROVED', 'FUNDING_OPEN', 'POOLING', 'REJECTED'];
export const PROJECT_REOPEN_ROLES = ['Super Admin', 'Country Admin'];

export function isProjectLocked(status: string | undefined | null): boolean {
  return Boolean(status && LOCKED_PROJECT_STATUSES.includes(status));
}

export function canReopenProject(status: string | undefined | null, role: string): boolean {
  return Boolean(status && REOPENABLE_PROJECT_STATUSES.includes(status) && PROJECT_REOPEN_ROLES.includes(role));
}
