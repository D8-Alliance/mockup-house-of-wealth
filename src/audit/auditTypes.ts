export type AuditActionType =
  | 'login'
  | 'logout'
  | 'role_switch_demo'
  | 'project_create'
  | 'project_submit'
  | 'project_approve'
  | 'project_reject'
  | 'dd_complete'
  | 'shariah_approve'
  | 'compliance_approve'
  | 'risk_approve'
  | 'pool_create'
  | 'pool_approve'
  | 'pool_open'
  | 'investment_create'
  | 'investment_settle'
  | 'disbursement'
  | 'distribution'
  | 'pool_close'
  | 'contract_submit'
  | 'contract_review'
  | 'contract_approve'
  | 'contract_reject'
  | 'financial_transaction'
  | 'user_create'
  | 'user_update'
  | 'role_assignment'
  | 'organisation_create'
  | 'organisation_update';

export type AuditResultType = 'Success' | 'Denied' | 'Failed' | 'Warning';

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  userId: string;
  userName?: string;
  organisationId: string;
  countryNodeId: string;
  role: string;
  action: AuditActionType;
  resourceType: string;
  resourceId: string;
  result: AuditResultType;
  metadata?: Record<string, any>;
}
