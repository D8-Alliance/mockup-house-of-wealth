import { coverStatus, fundingBlockers, minSponsorPct, proRataShares, sponsorCapital, takafulRequirements } from './safeguard-rules';

const excavator = { assetId: 'ASSET-MYS-EXC', assetType: 'MACHINERY', name: 'Komatsu PC200', value: 380000, akad: 'IJARAH', ownerName: 'Al Hidayah Group' };
const land = { assetId: 'ASSET-MYS-LAND', assetType: 'LAND', name: 'Lot 5674', value: 500000, akad: 'MUSHARAKAH', ownerName: 'Al Hidayah Group' };
const day = 86_400_000;
const now = new Date('2026-11-01T00:00:00Z');

describe('capital and takaful rules', () => {
  it('sets the sponsor minimum by country, 10% unless configured', () => {
    expect(minSponsorPct('CN-MYS', undefined)).toBe(10);
    expect(minSponsorPct('CN-MYS', '15')).toBe(15);
    expect(minSponsorPct('CN-IDN', '{"CN-MYS":10,"CN-IDN":20}')).toBe(20);
    expect(minSponsorPct('CN-TUR', '{"CN-MYS":10}')).toBe(10);
  });

  it('counts the sponsor cash at each stage, leaving out rejected evidence and other financing', () => {
    const capital = sponsorCapital([
      { source: 'SPONSOR_CASH', amount: 100000, status: 'DEPOSITED' },
      { source: 'SPONSOR_CASH', amount: 50000, status: 'EVIDENCE_SUBMITTED' },
      { source: 'SPONSOR_CASH', amount: 70000, status: 'REJECTED' },
      { source: 'OTHER_FINANCING', amount: 300000, status: 'DEPOSITED' },
    ], 2050000, 10);
    expect(capital).toEqual({ pct: 10, required: 205000, pledged: 150000, submitted: 150000, evidenced: 100000, deposited: 100000 });
  });

  it('asks cover for machinery (lessor pays under Ijarah), public liability where there is a site, CAR and PERKESO when ticked', () => {
    const requirements = takafulRequirements({ assets: [excavator, land], hasSiteWork: true, hasWorkers: true });
    expect(requirements.map((item) => item.key)).toEqual(['MACHINERY:ASSET-MYS-EXC', 'CONTRACTORS_ALL_RISK', 'PUBLIC_LIABILITY', 'PERKESO']);
    expect(requirements[0]).toMatchObject({ minSumCovered: 380000, payer: 'Al Hidayah Group (lessor)' });
    expect(takafulRequirements({ assets: [], hasSiteWork: false, hasWorkers: false })).toEqual([]);
  });

  it('meets a requirement only with a verified policy in force covering enough', () => {
    const [machinery] = takafulRequirements({ assets: [excavator], hasSiteWork: false, hasWorkers: false });
    const policy = { id: 'TKF-1', coverType: 'MACHINERY', assetId: 'ASSET-MYS-EXC', sumCovered: 380000, startDate: new Date(now.getTime() - 10 * day), endDate: new Date(now.getTime() + 200 * day), status: 'VERIFIED' };
    const state = (p: typeof policy) => coverStatus([machinery], [p], now)[0].state;
    expect(state(policy)).toBe('COVERED');
    expect(state({ ...policy, endDate: new Date(now.getTime() + 20 * day) })).toBe('EXPIRING');
    expect(state({ ...policy, sumCovered: 200000 })).toBe('INSUFFICIENT');
    expect(state({ ...policy, status: 'SUBMITTED' })).toBe('PENDING_REVIEW');
    expect(state({ ...policy, endDate: new Date(now.getTime() - day) })).toBe('LAPSED');
    expect(state({ ...policy, assetId: 'ASSET-OTHER' })).toBe('MISSING');
    expect(state({ ...policy, startDate: new Date(now.getTime() + 5 * day) })).toBe('NOT_STARTED');
  });

  it('blocks the pool until capital is proved, and releases until it is deposited and cover is in force', () => {
    const capital = { pct: 10, required: 120000, pledged: 120000, submitted: 120000, evidenced: 120000, deposited: 0 };
    const cover = [{ key: 'PUBLIC_LIABILITY', coverType: 'PUBLIC_LIABILITY' as const, label: 'Public liability', payer: 'PDP', state: 'MISSING' as const, policyId: null, coveredUntil: null }];
    expect(fundingBlockers('POOL', { capital, cover, currency: 'MYR' })).toEqual([]);
    const release = fundingBlockers('DISBURSE', { capital, cover, currency: 'MYR' });
    expect(release[0]).toContain('RM 0.00 of the RM 120,000.00 minimum is deposited');
    expect(release[1]).toContain('Public liability (missing)');
    expect(fundingBlockers('POOL', { capital: { ...capital, evidenced: 50000 }, cover: [], currency: 'MYR' })[0]).toContain('must be proved');
  });

  it('draws each release from the sponsor and investors in proportion', () => {
    expect(proRataShares(300000, 350000, 1200000)).toEqual({ sponsorRatio: 22.58, sponsor: 67741.94, investors: 232258.06 });
  });
});
