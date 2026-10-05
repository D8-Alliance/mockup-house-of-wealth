import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * Firebase Cloud Messaging over the HTTP v1 API. Google retired the legacy
 * `fcm/send` API and its server keys, so v1 is the only working option: it is
 * authorised with a short-lived OAuth2 access token minted from a service
 * account key (a JWT signed with the account's private key).
 *
 * The service account JSON contains a private key: keep it out of Git and
 * point FCM_SERVICE_ACCOUNT_FILE (or GOOGLE_APPLICATION_CREDENTIALS) at it.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
// Refresh a little before Google's expiry so an in-flight send never uses an expired token.
const REFRESH_MARGIN_SECONDS = 60;

export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export function loadServiceAccount(path: string): ServiceAccount {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<ServiceAccount> & { type?: string };
  if (parsed.type && parsed.type !== 'service_account') throw new Error('FCM credential file is not a Google service account key.');
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) throw new Error('FCM service account file is missing project_id, client_email or private_key.');
  return { project_id: parsed.project_id, client_email: parsed.client_email, private_key: parsed.private_key, token_uri: parsed.token_uri };
}

const base64Url = (value: Buffer | string) => Buffer.from(value).toString('base64url');

/** Signed JWT assertion for the OAuth2 jwt-bearer grant (RS256). */
export function signAssertion(account: ServiceAccount, nowSeconds: number): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: account.token_uri || TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 }));
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(account.private_key);
  return `${header}.${claims}.${base64Url(signature)}`;
}

export class FcmClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly account: ServiceAccount,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly nowSeconds: () => number = () => Math.floor(Date.now() / 1000),
  ) {}

  private async accessToken(): Promise<string> {
    const now = this.nowSeconds();
    if (this.token && this.token.expiresAt - REFRESH_MARGIN_SECONDS > now) return this.token.value;
    const response = await this.fetchImpl(this.account.token_uri || TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signAssertion(this.account, now) }),
    });
    // Never echo the response body: on failure it can describe the credential.
    if (!response.ok) throw new Error(`Google OAuth token request returned ${response.status}`);
    const body = await response.json() as { access_token?: string; expires_in?: number };
    if (!body.access_token) throw new Error('Google OAuth token response had no access token.');
    this.token = { value: body.access_token, expiresAt: now + (body.expires_in ?? 3600) };
    return body.access_token;
  }

  async send(input: { token: string; title: string; body: string }): Promise<void> {
    const response = await this.fetchImpl(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(this.account.project_id)}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await this.accessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token: input.token, notification: { title: input.title, body: input.body } } }),
    });
    // 404 UNREGISTERED means the device token is stale; the caller's retry/dead-letter handling decides what to do.
    if (!response.ok) throw new Error(`Push provider returned ${response.status}`);
  }
}
