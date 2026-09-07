import { sessionManager } from '../auth/sessionManager';
import { PDPApplication } from '../pdp/pdpTypes';

const API_BASE_URL = `http://${window.location.hostname}:3001`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionManager.getAuthState().session?.token;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

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
};

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
