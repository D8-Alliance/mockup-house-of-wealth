import { checkAssetDocuments, CheckedAsset, distanceKm, landGaps, landIdentityKey, requiredDocuments } from './asset-checks';

const now = new Date('2026-10-16T00:00:00Z');
const land = { titleType: 'GRN', titleNumber: '56789', lotNumber: '1234', mukim: 'Semenyih', district: 'Hulu Langat', state: 'Selangor', areaValue: 2, areaUnit: 'HECTARE', landUseCategory: 'AGRICULTURE', tenure: 'FREEHOLD' };
const asset: CheckedAsset = { assetType: 'LAND', ownerName: 'Al Hidayah Group Sdn Bhd', isEncumbered: false, latitude: 2.9437, longitude: 101.8437, land };
const text = (value: string) => ({ text: value, method: 'ocr' as const });
const search = 'CARIAN RASMI\nNo. Hakmilik: GRN 56789  No. Lot: 1234\nMukim Semenyih, Daerah Hulu Langat\nTuan Punya: AL HIDAYAH GROUP SDN BHD 1/1\nTarikh carian: 01/10/2026';
const find = (findings: ReturnType<typeof checkAssetDocuments>, source: string, field: string) => findings.find((item) => item.source.includes(source) && item.field === field);

describe('land rules', () => {
  it('requires the official search for land only', () => {
    expect(requiredDocuments('LAND')).toEqual(['OWNERSHIP', 'OFFICIAL_SEARCH']);
    expect(requiredDocuments('MACHINERY')).toEqual(['OWNERSHIP']);
  });

  it('lists missing title fields, with the lease expiry only for leasehold', () => {
    expect(landGaps(land)).toEqual([]);
    expect(landGaps({ ...land, tenure: 'LEASEHOLD' })).toEqual(['lease expiry date']);
    expect(landGaps({})).toContain('lot number');
  });

  it('identifies land by lot, mukim, district and state whatever the spelling', () => {
    expect(landIdentityKey(land)).toBe(landIdentityKey({ ...land, mukim: 'SEMENYIH', state: 'selangor', district: 'hulu-langat' }));
    expect(landIdentityKey({ lotNumber: '1234' })).toBeNull();
  });
});

describe('checkAssetDocuments', () => {
  it('matches title, lot, mukim, owner and a recent search date', () => {
    const findings = checkAssetDocuments(asset, [{ documentType: 'OFFICIAL_SEARCH', text: text(search) }], now);
    for (const field of ['Title number', 'Lot number', 'Mukim', 'Registered owner', 'Search date']) expect(find(findings, 'Carian Rasmi', field)?.result).toBe('MATCH');
  });

  it('flags a charge on the search that the owner did not declare, and an old search', () => {
    const findings = checkAssetDocuments(asset, [{ documentType: 'OFFICIAL_SEARCH', text: text(`${search.replace('01/10/2026', '01/03/2026')}\nGADAIAN kepada Maybank Islamic Berhad`) }], now);
    expect(find(findings, 'Carian Rasmi', 'Charge or caveat')?.result).toBe('MISMATCH');
    expect(find(findings, 'Carian Rasmi', 'Search date')?.result).toBe('MISMATCH');
  });

  it('flags another registered owner, and says when a scanned document could not be read', () => {
    const findings = checkAssetDocuments(asset, [
      { documentType: 'OFFICIAL_SEARCH', text: text(search.replace('AL HIDAYAH GROUP SDN BHD', 'AHMAD BIN ALI')) },
      { documentType: 'OWNERSHIP', text: { text: '', method: 'none' } },
    ], now);
    expect(find(findings, 'Carian Rasmi', 'Registered owner')?.result).toBe('MISMATCH');
    expect(find(findings, 'geran', 'Readable text')?.result).toBe('NOT_FOUND');
  });

  it('checks the quit rent year and compares the site photo with the map pin', () => {
    const findings = checkAssetDocuments(asset, [
      { documentType: 'QUIT_RENT', text: text('Resit cukai tanah tahun 2024') },
      { documentType: 'SITE_PHOTO', text: null, metadata: { latitude: 2.944, longitude: 101.844 } },
    ], now);
    expect(find(findings, 'cukai tanah', 'Year paid')?.result).toBe('MISMATCH');
    expect(find(findings, 'site photo', 'Photo location')?.result).toBe('MATCH');
    const far = checkAssetDocuments(asset, [{ documentType: 'SITE_PHOTO', text: null, metadata: { latitude: 3.139, longitude: 101.6869 } }], now);
    expect(find(far, 'site photo', 'Photo location')?.result).toBe('MISMATCH');
    expect(distanceKm({ latitude: 2.9437, longitude: 101.8437 }, { latitude: 3.139, longitude: 101.6869 })).toBeGreaterThan(20);
  });
});
