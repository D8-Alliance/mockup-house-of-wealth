import { SponsorProject, WorkflowStage } from './SponsorTypes';

export const WORKFLOW_STAGES_LIST: WorkflowStage[] = [
  'Draft',
  'Internal Review',
  'Compliance Review',
  'Risk Review',
  'Shariah Review',
  'Approved',
  'Funding Open',
  'Pooling',
  'Funded',
  'Execution',
  'Profit Distribution',
  'Completed'
];

export const INITIAL_SPONSOR_PROJECTS: SponsorProject[] = [
  {
    id: 'PRJ-FELDA-2026',
    title: 'FELDA Palm Bio-Refinery & Clean Energy Conversion Plant',
    orgName: 'FELDA (Federal Land Development Authority)',
    orgType: 'FELDA / Plantation & Agriculture',
    category: 'Green Energy & Solar',
    shariahContract: 'Ijarah (Lease)',
    targetFunding: 12500000,
    raisedFunding: 12500000,
    expectedYield: '9.2% p.a.',
    tenureMonths: 60,
    location: 'Jengka, Pahang',
    country: 'Malaysia',
    workflowStage: 'Execution',
    healthScore: 98,
    description: 'Conversion of palm oil mill effluent into bio-methane clean electricity for grid injection under SEDA feed-in tariff contract.',
    milestones: [
      { id: 'M1', title: 'Land Acquisition & Environmental Impact Assessment', targetDate: '2026-02-15', completionPct: 100, disbursementAmount: 2500000, status: 'Completed', shariahSignoff: true, auditorSignoff: true },
      { id: 'M2', title: 'Turbine & Bio-Digester Equipment Procurement', targetDate: '2026-05-20', completionPct: 100, disbursementAmount: 4500000, status: 'Completed', shariahSignoff: true, auditorSignoff: true },
      { id: 'M3', title: 'Civil Construction & Grid Synchronization', targetDate: '2026-09-30', completionPct: 65, disbursementAmount: 3500000, status: 'In Progress', shariahSignoff: true, auditorSignoff: false },
      { id: 'M4', title: 'Commercial Operations Date (COD)', targetDate: '2026-12-15', completionPct: 0, disbursementAmount: 2000000, status: 'Upcoming', shariahSignoff: false, auditorSignoff: false }
    ],
    disbursements: [
      { trancheId: 'TR-101', milestoneId: 'M1', amount: 2500000, requestedDate: '2026-02-18', disbursedDate: '2026-02-22', status: 'Released', escrowRef: 'ESC-MY-88192' },
      { trancheId: 'TR-102', milestoneId: 'M2', amount: 4500000, requestedDate: '2026-05-25', disbursedDate: '2026-05-29', status: 'Released', escrowRef: 'ESC-MY-88401' },
      { trancheId: 'TR-103', milestoneId: 'M3', amount: 3500000, requestedDate: '2026-08-01', status: 'Awaiting Audit', escrowRef: 'ESC-MY-88910' }
    ],
    documents: [
      { id: 'DOC-01', title: 'FELDA Bio-Refinery Business Plan & SEDA License', category: 'Business Plan', fileSize: '14.2 MB', uploadDate: '2026-01-10', securityLevel: 'Public' },
      { id: 'DOC-02', title: 'PwC 5-Year Financial Projection & IRR Audit', category: 'Financial Projection', fileSize: '8.6 MB', uploadDate: '2026-01-12', securityLevel: 'Investors Only' },
      { id: 'DOC-03', title: 'AAOIFI Shariah Ijarah Certificate #FTW-MY-2026', category: 'Shariah Audit', fileSize: '3.1 MB', uploadDate: '2026-01-15', securityLevel: 'Public' }
    ],
    team: [
      { id: 'T1', name: 'Dato’ Seri Ahmad Shabery', role: 'Project Director', qualification: 'M.Sc. Chemical Engineering (Imperial)', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' },
      { id: 'T2', name: 'Ir. Dr. Hafizah Sulaiman', role: 'Chief Technical Officer', qualification: 'Ph.D. Renewable Energy (UTM)', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80' }
    ],
    comms: [
      { id: 'C1', title: 'Q2 2026 Construction & Turbine Assembly Progress Update', date: '2026-07-15', author: 'Project Director', type: 'Quarterly Update', readCount: 142 },
      { id: 'C2', title: 'SEDA Grid Connection Synchronization Milestone Achieved', date: '2026-06-01', author: 'CTO Office', type: 'Milestone Notice', readCount: 189 }
    ]
  },
  {
    id: 'PRJ-FELCRA-2026',
    title: 'FELCRA Agro-IoT Smart Fertilization & Cassava Hub',
    orgName: 'FELCRA Berhad',
    orgType: 'FELCRA / Agro-Land Development',
    category: 'Agro-Industrial',
    shariahContract: 'Mudarabah (Profit Share)',
    targetFunding: 6800000,
    raisedFunding: 6800000,
    expectedYield: '10.5% p.a.',
    tenureMonths: 36,
    location: 'Seberang Perak',
    country: 'Malaysia',
    workflowStage: 'Profit Distribution',
    healthScore: 95,
    description: 'High-yield commercial cassava cultivation integrated with automated drone fertilization and starch processing.',
    milestones: [
      { id: 'FM1', title: 'Soil Preparation & Smart Irrigation Sensor Network', targetDate: '2025-10-01', completionPct: 100, disbursementAmount: 2000000, status: 'Completed', shariahSignoff: true, auditorSignoff: true },
      { id: 'FM2', title: 'First Season Harvesting & Processing Mill Throughput', targetDate: '2026-04-15', completionPct: 100, disbursementAmount: 4800000, status: 'Completed', shariahSignoff: true, auditorSignoff: true }
    ],
    disbursements: [
      { trancheId: 'FTR-01', milestoneId: 'FM1', amount: 2000000, requestedDate: '2025-10-05', disbursedDate: '2025-10-08', status: 'Released', escrowRef: 'ESC-MY-7721' },
      { trancheId: 'FTR-02', milestoneId: 'FM2', amount: 4800000, requestedDate: '2026-04-20', disbursedDate: '2026-04-24', status: 'Released', escrowRef: 'ESC-MY-8812' }
    ],
    documents: [
      { id: 'FDOC-1', title: 'FELCRA Cassava Expansion Feasibility', category: 'Business Plan', fileSize: '9.4 MB', uploadDate: '2025-08-10', securityLevel: 'Public' }
    ],
    team: [
      { id: 'FT1', name: 'Zulkifli Hassan', role: 'Head of Agronomy', qualification: 'B.Sc Agronomy (UPM)', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' }
    ],
    comms: [
      { id: 'FC1', title: 'First Mudarabah Dividend Payout Notice (Q2 2026)', date: '2026-07-01', author: 'Finance Division', type: 'Dividends Announcement', readCount: 230 }
    ]
  },
  {
    id: 'PRJ-MARA-2026',
    title: 'MARA Digital Halal SME Incubation & Logistics Hub',
    orgName: 'MARA Corporation',
    orgType: 'MARA / Entrepreneur Development',
    category: 'SME Export',
    shariahContract: 'Musharakah (Partnership)',
    targetFunding: 8500000,
    raisedFunding: 5100000,
    expectedYield: '11.0% p.a.',
    tenureMonths: 48,
    location: 'Cyberjaya & Port Klang',
    country: 'Malaysia',
    workflowStage: 'Funding Open',
    healthScore: 92,
    description: 'Shared cold-storage fulfillment center for 120 Bumiputera Halal exporters expanding into D-8 Middle East corridors.',
    milestones: [
      { id: 'MM1', title: 'Facility Lease & Cold Room Installation', targetDate: '2026-10-01', completionPct: 20, disbursementAmount: 3000000, status: 'In Progress', shariahSignoff: true, auditorSignoff: false }
    ],
    disbursements: [],
    documents: [
      { id: 'MDOC-1', title: 'MARA Digital Logistics Whitepaper', category: 'Business Plan', fileSize: '12.1 MB', uploadDate: '2026-06-01', securityLevel: 'Public' }
    ],
    team: [
      { id: 'MT1', name: 'Noraini Ahmad', role: 'Program Director', qualification: 'MBA (UM)', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' }
    ],
    comms: []
  },
  {
    id: 'PRJ-WAQF-2026',
    title: 'D-8 International Waqf Healthcare & Dialysis Center',
    orgName: 'MUIS & Yayasan Waqf Malaysia',
    orgType: 'Impact NGO / Waqf Foundation',
    category: 'Social Waqf Housing',
    shariahContract: 'Istisna (Manufacturing)',
    targetFunding: 4500000,
    raisedFunding: 4500000,
    expectedYield: '7.5% p.a. (Social Return + Capital Preservation)',
    tenureMonths: 24,
    location: 'Istanbul & Kuala Lumpur',
    country: 'Turkey',
    workflowStage: 'Shariah Review',
    healthScore: 90,
    description: 'Self-sustaining perpetual Waqf medical clinic providing subsidized kidney dialysis for underprivileged D-8 families.',
    milestones: [
      { id: 'WM1', title: 'Medical Facility Fit-out & Dialysis Machine Import', targetDate: '2026-11-30', completionPct: 0, disbursementAmount: 4500000, status: 'Upcoming', shariahSignoff: false, auditorSignoff: false }
    ],
    disbursements: [],
    documents: [
      { id: 'WDOC-1', title: 'Waqf Healthcare Operating Model & Shariah Charter', category: 'Shariah Audit', fileSize: '5.2 MB', uploadDate: '2026-07-20', securityLevel: 'Public' }
    ],
    team: [
      { id: 'WT1', name: 'Prof. Dr. Yusuf Al-Qaradawi Jr.', role: 'Medical Director', qualification: 'M.D. (Al-Azhar / Johns Hopkins)', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80' }
    ],
    comms: []
  }
];
