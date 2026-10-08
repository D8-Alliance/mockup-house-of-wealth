import { authService } from '../auth/services/authService';
import { PDPApplication } from '../pdp/pdpTypes';
import { AdminAIAnalyticsSummary } from '../ai/monetisation/aiMonetisationTypes';

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

  // Nest sends an empty body when a handler returns null (e.g. "no KYC application yet").
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
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

export interface BackendFinancialAccount {
  id: string;
  accountCode: string;
  accountType: string;
  ownerType: string;
  ownerId: string;
  currency: string;
  status: string;
}

export interface BackendLedgerTransaction {
  id: string;
  transactionNumber: string;
  transactionType: string;
  referenceType: string;
  referenceId: string;
  currency: string;
  description: string;
  status: string;
  createdAt: string;
  entries: Array<{ id: string; accountId: string; direction: 'DEBIT' | 'CREDIT'; amount: string | number; currency: string; description?: string | null; account?: { accountCode: string; ownerType: string; ownerId: string } }>;
}

export interface BackendInvestmentOrder {
  id: string;
  orderNumber: string;
  poolId: string;
  projectId: string;
  investorUserId: string;
  amount: string | number;
  currency: string;
  status: string;
  createdAt: string;
  settledAt?: string | null;
}

export interface BackendNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string | null;
  resourceId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export const apiClient = {
  getDashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),
  getFinancialAccounts: () => request<BackendFinancialAccount[]>('/financial/accounts'),
  getFinancialAccountBalance: (accountId: string) => request<{ accountId: string; accountCode: string; currency: string; balance: number; debit: number; credit: number }>(`/financial/accounts/${encodeURIComponent(accountId)}/balance`),
  getFinancialLedger: () => request<BackendLedgerTransaction[]>('/financial/ledger'),
  transferFinancialAccounts: (input: { sourceAccountId: string; destinationAccountId: string; amount: number; description: string; idempotencyKey: string }) => request<BackendLedgerTransaction>('/financial/transfers', { method: 'POST', body: JSON.stringify(input) }),
  getInvestmentOrders: () => request<BackendInvestmentOrder[]>('/investments/orders'),
  createInvestmentOrder: (input: { poolId: string; amount: number; currency: string; idempotencyKey: string }) => request<BackendInvestmentOrder>('/investments/orders', { method: 'POST', body: JSON.stringify(input) }),
  settleInvestmentOrder: (id: string) => request<BackendInvestmentOrder>(`/investments/orders/${encodeURIComponent(id)}/settle`, { method: 'POST' }),
  cancelInvestmentOrder: (id: string, reason?: string) => request<BackendInvestmentOrder>(`/investments/orders/${encodeURIComponent(id)}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  getNotifications: () => request<BackendNotification[]>('/notifications'),
  getUnreadNotificationCount: () => request<{ count: number }>('/notifications/unread-count'),
  markNotificationRead: (id: string) => request<BackendNotification>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<{ count: number }>('/notifications/read-all', { method: 'POST' }),
  getMembershipCreditSummary: () => request<BackendCreditSummary>('/membership/me/credits'),
  getMembershipCreditUsage: () => request<BackendCreditTransaction[]>('/membership/me/credits/usage'),
  getMembershipTransactions: () => request<BackendTransaction[]>('/membership/me/transactions'),
  downloadTransactionReceipt: async (transactionId: string) => {
    const token = authService.getAuthState().session?.token; const response = await fetch(`${API_BASE_URL}/membership/me/transactions/${encodeURIComponent(transactionId)}/receipt`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error(await response.text() || 'Receipt is unavailable.'); const blobUrl = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = blobUrl; link.download = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || 'receipt.txt'; link.click(); URL.revokeObjectURL(blobUrl);
  },
  consumeMembershipCredits: (operationKey: string, targetEntity?: string) => request<BackendCreditTransaction>('/membership/me/credits/consume', { method: 'POST', body: JSON.stringify({ operationKey, targetEntity }) }),
  topUpMembershipCredits: (packageId: string, paymentMethod: string) => request<{ transaction?: BackendCreditTransaction; balance?: BackendCreditSummary; paymentUrl?: string; paymentId?: string; status?: string }>('/membership/me/credits/top-up', { method: 'POST', body: JSON.stringify({ packageId, paymentMethod }) }),
  verifyMembershipPayment: (paymentId: string) => request<{ status: 'PAID' | 'FAILED' | 'PENDING'; paymentId: string; productType: string }>(`/membership/me/payments/${encodeURIComponent(paymentId)}/verify`, { method: 'POST' }),
  getAdminCreditAnalytics: () =>request<{ summary: AdminAIAnalyticsSummary; transactions: BackendCreditTransaction[] }>('/membership/admin/credits/analytics'),
  getProjects: () => request<BackendProject[]>('/projects'),
  analyzeProjectFeasibility: (projectId: string) => request<BackendFeasibilityAssessment>(`/ai/projects/${encodeURIComponent(projectId)}/feasibility/analyze`, { method: 'POST' }),
  getLatestProjectFeasibility: (projectId: string) => request<BackendFeasibilityAssessment | null>(`/ai/projects/${encodeURIComponent(projectId)}/feasibility/latest`),
  reviewProjectFeasibility: (projectId: string, runId: string, input: { reviewStage: string; decision: string; comment: string; supportingEvidence?: string[] }) => request<BackendFeasibilityAssessment & { reviewStatus?: string; roleResponsibility?: string[]; aiRecommendationIsNotApproval?: boolean }>(`/ai/projects/${encodeURIComponent(projectId)}/feasibility/${encodeURIComponent(runId)}/review`, { method: 'POST', body: JSON.stringify(input) }),
  runProjectDueDiligence: (projectId: string) => request<BackendDueDiligenceScan>('/ai/projects/due-diligence/scan', { method: 'POST', body: JSON.stringify({ projectId }) }),
  getLatestProjectDueDiligence: (projectId: string) => request<BackendDueDiligenceScan | null>(`/ai/projects/${encodeURIComponent(projectId)}/due-diligence/latest`),
  analyzeProjectDocument: (projectId: string, documentId: string) => request<BackendDocumentAnalysis>(`/ai/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}/analyze`, { method: 'POST' }),
  getProjectLifecycle: (projectId: string) => request<BackendProjectLifecycle>(`/projects/${encodeURIComponent(projectId)}/lifecycle`),
  updateProjectStatus: (projectId: string, input: { status: string; note?: string }) => request<BackendProject>(`/projects/${encodeURIComponent(projectId)}/status`, { method: 'POST', body: JSON.stringify(input) }),
  updateProjectMilestone: (projectId: string, milestoneId: string, input: { completionPct?: number; status?: string; shariahSignoff?: boolean; auditorSignoff?: boolean }) => request(`/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  createProject: (input: CreateProjectInput) => request<BackendProject>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  getProjectDocuments: (projectId: string) => request<BackendProjectDocument[]>(`/projects/${encodeURIComponent(projectId)}/documents`),
  getProjectEvidenceRequirements: (projectId: string) => request<BackendEvidenceRequirement[]>(`/projects/${encodeURIComponent(projectId)}/evidence/requirements`),
  uploadProjectEvidence: (projectId: string, evidenceType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<BackendEvidenceRequirement>(`/projects/${encodeURIComponent(projectId)}/evidence/${encodeURIComponent(evidenceType)}/upload`, { method: 'POST', body: formData });
  },
  verifyProjectEvidence: (projectId: string, evidenceType: string) => request<BackendEvidenceRequirement>(`/projects/${encodeURIComponent(projectId)}/evidence/${encodeURIComponent(evidenceType)}/verify`, { method: 'POST' }),
  reopenProject: (projectId: string, reason: string) => request<BackendProject>(`/projects/${encodeURIComponent(projectId)}/reopen`, { method: 'POST', body: JSON.stringify({ reason }) }),
  registerDemoUser: (input: { name: string; email: string; organisation: string; countryNodeId: string; role: string }) => request<{ userId: string; organisationId: string; organisationName: string; countryNodeId: string; role: string; email: string; name: string }>('/auth/demo-register', { method: 'POST', body: JSON.stringify(input) }),
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
  confirmProjectPromotionPayment: (projectId: string, campaignId: string) => request<BackendProjectPromotion>(`/projects/${encodeURIComponent(projectId)}/promotions/${encodeURIComponent(campaignId)}/payment/confirm`, { method: 'POST' }),
  downloadPromotionReceipt: async (projectId: string, campaignId: string) => {
    const token = authService.getAuthState().session?.token;
    const response = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/promotions/${encodeURIComponent(campaignId)}/receipt`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error(await response.text() || 'Promotion receipt is unavailable.');
    const blobUrl = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = blobUrl; link.download = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || 'promotion-receipt.txt'; link.click(); URL.revokeObjectURL(blobUrl);
  },
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
  updateMyProfile: (input: { phone?: string; pushToken?: string; avatarUrl?: string }) => request<BackendUser>('/users/me/profile', { method: 'PATCH', body: JSON.stringify(input) }),
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
  calculateZakat: (input: { investedCapital: number; liquidCash: number; debtsOwed: number; currency?: string }) =>
    request<ZakatCalculation>('/zakat/calculations', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  createZakatPayment: (calculationId: string) => request<{ paymentUrl: string; paymentId: string; status: string }>(`/zakat/calculations/${encodeURIComponent(calculationId)}/payment`, { method: 'POST' }),
  upgradeMembership: (input: { planId: string; billingInterval: 'monthly' | 'annual'; paymentMethod: string; creditsToApply?: number }) =>
    request('/membership/me/upgrade', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getMembershipStatus: () => request<BackendMembershipStatus>('/membership/me'),
  getPaymentOptions: () => request<{ simulatedPaymentsAllowed: boolean }>('/membership/payment-options'),
  getHashChainIntegrity: () => request<HashChainReport>('/admin/audit/integrity'),
  sealHashChains: () => request<HashChainReport>('/admin/audit/integrity/seal', { method: 'POST' }),
  cancelMembershipPayment: (paymentId: string) => request<{ status: string; paymentId: string }>(`/membership/me/payments/${encodeURIComponent(paymentId)}/cancel`, { method: 'POST' }),
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
  getShariahReviews: () => request<ShariahReview[]>('/shariah/reviews'),
  getCentralMalaysiaShariahReviews: () => request<ShariahReview[]>('/shariah/reviews/central/malaysia'),
  getShariahNotifications: () => request<ShariahNotification[]>('/shariah/reviews/notifications'),
  revertShariahReview: (id: string) => request<ShariahReview>(`/shariah/reviews/${id}/revert`, { method: 'POST' }),
  resubmitShariahReview: (id: string, input: CreateShariahReviewInput) => request<ShariahReview>(`/shariah/reviews/${id}/resubmit`, { method: 'POST', body: JSON.stringify(input) }),
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
  aiChat: (input: { message: string; conversationId?: string; projectId?: string }) => request<BackendAiChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  listCitations: (filter: CitationAuditFilter & { page?: number; pageSize?: number } = {}) => request<CitationAuditPage>(`/ai/citations${citationQuery(filter)}`),
  getCitationSummary: (filter: Pick<CitationAuditFilter, 'countryNodeId' | 'from' | 'to'> = {}) => request<CitationAuditSummary>(`/ai/citations/summary${citationQuery(filter)}`),
  reviewCitation: (id: string, input: { status: CitationReviewStatus; comment?: string }) => request<BackendAiCitation>(`/ai/citations/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  exportCitationsCsv: async (filter: CitationAuditFilter = {}) => {
    const token = authService.getAuthState().session?.token;
    const response = await fetch(`${API_BASE_URL}/ai/citations/export${citationQuery(filter)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error(await response.text() || 'Citation export failed.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || 'citation-audit.csv';
    link.click();
    URL.revokeObjectURL(url);
    return Number(response.headers.get('x-row-count') || 0);
  },
  listAiConversations: () => request<BackendAiConversationSummary[]>('/ai/conversations'),
  getAiConversation: (id: string) => request<BackendAiConversation>(`/ai/conversations/${encodeURIComponent(id)}`),
  supersedeRagDocument: (id: string, supersededById: string | null) => request<BackendRagDocument>(`/ai/rag/documents/${encodeURIComponent(id)}/supersede`, {
    method: 'POST',
    body: JSON.stringify({ supersededById }),
  }),
  getRagCountries: () => request<BackendRagCountry[]>('/ai/rag/countries'),
  listRagDocuments: (filter: { scope?: RagScope; projectId?: string; approvalStatus?: string } = {}) => {
    const params = new URLSearchParams(Object.entries(filter).filter(([, value]) => Boolean(value)) as [string, string][]);
    return request<BackendRagDocument[]>(`/ai/rag/documents${params.size ? `?${params}` : ''}`);
  },
  backfillRagEmbeddings: () => request<{ enabled: boolean; model: string | null; rebuilt: Array<{ documentId: string; chunksBefore: number; chunksAfter: number }>; documents: Array<{ documentId: string } & RagEmbeddingStatus> }>('/ai/rag/embeddings/backfill', { method: 'POST' }),
  reviewRagDocument: (id: string, input: { decision: 'REVIEWED' | 'APPROVED' | 'REJECTED'; comment?: string }) => request<BackendRagDocument>(`/ai/rag/documents/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  createRagDocument: (input: RagDocumentMetadata & { title: string; sourceType: string; content: string }) => request<BackendRagDocument>('/ai/rag/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  uploadRagPdf: (file: File, metadata: RagDocumentMetadata) => {
    const formData = new FormData();
    Object.entries(metadata).forEach(([key, value]) => { if (value) formData.append(key, value); });
    formData.append('file', file);
    return request<BackendRagDocument>('/ai/rag/documents/upload', { method: 'POST', body: formData });
  },
  searchRagDocuments: (input: { projectId?: string; query: string; limit?: number; documentCategory?: string; contractType?: string; authority?: string; jurisdiction?: string; industry?: string }) => request<BackendRagSearchResult[]>('/ai/rag/documents/search', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  analyzeContractAdvisor: (input: { projectId: string; proposedShariahContract: string; context?: string }) => request<BackendAiRun>('/ai/contract-advisor/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  generateContractDraft: (input: { projectId: string; contractType?: string }) => request<BackendAiRun>('/ai/contract-drafts/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  createAgreementDraft: (input: { contractType: string; projectName: string; jurisdiction: string; projectId?: string; wizardData: Record<string, unknown> }) => request<BackendAgreementDraft>('/contract-intelligence/agreements/drafts', { method: 'POST', body: JSON.stringify(input) }),
  reviewAgreement: (id: string, input: { reviewStatus: string; note?: string }) => request(`/contract-intelligence/agreements/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify(input) }),
  downloadAgreement: async (id: string, format: 'docx' | 'pdf') => { const token = authService.getAuthState().session?.token; const response = await fetch(`${API_BASE_URL}/contract-intelligence/agreements/${encodeURIComponent(id)}/download/${format}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); if (!response.ok) throw new Error(await response.text() || 'Agreement download failed.'); const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || `agreement.${format}`; link.click(); URL.revokeObjectURL(url); },
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
  getMyKyc: () => request<KycApplication | null>('/kyc/me'),
  saveMyKycDraft: (input: KycDraftInput) => request<KycApplication>('/kyc/me', { method: 'PUT', body: JSON.stringify(input) }),
  uploadMyKycDocument: (documentType: KycDocumentType, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<KycDocument>(`/kyc/me/documents/${documentType}`, { method: 'POST', body: formData });
  },
  submitMyKyc: () => request<KycApplication>('/kyc/me/submit', { method: 'POST' }),
  downloadMyKycDocument: (documentId: string) => openAuthenticatedFile(`/kyc/me/documents/${encodeURIComponent(documentId)}/download`),
  getKycQueue: (status: KycReviewableStatus = 'SUBMITTED') => request<KycQueueItem[]>(`/kyc/applications?status=${status}`),
  getKycApplicationForReview: (id: string) => request<KycApplication>(`/kyc/applications/${encodeURIComponent(id)}`),
  downloadKycDocumentForReview: (applicationId: string, documentId: string) => openAuthenticatedFile(`/kyc/applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(documentId)}/download`),
  reviewKycApplication: (id: string, input: { decision: KycDecision; comment: string; kycLevel?: KycLevel; acknowledgeWarnings?: boolean; overrideReason?: string }) => request<KycApplication>(`/kyc/applications/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify(input) }),
  rerunKycChecks: (id: string) => request<KycApplication>(`/kyc/applications/${encodeURIComponent(id)}/checks/run`, { method: 'POST' }),
  // Face verification (camera liveness prototype).
  getMyLiveness: () => request<LivenessSession | null>('/kyc/me/liveness'),
  startLiveness: () => request<LivenessSession>('/kyc/me/liveness/sessions', { method: 'POST' }),
  submitLivenessFrame: (sessionId: string, step: LivenessStep, frame: Blob) => {
    const body = new FormData();
    body.append('frame', frame, 'frame.jpg');
    return request<LivenessFrameResult>(`/kyc/me/liveness/sessions/${encodeURIComponent(sessionId)}/steps/${step}`, { method: 'POST', body });
  },
  getKycLivenessForReview: (applicationId: string) => request<LivenessReview | null>(`/kyc/applications/${encodeURIComponent(applicationId)}/liveness`),
  /** Object URL of a captured liveness frame (the caller revokes it). */
  getKycLivenessFrameUrl: async (applicationId: string, frameId: string) => {
    const token = authService.getAuthState().session?.token;
    const response = await fetch(`${API_BASE_URL}/kyc/applications/${encodeURIComponent(applicationId)}/liveness/frames/${encodeURIComponent(frameId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error(await response.text() || 'Frame is unavailable.');
    return URL.createObjectURL(await response.blob());
  },
};

/** Fetches a protected file with the bearer token and opens it in a new tab. */
async function openAuthenticatedFile(path: string) {
  const token = authService.getAuthState().session?.token;
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error(await response.text() || 'File is unavailable.');
  const blobUrl = URL.createObjectURL(await response.blob());
  window.open(blobUrl, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

/** Server errors arrive as Nest JSON bodies; this pulls out the human-readable message. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join('; ');
    return parsed.message || fallback;
  } catch {
    return error.message || fallback;
  }
}

export type KycStatus = 'DRAFT' | 'SUBMITTED' | 'RESUBMISSION_REQUIRED' | 'APPROVED' | 'REJECTED';
export type KycReviewableStatus = Exclude<KycStatus, 'DRAFT'>;
export type KycDocumentType = 'ID_FRONT' | 'ID_BACK' | 'PASSPORT' | 'SELFIE' | 'PROOF_OF_ADDRESS';
export type KycIdDocumentType = 'NATIONAL_ID' | 'PASSPORT';
export type KycLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
export type KycDecision = 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';

export interface KycDraftInput {
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  idDocumentType?: KycIdDocumentType;
  idDocumentNumber?: string;
  idDocumentExpiry?: string;
  residentialAddress?: string;
}

export interface KycDocument {
  id: string;
  documentType: KycDocumentType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  createdAt: string;
}

export interface KycReviewRecord {
  id: string;
  reviewerId: string;
  reviewerRole: string;
  decision: KycDecision;
  kycLevel: KycLevel | null;
  comment: string;
  createdAt: string;
}

export interface KycApplication {
  id: string;
  applicationNumber: string;
  userId: string;
  userEmail: string;
  countryNodeId: string;
  fullName: string;
  dateOfBirth: string | null;
  nationality: string;
  idDocumentType: KycIdDocumentType | '';
  idDocumentNumber: string;
  idDocumentExpiry: string | null;
  residentialAddress: string;
  status: KycStatus;
  kycLevel: KycLevel | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  documents: KycDocument[];
  requiredDocuments: KycDocumentType[];
  missing?: string[];
  reviews?: KycReviewRecord[];
  // Officer views only: advisory output of the automated checks.
  checkRecommendation?: KycCheckRecommendation | null;
  checkReasons?: string[];
  checksUpdatedAt?: string | null;
  checks?: KycCheckResult[];
}

export type KycCheckRecommendation = 'CLEAR' | 'ATTENTION' | 'ADVERSE' | 'PENDING';
export type KycCheckStatus = 'PASS' | 'FAIL' | 'REVIEW' | 'PENDING' | 'ERROR' | 'SKIPPED';

export interface KycCheckResult {
  id: string;
  round: number;
  checkType: string;
  provider: string;
  providerVersion: string;
  status: KycCheckStatus;
  score: number | null;
  reasons: string[];
  shadow: boolean;
  agree: boolean | null;
  latencyMs: number;
  createdAt: string;
  completedAt: string | null;
}

export type LivenessStep = 'ALIGN' | 'TURN_LEFT' | 'TURN_RIGHT' | 'LOOK_UP' | 'ID_CARD' | 'FACE_WITH_ID';

export interface LivenessResult {
  livenessPassed: boolean;
  failureReason?: string;
  /** Officer view only. */
  cardFaceSimilarity?: number | null;
  uploadedIdFaceSimilarity?: number | null;
  idNumberOnCard?: 'MATCH' | 'MISMATCH' | 'NOT_FOUND';
}

export interface LivenessSession {
  id: string;
  status: 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'EXPIRED';
  steps: LivenessStep[];
  currentStep: number;
  expiresAt: string;
  stepTimeLimitSeconds: number;
  completedAt: string | null;
  result: LivenessResult | null;
}

export interface LivenessFrameResult {
  accepted: boolean;
  message: string;
  metrics: Record<string, number | string | boolean>;
  session: LivenessSession;
}

export interface LivenessReview extends LivenessSession {
  frames: Array<{ id: string; step: LivenessStep; capturedAt: string; metrics: Record<string, unknown> }>;
}

export interface KycQueueItem {
  id: string;
  applicationNumber: string;
  userEmail: string;
  fullName: string;
  nationality: string;
  idDocumentType: KycIdDocumentType | '';
  idDocumentNumberMasked: string;
  countryNodeId: string;
  status: KycReviewableStatus;
  kycLevel: KycLevel | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  documentCount: number;
  checkRecommendation?: KycCheckRecommendation | null;
  checkReasons?: string[];
}

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

export interface BackendAgreementDraft {
  contract: { id: string; contractNumber: string; contractType: string; status: string; title?: string };
  compliance: { status: string; checks: Array<{ label: string; pass: boolean; severity: string }> };
  sections: Array<{ number: string; title: string; paragraphs: string[] }>;
  variables: Record<string, string>;
}

export interface CreateShariahReviewInput {
  projectId: string;
  organisationId: string;
  countryNodeId: string;
  proposedContract: string;
  draftText?: string;
}

export interface ShariahDecisionInput {
  decision: 'ACCEPTED' | 'MODIFIED' | 'OVERRIDDEN' | 'REJECTED' | 'REQUEST_CHANGES';
  justification?: string;
}

export interface ShariahReview {
  id: string;
  projectId: string;
  organisationId: string;
  countryNodeId: string;
  proposedContract: string;
  status: 'PROPOSED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'MODIFIED' | 'OVERRIDDEN' | 'REJECTED' | 'REVERTED';
  revision?: number;
  requestedChanges?: string | null;
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
  aiResult?: { draftText?: string; source?: string } | null;
  project?: BackendProject;
}

export interface ShariahNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string | null;
  resourceId?: string | null;
  readAt?: string | null;
  createdAt: string;
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

/** GLOBAL = all 9 D-8 country nodes, COUNTRY = one country node, PROJECT = one project. */
export type RagScope = 'GLOBAL' | 'COUNTRY' | 'PROJECT';

export interface RagDocumentMetadata {
  scope: RagScope;
  countryNodeId?: string;
  effectiveFrom?: string;
  projectId?: string;
  title?: string;
  sourceType?: string;
  documentCategory?: string;
  contractType?: string;
  authority?: string;
  jurisdiction?: string;
  industry?: string;
}

export interface RagEmbeddingStatus {
  status: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE' | 'DISABLED';
  model: string | null;
  embeddedChunks: number;
  totalChunks: number;
}

/** Grounding of an assistant answer in approved knowledge-base sources (validated server-side). */
export type AiGroundingStatus = 'GROUNDED' | 'PARTIALLY_GROUNDED' | 'UNSUPPORTED' | 'NO_SOURCES';

export type CitationReviewStatus = 'UNREVIEWED' | 'CONFIRMED' | 'INCORRECT' | 'IRRELEVANT';

export interface CitationAuditFilter {
  documentId?: string;
  scope?: RagScope | '';
  countryNodeId?: string;
  groundingStatus?: AiGroundingStatus | '';
  quoteVerified?: 'true' | 'false' | '';
  reviewStatus?: CitationReviewStatus | '';
  from?: string;
  to?: string;
  search?: string;
}

const citationQuery = (filter: object) => {
  const params = new URLSearchParams(Object.entries(filter as Record<string, string | number | undefined>).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => [key, String(value)]));
  return params.size ? `?${params}` : '';
};

export interface CitationAuditItem extends BackendAiCitation {
  question: string | null;
  answer: string;
  answerCreatedAt: string;
  conversationId: string;
  messageId: string;
  groundingStatus: AiGroundingStatus | null;
  confidence: { level?: string; scorePercent?: number } | null;
  userId: string;
  organisationId: string;
  countryNodeId: string;
  documentStatus: string;
}

export interface CitationAuditPage {
  total: number;
  page: number;
  pageSize: number;
  canReview: boolean;
  items: CitationAuditItem[];
}

export interface CitationAuditSummary {
  countryNodeId: string | null;
  totalAnswers: number;
  grounding: Record<AiGroundingStatus, number>;
  totalCitations: number;
  unverifiedQuotes: number;
  reviews: Record<CitationReviewStatus, number>;
  topDocuments: Array<{ documentId: string | null; title: string; answers: number; citations: number; superseded: boolean }>;
}

export interface BackendAiCitation {
  id: string;
  marker: number;
  sourceLabel: string;
  chunkId: string | null;
  documentId: string | null;
  documentTitle: string;
  sourceType: string;
  scope: RagScope;
  pageStart: number | null;
  pageEnd: number | null;
  paragraphRefs: string[] | null;
  quote: string | null;
  quoteVerified: boolean;
  excerpt: string;
  retrievalScore: number | null;
  reviewStatus?: CitationReviewStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  document?: { supersededById: string | null } | null;
  createdAt: string;
}

export interface BackendAiMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    runId?: string | null;
    groundingStatus?: AiGroundingStatus;
    confidence?: { level: 'HIGH' | 'MEDIUM' | 'LOW'; scorePercent: number; disclaimer: string };
    limitations?: string[];
    unsupportedSentences?: string[];
    sourceCount?: number;
  } | null;
  citations?: BackendAiCitation[];
  createdAt: string;
}

export interface BackendAiChatResponse {
  conversationId: string;
  runId: string | null;
  message: BackendAiMessage;
}

export interface BackendAiConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export interface BackendAiConversation {
  id: string;
  title: string | null;
  messages: BackendAiMessage[];
}

export interface BackendRagCountry {
  code: string;
  name: string;
}

export interface BackendRagDocument {
  id: string;
  scope: RagScope;
  countryNodeId: string;
  organisationId: string;
  projectId?: string | null;
  title: string;
  sourceType: string;
  documentCategory?: string | null;
  contractType?: string | null;
  authority?: string | null;
  jurisdiction?: string | null;
  approvalStatus: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  status: string;
  uploadedBy: string;
  reviewedBy?: string | null;
  approvedBy?: string | null;
  reviewComment?: string | null;
  supersededById?: string | null;
  supersededAt?: string | null;
  supersededBy?: { id: string; title: string } | null;
  effectiveFrom?: string | null;
  chunkCount?: number;
  citedInAnswers?: number;
  embedding?: RagEmbeddingStatus;
  metadata?: { embedding?: RagEmbeddingStatus; source?: { type?: string; fileName?: string; pageCount?: number } } | null;
  createdAt: string;
  chunks?: { id: string; content: string; chunkIndex: number }[];
}

export interface BackendRagSearchResult {
  id: string;
  documentId: string;
  content: string;
  title: string;
  sourceType: string;
  scope: RagScope;
  pageStart?: number | null;
  pageEnd?: number | null;
  paragraphRefs?: string[];
  retrieval?: 'keyword' | 'vector' | 'hybrid';
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
  projectSponsor?: { name: string };
  milestones?: BackendProjectMilestone[];
  documents?: BackendProjectDocument[];
}

export interface BackendFeasibilityAssessment {
  id: string;
  requestId: string;
  project?: { projectId: string; projectCode: string; projectName: string; sector: string; fundingRequired: number | string; status: string };
  output?: { recommendation?: { financialAnalysis?: Record<string, unknown>; riskAnalysis?: Record<string, unknown>; [key: string]: unknown } };
  financialAnalysis: { npv: number | null; irr: number | null; dscr: number | null; roi: number | null; paybackPeriod: number | null; profitMargin: number | null; cashflow: Record<string, unknown>; fundingReadiness: string; assumptions?: Record<string, unknown>; scenarios?: Array<{ name: string; status: string; adjustmentPercent: number | null; npv: number | null; irr: number | null; roi: number | null; paybackPeriod: number | null }>; [key: string]: unknown };
  riskAnalysis: { riskFlags: Array<{ title: string; severity: string; description: string }>; missingEvidence: string[]; keyAssumptions: Array<{ name: string; value: unknown }>; projectRiskAssessment?: { overallLevel: string; risks: Array<{ type?: string; category: string; level: string; reason?: string; description: string; impact: string; mitigation?: string; mitigationAction?: string }>; requiresHumanReview: boolean }; [key: string]: unknown };
  evidenceIntelligence: {
    scorePercent: number;
    status: string;
    components: { projectData: number; requiredDocuments: number; financialAssumptions: number; supportingEvidence: number };
    weights?: { projectData: number; requiredDocuments: number; financialAssumptions: number; supportingEvidence: number };
    contributions?: { projectData: number; requiredDocuments: number; financialAssumptions: number; supportingEvidence: number };
    coverage: Array<{ key: string; label: string; status: string; importance: string; requiredAction: string }>;
    matrix: Array<{ evidence: string; status: string; priority: string; requiredAction: string }>;
    nextActions: string[];
    confidenceReasons: string[];
    disclaimer: string;
    methodology?: string;
  };
  confidence: { level: string; scorePercent: number; disclaimer: string; reasons: string[] };
  projectFeasibility?: { available: boolean; score: number | null; status: string; components: { financialFeasibility: number | null; marketAssumptions: number | null; executionReadiness: number | null; riskExposure: number | null }; reason: string };
  investmentReadiness: { status: string; category?: string; label: string; reasons?: Array<{ category: string; status: string; detail: string }>; reviewCanProceedAfter?: Array<{ requirement: string; complete: boolean }>; recommendedNextStep?: string; evidenceStatus: string; financialStatus: string; riskLevel: string; complianceStatus: string; shariahStatus?: string; requiresHumanReview: boolean; disclaimer: string };
  shariahAssessment: { structure: string; reviewTitle: string; suitability: string; checks: Array<{ label: string; status: string }>; assessment?: string[]; requiredInformation: string[]; missingInformation?: string[]; potentialConcerns: string[]; status: string; statusFlow?: string[]; humanReviewStatus?: string; disclaimer?: string; humanReviewRequired: boolean };
  humanReviewRequired: boolean;
  reviewStage: string;
  roleResponsibility?: string[];
  reviewHistory?: Array<{ stage: string; reviewerId?: string; reviewer?: string; reviewerRole?: string; date?: string; status?: string; decision?: string; comment?: string; supportingEvidence?: string[]; actorId?: string; at?: string; note?: string | null }>;
}

export interface BackendProjectMilestone {
  id: string;
  title: string;
  targetDate?: string | null;
  completionPct: number;
  disbursementAmount: number | string;
  status: string;
  shariahSignoff: boolean;
  auditorSignoff: boolean;
}

export interface BackendProjectLifecycle {
  project: BackendProject;
  milestones: BackendProjectMilestone[];
  events: { id: string; fromStatus?: string | null; toStatus: string; note?: string | null; actorId: string; createdAt: string }[];
}

export interface BackendDueDiligenceScan {
  id: string;
  projectId: string;
  confidenceScore: number;
  missingDocuments: { title: string; status: string }[];
  findings: { title: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; mitigation: string }[];
  createdAt: string;
}

export interface BackendCreditSummary {
  userId: string;
  availableBalance: number;
  usedCredits: number;
  remainingCredits: number;
  usedThisMonth: number;
  monthlyAllowance: number;
  additionalCredits: number;
  totalPoolCredits: number;
  resetDate: string;
  userTier: string;
  purchasedCredits?: number;
  bonusCredits?: number;
  /** Administrators and Shariah reviewers: AI is not charged for the active role. */
  creditExempt?: boolean;
}

export interface BackendCreditTransaction {
  id: string;
  userId?: string;
  type: string;
  operationKey?: string | null;
  targetEntity?: string | null;
  credits: number;
  balanceBefore: number;
  balanceAfter: number;
  amountMYR?: number | string | null;
  paymentMethod?: string | null;
  createdAt: string;
}

export interface BackendMembershipStatus {
  userId: string;
  planId: string;
  planName: string;
  tier: string;
  billingInterval: 'monthly' | 'annual';
  status: string;
  /** FREE, ACTIVE, EXPIRING_SOON (within 7 days of the end) or GRACE (ended, still usable). */
  lifecycleStatus: 'FREE' | 'ACTIVE' | 'EXPIRING_SOON' | 'GRACE';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  daysRemaining: number;
  graceEndsAt: string | null;
  graceDays: number;
  renewalMode: 'MANUAL' | 'NONE';
  autoRenew: boolean;
  paymentMethodSummary: string;
  aiCreditsRemaining: number;
  aiCreditsTotal: number;
  redeemableCredits: number;
  creditValueMYR: number;
  fpxFeeMYR: number;
  toyyibPayMinimumMYR: number;
  pendingMembershipPayments: number;
}

export interface BackendTransaction { id: string; type: string; description: string; status: string; amountMYR: number; amountUSD: number; credits: number; method: string; invoiceNumber?: string | null; createdAt: string; receiptAvailable: boolean; paymentId?: string; gatewayBillCode?: string | null; gatewayTransactionId?: string | null; failureReason?: string | null; fpxFeeMYR?: number; simulated?: boolean; }

export interface BackendDocumentAnalysis {
  id: string;
  documentName: string;
  parties: string[];
  importantDates: string[];
  extractedFigures: string[];
  keyTerms: string[];
  confidence: { level: 'LOW' | 'MEDIUM' | 'HIGH'; scorePercent: number; disclaimer: string };
  requiresHumanReview: boolean;
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

export interface BackendEvidenceRequirement {
  id: string;
  projectId: string;
  evidenceType: string;
  description: string;
  requiredFormat: string;
  priority: string;
  status: 'MISSING' | 'UPLOADED' | 'AI_PROCESSING' | 'AI_PRECHECKED' | 'VERIFIED' | 'REQUIRES_REVIEW';
  uploadedDocumentId?: string | null;
  verificationStatus: string;
  confidenceScore: number;
  verificationResult?: { analysisId?: string; extractedInformation?: Record<string, unknown>; validationResult?: string; missingFields?: string[]; integrityFlags?: DocumentIntegrityFlag[] } | null;
  uploadedDocument?: (Pick<BackendProjectDocument, 'id' | 'fileName' | 'mimeType' | 'extractionStatus' | 'createdAt'> & { sha256?: string | null; integrity?: { flags?: DocumentIntegrityFlag[] } | null }) | null;
}

export interface HashChainStatus { chain: string; valid: boolean; sealedCount: number; unsealedCount: number; headSequence: number; headHash: string; firstBreak: { sequence: number; recordId: string; reason: string } | null }
export interface HashChainReport { checkedAt: string; chains: HashChainStatus[] }

/** Advisory tamper signal on uploaded evidence (server/src/projects/document-integrity.ts). */
export interface DocumentIntegrityFlag { code: string; message: string }

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
  payment?: { id: string; amountMYR: number | string; method: string; status: string; providerRef?: string | null; createdAt: string; updatedAt: string } | null;
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
