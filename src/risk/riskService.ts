import { RiskAssessmentReport } from './riskTypes';
import { INITIAL_RISK_REPORTS } from '../data/mockPoolingWorkflowDataPart2';
import { auditLogger } from '../audit/auditLogger';
import { notificationService } from '../notifications/notificationService';

class RiskService {
  private reports: RiskAssessmentReport[] = [...INITIAL_RISK_REPORTS];

  public getByProject(projectId: string): RiskAssessmentReport | undefined {
    return this.reports.find(r => r.projectId === projectId);
  }

  public getOrCreateForProject(projectId: string, orgId: string, countryNodeId: string): RiskAssessmentReport {
    let report = this.getByProject(projectId);
    if (!report) {
      report = {
        id: `RISK-${Date.now()}`,
        projectId,
        organisationId: orgId,
        countryNodeId,
        overallRiskRating: 'Medium Risk',
        riskOfficerId: 'USR-RISK-OFFICER',
        riskOfficerName: 'Risk Governance Officer',
        riskApprovalStatus: 'PENDING',
        evaluatedAt: new Date().toISOString(),
        risks: [
          { id: 'R-1', category: 'Market', riskTitle: 'Commodity / Yield Price Risk', description: 'Sensitivity to global benchmark prices', likelihood: 'Medium', impact: 'High', riskScore: 12, mitigationStrategy: 'Forward off-take hedge agreements', owner: 'Project Manager', status: 'Mitigated' },
          { id: 'R-2', category: 'Operational', riskTitle: 'Execution & Weather Delays', description: 'Monsoon or machinery breakdown risk', likelihood: 'Medium', impact: 'Medium', riskScore: 8, mitigationStrategy: 'Automated monitoring & backup fleet', owner: 'Operations Lead', status: 'Mitigated' },
          { id: 'R-3', category: 'Liquidity', riskTitle: 'Capital Cashflow Timing', description: 'Mismatch in harvest payout cycles', likelihood: 'Low', impact: 'Medium', riskScore: 6, mitigationStrategy: 'Secondary liquidity pool reserve buffer', owner: 'Finance Officer', status: 'Mitigated' }
        ]
      };
      this.reports.unshift(report);
    }
    return report;
  }

  public approveRiskAssessment(projectId: string, userId: string, userRole: string, comments: string) {
    const report = this.getOrCreateForProject(projectId, 'ORG-FELDA-MYS', 'CN-MYS');
    report.riskApprovalStatus = 'APPROVED';
    report.approvalComments = comments;

    auditLogger.logEvent({
      userId,
      organisationId: report.organisationId,
      countryNodeId: report.countryNodeId,
      role: userRole,
      action: 'risk_approve',
      resourceType: 'risk',
      resourceId: report.id,
      result: 'Success',
      metadata: { projectId, rating: report.overallRiskRating }
    });

    notificationService.notify(
      'Risk Assessment Approved',
      `Risk Assessment passed with rating ${report.overallRiskRating} for project ${projectId}.`,
      'success',
      'risk',
      report.id
    );
  }
}

export const riskService = new RiskService();
