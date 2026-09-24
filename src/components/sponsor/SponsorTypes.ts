// Add future sponsor entity types here without changing the project model.
export const SPONSOR_ENTITY_TYPES = [
  'FELDA / Plantation & Agriculture',
  'FELCRA / Agro-Land Development',
  'RISDA / Rubber & Rural Innovation',
  'MARA / Entrepreneur Development',
  'GLC / Sovereign-Backed Enterprise',
  'Cooperative Society (Koperasi)',
  'Property & Urban Developer',
  'High-Growth SME',
  'Impact NGO / Waqf Foundation',
] as const;

export type SponsorOrgType = string;

export type WorkflowStage = 
  | 'Draft'
  | 'Internal Review'
  | 'Compliance Review'
  | 'Risk Review'
  | 'Shariah Review'
  | 'Approved'
  | 'Funding Open'
  | 'Pooling'
  | 'Funded'
  | 'Execution'
  | 'Profit Distribution'
  | 'Completed';

export interface ProjectMilestone {
  id: string;
  title: string;
  targetDate: string;
  completionPct: number;
  disbursementAmount: number;
  status: 'Completed' | 'In Progress' | 'Pending Verification' | 'Upcoming';
  shariahSignoff: boolean;
  auditorSignoff: boolean;
}

export interface ProjectDisbursement {
  trancheId: string;
  milestoneId: string;
  amount: number;
  requestedDate: string;
  disbursedDate?: string;
  status: 'Released' | 'Awaiting Shariah Signoff' | 'Awaiting Audit' | 'Processing';
  escrowRef: string;
}

export interface DataRoomDocument {
  id: string;
  title: string;
  category: 'Business Plan' | 'Financial Projection' | 'Shariah Audit' | 'Valuation Report' | 'Legal Title Deed';
  fileSize: string;
  uploadDate: string;
  securityLevel: 'Public' | 'Investors Only' | 'Confidential';
  fileUrl?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  qualification: string;
  avatarUrl: string;
}

export interface InvestorComm {
  id: string;
  title: string;
  body?: string;
  date: string;
  author: string;
  type: 'Quarterly Update' | 'Financial Statement' | 'Milestone Notice' | 'Dividends Announcement' | 'Compliance Notice';
  readCount: number;
}

export interface SponsorProject {
  id: string;
  title: string;
  orgName: string;
  orgType: SponsorOrgType;
  category: 'Green Energy & Solar' | 'Agro-Industrial' | 'SME Export' | 'Commercial Real Estate' | 'Social Waqf Housing';
  shariahContract: 'Ijarah (Lease)' | 'Mudarabah (Profit Share)' | 'Musharakah (Partnership)' | 'Istisna (Manufacturing)' | 'Murabahah (Cost-Plus)' | 'Wakalah (Agency Investment)';
  targetFunding: number;
  raisedFunding: number;
  expectedYield: string;
  tenureMonths: number;
  location: string;
  country: string;
  workflowStage: WorkflowStage;
  healthScore: number;
  milestones: ProjectMilestone[];
  disbursements: ProjectDisbursement[];
  documents: DataRoomDocument[];
  team: TeamMember[];
  comms: InvestorComm[];
  description: string;
}
