import { authService } from '../auth/services/authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:3001`;

export type AkadType = 'MUDARABAH' | 'MUSHARAKAH' | 'WAKALAH' | 'IJARAH';

export interface PoolAkadTerms {
  id: string;
  poolId: string;
  version: number;
  akadType: AkadType;
  investorProfitSharePct: string | number;
  termsText: string;
  termsHash: string;
  createdAt: string;
}

export interface AkadInvestmentOrder {
  id: string;
  orderNumber: string;
  status: string;
  amount: string | number;
  currency: string;
  akadTermsId: string;
  akadAcceptedAt: string;
}

export const AKAD_LABELS: Record<AkadType, string> = { MUDARABAH: 'Mudarabah', MUSHARAKAH: 'Musharakah', WAKALAH: 'Wakalah bil Istithmar', IJARAH: 'Ijarah' };
/** Mirrors the server rule (server/src/pools/akad-terms.ts): profit-sharing contracts need a share on both sides. */
export const AKAD_MAX_INVESTOR_PCT: Record<AkadType, number> = { MUDARABAH: 99, MUSHARAKAH: 99, WAKALAH: 100, IJARAH: 100 };

export class AkadApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authService.getAuthState().session?.token;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
  if (!response.ok) throw new AkadApiError((Array.isArray(body?.message) ? body?.message.join(' ') : body?.message) || `Request failed (${response.status}).`, response.status);
  return body as T;
}

const newIdempotencyKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const akadApi = {
  getTerms: (poolId: string) => request<{ current: PoolAkadTerms | null; versions: PoolAkadTerms[] }>(`/pools/${encodeURIComponent(poolId)}/akad-terms`),
  publishTerms: (poolId: string, input: { akadType: AkadType; investorProfitSharePct: number }) => request<PoolAkadTerms>(`/pools/${encodeURIComponent(poolId)}/akad-terms`, { method: 'PUT', body: JSON.stringify(input) }),
  /** Places a real order that accepts the given terms version (ijab and qabul); settlement staff confirm payment later. */
  createOrder: (input: { poolId: string; amount: number; currency: string; akadTermsId: string }) => request<AkadInvestmentOrder>('/investments/orders', { method: 'POST', body: JSON.stringify({ ...input, idempotencyKey: newIdempotencyKey(), acceptAkad: true }) }),
};
