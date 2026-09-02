import { DueDiligenceRecord } from '../dueDiligence/dueDiligenceTypes';
import { RiskAssessmentReport } from '../risk/riskTypes';
import { ShariahReview } from '../shariah/shariahTypes';
import { ComplianceReview } from '../compliance/complianceTypes';
import { WealthPool } from '../pooling/poolTypes';
import { InvestmentOrder, InvestorSuitabilityProfile } from '../investments/investmentTypes';

export const INITIAL_DUE_DILIGENCE_RECORDS: DueDiligenceRecord[] = [
  {
    id: 'DD-001',
    projectId: 'PROJ-MYS-001',
    organisationId: 'ORG-FELDA-MYS',
    countryNodeId: 'CN-MYS',
    overallStatus: 'PASSED',
    leadReviewerId: 'USR-FARAH-DD',
    leadReviewerName: 'Farah Zain (Lead DD Auditor)',
    completedAt: '2026-06-15T10:00:00Z',
    createdAt: '2026-06-05T09:00:00Z',
    updatedAt: '2026-06-15T10:00:00Z',
    summaryComments: 'All 10 due diligence dimensions verified. Corporate registration, land titles, and off-take contracts validated.',
    checklist: [
      { id: 'DD-1', dimension: 'Organisation', title: 'Organisation Verification', description: 'Validate company registration & active standing', status: 'PASSED' },
      { id: 'DD-2', dimension: 'Project', title: 'Project Documents', description: 'Review business plan, technical blueprints & site plans', status: 'PASSED' },
      { id: 'DD-3', dimension: 'Financial', title: 'Financial Statements', description: 'Audit 3-year P&L, balance sheets and debt coverage', status: 'PASSED' },
      { id: 'DD-4', dimension: 'Legal', title: 'Ownership & Legal Title', description: 'Verify agricultural land titles & concessions', status: 'PASSED' },
      { id: 'DD-5', dimension: 'Asset', title: 'Asset Valuation', description: 'Independent land & machinery appraisal', status: 'PASSED' },
      { id: 'DD-6', dimension: 'Management', title: 'Management Experience', description: 'Background check on PDP leaders and agricultural engineers', status: 'PASSED' },
      { id: 'DD-7', dimension: 'Market', title: 'Market Feasibility', description: 'Assess global palm oil demand & off-take pricing formula', status: 'PASSED' },
      { id: 'DD-8', dimension: 'Operational', title: 'Operational Capacity', description: 'Inspect plantation machinery, sensor IoT and labor contracts', status: 'PASSED' },
      { id: 'DD-9', dimension: 'Fraud', title: 'Fraud & Anti-Bribery Screening', description: 'Cross-check key executives against fraud databases', status: 'PASSED' },
      { id: 'DD-10', dimension: 'Reputation', title: 'Reputational Risk', description: 'ESG RSPO sustainability certification audit', status: 'PASSED' }
    ]
  }
];

export const INITIAL_RISK_REPORTS: RiskAssessmentReport[] = [
  {
    id: 'RISK-001',
    projectId: 'PROJ-MYS-001',
    organisationId: 'ORG-FELDA-MYS',
    countryNodeId: 'CN-MYS',
    overallRiskRating: 'Medium Risk',
    riskOfficerId: 'USR-KHALID-RISK',
    riskOfficerName: 'Khalid Abdullah (Chief Risk Officer)',
    riskApprovalStatus: 'APPROVED',
    approvalComments: 'Acceptable risk profile. Agricultural price fluctuations mitigated via long-term off-take pricing caps.',
    evaluatedAt: '2026-06-18T14:00:00Z',
    risks: [
      { id: 'R-1', category: 'Market', riskTitle: 'Palm Oil Price Volatility', description: 'Fluctuations in global CPO benchmark price', likelihood: 'Medium', impact: 'High', riskScore: 12, mitigationStrategy: 'Forward off-take hedge contracts with regional refiners', owner: 'Project Manager', status: 'Mitigated' },
      { id: 'R-2', category: 'Operational', riskTitle: 'Monsoon Weather Disruptions', description: 'Excessive rain during harvest season', likelihood: 'Medium', impact: 'Medium', riskScore: 8, mitigationStrategy: 'Automated drainage and elevated access roads', owner: 'Site Supervisor', status: 'Mitigated' },
      { id: 'R-3', category: 'Regulatory', riskTitle: 'RSPO Sustainability Compliance', description: 'Changes in EU deforestation import standards', likelihood: 'Low', impact: 'High', riskScore: 9, mitigationStrategy: '100% satellite traceability & EUDR zero-deforestation certification', owner: 'Compliance Officer', status: 'Mitigated' }
    ]
  }
];

