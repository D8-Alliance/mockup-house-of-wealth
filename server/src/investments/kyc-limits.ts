/**
 * How much an investor may have invested in total, by KYC level, set by Compliance in
 * KYC_INVESTMENT_LIMITS (JSON), e.g. {"LEVEL_1":{"MYR":10000},"LEVEL_2":{"MYR":100000}}.
 * Caps are per currency, since pools in different countries' currencies are never added up.
 * No setting, or no entry for the level or currency, means no cap. A setting that is not valid
 * JSON throws: a compliance control must not quietly fall back to unlimited.
 */
export type KycLevelName = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

export class KycLimitsMisconfigured extends Error {}

export function kycInvestmentLimit(level: string | null | undefined, currency: string, env: NodeJS.ProcessEnv = process.env): number | null {
  const raw = env.KYC_INVESTMENT_LIMITS?.trim();
  if (!raw) return null;
  let limits: Record<string, Record<string, unknown>>;
  try {
    limits = JSON.parse(raw);
  } catch {
    throw new KycLimitsMisconfigured('KYC_INVESTMENT_LIMITS is not valid JSON.');
  }
  // An approval from before levels were recorded counts as the strictest level.
  const cap = limits?.[level || 'LEVEL_1']?.[currency.toUpperCase()];
  if (cap === undefined || cap === null) return null;
  if (typeof cap !== 'number' || !Number.isFinite(cap) || cap < 0) throw new KycLimitsMisconfigured(`KYC_INVESTMENT_LIMITS has an invalid cap for ${level || 'LEVEL_1'} ${currency}.`);
  return cap;
}
