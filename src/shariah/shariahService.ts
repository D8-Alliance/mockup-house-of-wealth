import { ShariahReview, IslamicContractType } from './shariahTypes';
import { INITIAL_SHARIAH_REVIEWS } from '../data/mockPoolingWorkflowDataPart2';
import { auditLogger } from '../audit/auditLogger';
import { notificationService } from '../notifications/notificationService';

class ShariahService {
  private reviews: ShariahReview[] = [...INITIAL_SHARIAH_REVIEWS];

  public getByProject(projectId: string): ShariahReview | undefined {
    return this.reviews.find(r => r.projectId === projectId);
  }

  public getOrCreateForProject(projectId: string, orgId: string, countryNodeId: string, contract: IslamicContractType = 'Mudarabah'): ShariahReview {
    let review = this.getByProject(projectId);
    if (!review) {
      review = {
        id: `SHAR-${Date.now()}`,
        projectId,
        organisationId: orgId,
        countryNodeId,
        proposedContract: contract,
        profitSharingRatioSponsorPercent: 20,
        profitSharingRatioInvestorPercent: 80,
        lossAllocationTerms: 'Losses borne by capital providers pro-rata to capital ratio, except in proven cases of Mudarib misconduct, negligence or breach of contract terms.',
        feeStructureDescription: 'Mudarib management fee of 1.5% p.a. deducted strictly from actual realized revenues.',
        underlyingAssetEligibility: '100% Halal agricultural assets and non-speculative trade.',
        status: 'PROPOSED',
        shariahAdvisorId: 'USR-DR-ISMAIL-SHAR',
        shariahAdvisorName: 'Dr. Ismail Hassim',
        shariahBoardName: 'D-8 Central Shariah Advisory Council',
        reviewComments: 'Awaiting human Shariah Advisor review and contract structure verification.',
        reviewedAt: new Date().toISOString()
      };
      this.reviews.unshift(review);
    }
    return review;
  }

  public approveShariahStructure(projectId: string, userId: string, userRole: string, comments: string, fatwaRef?: string) {
    const review = this.getOrCreateForProject(projectId, 'ORG-FELDA-MYS', 'CN-MYS');
    review.status = 'APPROVED';
    review.reviewComments = comments || 'Shariah Board verified and approved structure under AAOIFI rules.';
    review.fatwaReferenceNumber = fatwaRef || `FATWA-D8-2026-${Math.floor(100 + Math.random() * 900)}`;
    review.reviewedAt = new Date().toISOString();

    auditLogger.logEvent({
      userId,
      organisationId: review.organisationId,
      countryNodeId: review.countryNodeId,
      role: userRole,
      action: 'shariah_approve',
      resourceType: 'shariah',
      resourceId: review.id,
      result: 'Success',
      metadata: { projectId, contract: review.proposedContract, fatwaRef: review.fatwaReferenceNumber }
    });

    notificationService.notify(
      'Shariah Review Approved by Human Advisor',
      `Shariah signoff granted for project ${projectId} under Fatwa ${review.fatwaReferenceNumber}.`,
      'success',
      'shariah',
      review.id
    );
  }
}

export const shariahService = new ShariahService();
