import { capitalShares, cleanTerms, demandLevel, offerMetrics, scoreOffers, periodsOverlap, publicDetails, regionOf, termsProblems, typesMatch } from './asset-partnership-rules';

describe('comparing offers', () => {
  const d = (value: string) => new Date(value);
  it('puts monthly and whole-period rent on the same footing, and measures how much of the needed period is covered', () => {
    const monthly = offerMetrics('IJARAH', { rentAmount: 2000, rentFrequency: 'MONTHLY' }, d('2027-01-01'), d('2027-06-30'), d('2027-01-01'), d('2027-12-31'));
    expect(monthly).toMatchObject({ months: 6, monthlyRent: 2000, totalRent: 12000 });
    expect(monthly.coveragePct).toBeGreaterThanOrEqual(49);
    const whole = offerMetrics('IJARAH', { rentAmount: 12000, rentFrequency: 'WHOLE_PERIOD' }, d('2027-01-01'), d('2027-06-30'), null, null);
    expect(whole).toMatchObject({ monthlyRent: 2000, totalRent: 12000, coveragePct: null });
    expect(offerMetrics('MUSHARAKAH', { contributionValue: 400000, profitSharePct: 30 }, d('2027-01-01'), d('2027-12-31'), null, null)).toMatchObject({ monthlyRent: null, totalRent: null, months: 12 });
  });
});

describe('asset partnership rules', () => {
  it('needs a known rent and upkeep for Ijarah, and the agreed value and profit share for Musharakah', () => {
    expect(termsProblems('IJARAH', { currency: 'MYR' }, '2027-01-01', '2027-07-01')).toEqual(['the rent (ujrah) amount', 'whether the rent is monthly or for the whole period', 'who handles day-to-day upkeep']);
    expect(termsProblems('IJARAH', { currency: 'MYR', rentAmount: 9000, rentFrequency: 'MONTHLY', upkeepBy: 'LESSEE' }, '2027-01-01', '2027-07-01')).toEqual([]);
    expect(termsProblems('MUSHARAKAH', { currency: 'MYR' }, '2027-01-01', '2026-12-01')).toEqual(expect.arrayContaining(['an end date after the start date', "the asset's agreed value as capital", "the owner's profit share"]));
  });

  it('keeps only the fields of the chosen akad', () => {
    expect(cleanTerms('MUSHARAKAH', { rentAmount: 9000, contributionValue: 450000, profitSharePct: 30, currency: 'MYR' })).toEqual({ contributionValue: 450000, profitSharePct: 30, currency: 'MYR' });
  });

  it('matches machinery with equipment, and spots overlapping periods', () => {
    expect(typesMatch('MACHINERY', 'EQUIPMENT')).toBe(true);
    expect(typesMatch('LAND', 'BUILDING')).toBe(false);
    const jan = { startDate: new Date('2027-01-01'), endDate: new Date('2027-02-01') };
    expect(periodsOverlap(jan, { startDate: new Date('2027-01-15'), endDate: new Date('2027-03-01') })).toBe(true);
    expect(periodsOverlap(jan, { startDate: new Date('2027-02-01'), endDate: new Date('2027-03-01') })).toBe(false);
  });

  it('shows delivery partners what an asset is and roughly where, never its identifiers', () => {
    const machine = { manufacturer: 'Komatsu', model: 'PC200-8', serialNumber: 'KMT123', yearOfManufacture: 2019 };
    expect(publicDetails('MACHINERY', machine)).toEqual({ manufacturer: 'Komatsu', model: 'PC200-8', yearOfManufacture: 2019 });
    expect(publicDetails('LAND', { lotNumber: '4321', titleNumber: '98765', areaValue: 2.5, district: 'Hulu Langat', state: 'Selangor' })).toEqual({ areaValue: 2.5, district: 'Hulu Langat', state: 'Selangor' });
    expect(regionOf({ district: 'Hulu Langat', state: 'Selangor' })).toBe('Hulu Langat, Selangor');
  });
});

describe('scoring offers', () => {
  const base = { coveragePct: 100, documentIssues: 0, encumbered: false, demand: 'LOW' as const, profitSharePct: null };
  it('gives the lowest rent full price marks and the others in proportion, and always the same result', () => {
    const offers = [
      { ...base, id: 'A', akad: 'IJARAH' as const, monthlyRent: 2000 },
      { ...base, id: 'B', akad: 'IJARAH' as const, monthlyRent: 2500, coveragePct: 50, documentIssues: 1, encumbered: true, demand: 'HIGH' as const },
    ];
    const scores = scoreOffers(offers);
    expect(scores.get('A')).toEqual({ total: 100, parts: { rent: 35, coverage: 25, documents: 20, encumbrance: 10, availability: 10 } });
    expect(scores.get('B')).toEqual({ total: 56, parts: { rent: 28, coverage: 12.5, documents: 15, encumbrance: 0, availability: 0 } });
    expect(scoreOffers(offers)).toEqual(scores);
  });

  it('compares Musharakah offers by the owner\'s profit share, never against rent', () => {
    const scores = scoreOffers([
      { ...base, id: 'R', akad: 'IJARAH', monthlyRent: 9000 },
      { ...base, id: 'M', akad: 'MUSHARAKAH', monthlyRent: null, profitSharePct: 30 },
      { ...base, id: 'N', akad: 'MUSHARAKAH', monthlyRent: null, profitSharePct: 40, demand: 'MEDIUM' },
    ]);
    expect(scores.get('R')?.parts.rent).toBe(35);
    expect(scores.get('M')?.parts.rent).toBe(35);
    expect(scores.get('N')?.parts).toMatchObject({ rent: 26.3, availability: 5 });
  });

  it('turns other projects\' interest into a level only', () => {
    expect([0, 1, 2, 5].map(demandLevel)).toEqual(['LOW', 'MEDIUM', 'HIGH', 'HIGH']);
  });
});

describe('Musharakah capital shares', () => {
  it('works out each side\'s share of capital once both contributions are known', () => {
    expect(capitalShares({ contributionValue: 500000, pdpContributionValue: 500000 })).toEqual({ owner: 50, pdp: 50 });
    expect(capitalShares({ contributionValue: 500000, pdpContributionValue: 0 })).toEqual({ owner: 100, pdp: 0 });
    expect(capitalShares({ contributionValue: 500000 })).toBeNull();
  });
});
