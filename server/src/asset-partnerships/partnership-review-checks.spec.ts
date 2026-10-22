import { checkSummary, partnershipChecks, ReviewCheckInput } from './partnership-review-checks';

const d = (value: string) => new Date(value);
/** The case a reviewer flagged on staging: land offered for an irrigation pump need, as a 3-month Musharakah with a 6% profit share. */
const flagged: ReviewCheckInput = {
  akad: 'MUSHARAKAH',
  terms: { contributionValue: 500000, profitSharePct: 6, currency: 'MYR' },
  startDate: d('2026-11-01'), endDate: d('2027-01-31'),
  need: { assetType: 'MACHINERY', title: 'Smart irrigation pump systems', startDate: d('2026-11-01'), endDate: d('2027-10-31') },
  project: { sector: 'Agriculture', projectName: 'Felcra irrigation' },
  asset: { assetType: 'LAND', status: 'VERIFIED', isEncumbered: false, estimatedValue: 500000, valuationDate: d('2026-09-01'), details: { landUseCategory: 'AGRICULTURE', tenure: 'FREEHOLD' }, checkFindings: [{ field: 'Registered owner', result: 'MATCH' }, { field: 'Search date', result: 'MISMATCH', note: 'Ask for a new search.' }], documentTypes: ['OWNERSHIP', 'OFFICIAL_SEARCH', 'SITE_PHOTO'] },
  pdpApplicationStatus: 'SUBMITTED',
  overlappingCommitments: 0,
  now: d('2026-10-22'),
};
const status = (input: ReviewCheckInput, key: string) => partnershipChecks(input).find((check) => check.key === key)?.status;

describe('partnership review checks', () => {
  it('flags what a reviewer should not approve as it stands', () => {
    expect(status(flagged, 'type-match')).toBe('FAIL');
    expect(status(flagged, 'period-length')).toBe('WARN');
    expect(status(flagged, 'pdp-capital')).toBe('FAIL');
    expect(status(flagged, 'loss-by-capital')).toBe('FAIL');
    expect(status(flagged, 'search-date')).toBe('FAIL');
    expect(status(flagged, 'registered-owner')).toBe('PASS');
    expect(status(flagged, 'pdp-kyb')).toBe('WARN');
    expect(status(flagged, 'land-use')).toBe('PASS');
    expect(status(flagged, 'documents')).toBe('PASS');
  });

  it('warns when the profit share is far from the capital share, and passes once the terms are corrected', () => {
    const withCapital = { ...flagged, terms: { ...flagged.terms, pdpContributionValue: 0 } };
    expect(status(withCapital, 'pdp-capital')).toBe('WARN');
    expect(status(withCapital, 'profit-vs-capital')).toBe('WARN');
    const fixed = { ...flagged, terms: { contributionValue: 500000, profitSharePct: 60, pdpContributionValue: 300000, currency: 'MYR' }, endDate: d('2027-10-31') };
    expect(status(fixed, 'pdp-capital')).toBe('PASS');
    expect(status(fixed, 'profit-vs-capital')).toBe('PASS');
    expect(status(fixed, 'loss-by-capital')).toBe('PASS');
    expect(status(fixed, 'period-length')).toBe('PASS');
  });

  it('checks Ijarah rent against the asset\'s value and keeps Shariah items for the Shariah reviewer', () => {
    const lease: ReviewCheckInput = { ...flagged, akad: 'IJARAH', terms: { rentAmount: 300, rentFrequency: 'MONTHLY', upkeepBy: 'LESSEE', currency: 'MYR' }, need: { ...flagged.need!, assetType: 'LAND' } };
    expect(status(lease, 'rent-yield')).toBe('WARN');
    expect(status(lease, 'rent-known')).toBe('PASS');
    const legal = checkSummary(partnershipChecks(lease), 'LEGAL');
    const shariah = checkSummary(partnershipChecks(lease), 'SHARIAH');
    expect(legal.warn).toContain("Rent is in a usual range for the asset's value");
    expect(shariah.warn).not.toContain("Rent is in a usual range for the asset's value");
  });

  it('fails a prohibited activity, a lease ending too soon, and an asset held elsewhere', () => {
    const bad: ReviewCheckInput = { ...flagged, project: { sector: 'Hospitality', projectName: 'Casino resort' }, asset: { ...flagged.asset, details: { leaseExpiry: '2026-12-31' } }, overlappingCommitments: 1 };
    expect(status(bad, 'halal-use')).toBe('FAIL');
    expect(status(bad, 'lease-expiry')).toBe('FAIL');
    expect(status(bad, 'overlap')).toBe('FAIL');
  });
});
