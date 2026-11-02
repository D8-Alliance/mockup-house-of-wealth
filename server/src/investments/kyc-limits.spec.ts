import { kycInvestmentLimit, KycLimitsMisconfigured } from './kyc-limits';

const env = (value?: string) => ({ KYC_INVESTMENT_LIMITS: value }) as NodeJS.ProcessEnv;
const limits = env('{"LEVEL_1":{"MYR":10000},"LEVEL_2":{"MYR":100000,"IDR":1500000000}}');

describe('KYC investment limits', () => {
  it('sets no cap while Compliance has not configured any', () => {
    expect(kycInvestmentLimit('LEVEL_1', 'MYR', env())).toBeNull();
    expect(kycInvestmentLimit('LEVEL_1', 'MYR', env('  '))).toBeNull();
  });

  it('reads the cap for the level and currency', () => {
    expect(kycInvestmentLimit('LEVEL_1', 'MYR', limits)).toBe(10000);
    expect(kycInvestmentLimit('LEVEL_2', 'idr', limits)).toBe(1500000000);
  });

  it('has no cap where the level or currency is not listed', () => {
    expect(kycInvestmentLimit('LEVEL_3', 'MYR', limits)).toBeNull();
    expect(kycInvestmentLimit('LEVEL_1', 'USD', limits)).toBeNull();
  });

  it('treats an approval without a level as LEVEL_1', () => {
    expect(kycInvestmentLimit(null, 'MYR', limits)).toBe(10000);
  });

  it('refuses a setting that is not valid, instead of allowing unlimited investing', () => {
    expect(() => kycInvestmentLimit('LEVEL_1', 'MYR', env('{LEVEL_1:'))).toThrow(KycLimitsMisconfigured);
    expect(() => kycInvestmentLimit('LEVEL_1', 'MYR', env('{"LEVEL_1":{"MYR":"lots"}}'))).toThrow(KycLimitsMisconfigured);
  });
});
