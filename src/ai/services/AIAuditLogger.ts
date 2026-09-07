import { AIAuditEvent, AIHumanDecision, AIFeatureKey, AIConfidenceLevel } from '../types/aiCoreTypes';

class AIAuditLoggerService {
  private logs: AIAuditEvent[] = [
    {
      aiRequestId: 'AI-REQ-8801',
      timestamp: '2026-08-11T12:00:00Z',
      userId: 'USR-MYS-001',
      userName: 'Tengku Ahmad Shah',
      organisationId: 'ORG-FELDA-MYS',
      countryNodeId: 'CN-MYS',
      role: 'Project Sponsor / PDP',
      aiFeature: 'contract_advisor',
      inputContextSummary: 'Agri expansion $8M funding request',
      outputSummary: 'Recommended Mudarabah structure with 80/20 investor split',
      recommendation: 'Potentially suitable structure — requires Shariah review.',
      confidenceLevel: 'HIGH',
      riskFlagsCount: 1,
      humanDecision: 'PENDING'
    },
    {
      aiRequestId: 'AI-REQ-8802',
      timestamp: '2026-08-11T13:30:00Z',
      userId: 'USR-RISK-001',
      userName: 'Dr. Zulkifli Risk Officer',
      organisationId: 'ORG-FELDA-MYS',
      countryNodeId: 'CN-MYS',
      role: 'Risk Officer',
      aiFeature: 'risk_analyzer',
      inputContextSummary: 'Project PROJ-MYS-001 Risk evaluation',
      outputSummary: 'AI calculated High Liquidity Risk (7/10)',
      recommendation: 'Risk Level: High Liquidity Risk',
      confidenceLevel: 'MEDIUM',
      riskFlagsCount: 2,
      humanDecision: 'OVERRIDDEN',
      overrideReason: 'Additional cash reserve guarantee provided by FELDA parent entity.',
      reviewedByUserId: 'USR-RISK-001',
      reviewedAt: '2026-08-11T14:00:00Z'
    }
  ];

  public logEvent(event: Omit<AIAuditEvent, 'timestamp'>): AIAuditEvent {
    const fullEvent: AIAuditEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    this.logs.unshift(fullEvent);
    return fullEvent;
  }

  public updateHumanDecision(
    aiRequestId: string,
    decision: AIHumanDecision,
    userId: string,
    overrideReason?: string
  ) {
    const log = this.logs.find(l => l.aiRequestId === aiRequestId);
    if (log) {
      log.humanDecision = decision;
      log.reviewedByUserId = userId;
      log.reviewedAt = new Date().toISOString();
      if (overrideReason) {
        log.overrideReason = overrideReason;
      }
    }
  }

  public getLogs(userId?: string, role?: string): AIAuditEvent[] {
    const isAdministrator = role === 'Super Admin' || role === 'AI Administrator' || role === 'Auditor';
    if (isAdministrator) {
      return [...this.logs];
    }
    if (!userId) {
      return [];
    }
    return this.logs.filter(l => l.userId === userId);
  }

  public getAllLogs(): AIAuditEvent[] {
    return [...this.logs];
  }
}

export const aiAuditLogger = new AIAuditLoggerService();
