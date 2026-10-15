import { createVerify, generateKeyPairSync } from 'node:crypto';
import { FcmClient, ServiceAccount, signAssertion } from './fcm-client';

// A throwaway key pair generated for the test; no real credential is involved.
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const account: ServiceAccount = { project_id: 'how-test', client_email: 'push@how-test.iam.gserviceaccount.com', private_key: privateKey };

describe('signAssertion', () => {
  it('produces an RS256 JWT for the FCM scope, signed with the service account key', () => {
    const [header, claims, signature] = signAssertion(account, 1_000).split('.');
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: 1_000, exp: 4_600 });
    expect(createVerify('RSA-SHA256').update(`${header}.${claims}`).verify(publicKey, Buffer.from(signature, 'base64url'))).toBe(true);
  });
});

describe('FcmClient', () => {
  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

  it('sends through the HTTP v1 endpoint with a bearer token, reusing the token until it nears expiry', async () => {
    let now = 1_000;
    const fetchMock = jest.fn(async (url: string) => (url.includes('oauth2') ? ok({ access_token: `token-${now}`, expires_in: 3600 }) : ok({ name: 'projects/how-test/messages/1' })));
    const client = new FcmClient(account, fetchMock as unknown as typeof fetch, () => now);

    await client.send({ token: 'DEVICE-1', title: 'Payment received', body: 'Your credits were added.' });
    now += 600;
    await client.send({ token: 'DEVICE-1', title: 'Second', body: 'Still the same token.' });

    const tokenCalls = fetchMock.mock.calls.filter(([url]) => url.includes('oauth2'));
    expect(tokenCalls).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe('https://fcm.googleapis.com/v1/projects/how-test/messages:send');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token-1000' });
    expect(JSON.parse(String(init.body))).toEqual({ message: { token: 'DEVICE-1', notification: { title: 'Payment received', body: 'Your credits were added.' } } });

    now += 3_000; // past expiry minus the refresh margin
    await client.send({ token: 'DEVICE-1', title: 'Third', body: 'New token.' });
    expect(fetchMock.mock.calls.filter(([u]) => u.includes('oauth2'))).toHaveLength(2);
  });

  it('reports a failed token request without leaking the response body', async () => {
    const fetchMock = jest.fn(async () => ({ ok: false, status: 400, json: async () => ({ error: 'invalid_grant', error_description: 'secret detail' }) }) as Response);
    const client = new FcmClient(account, fetchMock as unknown as typeof fetch, () => 1_000);
    await expect(client.send({ token: 'DEVICE-1', title: 't', body: 'b' })).rejects.toThrow('Google OAuth token request returned 400');
  });
});
