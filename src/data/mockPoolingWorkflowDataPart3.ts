import { WealthPool } from '../pooling/poolTypes';
import { InvestmentOrder, InvestorSuitabilityProfile } from '../investments/investmentTypes';
import { FundingRequest, Disbursement } from '../funding/fundingTypes';
import { ProjectMilestoneItem, ProjectProgressUpdate } from '../monitoring/monitoringTypes';
import { DistributionRecord, PoolExitEvent } from '../distributions/distributionTypes';

export const INITIAL_WEALTH_POOLS: WealthPool[] = [
  {
    poolId: 'POOL-MYS-001',
    poolCode: 'POOL-AGRI-SUKUK-A',
    poolName: 'FELDA Smart Agri Sukuk Pool A',
    projectId: 'PROJ-MYS-001',
    projectName: 'FELDA Agri-Smart Oil Palm & Tech Expansion',
    organisationId: 'ORG-FELDA-MYS',
    organisationName: 'FELDA Holdings Berhad',
    countryNodeId: 'CN-MYS',
    poolType: 'Agriculture',
    investmentStructure: 'Mudarabah',
    targetAmount: 8000000,
    minimumAmount: 5000000,
    maximumAmount: 10000000,
    amountRaised: 3500000,
    minimumInvestment: 10000,
    maximumInvestment: 1000000,
    currency: 'MYR',
    durationMonths: 60,
    indicativeExpectedReturn: 8.5,
    riskLevel: 'Medium',
    openingDate: '2026-07-01',
    closingDate: '2026-09-30',
    status: 'OPEN',
    investorCount: 12,
    feesDescription: 'Management fee 1.5% p.a.; zero entry/exit fee for early bird institutional backers.',
    distributionFrequency: 'Semi-Annually',
    riskDisclosure: 'Indicative expected return of 8.5% p.a. is for demonstration/projection purposes only and does not constitute a guaranteed return.',
    approvals: {
      shariahApproval: true,
      shariahApprovedBy: 'Dr. Ismail Hassim',
      shariahApprovedAt: '2026-06-20T11:30:00Z',
      complianceApproval: true,
      complianceApprovedBy: 'Noor Aini',
      complianceApprovedAt: '2026-06-22T09:00:00Z',
      riskApproval: true,
      riskApprovedBy: 'Khalid Abdullah',
      riskApprovedAt: '2026-06-18T14:00:00Z',
      authorisedApproval: true,
      authorisedApprovedBy: 'Super Admin Council',
      authorisedApprovedAt: '2026-06-25T10:00:00Z'
    },
    createdAt: '2026-06-25T10:00:00Z',
    updatedAt: '2026-08-10T12:00:00Z'
  },
  {
    poolId: 'POOL-MYS-P2-001',
    poolCode: 'POOL-GREEN-SOLAR-01',
    poolName: 'Quaid-e-Azam Solar Infrastructure Pool',
    projectId: 'PROJ-MYS-P2-002',
    projectName: 'Quaid-e-Azam Solar Infrastructure & Green Energy Sukuk',
    organisationId: 'ORG-MYS-P2-CAP',
    organisationName: 'Malaysian Sovereign Capital Assets',
    countryNodeId: 'CN-MYS',
    poolType: 'Green Sukuk',
    investmentStructure: 'Ijarah',
    targetAmount: 20000000,
    minimumAmount: 15000000,
    maximumAmount: 25000000,
    amountRaised: 20000000,
    minimumInvestment: 50000,
    maximumInvestment: 5000000,
    currency: 'USD',
    durationMonths: 84,
    indicativeExpectedReturn: 7.8,
    riskLevel: 'Low',
    openingDate: '2026-05-15',
    closingDate: '2026-07-15',
    status: 'ACTIVE',
    investorCount: 28,
    feesDescription: '1.2% p.a. asset management fee.',
    distributionFrequency: 'Quarterly',
    riskDisclosure: 'Indicative expected return of 7.8% p.a. is based on contracted utility tariffs. Past performance or projected return does not guarantee future results.',
    approvals: {
      shariahApproval: true,
      shariahApprovedBy: 'Sheikh Dr. Ahmed Al-Kubaisi',
      shariahApprovedAt: '2026-05-10T10:00:00Z',
      complianceApproval: true,
      complianceApprovedBy: 'Rashid Al-Nuaimi',
      complianceApprovedAt: '2026-05-12T11:00:00Z',
      riskApproval: true,
      riskApprovedBy: 'Sultan Mansour',
      riskApprovedAt: '2026-05-11T14:00:00Z',
      authorisedApproval: true,
      authorisedApprovedBy: 'Malaysia Country Admin',
      authorisedApprovedAt: '2026-05-14T09:00:00Z'
    },
    createdAt: '2026-05-14T09:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  }
];

export const INITIAL_INVESTOR_PROFILES: InvestorSuitabilityProfile[] = [
  { investorId: 'USR-INV-001', investorName: 'Kuala Lumpur Family Office', investorType: 'Family Office', riskProfile: 'Moderate', experienceLevel: 'Advanced', investmentObjective: 'Income Generation', eligibilityPassed: true, evaluatedAt: '2026-07-01T10:00:00Z' },
  { investorId: 'USR-INV-002', investorName: 'Abu Dhabi Sovereign Wealth Participant', investorType: 'Institutional Investor', riskProfile: 'Conservative', experienceLevel: 'Institutional', investmentObjective: 'Capital Preservation', eligibilityPassed: true, evaluatedAt: '2026-07-02T11:00:00Z' },
  { investorId: 'USR-INV-003', investorName: 'Haji Latiff (Retail)', investorType: 'Retail Investor', riskProfile: 'Balanced', experienceLevel: 'Intermediate', investmentObjective: 'Zakat Purified Impact', eligibilityPassed: true, evaluatedAt: '2026-07-05T14:00:00Z' }
];

export const INITIAL_INVESTMENT_ORDERS: InvestmentOrder[] = [
  { investmentId: 'INV-ORD-001', investorId: 'USR-INV-001', investorName: 'Kuala Lumpur Family Office', investorType: 'Family Office', poolId: 'POOL-MYS-001', poolName: 'FELDA Smart Agri Sukuk Pool A', organisationId: 'ORG-FELDA-MYS', countryNodeId: 'CN-MYS', amount: 2000000, currency: 'MYR', contractType: 'Mudarabah', indicativeReturnRate: 8.5, status: 'SETTLED', paymentReference: 'PAY-BNM-99120', createdAt: '2026-07-02T10:00:00Z', settledAt: '2026-07-02T10:05:00Z' },
  { investmentId: 'INV-ORD-002', investorId: 'USR-INV-002', investorName: 'Abu Dhabi Sovereign Wealth Participant', investorType: 'Institutional Investor', poolId: 'POOL-MYS-001', poolName: 'FELDA Smart Agri Sukuk Pool A', organisationId: 'ORG-FELDA-MYS', countryNodeId: 'CN-MYS', amount: 1000000, currency: 'MYR', contractType: 'Mudarabah', indicativeReturnRate: 8.5, status: 'SETTLED', paymentReference: 'PAY-BNM-99121', createdAt: '2026-07-03T11:00:00Z', settledAt: '2026-07-03T11:05:00Z' },
  { investmentId: 'INV-ORD-003', investorId: 'USR-INV-003', investorName: 'Haji Latiff (Retail)', investorType: 'Retail Investor', poolId: 'POOL-MYS-001', poolName: 'FELDA Smart Agri Sukuk Pool A', organisationId: 'ORG-FELDA-MYS', countryNodeId: 'CN-MYS', amount: 500000, currency: 'MYR', contractType: 'Mudarabah', indicativeReturnRate: 8.5, status: 'SETTLED', paymentReference: 'PAY-BNM-99122', createdAt: '2026-07-05T14:00:00Z', settledAt: '2026-07-05T14:05:00Z' }
];

export const INITIAL_FUNDING_REQUESTS: FundingRequest[] = [
  {
    id: 'FUND-REQ-001',
    projectId: 'PROJ-MYS-001',
    projectName: 'FELDA Agri-Smart Oil Palm & Tech Expansion',
    poolId: 'POOL-MYS-001',
    poolName: 'FELDA Smart Agri Sukuk Pool A',
    organisationId: 'ORG-FELDA-MYS',
    countryNodeId: 'CN-MYS',
    requestedAmount: 3500000,
    purpose: 'Initial tranche release for IoT sensors deployment and land preparation.',
    status: 'APPROVED',
    requestedBy: 'Ahmad Razak (PDP)',
    requestedAt: '2026-07-10T10:00:00Z',
    approvedBy: 'Treasury Officer (BNM Node)',
    approvedAt: '2026-07-12T11:00:00Z',
    disbursedAt: '2026-07-13T09:00:00Z'
  }
];

export const INITIAL_MILESTONES: ProjectMilestoneItem[] = [
  { id: 'MILE-1', projectId: 'PROJ-MYS-001', title: 'Land Preparation & Drone Survey', targetDate: '2026-09-30', completionPercentage: 100, budgetAllocated: 1000000, actualSpent: 950000, status: 'Completed', isPublicToInvestors: true, shariahSignoff: true, auditorSignoff: true },
  { id: 'MILE-2', projectId: 'PROJ-MYS-001', title: 'IoT Soil Sensor Grid Installation', targetDate: '2026-11-30', completionPercentage: 65, budgetAllocated: 2500000, actualSpent: 1800000, status: 'In Progress', isPublicToInvestors: true, shariahSignoff: true, auditorSignoff: false },
  { id: 'MILE-3', projectId: 'PROJ-MYS-001', title: 'High-Yield Saplings Replanting', targetDate: '2027-03-31', completionPercentage: 0, budgetAllocated: 4500000, actualSpent: 0, status: 'Pending', isPublicToInvestors: true, shariahSignoff: false, auditorSignoff: false }
];

export const INITIAL_PROGRESS_UPDATES: ProjectProgressUpdate[] = [
  { id: 'UPD-1', projectId: 'PROJ-MYS-001', title: 'Drone Survey & Topography Mapping Complete', description: 'Drone topography completed across 1,200 hectares in Jengka estate. Land preparation ahead of schedule.', updateDate: '2026-08-01', completionPercentage: 25, isPublicToInvestors: true, authorName: 'Siti Aminah', authorRole: 'Project Manager' }
];

export const INITIAL_DISTRIBUTIONS: DistributionRecord[] = [
  {
    id: 'DIST-001',
    poolId: 'POOL-MYS-P2-001',
    poolName: 'Quaid-e-Azam Solar Infrastructure Pool',
    projectId: 'PROJ-MYS-P2-002',
    organisationId: 'ORG-MYS-P2-CAP',
    countryNodeId: 'CN-MYS',
    distributionPeriod: 'Q2 2026 Profit Share',
    distributionDate: '2026-07-15',
    totalGrossProfit: 390000,
    mudaribSharePercent: 15,
    netInvestorProfitPool: 331500,
    status: 'Completed',
    currency: 'USD',
    disclaimer: 'Indicative profit distribution based on actual realized solar utility PPA receipts.'
  }
];

export const INITIAL_EXIT_EVENTS: PoolExitEvent[] = [
  {
    id: 'EXIT-001',
    poolId: 'POOL-MYS-P2-001',
    poolName: 'Quaid-e-Azam Solar Infrastructure Pool',
    projectId: 'PROJ-MYS-P2-002',
    organisationId: 'ORG-MYS-P2-CAP',
    countryNodeId: 'CN-MYS',
    maturityDate: '2033-09-30',
    totalTargetCapital: 20000000,
    totalPrincipalReturned: 0,
    totalProfitDistributedToDate: 331500,
    exitStatus: 'ACTIVE'
  }
];
