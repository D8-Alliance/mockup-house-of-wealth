export type DueDiligenceStatus = 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'CONDITIONAL';

export type DueDiligenceDimension = 
  | 'Organisation'
  | 'Project'
  | 'Financial'
  | 'Legal'
  | 'Asset'
  | 'Management'
  | 'Market'
  | 'Operational'
  | 'Fraud'
  | 'Reputation';

export interface DueDiligenceItem {
  id: string;
  dimension: DueDiligenceDimension;
  title: string;
  description: string;
  status: DueDiligenceStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface DueDiligenceRecord {
  id: string;
  projectId: string;
  organisationId: string;
  countryNodeId: string;
  overallStatus: DueDiligenceStatus;
  leadReviewerId: string;
  leadReviewerName: string;
  completedAt?: string;
  checklist: DueDiligenceItem[];
  summaryComments: string;
  createdAt: string;
  updatedAt: string;
}
