import { projectTerms } from './projects.service';

describe('projectTerms', () => {
  it('keeps the yield, tenure and location a sponsor gives', () => {
    expect(projectTerms({ expectedYieldPct: 8.5, tenureMonths: 48, location: '  Kuantan, Pahang ' })).toEqual({ expectedYieldPct: 8.5, tenureMonths: 48, location: 'Kuantan, Pahang' });
  });

  it('leaves out missing or impossible values instead of saving them', () => {
    expect(projectTerms({})).toEqual({ expectedYieldPct: null, tenureMonths: null, location: null });
    expect(projectTerms({ expectedYieldPct: 250, tenureMonths: 2.5, location: ' ' })).toEqual({ expectedYieldPct: null, tenureMonths: null, location: null });
  });
});
