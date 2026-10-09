import { UserRole } from '../rbac/types';

/**
 * Where API data comes from.
 * - live (default): the NestJS backend at VITE_API_BASE_URL.
 * - static (VITE_DATA_SOURCE=static): responses recorded from the seed database, served from
 *   /demo-data/*.json, so the frontend can be shown on its own with no backend online.
 *   Write actions are refused with a clear "demo mode" message and nothing is stored.
 * Record new data with scripts/demo-recorder.mjs (see docs in that file).
 */
export const DATA_SOURCE: 'live' | 'static' = import.meta.env.VITE_DATA_SOURCE === 'static' ? 'static' : 'live';
export const IS_STATIC_DEMO = DATA_SOURCE === 'static';

/** Personas whose screens were recorded; the sign-in form offers only these in static mode. */
export const STATIC_DEMO_ROLES: UserRole[] = ['Super Admin', 'Country Admin', 'Project Sponsor', 'Retail Investor', 'Shariah Reviewer', 'Legal Officer'];

interface RecordedResponse { status: number; contentType: string; contentDisposition?: string; body?: string; bodyBase64?: string }
type RecordingFile = Record<string, RecordedResponse>;

const files = new Map<string, Promise<RecordingFile>>();

/** The demo token's first segment carries { mock, role }: one recording file per user and role. */
export function personaKey(authorization: string | null | undefined): string {
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return 'public';
  try {
    const claims = JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))) as { mock?: string; role?: string };
    return `${claims.mock ?? 'unknown'}__${claims.role ?? 'default'}`.replace(/[^A-Za-z0-9_-]+/g, '-');
  } catch {
    return 'public';
  }
}

/** "GET /pools?status=OPEN" — the same key the recorder writes. */
export function recordingKey(method: string, url: string): string {
  const parsed = new URL(url, 'http://demo.local');
  return `${method.toUpperCase()} ${parsed.pathname}${parsed.search}`;
}

function loadFile(name: string): Promise<RecordingFile> {
  if (!files.has(name)) {
    files.set(name, fetch(`/demo-data/${name}.json`).then((response) => (response.ok ? response.json() : {})).catch(() => ({})));
  }
  return files.get(name)!;
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function staticFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (method === 'POST' && new URL(url, 'http://demo.local').pathname === '/auth/logout') return json(200, { success: true });
  if (method !== 'GET') {
    return json(403, { message: 'Demo mode: this action is not saved. The data shown is a recorded sample.' });
  }
  const key = recordingKey(method, url);
  const persona = personaKey(headers.get('Authorization'));
  const own = await loadFile(persona);
  const shared = await loadFile('public');
  // Queries such as a statement period (?from=...&to=...) depend on the day the screen is opened,
  // so when the exact query was not recorded, use a recording of the same path.
  const samePath = (file: RecordingFile) => Object.keys(file).find((candidate) => candidate.split('?')[0] === key.split('?')[0]);
  const fallbackKey = samePath(own) ?? samePath(shared);
  const recorded = own[key] ?? shared[key] ?? (fallbackKey ? own[fallbackKey] ?? shared[fallbackKey] : undefined);
  if (!recorded) return json(404, { message: 'Demo mode: this screen has no recorded data yet.' });
  const body = recorded.bodyBase64 ? Uint8Array.from(atob(recorded.bodyBase64), (char) => char.charCodeAt(0)) : recorded.body ?? '';
  const responseHeaders: Record<string, string> = { 'Content-Type': recorded.contentType };
  if (recorded.contentDisposition) responseHeaders['Content-Disposition'] = recorded.contentDisposition;
  return new Response(body, { status: recorded.status, headers: responseHeaders });
}

/** Drop-in replacement for fetch() for every backend call. */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return IS_STATIC_DEMO ? staticFetch(url, init) : fetch(url, init);
}
