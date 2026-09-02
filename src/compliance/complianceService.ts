import { ComplianceReview } from './complianceTypes';
import { INITIAL_COMPLIANCE_REVIEWS } from '../data/mockPoolingWorkflowDataPart2';
import { auditLogger } from '../audit/auditLogger';
import { notificationService } from '../notifications/notificationService';

class ComplianceService {
  private reviews: ComplianceReview[] = [...INITIAL_COMPLIANCE_REVIEWS];

  public getByProject(projectId: string): ComplianceReview | undefined {
    return this.reviews.find(r => r.projectId === projectId);
  }

  public getOrCreateForProject(projectId: string, orgId: string, countryNodeId: string): ComplianceReview {
    let review = this.getByProject(projectId);
    if (!review) {
      review = {
        id: `COMP-${Date.now()}`,
        projectId,
        organisationId: orgId,
        countryNodeId,
        complianceOfficerId: 'USR-COMP-OFFICER',
        complianceOfficerName: 'Head of Regulatory Compliance',
        status: 'IN_REVIEW',
        reviewerComments: 'Project level KYB, PEP, AML & licensing screening underway.',
        reviewedAt: new Date().toISOString(),
        checklist: [
          { id: 'C-1', category: 'KYC Verification', status: 'PASSED', findings: 'All key PDP personnel identity verified.' },
          { id: 'C-2', category: 'KYB Corporate Screening', status: 'PASSED', findings: 'Entity corporate registration active.' },
          { id: 'C-3', category: 'AML/CFT Screening', status: 'PASSED', findings: 'Clean record on money laundering databases.' },
          { id: 'C-4', category: 'Sanction List Verification', status: 'PASSED', findings: 'Clear on UN, OFAC & regional sanction lists.' },
          { id: 'C-5', category: 'PEP Screening', status: 'PASSED', findings: 'Government directors declared & screened.' },
          { id: 'C-6', category: 'Ultimate Beneficial Ownership', status: 'PASSED', findings: 'Transparent ownership structure.' },
          { id: 'C-7', category: 'Source of Funds Verification', status: 'PASSED', findings: 'Contribution source validated.' },
          { id: 'C-8', category: 'Regulatory Licenses', status: 'PASSED', findings: 'Operating export/business licenses verified.' }
        ]
      };
      this.reviews.unshift(review);
    }
    return review;
  }

  public approveCompliance(projectId: string, userId: string, userRole: string, comments: string) {
    const review = this.getOrCreateForProject(projectId, 'ORG-FELDA-MYS', 'CN-MYS');
    review.status = 'PASSED';
    review.reviewerComments = comments || 'Compliance screening passed with zero high-risk findings.';

    auditLogger.logEvent({
      userId,
      organisationId: review.organisationId,
      countryNodeId: review.countryNodeId,
      role: userRole,
      action: 'compliance_approve',
      resourceType: 'compliance',
      resourceId: review.id,
      result: 'Success',
      metadata: { projectId }
    });

    notificationService.notify(
      'Compliance Review Approved',
      `Regulatory compliance screening passed for Project ${projectId}.`,
      'success',
      'compliance',
      review.id
    );
  }
}

export const complianceService = new ComplianceService();
