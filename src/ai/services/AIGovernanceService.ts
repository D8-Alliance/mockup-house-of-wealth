import { 
  AIFeatureGovernanceConfig, 
  AIFeedbackItem, 
  AIFeatureKey, 
  AIFeatureStatus 
} from '../types/aiCoreTypes';

class AIGovernanceService {
  private configs: AIFeatureGovernanceConfig[] = [
    {
      key: 'contract_advisor',
      name: 'AI Contract Advisor',
      description: 'Recommends suitable Islamic contract structures (Mudarabah, Musharakah, Wakalah, etc.)',
      ownerRole: 'Shariah Reviewer',
      status: 'ENABLED',
      riskLevel: 'MEDIUM',
      humanApprovalRequired: true,
      version: 'v2.4.0',
      lastUpdated: '2026-08-01'
    },
    {
      key: 'contract_draft',
      name: 'AI Contract Draft Assistant',
      description: 'Generates preliminary contract terms labeled as AI-generated drafts.',
      ownerRole: 'Project Sponsor',
      status: 'ENABLED',
      riskLevel: 'HIGH',
      humanApprovalRequired: true,
      version: 'v2.1.0',
      lastUpdated: '2026-08-01'
    },
    {
      key: 'shariah_assistant',
      name: 'AI Shariah Assistant',
      description: 'Performs preliminary Shariah compliance analysis for human reviewers.',
      ownerRole: 'Shariah Reviewer',
      status: 'ENABLED',
      riskLevel: 'HIGH',
      humanApprovalRequired: true,
      version: 'v3.0.0',
      lastUpdated: '2026-08-05'
    },
    {
      key: 'investment_advisor',
      name: 'AI Investment Advisor & Matcher',
      description: 'Matches investor risk profiles with relevant wealth pools.',
      ownerRole: 'Investor',
      status: 'ENABLED',
      riskLevel: 'MEDIUM',
      humanApprovalRequired: true,
      version: 'v1.8.0',
      lastUpdated: '2026-07-28'
    },
    {
      key: 'portfolio_analysis',
      name: 'AI Portfolio Analysis',
      description: 'Summarizes portfolio concentration, sector exposure, and maturity distribution.',
      ownerRole: 'Investor',
      status: 'ENABLED',
      riskLevel: 'LOW',
      humanApprovalRequired: false,
      version: 'v1.5.0',
      lastUpdated: '2026-07-20'
    },
    {
      key: 'project_analyzer',
      name: 'AI Project Analyzer',
      description: 'Evaluates project business plans, NPV, DSCR, and funding readiness.',
      ownerRole: 'Project Sponsor',
      status: 'ENABLED',
      riskLevel: 'MEDIUM',
      humanApprovalRequired: true,
      version: 'v2.0.0',
      lastUpdated: '2026-08-02'
    },
    {
      key: 'due_diligence_assistant',
      name: 'AI Due Diligence Assistant',
      description: 'Scans project documentation for missing items and anomalies.',
      ownerRole: 'Compliance Officer',
      status: 'ENABLED',
      riskLevel: 'HIGH',
      humanApprovalRequired: true,
      version: 'v2.2.0',
      lastUpdated: '2026-08-03'
    },
    {
      key: 'risk_analyzer',
      name: 'AI Risk Analyzer & Early Warning',
      description: 'Assesses financial, operational, market, and liquidity risk indicators.',
      ownerRole: 'Risk Officer',
      status: 'ENABLED',
      riskLevel: 'HIGH',
      humanApprovalRequired: true,
      version: 'v2.5.0',
      lastUpdated: '2026-08-06'
    },
    {
      key: 'scenario_engine',
      name: 'AI Financial Scenario Engine',
      description: 'Simulates base, optimistic, conservative, and stress cases for projects.',
      ownerRole: 'Finance Officer',
      status: 'ENABLED',
      riskLevel: 'LOW',
      humanApprovalRequired: false,
      version: 'v1.9.0',
      lastUpdated: '2026-07-25'
    },
    {
      key: 'pool_optimizer',
      name: 'AI Pool Optimizer',
      description: 'Provides suggestions for optimal wealth pool structuring and sizing.',
      ownerRole: 'Pool Manager',
      status: 'ENABLED',
      riskLevel: 'MEDIUM',
      humanApprovalRequired: true,
      version: 'v1.7.0',
      lastUpdated: '2026-08-01'
    }
  ];

  private feedbackList: AIFeedbackItem[] = [];

  public getConfigs(): AIFeatureGovernanceConfig[] {
    return [...this.configs];
  }

  public isFeatureEnabled(key: AIFeatureKey): boolean {
    const config = this.configs.find(c => c.key === key);
    return config ? config.status === 'ENABLED' || config.status === 'BETA' : false;
  }

  public toggleFeatureStatus(key: AIFeatureKey, status: AIFeatureStatus) {
    const config = this.configs.find(c => c.key === key);
    if (config) {
      config.status = status;
      config.lastUpdated = new Date().toISOString().split('T')[0];
    }
  }

  public submitFeedback(feedback: Omit<AIFeedbackItem, 'id' | 'timestamp'>) {
    const item: AIFeedbackItem = {
      ...feedback,
      id: `FB-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    this.feedbackList.unshift(item);
    return item;
  }

  public getFeedbackList(): AIFeedbackItem[] {
    return [...this.feedbackList];
  }
}

export const aiGovernanceService = new AIGovernanceService();
