import { DueDiligenceRecord, DueDiligenceStatus } from './dueDiligenceTypes';
import { INITIAL_DUE_DILIGENCE_RECORDS } from '../data/mockPoolingWorkflowDataPart2';
import { auditLogger } from '../audit/auditLogger';
import { notificationService } from '../notifications/notificationService';

class DueDiligenceService {
  private records: DueDiligenceRecord[] = [...INITIAL_DUE_DILIGENCE_RECORDS];

  public getByProject(projectId: string): DueDiligenceRecord | undefined {
    return this.records.find(r => r.projectId === projectId);
  }

  public getOrCreateForProject(projectId: string, orgId: string, countryNodeId: string): DueDiligenceRecord {
    let record = this.getByProject(projectId);
    if (!record) {
      record = {
        id: `DD-${Date.now()}`,
        projectId,
        organisationId: orgId,
        countryNodeId,
        overallStatus: 'IN_PROGRESS',
        leadReviewerId: 'USR-DD-LEAD',
        leadReviewerName: 'Lead Due Diligence Auditor',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        summaryComments: '10-Point Due Diligence initiated for project.',
        checklist: [
          { id: 'DD-1', dimension: 'Organisation', title: 'Organisation Verification', description: 'Validate corporate standing & KYB', status: 'PENDING' },
          { id: 'DD-2', dimension: 'Project', title: 'Project Documents', description: 'Review feasibility & technical specs', status: 'PENDING' },
          { id: 'DD-3', dimension: 'Financial', title: 'Financial Statements', description: 'Audit 3-year P&L and cashflows', status: 'PENDING' },
          { id: 'DD-4', dimension: 'Legal', title: 'Legal Title & Contracts', description: 'Verify asset ownership & licenses', status: 'PENDING' },
          { id: 'DD-5', dimension: 'Asset', title: 'Asset Valuation', description: 'Independent asset appraisal report', status: 'PENDING' },
          { id: 'DD-6', dimension: 'Management', title: 'Management Evaluation', description: 'Management track record screening', status: 'PENDING' },
          { id: 'DD-7', dimension: 'Market', title: 'Market Feasibility', description: 'Off-take agreement & industry analysis', status: 'PENDING' },
          { id: 'DD-8', dimension: 'Operational', title: 'Operational Capacity', description: 'Plantation & machinery site audit', status: 'PENDING' },
          { id: 'DD-9', dimension: 'Fraud', title: 'Fraud & AML Screening', description: 'Anti-bribery & background checks', status: 'PENDING' },
          { id: 'DD-10', dimension: 'Reputation', title: 'Reputational & ESG Risk', description: 'Sustainability & RSPO compliance', status: 'PENDING' }
        ]
      };
      this.records.unshift(record);
    }
    return record;
  }

  public updateChecklistItem(projectId: string, itemId: string, status: DueDiligenceStatus, userId: string, userRole: string) {
    const record = this.getByProject(projectId);
    if (!record) return;

    const item = record.checklist.find(i => i.id === itemId);
    if (item) {
      item.status = status;
      item.verifiedBy = userRole;
      item.verifiedAt = new Date().toISOString();
    }

    const allPassed = record.checklist.every(i => i.status === 'PASSED');
    if (allPassed) {
      record.overallStatus = 'PASSED';
      record.completedAt = new Date().toISOString();

      auditLogger.logEvent({
        userId,
        organisationId: record.organisationId,
        countryNodeId: record.countryNodeId,
        role: userRole,
        action: 'dd_complete',
        resourceType: 'due_diligence',
        resourceId: record.id,
        result: 'Success',
        metadata: { projectId, overallStatus: 'PASSED' }
      });

      notificationService.notify(
        'Due Diligence Completed (PASSED)',
        `All 10 DD dimensions verified for Project ${projectId}.`,
        'success',
        'due_diligence',
        record.id
      );
    }
  }
}

export const dueDiligenceService = new DueDiligenceService();
