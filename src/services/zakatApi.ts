import { authService } from '../auth/services/authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:3001`;

export type ZakatCategory = 'SAVINGS' | 'INCOME' | 'INVESTMENT_INCOME' | 'INVESTMENT_CAPITAL' | 'BUSINESS';
export type YearBasis = 'HIJRI' | 'GREGORIAN';
export type PlatformInvestmentMethod = 'NONE' | 'MUSTAGHALLAT' | 'CAPITAL';

export interface ZakatAuthority {
  code: string;
  countryNodeId: string;
  region: string;
  name: string;
  website: string;
  isHomeCountry: boolean;
  nisabRates: Array<{ id: string; amount: string | number; currency: string; effectiveFrom: string; effectiveTo: string; source: string }>;
}

export interface ZakatLine { category: ZakatCategory; label: string; amount: number; haulMet?: boolean; source: 'USER' | 'PLATFORM'; included: boolean; note: string }

export interface ZakatCalculationResult {
  id: string;
  currency: string;
  asOfDate: string | null;
  yearBasis: YearBasis | null;
  authority: { code: string; name: string; website: string } | null;
  nisabThreshold: number;
  nisabSource: string | null;
  zakatRate: number;
  lines: ZakatLine[];
  debtsOwed: number;
  netWealth: number;
  zakatDue: number;
  meetsNisab: boolean;
  payment: { mode: 'AUTHORITY_PORTAL' | 'APPOINTED_COLLECTOR'; url: string | null };
  taxNote: string | null;
  disclaimer: string;
}

export interface CalculateZakatInput {
  authorityCode: string;
  asOfDate?: string;
  yearBasis: YearBasis;
  items: Array<{ category: ZakatCategory; label: string; amount: number; haulMet?: boolean }>;
  debts?: number;
  platformInvestments?: PlatformInvestmentMethod;
  nisabOverride?: number;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authService.getAuthState().session?.token;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const body = await response.json().catch(() => null) as ({ message?: string | string[] } & T) | null;
  if (!response.ok) throw new Error((Array.isArray(body?.message) ? body?.message.join(' ') : body?.message) || `Request failed (${response.status}).`);
  return body as T;
}

export const zakatApi = {
  getPreference: () => request<{ enabled: boolean }>('/zakat/preference'),
  setPreference: (enabled: boolean) => request<{ enabled: boolean }>('/zakat/preference', { method: 'PUT', body: JSON.stringify({ enabled }) }),
  getAuthorities: () => request<ZakatAuthority[]>('/zakat/authorities'),
  calculate: (input: CalculateZakatInput) => request<ZakatCalculationResult>('/zakat/calculations', { method: 'POST', body: JSON.stringify(input) }),
  latest: () => request<ZakatCalculationResult | null>('/zakat/calculations/latest'),
};
