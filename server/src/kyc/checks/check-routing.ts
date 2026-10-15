import { KYC_CHECK_TYPES, KycCheckProvider, KycCheckType } from './check-types';

/**
 * Which provider runs which check, per country node. Changing provider means
 * changing KYC_ROUTING_JSON, not code. Example:
 *
 * {
 *   "defaults":  { "AML_SCREENING": { "primary": "vendor-a", "required": true } },
 *   "countries": { "CN-MYS": { "DOCUMENT": { "primary": "vendor-a", "shadow": ["vendor-b"], "required": true } } }
 * }
 */
export interface CheckRoute {
  primary: string;
  /** Tried in order when the primary errors, times out, or does not support the country. */
  fallback?: string[];
  /** Run alongside without affecting the recommendation; agreement with the primary is recorded. */
  shadow?: string[];
  /** A FAIL on a required check makes the recommendation ADVERSE; otherwise ATTENTION. */
  required: boolean;
  timeoutMs?: number;
}

export type CheckPipeline = Partial<Record<KycCheckType, CheckRoute>>;

export interface CheckRouting {
  defaults: CheckPipeline;
  countries: Record<string, CheckPipeline>;
}

// Internal rules need no external service, so they are on by default.
export const DEFAULT_CHECK_ROUTING: CheckRouting = {
  defaults: {
    DOCUMENT_CONSISTENCY: { primary: 'internal', required: true },
    DUPLICATE_IDENTITY: { primary: 'internal', required: true },
    // Reads the documents locally (PDF text / OCR); advisory, so a mismatch is ATTENTION, never ADVERSE.
    DOCUMENT_CONTENT: { primary: 'local-ocr', required: false, timeoutMs: 90_000 },
    // Camera face verification prototype (src/kyc/liveness). Not required: a missing session is ATTENTION.
    LIVENESS: { primary: 'local-face', required: false },
    FACE_MATCH: { primary: 'local-face', required: false },
  },
  countries: {},
};

const ROUTE_KEYS = new Set(['primary', 'fallback', 'shadow', 'required', 'timeoutMs']);

function parseRoute(value: unknown, where: string): CheckRoute {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${where}: must be an object`);
  const route = value as Record<string, unknown>;
  // Unknown keys are rejected so a typo such as "requried" cannot silently weaken a check.
  const unknown = Object.keys(route).filter((key) => !ROUTE_KEYS.has(key));
  if (unknown.length) throw new Error(`${where}: unknown field(s) ${unknown.join(', ')}`);
  if (typeof route.primary !== 'string' || !route.primary) throw new Error(`${where}.primary: must be a provider name`);
  if (typeof route.required !== 'boolean') throw new Error(`${where}.required: must be true or false`);
  for (const key of ['fallback', 'shadow'] as const) {
    if (route[key] !== undefined && !(Array.isArray(route[key]) && (route[key] as unknown[]).every((name) => typeof name === 'string' && name))) {
      throw new Error(`${where}.${key}: must be a list of provider names`);
    }
  }
  if (route.timeoutMs !== undefined && !(typeof route.timeoutMs === 'number' && route.timeoutMs > 0 && route.timeoutMs <= 120_000)) {
    throw new Error(`${where}.timeoutMs: must be between 1 and 120000`);
  }
  return route as unknown as CheckRoute;
}

function parsePipeline(value: unknown, where: string): CheckPipeline {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${where}: must be an object`);
  const pipeline: CheckPipeline = {};
  for (const [check, route] of Object.entries(value)) {
    if (!(KYC_CHECK_TYPES as readonly string[]).includes(check)) throw new Error(`${where}: unknown check type ${check}`);
    pipeline[check as KycCheckType] = parseRoute(route, `${where}.${check}`);
  }
  return pipeline;
}

/** Parses and strictly validates KYC_ROUTING_JSON; falls back to the defaults when unset. */
export function loadCheckRouting(json = process.env.KYC_ROUTING_JSON): CheckRouting {
  if (!json?.trim()) return DEFAULT_CHECK_ROUTING;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`KYC_ROUTING_JSON is not valid JSON: ${(error as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null) throw new Error('KYC_ROUTING_JSON must be an object');
  const { defaults, countries, ...rest } = parsed as Record<string, unknown>;
  if (Object.keys(rest).length) throw new Error(`KYC_ROUTING_JSON: unknown field(s) ${Object.keys(rest).join(', ')}`);
  const countryPipelines: Record<string, CheckPipeline> = {};
  for (const [country, pipeline] of Object.entries((countries ?? {}) as Record<string, unknown>)) {
    if (!/^CN-[A-Z]{3}$/.test(country)) throw new Error(`KYC_ROUTING_JSON.countries: ${country} is not a country node id like CN-MYS`);
    countryPipelines[country] = parsePipeline(pipeline, `countries.${country}`);
  }
  return { defaults: defaults === undefined ? DEFAULT_CHECK_ROUTING.defaults : parsePipeline(defaults, 'defaults'), countries: countryPipelines };
}

/** Country routes replace the default route for the same check. */
export function resolvePipeline(routing: CheckRouting, countryNodeId: string): CheckPipeline {
  return { ...routing.defaults, ...(routing.countries[countryNodeId] ?? {}) };
}

/** Fails at start-up, not while an applicant is waiting. */
export function assertRoutingUsable(routing: CheckRouting, providers: KycCheckProvider[], production = process.env.NODE_ENV === 'production') {
  const byName = new Map(providers.map((provider) => [provider.name, provider]));
  const referenced = new Set<string>();
  for (const pipeline of [routing.defaults, ...Object.values(routing.countries)]) {
    for (const route of Object.values(pipeline)) {
      if (route) [route.primary, ...(route.fallback ?? []), ...(route.shadow ?? [])].forEach((name) => referenced.add(name));
    }
  }
  const missing = [...referenced].filter((name) => !byName.has(name));
  if (missing.length) throw new Error(`KYC routing refers to unregistered provider(s): ${missing.join(', ')}`);
  if (production) {
    const devOnly = [...referenced].filter((name) => byName.get(name)?.developmentOnly);
    if (devOnly.length) throw new Error(`KYC routing uses development-only provider(s) in production: ${devOnly.join(', ')}`);
  }
}
