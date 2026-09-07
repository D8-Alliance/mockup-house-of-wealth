import { FundingRequest, Disbursement } from './fundingTypes';
import { INITIAL_FUNDING_REQUESTS } from '../data/mockPoolingWorkflowDataPart3';
import { poolService } from '../pooling/poolService';
import { projectService } from '../projects/projectService';
import { auditLogger } from '../audit/auditLogger';
import { notificationService } from '../notifications/notificationService';
import { generateNumericId } from '../utils/id';

class FundingService {
  private requests: FundingRequest[] = [...INITIAL_FUNDING_REQUESTS];
  private disbursements: Disbursement[] = [
    {
      id: 'DISB-001',
      fundingRequestId: 'FUND-REQ-001',
      projectId: 'PROJ-MYS-001',
      trancheNumber: 1,
      amount: 3500000,
      currency: 'MYR',
      escrowAccountRef: 'ESCROW-BNM-88102',
      disbursedBy: 'Treasury Officer (BNM Node)',
      disbursedAt: '2026-07-13T09:00:00Z',
      notes: 'Initial tranche released to FELDA Jengka project account.'
    }
  ];

  public getRequestsByProject(projectId: string): FundingRequest[] {
    return this.requests.filter(r => r.projectId === projectId);
  }

  public getAllRequests(): FundingRequest[] {
    return [...this.requests];
  }

  public createFundingRequest(
    projectId: string, 
    poolId: string, 
    amount: number, 
    purpose: string, 
    userId: string, 
    userRole: string
  ): FundingRequest {
    const project = projectService.getProjectById(projectId);
    const pool = poolService.getPoolById(poolId);

    const newReq: FundingRequest = {
      id: generateNumericId('FUND-REQ', 6),
      projectId,
      projectName: project?.projectName || 'Project',
      poolId,
      poolName: pool?.poolName || 'Pool',
      organisationId: project?.organisationId || 'ORG-FELDA-MYS',
      countryNodeId: project?.countryNodeId || 'CN-MYS',
      requestedAmount: amount,
      purpose,
      status: 'PENDING',
      requestedBy: userRole,
      requestedAt: new Date().toISOString()
    };

    this.requests.unshift(newReq);

    auditLogger.logEvent({
      userId,
      organisationId: newReq.organisationId,
      countryNodeId: newReq.countryNodeId,
      role: userRole,
      action: 'disbursement',
      resourceType: 'disbursement',
      resourceId: newReq.id,
      result: 'Success',
      metadata: { amount, purpose }
    });

    notificationService.notify(
      'Funding Request Submitted',
      `Disbursement request of ${amount.toLocaleString()} for "${newReq.projectName}" submitted to Treasury.`,
      'info',
      'disbursement',
      newReq.id
    );

    return newReq;
  }

  public approveAndDisburse(fundingRequestId: string, userId: string, userRole: string): Disbursement {
    const req = this.requests.find(r => r.id === fundingRequestId);
    if (!req) throw new Error('Funding request not found');

    req.status = 'DISBURSED';
    req.approvedBy = userRole;
    req.approvedAt = new Date().toISOString();
    req.disbursedAt = new Date().toISOString();

    const disb: Disbursement = {
      id: generateNumericId('DISB', 6),
      fundingRequestId: req.id,
      projectId: req.projectId,
      trancheNumber: this.disbursements.length + 1,
      amount: req.requestedAmount,
      currency: 'USD',
      escrowAccountRef: `ESCROW-NODE-${Math.floor(1000 + Math.random() * 9000)}`,
      disbursedBy: userRole,
      disbursedAt: new Date().toISOString(),
      notes: `Tranche #${this.disbursements.length + 1} disbursed for ${req.purpose}`
    };

    this.disbursements.unshift(disb);

    projectService.updateProjectStatus(req.projectId, 'ACTIVE', userId, userRole, 'Funding disbursed by Treasury.');
    const pool = poolService.getPoolById(req.poolId);
    if (pool) pool.status = 'ACTIVE';

    auditLogger.logEvent({
      userId,
      organisationId: req.organisationId,
      countryNodeId: req.countryNodeId,
      role: userRole,
      action: 'disbursement',
      resourceType: 'disbursement',
      resourceId: disb.id,
      result: 'Success',
      metadata: { amount: req.requestedAmount }
    });

    notificationService.notify(
      'Capital Disbursed - Project Active',
      `Capital tranche of ${req.requestedAmount.toLocaleString()} disbursed to ${req.projectName}. Project is now ACTIVE.`,
      'success',
      'disbursement',
      disb.id
    );

    return disb;
  }
}

export const fundingService = new FundingService();
