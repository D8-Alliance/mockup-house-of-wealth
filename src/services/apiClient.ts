import { apiFetch } from './apiFetch';
import { authService } from '../auth/services/authService';
import { PDPApplication } from '../pdp/pdpTypes';
import { AdminAIAnalyticsSummary } from '../ai/monetisation/aiMonetisationTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:3001`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authService.getAuthState().session?.token;
  const isFormData = options.body instanceof FormData;
  let response: Response;
  try {
    response = await apiFetch(`${API_BASE_URL}${path}`, {
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
    const text = await response.text();
    // Nest and demo mode send {"message": "..."}; throw the readable message, so screens that show
    // error.message directly do not print raw JSON. apiErrorMessage() accepts both forms.
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) message = parsed.message.join('; ');
      else if (typeof parsed.message === 'string') message = parsed.message;
    } catch {
      // Not JSON: keep the text as it is.
    }
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
  /** The server answers with a bare number; older builds answered { count }. */
  getUnreadNotificationCount: async () => { const result = await request<number | { count: number }>('/notifications/unread-count'); return { count: typeof result === 'number' ? result : Number(result?.count ?? 0) }; },
  markNotificationRead: (id: string) => request<BackendNotification>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<{ count: number }>('/notifications/read-all', { method: 'POST' }),
  getMembershipCreditSummary: () => request<BackendCreditSummary>('/membership/me/credits'),
  getMembershipCreditUsage: () => request<BackendCreditTransaction[]>('/membership/me/credits/usage'),
  getMembershipTransactions: () => request<BackendTransaction[]>('/membership/me/transactions'),
  downloadTransactionReceipt: async (transactionId: string) => {
    const token = authService.getAuthState().session?.token; const response = await apiFetch(`${API_BASE_URL}/membership/me/transactions/${encodeURIComponent(transactionId)}/receipt`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error(await response.text() || 'Receipt is unavailable.'); const blobUrl = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = blobUrl; link.download = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || 'receipt.pdf'; link.click(); URL.revokeObjectURL(blobUrl);
  },
  consumeMembershipCredits: (operationKey: string, targetEntity?: string) => request<BackendCreditTransaction>('/membership/me/credits/consume', { method: 'POST', body: JSON.stringify({ operationKey, targetEntity }) }),
  topUpMembershipCredits: (packageId: string, paymentMethod: string) => request<{ transaction?: BackendCreditTransaction; balance?: BackendCreditSummary; paymentUrl?: string; paymentId?: string; status?: string }>('/membership/me/credits/top-up', { method: 'POST', body: JSON.stringify({ packageId, paymentMethod }) }),
  verifyMembershipPayment: (paymentId: string) => request<{ status: 'PAID' | 'FAILED' | 'PENDING'; paymentId: string; productType: string }>(`/membership/me/payments/${encodeURIComponent(paymentId)}/verify`, { method: 'POST' }),
  getAdminCreditAnalytics: () =>request<{ summary: AdminAIAnalyticsSummary; transactions: BackendCreditTransaction[] }>('/membership/admin/credits/analytics'),
  getProjects: () => request<BackendProject[]>('/projects'),
  getPools: () => request<BackendPool[]>('/pools'),
  getFundingRequests: (projectId: string) => request<BackendFundingRequest[]>(`/funding/requests/${encodeURIComponent(projectId)}`),
  getDistributions: () => request<BackendDistribution[]>('/distributions'),
  analyzeProjectFeasibility: (projectId: string) => request<BackendFeasibilityAssessment>(`/ai/projects/${encodeURIComponent(projectId)}/feasibility/analyze`, { method: 'POST' }),
  getLatestProjectFeasibility: (projectId: string) => request<BackendFeasibilityAssessment | null>(`/ai/projects/${encodeURIComponent(projectId)}/feasibility/latest`),
  reviewProjectFeasibility: (projectId: string, runId: string, input: { reviewStage: string; decision: string; comment: string; supportingEvidence?: string[] }) => request<BackendFeasibilityAssessment & { reviewStatus?: string; roleResponsibility?: string[]; aiRecommendationIsNotApproval?: boolean }>(`/ai/projects/${encodeURIComponent(projectId)}/feasibility/${encodeURIComponent(runId)}/review`, { method: 'POST', body: JSON.stringify(input) }),
  runProjectDueDiligence: (projectId: string) => request<BackendDueDiligenceScan>('/ai/projects/due-diligence/scan', { method: 'POST', body: JSON.stringify({ projectId }) }),
  getLatestProjectDueDiligence: (projectId: string) => request<BackendDueDiligenceScan | null>(`/ai/projects/${encodeURIComponent(projectId)}/due-diligence/latest`),
  analyzeProjectDocument: (projectId: string, documentId: string) => request<BackendDocumentAnalysis>(`/ai/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}/analyze`, { method: 'POST' }),
  getProjectLifecycle: (projectId: string) => request<BackendProjectLifecycle>(`/projects/${encodeURIComponent(projectId)}/lifecycle`),
  /** Corrects a draft project's details (refused once it is submitted for review). */
  updateProjectDetails: (projectId: string, input: { projectName?: string; description?: string; sector?: string; sponsorEntityType?: string; proposedShariahContract?: string; totalProjectCost?: number; fundingRequired?: number; expectedYieldPct?: number; tenureMonths?: number; location?: string }) => request<BackendProject>(`/projects/${encodeURIComponent(projectId)}`, { method: 'PATCH', body: JSON.stringify(input) }),
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
    const response = await apiFetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/promotions/${encodeURIComponent(campaignId)}/receipt`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error(await response.text() || 'Promotion receipt is unavailable.');
    const blobUrl = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = blobUrl; link.download = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || 'promotion-receipt.pdf'; link.click(); URL.revokeObjectURL(blobUrl);
  },
  uploadProjectDocument: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<BackendProjectDocument>(`/projects/${encodeURIComponent(projectId)}/documents`, { method: 'POST', body: formData });
  },
  downloadProjectDocument: async (projectId: string, documentId: string) => {
    const token = authService.getAuthState().session?.token;
    const response = await apiFetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}/download`, {
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
  updateMyProfile: (input: { phone?: string; pushToken?: string; avatarUrl?: string; timezone?: string; bio?: string; preferences?: ProfilePreferences }) => request<BackendUser>('/users/me/profile', { method: 'PATCH', body: JSON.stringify(input) }),
  getPrivacyConsent: () => request<{ currentVersion: string; accepted: boolean; acceptedAt: string | null }>('/users/me/privacy-consent'),
  acceptPrivacyNotice: (version: string) => request<{ currentVersion: string; accepted: boolean; acceptedAt: string | null }>('/users/me/privacy-consent', { method: 'POST', body: JSON.stringify({ version }) }),
  getMyPayoutAccounts: () => request<PayoutAccount[]>('/users/me/payout-accounts'),
  addMyPayoutAccount: (input: NewPayoutAccount) => request<PayoutAccount>('/users/me/payout-accounts', { method: 'POST', body: JSON.stringify(input) }),
  setDefaultPayoutAccount: (id: string) => request<PayoutAccount[]>(`/users/me/payout-accounts/${encodeURIComponent(id)}/default`, { method: 'PATCH' }),
  removeMyPayoutAccount: (id: string) => request<PayoutAccount[]>(`/users/me/payout-accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
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
  /** The signed-in user's own PDP applications, newest first. */
  getMyPdpApplications: async () => (await request<BackendPdpApplication[]>('/pdp/applications/mine')).map(mapPdpApplication),
  /** KYB reviewers: applications from their country (every country for the Super Admin). */
  getPdpReviewQueue: async (status = 'SUBMITTED') => (await request<BackendPdpApplication[]>(`/pdp/applications?status=${encodeURIComponent(status)}`)).map(mapPdpApplication),
  reviewPdpApplication: async (id: string, decision: PdpKybDecision, justification: string) => mapPdpApplication(await request<BackendPdpApplication>(`/pdp/applications/${encodeURIComponent(id)}/kyb-review`, { method: 'POST', body: JSON.stringify({ decision, justification }) })),
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
  getRoleAvailability: () => request<RoleAvailabilityEntry[]>('/roles/availability'),
  updateRoleAvailability: (role: string, enabled: boolean) => request<RoleAvailabilityEntry>(`/admin/roles/${encodeURIComponent(role)}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
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
    const response = await apiFetch(`${API_BASE_URL}/ai/citations/export${citationQuery(filter)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
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
  createAgreementDraft: (input: { contractType: string; projectName: string; jurisdiction: string; projectId?: string; engagementId?: string; wizardData: Record<string, unknown> }) => request<BackendAgreementDraft>('/contract-intelligence/agreements/drafts', { method: 'POST', body: JSON.stringify(input) }),
  listAgreements: () => request<AgreementSummary[]>('/contract-intelligence/agreements'),
  getAgreement: (id: string) => request<AgreementDetail>(`/contract-intelligence/agreements/${encodeURIComponent(id)}`),
  /** A party to a partnership agreement agrees to the latest draft, or signs with their typed full name. */
  agreementPartyAction: (id: string, input: { action: AgreementPartyAction; signatureName?: string }) => request<AgreementDetail>(`/contract-intelligence/agreements/${encodeURIComponent(id)}/party-action`, { method: 'POST', body: JSON.stringify(input) }),
  reviewAgreement: (id: string, input: { reviewStatus: AgreementAction; note?: string }) => request(`/contract-intelligence/agreements/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify(input) }),
  downloadAgreement: async (id: string, format: 'docx' | 'pdf') => { const token = authService.getAuthState().session?.token; const response = await apiFetch(`${API_BASE_URL}/contract-intelligence/agreements/${encodeURIComponent(id)}/download/${format}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); if (!response.ok) throw new Error(await response.text() || 'Agreement download failed.'); const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || `agreement.${format}`; link.click(); URL.revokeObjectURL(url); },
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
  // Asset registration: owners register and submit; Country Admins and Legal Officers verify.
  getAssets: (status?: AssetStatusCode) => request<RegisteredAsset[]>(`/assets${status ? `?status=${status}` : ''}`),
  getAsset: (id: string) => request<RegisteredAsset>(`/assets/${encodeURIComponent(id)}`),
  createAsset: (input: AssetInput) => request<RegisteredAsset>('/assets', { method: 'POST', body: JSON.stringify(input) }),
  updateAsset: (id: string, input: AssetInput) => request<RegisteredAsset>(`/assets/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  uploadAssetDocument: (id: string, documentType: AssetDocumentType, file: File | Blob, location?: { latitude: number; longitude: number; accuracyMetres?: number }) => {
    const body = new FormData();
    body.append('file', file, file instanceof File ? file.name : 'site-photo.jpg');
    if (location) {
      body.append('latitude', String(location.latitude));
      body.append('longitude', String(location.longitude));
      if (location.accuracyMetres !== undefined) body.append('accuracyMetres', String(Math.round(location.accuracyMetres)));
    }
    return request<RegisteredAsset>(`/assets/${encodeURIComponent(id)}/documents/${documentType}`, { method: 'POST', body });
  },
  removeAssetDocument: (id: string, documentId: string) => request<RegisteredAsset>(`/assets/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' }),
  downloadAssetDocument: (id: string, documentId: string) => openAuthenticatedFile(`/assets/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/download`),
  getAssetStructuring: (id: string) => request<AssetStructuringGuidance>(`/assets/${encodeURIComponent(id)}/structuring`),
  /** AI suggestion while offering an asset to a project need: akad, indicative terms, points to watch. */
  /** AI explanation of the scored comparison of offers; offers are named Offer A, B… in the answer. */
  explainOfferComparison: (needId: string) => request<BackendAiRun & { labels: Record<string, string> }>(`/ai/asset-partnerships/needs/${encodeURIComponent(needId)}/compare-explain`, { method: 'POST' }),
  askOfferAdvisor: (needId: string, assetId: string) => request<BackendAiRun>(`/ai/asset-partnerships/needs/${encodeURIComponent(needId)}/advise`, { method: 'POST', body: JSON.stringify({ assetId }) }),
  askAssetAdvisor: (id: string, question?: string) => request<BackendAiRun>(`/ai/assets/${encodeURIComponent(id)}/advise`, { method: 'POST', body: JSON.stringify({ question }) }),
  submitAsset: (id: string) => request<RegisteredAsset>(`/assets/${encodeURIComponent(id)}/submit`, { method: 'POST', body: JSON.stringify({ ownership: true, halalUse: true, accuracy: true }) }),
  rerunAssetChecks: (id: string) => request<RegisteredAsset>(`/assets/${encodeURIComponent(id)}/checks/run`, { method: 'POST' }),
  setAssetListing: (assetId: string, input: AssetListingInput) => request<{ id: string; offeredToPdp: boolean; offerTerms: AssetOfferTerms | null }>(`/asset-partnerships/assets/${encodeURIComponent(assetId)}/listing`, { method: 'PUT', body: JSON.stringify(input) }),
  getListedAssets: (assetType?: AssetTypeCode) => request<ListedAsset[]>(`/asset-partnerships/listed-assets${assetType ? `?type=${assetType}` : ''}`),
  getAssetNeeds: () => request<ProjectAssetNeed[]>('/asset-partnerships/needs'),
  createAssetNeed: (input: AssetNeedInput) => request<ProjectAssetNeed>('/asset-partnerships/needs', { method: 'POST', body: JSON.stringify(input) }),
  setAssetNeedStatus: (id: string, status: 'OPEN' | 'CLOSED') => request<ProjectAssetNeed>(`/asset-partnerships/needs/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getAssetEngagements: () => request<AssetEngagement[]>('/asset-partnerships/engagements'),
  getNeedOffers: (needId: string) => request<OfferComparison>(`/asset-partnerships/needs/${encodeURIComponent(needId)}/offers`),
  createAssetEngagement: (input: EngagementInput) => request<AssetEngagement>('/asset-partnerships/engagements', { method: 'POST', body: JSON.stringify(input) }),
  respondAssetEngagement: (id: string, input: { action: 'ACCEPT' | 'DECLINE' | 'COUNTER'; akad?: PartnershipAkad; terms?: EngagementTerms; startDate?: string; endDate?: string; note?: string; termsHash?: string; confirmed?: boolean }) => request<AssetEngagement>(`/asset-partnerships/engagements/${encodeURIComponent(id)}/respond`, { method: 'POST', body: JSON.stringify(input) }),
  getEngagementRecord: (id: string) => request<EngagementRecord>(`/asset-partnerships/engagements/${encodeURIComponent(id)}/record`),
  downloadEngagementRecord: (id: string) => openAuthenticatedFile(`/asset-partnerships/engagements/${encodeURIComponent(id)}/record.pdf`),
  markEngagementSeen: (id: string) => request<{ recorded: boolean }>(`/asset-partnerships/engagements/${encodeURIComponent(id)}/seen`, { method: 'POST' }),
  withdrawAssetEngagement: (id: string, note?: string) => request<AssetEngagement>(`/asset-partnerships/engagements/${encodeURIComponent(id)}/withdraw`, { method: 'POST', body: JSON.stringify({ note }) }),
  getPartnershipChecks: (id: string) => request<{ engagementId: string; checks: PartnershipReviewCheck[]; generatedAt: string }>(`/asset-partnerships/engagements/${encodeURIComponent(id)}/checks`),
  askPartnershipReviewAssistant: (id: string, track: 'LEGAL' | 'SHARIAH') => request<BackendAiRun & { track: string; failing: number }>(`/ai/asset-partnerships/engagements/${encodeURIComponent(id)}/review-assist`, { method: 'POST', body: JSON.stringify({ track }) }),
  reviewAssetEngagement: (id: string, input: { decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'; note: string; track?: 'LEGAL' | 'SHARIAH'; aiRunId?: string; overrideReason?: string }) => request<AssetEngagement>(`/asset-partnerships/engagements/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify(input) }),
  withdrawAsset: (id: string) => request<RegisteredAsset>(`/assets/${encodeURIComponent(id)}/withdraw`, { method: 'POST' }),
  reviewAsset: (id: string, decision: 'VERIFIED' | 'CHANGES_REQUESTED' | 'REJECTED', note: string) => request<RegisteredAsset>(`/assets/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify({ decision, note }) }),
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
    const response = await apiFetch(`${API_BASE_URL}/kyc/applications/${encodeURIComponent(applicationId)}/liveness/frames/${encodeURIComponent(frameId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error(await response.text() || 'Frame is unavailable.');
    return URL.createObjectURL(await response.blob());
  },
};

/** Fetches a protected file with the bearer token and opens it in a new tab. */
async function openAuthenticatedFile(path: string) {
  const token = authService.getAuthState().session?.token;
  const response = await apiFetch(`${API_BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
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

/** One compared field of an automated check; INFO rows explain without raising an issue. */
export type AssetTypeCode = 'LAND' | 'BUILDING' | 'MACHINERY' | 'VEHICLE' | 'EQUIPMENT' | 'OTHER';
export type AssetStatusCode = 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'VERIFIED' | 'REJECTED' | 'WITHDRAWN';
export type AssetIntendedUse = 'IJARAH' | 'MUSHARAKAH' | 'MURABAHAH' | 'UNDECIDED';
export type AssetDocumentType = 'OWNERSHIP' | 'OFFICIAL_SEARCH' | 'QUIT_RENT' | 'SERIAL_PLATE' | 'DOSH_CERTIFICATE' | 'INSPECTION' | 'ROAD_TAX' | 'ASSESSMENT' | 'COMPLETION_CERT' | 'TENANCY' | 'VALUATION' | 'INSURANCE' | 'SITE_PHOTO' | 'PHOTO' | 'OTHER';

/** What a land title says (Malaysia). */
export interface LandDetailsInput {
  titleType?: 'GRN' | 'GM' | 'PN' | 'PM' | 'HSD' | 'HSM';
  titleNumber?: string;
  lotNumber?: string;
  mukim?: string;
  district?: string;
  state?: string;
  areaValue?: number;
  areaUnit?: 'HECTARE' | 'ACRE' | 'SQ_METRE' | 'SQ_FEET';
  landUseCategory?: 'AGRICULTURE' | 'BUILDING' | 'INDUSTRY' | 'OTHER';
  tenure?: 'FREEHOLD' | 'LEASEHOLD';
  leaseExpiry?: string;
  ownershipShare?: string;
  malayReserve?: boolean;
  restrictions?: string;
}

/** A heavy vehicle, as on its JPJ ownership certificate (VOC). */
export interface VehicleDetailsInput {
  registrationNumber?: string;
  chassisNumber?: string;
  engineNumber?: string;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  category?: 'LORRY' | 'PRIME_MOVER' | 'TRAILER' | 'TANKER' | 'BUS' | 'OTHER';
  roadTaxExpiry?: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
  permitNumber?: string;
  hirePurchase?: boolean;
}

/** Machinery or equipment, as on its purchase invoice and serial plate. */
export interface MachineDetailsInput {
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  yearOfManufacture?: number;
  purchaseDate?: string;
  operatingHours?: number;
  requiresDoshCertificate?: boolean;
  doshCertificateNumber?: string;
  doshCertificateExpiry?: string;
  hirePurchase?: boolean;
}

/** A building on its own title, a strata parcel, or a parcel under a master title. */
export interface BuildingDetailsInput {
  titleKind?: 'INDIVIDUAL' | 'STRATA' | 'MASTER_TITLE';
  titleNumber?: string;
  lotNumber?: string;
  mukim?: string;
  district?: string;
  state?: string;
  strataTitleNumber?: string;
  parcelNumber?: string;
  storey?: string;
  buildingName?: string;
  buildingUse?: 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'MIXED';
  floorArea?: number;
  floorAreaUnit?: 'SQ_METRE' | 'SQ_FEET';
  yearCompleted?: number;
  completionCertificateNumber?: string;
  hasTenants?: boolean;
  tenantActivity?: string;
}

/** Whatever details were saved for the asset's type. */
export type AssetDetailsInput = LandDetailsInput & VehicleDetailsInput & MachineDetailsInput & Omit<BuildingDetailsInput, keyof LandDetailsInput>;

export interface AssetInput {
  assetType: AssetTypeCode;
  name: string;
  description?: string;
  location?: string;
  titleReference?: string;
  estimatedValue: number;
  currency: string;
  valuationDate?: string;
  valuerName?: string;
  isEncumbered?: boolean;
  encumbranceNote?: string;
  intendedUse?: AssetIntendedUse;
  latitude?: number;
  longitude?: number;
  land?: LandDetailsInput;
  vehicle?: VehicleDetailsInput;
  machine?: MachineDetailsInput;
  building?: BuildingDetailsInput;
}

export type PartnershipAkad = 'IJARAH' | 'MUSHARAKAH';
export type PreferredAkad = PartnershipAkad | 'EITHER';

/** What an owner is open to when offering an asset to delivery partners. */
export interface AssetOfferTerms {
  preferredAkad: PreferredAkad;
  availableFrom: string | null;
  availableUntil: string | null;
  indicativeTerms: string;
  note: string;
}
export interface AssetListingInput extends Partial<Omit<AssetOfferTerms, 'availableFrom' | 'availableUntil'>> {
  offered: boolean;
  availableFrom?: string;
  availableUntil?: string;
}

/** A verified asset offered to delivery partners, without identifiers or the owner's name. */
export interface ListedAsset {
  id: string;
  assetType: AssetTypeCode;
  name: string;
  region: string;
  details: Partial<AssetDetailsInput>;
  intendedUse: AssetIntendedUse;
  isEncumbered: boolean;
  offerTerms: AssetOfferTerms | null;
  committed: { startDate: string; endDate: string }[];
}

export interface AssetNeedInput {
  projectId: string;
  assetType: AssetTypeCode;
  title: string;
  description?: string;
  quantity: number;
  startDate?: string;
  endDate?: string;
  location?: string;
  preferredAkad?: PreferredAkad;
}

export interface ProjectAssetNeed extends Omit<AssetNeedInput, 'startDate' | 'endDate'> {
  id: string;
  organisationId: string;
  countryNodeId: string;
  startDate: string | null;
  endDate: string | null;
  status: 'OPEN' | 'FILLED' | 'CLOSED';
  createdAt: string;
  project: { projectCode: string; projectName: string; sector: string; status: string; organisationName: string };
  approvedCount: number;
  offerCount?: number;
  myEngagementIds?: string[];
}

/** Ijarah: rent (ujrah), monthly or for the whole period, and who keeps the asset running day to day. Musharakah: the asset's agreed value and the owner's profit share. */
export interface EngagementTerms {
  rentAmount?: number;
  rentFrequency?: 'MONTHLY' | 'WHOLE_PERIOD';
  upkeepBy?: 'OWNER' | 'LESSEE';
  contributionValue?: number;
  profitSharePct?: number;
  /** Musharakah: the delivery partner's capital contribution. */
  pdpContributionValue?: number;
  currency?: string;
}

export interface EngagementInput {
  assetId: string;
  needId?: string;
  projectId?: string;
  akad: PartnershipAkad;
  terms: EngagementTerms;
  startDate: string;
  endDate: string;
  message?: string;
}

export type EngagementStatus = 'PROPOSED' | 'ACCEPTED' | 'APPROVED' | 'DECLINED' | 'WITHDRAWN' | 'REJECTED';

export interface EngagementHistoryEntry {
  at: string;
  by: string;
  byName: string;
  party: 'OWNER' | 'PDP' | 'REVIEW';
  action: string;
  note?: string;
  akad?: PartnershipAkad;
  terms?: EngagementTerms;
  startDate?: string;
  endDate?: string;
  /** Review decisions: the platform checks that failed or warned when the reviewer decided. */
  checks?: { fail: string[]; warn: string[] };
  /** ACCEPTED: what the party confirmed, and the fingerprint of the terms accepted. */
  statement?: string;
  acceptedTermsHash?: string;
  /** Review decisions drafted with the AI review assistant, and the asset's documents (SHA-256) at the time. */
  aiAssisted?: { runId: string };
  documents?: Array<{ type: string; fileName: string; sha256: string }>;
  /** An approval given despite failed checks, an AI suggestion against it, or a note reading as a refusal, and why. */
  override?: { grounds: string[]; reason: string };
}

/** The history checked against the audit log, and when each party saw the other side's changes. */
export interface EngagementRecord {
  engagementId: string;
  entries: Array<EngagementHistoryEntry & { hash: string; verification: 'VERIFIED' | 'LEGACY' | 'MISMATCH' }>;
  views: Array<{ at: string; byName: string; party: 'OWNER' | 'PDP' | null; entryIndex: number | null }>;
  fingerprint: string;
}

/** One of the platform's pre-approval checks on an accepted partnership. */
export interface PartnershipReviewCheck { key: string; track: 'LEGAL' | 'SHARIAH' | 'BOTH'; label: string; status: 'PASS' | 'WARN' | 'FAIL' | 'INFO'; detail: string }

/** Every offer for one need, with figures that make them comparable. */
export interface OfferComparison {
  need: { id: string; title: string; assetType: AssetTypeCode; quantity: number; status: string; startDate: string | null; endDate: string | null; location: string; preferredAkad: PreferredAkad };
  held: number;
  /** Fixed weights of the score, out of 100. */
  weights: Record<OfferScorePart, number>;
  /** Assets of this type still being verified in the country; they cannot be offered yet. */
  awaitingVerification: number;
  offers: Array<AssetEngagement & { metrics: { months: number; monthlyRent: number | null; totalRent: number | null; coveragePct: number | null }; documentIssues: number; demand: 'LOW' | 'MEDIUM' | 'HIGH'; live: boolean; score: { total: number; parts: Record<OfferScorePart, number> } | null }>;
}

export type OfferScorePart = 'rent' | 'coverage' | 'documents' | 'encumbrance' | 'availability';

export interface AssetEngagement {
  id: string;
  direction: 'OFFER' | 'REQUEST';
  status: EngagementStatus;
  awaiting: 'OWNER' | 'PDP' | 'REVIEW' | 'NONE';
  myParty: 'OWNER' | 'PDP' | null;
  canRespond: boolean;
  canWithdraw: boolean;
  canReview: boolean;
  akad: PartnershipAkad;
  terms: EngagementTerms;
  /** Fingerprint of the terms on the table; sent back on Accept so a party accepts exactly what it saw. */
  termsHash: string;
  startDate: string;
  endDate: string;
  asset: { id: string; assetType: AssetTypeCode; name: string; region: string; details: Partial<AssetDetailsInput> | null; isEncumbered: boolean; location?: string; titleReference?: string | null; estimatedValue?: number; currency?: string; encumbranceNote?: string | null };
  ownerOrganisationName: string | null;
  project: { projectId: string; projectCode: string; projectName: string; sector: string; status: string; organisationName: string };
  need: { id: string; title: string; quantity: number } | null;
  legalApprovedAt: string | null;
  shariahApprovedAt: string | null;
  /** The one agreement drafted for this partnership, once either side drafts it. */
  agreement?: { id: string; contractNumber: string; status: AgreementStatus } | null;
  history: EngagementHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Which Islamic contracts suit an asset, from the platform's Shariah structuring rules. */
export interface AssetStructuringGuidance {
  options: { contract: 'IJARAH' | 'MUSHARAKAH' | 'MURABAHAH'; fit: 'RECOMMENDED' | 'POSSIBLE' | 'NOT_SUITABLE'; reasons: string[]; ownerDuties: string[]; needs: string[] }[];
  concerns: string[];
  basis: string;
}

export interface RegisteredAssetDocument {
  id: string;
  documentType: AssetDocumentType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  integrity?: { flags?: { code: string; message: string }[] } | null;
  /** Site photos: where the phone was when the photo was taken. */
  metadata?: { latitude?: number; longitude?: number; accuracyMetres?: number | null; capturedAt?: string } | null;
  createdAt: string;
}

/** An asset registered on the server (unlike the sample AssetItem used by older screens). */
export interface RegisteredAsset extends Omit<AssetInput, 'description' | 'location' | 'titleReference' | 'valuerName' | 'encumbranceNote' | 'valuationDate' | 'latitude' | 'longitude' | 'land' | 'vehicle' | 'machine' | 'building'> {
  latitude: number | null;
  longitude: number | null;
  /** Type-specific details: the land title, vehicle, machine or building details. */
  details: AssetDetailsInput | null;
  /** Automated document checks, run when the asset is submitted. */
  checkFindings: KycCheckFinding[] | null;
  checkedAt: string | null;
  /** Reviewers only: other owners' registrations of the same asset. */
  duplicates?: { id: string; status: AssetStatusCode; organisationName: string }[];
  id: string;
  organisationId: string;
  organisationName?: string;
  countryNodeId: string;
  ownerUserId: string;
  description: string;
  location: string;
  titleReference: string | null;
  valuationDate: string | null;
  valuerName: string | null;
  encumbranceNote: string | null;
  status: AssetStatusCode;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  documents: RegisteredAssetDocument[];
  /** Offered to delivery partners (PDPs) in the same country. */
  offeredToPdp?: boolean;
  offerTerms?: AssetOfferTerms | null;
}

export interface KycCheckFinding {
  source: string;
  field: string;
  result: 'MATCH' | 'MISMATCH' | 'NOT_FOUND' | 'INFO';
  entered?: string;
  found?: string;
  note?: string;
}

export interface KycCheckResult {
  id: string;
  round: number;
  checkType: string;
  provider: string;
  providerVersion: string;
  status: KycCheckStatus;
  score: number | null;
  reasons: string[];
  findings?: KycCheckFinding[] | null;
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

/** A platform-wide role switch. Locked roles (Super Admin, Guest) cannot be disabled. */
export interface RoleAvailabilityEntry {
  role: string;
  enabled: boolean;
  locked: boolean;
  /** Why a locked role cannot be switched (static demo: no recorded screens). */
  note?: string;
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

/** Saved in the user's profile on the server. Unset notification channels count as on. */
export interface ProfilePreferences {
  currency?: string;
  preferredContracts?: string[];
  notifications?: { email?: boolean; push?: boolean; sms?: boolean };
}

/** A bank account for receiving money. The full number is encrypted on the server; only the masked form comes back. */
export interface PayoutAccount {
  id: string;
  provider: string;
  destinationType: 'BANK_ACCOUNT' | 'DUITNOW_PROXY';
  maskedReference: string | null;
  accountHolder: string | null;
  currency: string | null;
  isDefault: boolean;
  status: 'PENDING_VERIFICATION' | 'VERIFIED';
  verifiedAt: string | null;
  createdAt: string;
}

export interface NewPayoutAccount {
  provider: string;
  destinationType: 'BANK_ACCOUNT' | 'DUITNOW_PROXY';
  reference: string;
  accountHolder?: string;
  currency?: string;
  isDefault?: boolean;
}

export interface BackendUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  profile?: Record<string, unknown>;
  /** INDIVIDUAL, INSTITUTION, BANK, GOVERNMENT_AGENCY, REGULATOR or PLATFORM_STAFF. */
  userType?: string;
  /** The country the account was registered in; it never changes. */
  homeCountryNodeId?: string | null;
  assignedRoles: { role: string; organisationId: string; organisationName?: string; countryNodeId: string }[];
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

export interface BackendPool {
  poolId: string;
  poolName: string;
  currency: string;
  investmentStructure: string;
  indicativeExpectedReturn: number | string;
  status: string;
  projectId: string;
}

export interface BackendFundingRequest {
  fundingRequestId: string;
  projectId: string;
  poolId?: string | null;
  requestedAmount: number | string;
  currency: string;
  purpose: string;
  status: string;
  requestedAt: string;
  disbursedAt?: string | null;
}

export interface BackendDistribution {
  id: string;
  projectId: string;
  poolId?: string | null;
  totalAmount: number | string;
  investorProfit?: number | string | null;
  currency: string;
  status: string;
  periodName: string;
  createdAt: string;
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
  expectedYieldPct?: number | string | null;
  tenureMonths?: number | null;
  location?: string | null;
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
  expectedYieldPct?: number;
  tenureMonths?: number;
  location?: string;
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

export type PdpKybDecision = 'APPROVED' | 'REJECTED' | 'REQUEST_INFO';

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
  reviewNote?: string | null;
  reviewedAt?: string;
  history?: PDPApplication['reviewHistory'];
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
    reviewNote: application.reviewNote ?? undefined,
    reviewedAt: application.reviewedAt,
    reviewHistory: application.history ?? [],
  };
}

export type AgreementStatus = 'DRAFT' | 'LEGAL_REVIEW' | 'SHARIAH_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'EXECUTION';
export type AgreementAction = 'LEGAL_REVIEW' | 'SHARIAH_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'EXECUTION';
export interface AgreementAvailableAction { action: AgreementAction; label: string }
export type AgreementPartyAction = 'CONSENT' | 'SIGN';
export interface AgreementPartyRow { id?: string; role: 'OWNER' | 'PDP' | null; organisationId: string | null; displayName: string; consentedVersion: number | null; consentedAt?: string | null; signedAt: string | null; signatureName?: string | null }

export interface AgreementSummary {
  id: string;
  contractNumber: string;
  title: string | null;
  contractType: string;
  status: AgreementStatus;
  createdBy: string;
  organisationId: string;
  countryNodeId: string;
  createdAt: string;
  updatedAt: string;
  complianceStatus: string | null;
  availableActions: AgreementAvailableAction[];
  /** Partnership agreements: what the viewer's side can do (agree to the latest version, sign). */
  partyActions?: Array<{ action: AgreementPartyAction; label: string }>;
  engagementId?: string | null;
  latestVersion?: number;
  parties?: AgreementPartyRow[];
}

export interface AgreementDetail extends Omit<AgreementSummary, 'complianceStatus'> {
  complianceReport: { status?: string; checks?: Array<{ key: string; label: string; pass: boolean; severity: string }> } | null;
  versions: Array<{ id: string; version: number; content: { sections?: Array<{ number: string; title: string; paragraphs: string[] }>; approvedClauseIds?: string[]; shariahRuleIds?: string[] } }>;
  events: Array<{ id: string; eventType: string; fromStatus: string | null; toStatus: string | null; actorId: string; createdAt: string; metadata: { note?: string | null; role?: string } | null }>;
}