export const INITIAL_SHARIAH_REVIEWS: ShariahReview[] = [
  {
    id: 'SHAR-001',
    projectId: 'PROJ-MYS-001',
    organisationId: 'ORG-FELDA-MYS',
    countryNodeId: 'CN-MYS',
    proposedContract: 'Mudarabah',
    profitSharingRatioSponsorPercent: 20,
    profitSharingRatioInvestorPercent: 80,
    lossAllocationTerms: 'Losses borne strictly by capital providers pro-rata to capital ratio, except in proven cases of Mudarib misconduct, negligence or breach of contract terms.',
    feeStructureDescription: 'No hidden interest fees. Mudarib management fee of 1.5% p.a. deducted strictly from actual realized revenues.',
    underlyingAssetEligibility: '100% Halal agricultural assets, non-speculative sustainable oil palm cultivation.',
    status: 'APPROVED',
    shariahAdvisorId: 'USR-DR-ISMAIL-SHAR',
    shariahAdvisorName: 'Dr. Ismail Hassim',
    shariahBoardName: 'D-8 Central Shariah Advisory Council',
    fatwaReferenceNumber: 'FATWA-D8-2026-AGRI-04',
    reviewComments: 'Structure complies with AAOIFI Shariah Standard No. 13 (Mudarabah). Profit-sharing ratio and loss distribution clauses verified.',
    reviewedAt: '2026-06-20T11:30:00Z'
  }
];

export const INITIAL_COMPLIANCE_REVIEWS: ComplianceReview[] = [
  {
    id: 'COMP-001',
    projectId: 'PROJ-MYS-001',
    organisationId: 'ORG-FELDA-MYS',
    countryNodeId: 'CN-MYS',
    complianceOfficerId: 'USR-NOOR-COMP',
    complianceOfficerName: 'Noor Aini (Head of Regulatory Compliance)',
    status: 'PASSED',
    reviewerComments: 'Full KYB corporate verification complete. Beneficial ownership disclosed up to ultimate government shareholders. Zero PEP/Sanctions hits.',
    reviewedAt: '2026-06-22T09:00:00Z',
    checklist: [
      { id: 'C-1', category: 'KYC Verification', status: 'PASSED', findings: 'All PDP key executives identity verified via national digital ID.' },
      { id: 'C-2', category: 'KYB Corporate Screening', status: 'PASSED', findings: 'FELDA Holdings Berhad corporate registry active & verified.' },
      { id: 'C-3', category: 'AML/CFT Screening', status: 'PASSED', findings: 'Zero negative news or money laundering alerts flagged.' },
      { id: 'C-4', category: 'Sanction List Verification', status: 'PASSED', findings: 'Clear on UN, OFAC, BNM and EU sanction databases.' },
      { id: 'C-5', category: 'PEP Screening', status: 'PASSED', findings: 'Government-appointed directors declared and screened with low risk.' },
      { id: 'C-6', category: 'Ultimate Beneficial Ownership', status: 'PASSED', findings: 'Government-linked entity structure transparently verified.' },
      { id: 'C-7', category: 'Source of Funds Verification', status: 'PASSED', findings: 'Sponsor 20% contribution funded via audited treasury accounts.' },
      { id: 'C-8', category: 'Regulatory Licenses', status: 'PASSED', findings: 'Malaysian Palm Oil Board (MPOB) export licenses active.' }
    ]
  }
];
