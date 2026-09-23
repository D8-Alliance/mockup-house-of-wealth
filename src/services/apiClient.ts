import { authService } from '../auth/services/authService';
import { PDPApplication } from '../pdp/pdpTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:3001`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authService.getAuthState().session?.token;
  const isFormData = options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Backend API tidak dapat dicapai di ${API_BASE_URL}. Pastikan server sedang berjalan.`);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export interface ZakatCalculation {
  id: string;
  currency: string;
  investedCapital: number;
  liquidCash: number;
  debtsOwed: number;
  nisabThreshold: number;
  zakatRate: number;
  netWealth: number;
  zakatDue: number;
  createdAt: string;
}

export const apiClient = {
  getDashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),
  getProjects: () => request<BackendProject[]>('/projects'),
  createProject: (input: CreateProjectInput) => request<BackendProject>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  getProjectDocuments: (projectId: string) => request<BackendProjectDocument[]>(`/projects/${encodeURIComponent(projectId)}/documents`),
  getProjectTeam: (projectId: string) => request<BackendProjectTeamMember[]>(`/projects/${encodeURIComponent(projectId)}/team`),
  getProjectTeamCandidates: (projectId: string) => request<ProjectTeamCandidate[]>(`/projects/${encodeURIComponent(projectId)}/team/candidates`),
  addProjectTeamMember: (projectId: string, input: { userId: string; projectRole: string }) => request<BackendProjectTeamMember>(`/projects/${encodeURIComponent(projectId)}/team`, {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  removeProjectTeamMember: (projectId: string, memberId: string) => request<{ success: boolean }>(`/projects/${encodeURIComponent(projectId)}/team/${encodeURIComponent(memberId)}`, { method: 'DELETE' }),
  getProjectAnnouncements: (projectId: string) => request<BackendProjectAnnouncement[]>(`/projects/${encodeURIComponent(projectId)}/announcements`),
  createProjectAnnouncement: (projectId: string, input: CreateProjectAnnouncementInput) => request<BackendProjectAnnouncement>(`/projects/${encodeURIComponent(projectId)}/announcements`, {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  getPromotionPackages: (projectId: string) => request<BackendPromotionPackage[]>(`/projects/${encodeURIComponent(projectId)}/promotions/packages`),
  getProjectPromotions: (projectId: string) => request<BackendProjectPromotion[]>(`/projects/${encodeURIComponent(projectId)}/promotions`),
  createProjectPromotion: (projectId: string, input: CreateProjectPromotionInput) => request<BackendProjectPromotion>(`/projects/${encodeURIComponent(projectId)}/promotions`, {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  uploadProjectDocument: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<BackendProjectDocument>(`/projects/${encodeURIComponent(projectId)}/documents`, { method: 'POST', body: formData });
  },
  downloadProjectDocument: async (projectId: string, documentId: string) => {
    const token = authService.getAuthState().session?.token;
    const response = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(await response.text() || `Document download failed with status ${response.status}`);
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || 'project-document.pdf';
    link.click();
    URL.revokeObjectURL(blobUrl);
  },
  getCurrentUser: () => request<BackendUser>('/users/me'),
  getCurrentAccess: () => request<BackendAccess>('/users/me/access'),
  getUsers: () => request<BackendUser[]>('/users'),
  updateUserStatus: (userId: string, status: string) => request<BackendUser>(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  assignRole: (userId: string, role: string, organisationId: string, countryNodeId: string) =>
    request(`/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role, organisationId, countryNodeId }),
    }),
  revokeRole: (userId: string, role: string, organisationId: string, countryNodeId: string) =>
    request(`/users/${userId}/roles/${encodeURIComponent(role)}/orgs/${organisationId}/countries/${countryNodeId}`, {
      method: 'DELETE',
    }),
  calculateZakat: (input: { investedCapital: number; liquidCash: number; debtsOwed: number }) =>
    request<ZakatCalculation>('/zakat/calculations', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  upgradeMembership: (input: { planId: string; billingInterval: 'monthly' | 'annual'; paymentMethod: string }) =>
    request('/membership/me/upgrade', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  savePdpDraft: async (payload: Partial<PDPApplication>, id?: string) => {
    const response = await request<BackendPdpApplication>(id ? `/pdp/applications/${id}` : '/pdp/applications', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify({
        id,
        countryCode: payload.countryCode,
        countryName: payload.countryName,
        pdpType: payload.pdpType,
        organisationName: payload.organisationName,
        userEmail: payload.userEmail,
        payload,
      }),
    });
    return mapPdpApplication(response);
  },
  submitPdpApplication: async (id: string) => {
    const response = await request<BackendPdpApplication>(`/pdp/applications/${id}/submit`, { method: 'POST' });
    return mapPdpApplication(response);
  },
  createShariahReview: (input: CreateShariahReviewInput) => request<ShariahReview>('/shariah/reviews', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  getShariahReview: (id: string) => request<ShariahReview>(`/shariah/reviews/${id}`),
  submitShariahDecision: (id: string, input: ShariahDecisionInput) => request<ShariahReview>(`/shariah/reviews/${id}/decisions`, {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  getFeatureModules: () => request<FeatureModule[]>('/admin/modules'),
  updateFeatureModule: (moduleKey: string, mode: FeatureModuleMode) => request<FeatureModule>(`/admin/modules/${moduleKey}`, {
    method: 'PATCH',
    body: JSON.stringify({ mode }),
  }),
  aiChat: (input: { message: string; conversationId?: string }) => request<BackendAiRun>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  createRagDocument: (input: { projectId: string; title: string; sourceType: string; content: string }) => request<BackendRagDocument>('/ai/rag/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  uploadRagPdf: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', file);
    return request<BackendRagDocument>('/ai/rag/documents/upload', { method: 'POST', body: formData });
  },
  searchRagDocuments: (input: { projectId: string; query: string; limit?: number }) => request<BackendRagSearchResult[]>('/ai/rag/documents/search', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  analyzeContractAdvisor: (input: { projectId: string; proposedShariahContract: string; context?: string }) => request<BackendAiRun>('/ai/contract-advisor/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  generateContractDraft: (input: { contractType: string; capital: number; sponsorName: string; sector?: string; projectId?: string }) => request<BackendAiRun>('/ai/contract-drafts/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  analyzeShariah: (input: { proposedContract: string; terms: string; projectId: string }) => request<BackendAiRun>('/ai/shariah/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  analyzeDueDiligence: (input: { subjectType: string; subjectId: string; content?: string }) => request<BackendAiRun>('/ai/due-diligence/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  reviewAiDecision: (runId: string, input: { decision: 'ACCEPTED' | 'MODIFIED' | 'OVERRIDDEN' | 'REJECTED'; justification: string }) => request('/ai/decisions/' + runId + '/review', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
};

export interface DashboardSummary {
  source: 'database';
  projectCount: number;
  totalProjectValue: number;
  fundingRequired: number;
  activePoolCount: number;
  contractCount: number;
  fundingRequestCount: number;
  fundingRequested: number;
}

export interface CreateShariahReviewInput {
  projectId: string;
  organisationId: string;
  countryNodeId: string;
  proposedContract: string;
}

export interface ShariahDecisionInput {
  decision: 'ACCEPTED' | 'MODIFIED' | 'OVERRIDDEN' | 'REJECTED';
  justification?: string;
}

export interface ShariahReview {
  id: string;
  projectId: string;
  organisationId: string;
  countryNodeId: string;
  proposedContract: string;
  status: 'PROPOSED' | 'APPROVED' | 'MODIFIED' | 'OVERRIDDEN' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  decisions: {
    id: string;
    decision: ShariahDecisionInput['decision'];
    justification?: string;
    actorId: string;
    actorRole: string;
    createdAt: string;
  }[];
}

export interface FeatureModule {
  moduleKey: string;
  name: string;
  description: string;
  mode: FeatureModuleMode;
  enabled: boolean;
  updatedBy?: string;
  updatedAt: string;
}

export type FeatureModuleMode = 'ACTIVE' | 'MANUAL_REVIEW' | 'DISABLED';

export interface BackendAiRun<T = Record<string, unknown>> {
  id: string;
  requestId: string;
  featureKey: string;
  status: string;
  provider: string;
  model: string;
  output?: T & {
    recommendation?: Record<string, unknown>;
    confidence?: ShariahConfidence;
    reasoningSummary?: { positiveFactors: string[]; concerns: string[] };
    riskFlags?: { title: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }[];
    dataSources?: string[];
    limitations?: string[];
    requiresHumanReview?: boolean;
  };
  createdAt: string;
}

interface ShariahConfidence {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  scorePercent: number;
  disclaimer: string;
}

export interface BackendUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  profile?: Record<string, unknown>;
  assignedRoles: { role: string; organisationId: string; countryNodeId: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface BackendRagDocument {
  id: string;
  projectId: string;
  title: string;
  sourceType: string;
  status: string;
  createdAt: string;
  chunks?: { id: string; content: string; chunkIndex: number }[];
}

export interface BackendRagSearchResult {
  id: string;
  documentId: string;
  content: string;
  title: string;
  sourceType: string;
  score?: number;
}

export interface BackendProject {
  projectId: string;
  projectCode: string;
  projectName: string;
  description: string;
  organisationId: string;
  countryNodeId: string;
  sector: string;
  fundingRequired: number | string;
  proposedShariahContract: string;
  status: string;
  sponsorEntityType?: string | null;
  countryNode?: { currency: string };
}

export interface CreateProjectInput {
  projectCode: string;
  projectName: string;
  description: string;
  organisationId: string;
  countryNodeId: string;
  sector: string;
  totalProjectCost: number;
  sponsorContribution: number;
  fundingRequired: number;
  proposedShariahContract: string;
  projectSponsorId: string;
  sponsorEntityType?: string;
}

export interface BackendProjectDocument {
  id: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  extractionStatus: 'EXTRACTED' | 'FAILED' | 'NOT_APPLICABLE';
  extractionError?: string | null;
  extractedText: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendProjectTeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  qualification: string;
  avatarUrl: string;
}

export interface ProjectTeamCandidate {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export type ProjectAnnouncementType = 'Quarterly Update' | 'Financial Statement' | 'Milestone Notice' | 'Dividends Announcement' | 'Compliance Notice';

export interface CreateProjectAnnouncementInput {
  title: string;
  body: string;
  announcementType: ProjectAnnouncementType;
}

export interface BackendProjectAnnouncement {
  id: string;
  title: string;
  body: string;
  date: string;
  author: string;
  type: ProjectAnnouncementType;
  readCount: number;
}

export interface BackendPromotionPackage {
  id: string;
  title: string;
  badgeType: 'Featured' | 'Sponsored' | 'Promoted';
  durationDays: number;
  priceMYR: number;
  creditsCost: number;
}

export interface BackendProjectPromotion {
  id: string;
  projectId: string;
  packageName: string;
  badgeType: 'Featured' | 'Sponsored' | 'Promoted';
  status: string;
  startDate: string;
  endDate: string | null;
  priceMYR: number | string;
  paymentMethod: string;
  paymentStatus: string;
  views: number;
  clicks: number;
  investorLeads: number;
}

export interface CreateProjectPromotionInput {
  packageId: string;
  startDate: string;
  paymentMethod: 'RM' | 'CREDITS';
}

export interface BackendAccess {
  userId: string;
  role: string;
  assignedRoles: string[];
  countryNodeId: string;
  organisationId: string;
}

interface BackendPdpApplication {
  id: string;
  applicationNumber: string;
  userId: string;
  userEmail: string;
  countryCode: string;
  countryName: string;
  status: PDPApplication['status'];
  kybStatus: PDPApplication['kybStatus'];
  payload: Partial<PDPApplication>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

function mapPdpApplication(application: BackendPdpApplication): PDPApplication {
  return {
    ...(application.payload as PDPApplication),
    id: application.id,
    applicationNumber: application.applicationNumber,
    userId: application.userId,
    userEmail: application.userEmail,
    countryCode: application.countryCode,
    countryName: application.countryName,
    status: application.status,
    kybStatus: application.kybStatus,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    submittedAt: application.submittedAt,
  };
}
