import { AuthState, AuthSession, AuthUser, LoginCredentials, RegisterCredentials } from '../types/authTypes';
import { UserRole } from '../../rbac/types';

const issuer = import.meta.env.VITE_OIDC_ISSUER as string | undefined;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined;
const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI as string | undefined;
const storageKey = 'how-oidc-session';
const transactionKey = 'how-oidc-pkce';
const refreshKey = 'how-oidc-refresh';

function encode(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Invalid OIDC token');
  // JWT segments are unpadded base64url. atob() rejects both the url-safe
  // alphabet and a wrong number of '=', so restore exact padding before
  // decoding, then read the bytes as UTF-8 so non-ASCII names survive.
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

function requiredConfig(): { issuer: string; clientId: string; redirectUri: string } {
  if (!issuer || !clientId || !redirectUri) {
    throw new Error('OIDC frontend configuration is incomplete');
  }
  return { issuer: issuer.replace(/\/$/, ''), clientId, redirectUri };
}

type TokenResponse = { access_token?: string; expires_in?: number; refresh_token?: string; refresh_expires_in?: number; id_token?: string };

export class OidcAuthProvider {
  private session: AuthSession | null = this.readSession();
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;

  getAuthState(): AuthState {
    if (!this.session) return { isAuthenticated: false, session: null, mode: 'PRODUCTION', status: 'unauthenticated' };
    if (Date.parse(this.session.expiresAt) <= Date.now()) {
      this.clearSession();
      return { isAuthenticated: false, session: null, mode: 'PRODUCTION', status: 'sessionExpired' };
    }
    return { isAuthenticated: true, session: this.session, mode: 'PRODUCTION', status: 'authenticated' };
  }

  async initialize(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code && !state) {
      // Page reload (e.g. back from ToyyibPay): renew the access token if it has
      // expired or is about to, then keep it fresh while the tab is open.
      if (this.readRefreshToken() && (!this.session || Date.parse(this.session.expiresAt) - Date.now() < 60_000)) {
        await this.refreshTokens();
      } else {
        this.scheduleRefresh();
      }
      return;
    }
    if (!code || !state) throw new Error('Incomplete OIDC callback');

    const transaction = sessionStorage.getItem(transactionKey);
    if (!transaction) throw new Error('OIDC login transaction is missing');
    const parsed = JSON.parse(transaction) as { state: string; verifier: string };
    if (parsed.state !== state) throw new Error('OIDC state mismatch');

    const config = requiredConfig();
    const response = await fetch(`${config.issuer}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code,
        redirect_uri: config.redirectUri,
        code_verifier: parsed.verifier,
      }),
    });
    if (!response.ok) throw new Error('OIDC token exchange failed');
    this.applyTokens(await response.json() as TokenResponse);
    sessionStorage.removeItem(transactionKey);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Keycloak access tokens are short-lived (5 minutes by default). Refresh shortly
  // before expiry so an open tab - or a tab returning from a ToyyibPay checkout -
  // stays signed in for as long as the Keycloak SSO session is alive.
  private async refreshTokens(): Promise<boolean> {
    const stored = this.readRefreshToken();
    if (!stored) return false;
    const config = requiredConfig();
    try {
      const response = await fetch(`${config.issuer}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', client_id: config.clientId, refresh_token: stored.token }),
      });
      if (!response.ok) throw new Error('OIDC token refresh failed');
      this.applyTokens(await response.json() as TokenResponse);
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (!this.session || !this.readRefreshToken()) return;
    const delay = Math.max(5_000, Date.parse(this.session.expiresAt) - Date.now() - 60_000);
    this.refreshTimer = setTimeout(() => { void this.refreshTokens(); }, delay);
  }

  private applyTokens(tokens: TokenResponse): void {
    if (!tokens.access_token) throw new Error('OIDC response did not contain an access token');

    // Tenant mappers are configured on the access token used by the API.
    const claims = decodeJwt(tokens.access_token);
    const role = (claims.role as UserRole) || 'Guest';
    const user: AuthUser = {
      userId: String(claims.sub || ''),
      name: String(claims.name || claims.preferred_username || ''),
      email: String(claims.email || ''),
      organisationId: String(claims.organisation_id || ''),
      organisationName: '',
      countryNodeId: String(claims.country_node_id || ''),
      countryName: '',
      assignedRoles: [role],
      activeRole: role,
      status: 'ACTIVE',
      mfaStatus: 'Enabled',
    };
    this.session = {
      sessionId: this.session?.sessionId || crypto.randomUUID(),
      user,
      token: tokens.access_token,
      isDemoSession: false,
      mfaVerified: true,
      expiresAt: new Date(Date.now() + (tokens.expires_in || 300) * 1000).toISOString(),
    };
    sessionStorage.setItem(storageKey, JSON.stringify(this.session));
    if (tokens.refresh_token) {
      // refresh_expires_in 0 means an offline token with no fixed expiry.
      const refreshExpiresAt = tokens.refresh_expires_in ? Date.now() + tokens.refresh_expires_in * 1000 : Number.MAX_SAFE_INTEGER;
      sessionStorage.setItem(refreshKey, JSON.stringify({ token: tokens.refresh_token, expiresAt: refreshExpiresAt }));
    }
    this.scheduleRefresh();
  }

  private clearSession(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = undefined;
    this.session = null;
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem(refreshKey);
  }

  private readRefreshToken(): { token: string; expiresAt: number } | null {
    try {
      const stored = JSON.parse(sessionStorage.getItem(refreshKey) || 'null') as { token: string; expiresAt: number } | null;
      return stored && stored.expiresAt > Date.now() ? stored : null;
    } catch {
      return null;
    }
  }

  login(_credentials: LoginCredentials) {
    const config = requiredConfig();
    const verifier = encode(crypto.getRandomValues(new Uint8Array(32)));
    const state = encode(crypto.getRandomValues(new Uint8Array(16)));
    sessionStorage.setItem(transactionKey, JSON.stringify({ state, verifier }));
    void crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then((digest) => {
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: 'openid profile email',
        code_challenge: encode(new Uint8Array(digest)),
        code_challenge_method: 'S256',
        state,
      });
      window.location.assign(`${config.issuer}/protocol/openid-connect/auth?${params}`);
    });
    return { success: false, error: 'Redirecting to Keycloak...' };
  }

  completeMfa() { return { success: false, error: 'MFA is handled by Keycloak.' }; }
  register(_credentials: RegisterCredentials) { return { success: false, error: 'Registration is handled by Keycloak.' }; }
  logout() {
    const token = this.session?.token;
    if (token) {
      const apiBase = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:3001`;
      void fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    this.clearSession();
  }
  switchRole(_role: UserRole) { return false; }
  setMode(_mode: 'DEMO' | 'PRE_PRODUCTION' | 'PRODUCTION') {}
  enterAsGuest() {}

  private readSession(): AuthSession | null {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null') as AuthSession | null; } catch { return null; }
  }
}

export const oidcAuthProvider = new OidcAuthProvider();
