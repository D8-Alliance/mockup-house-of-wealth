import { AuthState, AuthSession, AuthUser, LoginCredentials, RegisterCredentials } from '../types/authTypes';
import { UserRole } from '../../rbac/types';

const issuer = import.meta.env.VITE_OIDC_ISSUER as string | undefined;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined;
const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI as string | undefined;
const storageKey = 'how-oidc-session';
const transactionKey = 'how-oidc-pkce';

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

export class OidcAuthProvider {
  private session: AuthSession | null = this.readSession();

  getAuthState(): AuthState {
    if (!this.session) return { isAuthenticated: false, session: null, mode: 'PRODUCTION', status: 'unauthenticated' };
    if (Date.parse(this.session.expiresAt) <= Date.now()) {
      this.session = null;
      sessionStorage.removeItem(storageKey);
      return { isAuthenticated: false, session: null, mode: 'PRODUCTION', status: 'sessionExpired' };
    }
    return { isAuthenticated: true, session: this.session, mode: 'PRODUCTION', status: 'authenticated' };
  }

  async initialize(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code && !state) return;
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
    const tokens = await response.json() as { access_token?: string; expires_in?: number; id_token?: string };
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
      sessionId: crypto.randomUUID(),
      user,
      token: tokens.access_token,
      isDemoSession: false,
      mfaVerified: true,
      expiresAt: new Date(Date.now() + (tokens.expires_in || 300) * 1000).toISOString(),
    };
    sessionStorage.setItem(storageKey, JSON.stringify(this.session));
    sessionStorage.removeItem(transactionKey);
    window.history.replaceState({}, document.title, window.location.pathname);
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
    this.session = null;
    sessionStorage.removeItem(storageKey);
  }
  switchRole(_role: UserRole) { return false; }
  setMode(_mode: 'DEMO' | 'PRE_PRODUCTION' | 'PRODUCTION') {}
  enterAsGuest() {}

  private readSession(): AuthSession | null {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null') as AuthSession | null; } catch { return null; }
  }
}

export const oidcAuthProvider = new OidcAuthProvider();
