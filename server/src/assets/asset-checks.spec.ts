import { assetIdentityKey, checkAssetDocuments, CheckedAsset, detailGaps, distanceKm, landGaps, landIdentityKey, requiredDocuments } from './asset-checks';

const now = new Date('2026-10-16T00:00:00Z');
const land = { titleType: 'GRN', titleNumber: '56789', lotNumber: '1234', mukim: 'Semenyih', district: 'Hulu Langat', state: 'Selangor', areaValue: 2, areaUnit: 'HECTARE', landUseCategory: 'AGRICULTURE', tenure: 'FREEHOLD' };
const asset: CheckedAsset = { assetType: 'LAND', ownerName: 'Al Hidayah Group Sdn Bhd', isEncumbered: false, latitude: 2.9437, longitude: 101.8437, details: land };
const text = (value: string) => ({ text: value, method: 'ocr' as const });
const search = 'CARIAN RASMI\nNo. Hakmilik: GRN 56789  No. Lot: 1234\nMukim Semenyih, Daerah Hulu Langat\nTuan Punya: AL HIDAYAH GROUP SDN BHD 1/1\nTarikh carian: 01/10/2026';
const find = (findings: ReturnType<typeof checkAssetDocuments>, source: string, field: string) => findings.find((item) => item.source.includes(source) && item.field === field);

describe('land rules', () => {
  it('requires the official search for land only', () => {
    expect(requiredDocuments('LAND')).toEqual(['OWNERSHIP', 'OFFICIAL_SEARCH']);
    expect(requiredDocuments('VEHICLE')).toEqual(['OWNERSHIP']);
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

describe('heavy vehicles', () => {
  const vehicle = { registrationNumber: 'WXY 1234', chassisNumber: 'JHHZJL1H8KK012345', engineNumber: 'J08E-UV12345', make: 'Hino', yearOfManufacture: 2019, roadTaxExpiry: '2027-03-01', insuranceExpiry: '2026-10-30' };
  const lorry: CheckedAsset = { ...asset, assetType: 'VEHICLE', details: vehicle };
  const voc = 'SIJIL PEMILIKAN KENDERAAN\nNo. Pendaftaran: WXY1234\nNo. Casis: JHHZJL1H8KK012345\nNo. Enjin: J08E-UV12345\nPemunya Berdaftar: AL HIDAYAH GROUP SDN BHD';

  it('needs registration, chassis and engine numbers, and identifies a vehicle by its chassis', () => {
    expect(detailGaps('VEHICLE', {})).toEqual(expect.arrayContaining(['registration number', 'chassis number', 'engine number']));
    expect(detailGaps('VEHICLE', vehicle)).toEqual([]);
    expect(assetIdentityKey('VEHICLE', vehicle)).toBe(assetIdentityKey('VEHICLE', { chassisNumber: 'jhhzjl1h8-kk012345' }));
  });

  it('matches the VOC numbers and owner, and notes insurance about to expire', () => {
    const findings = checkAssetDocuments(lorry, [{ documentType: 'OWNERSHIP', text: text(voc) }], now);
    for (const field of ['Registration number', 'Chassis number', 'Engine number', 'Registered owner']) expect(find(findings, 'VOC', field)?.result).toBe('MATCH');
    expect(find(findings, 'details entered', 'Insurance or takaful expiry')?.result).toBe('INFO');
    expect(find(findings, 'details entered', 'Road tax expiry')?.result).toBe('MATCH');
  });

  it('flags another chassis number and an undeclared hire purchase claim', () => {
    const findings = checkAssetDocuments(lorry, [{ documentType: 'OWNERSHIP', text: text(`${voc.replace('KK012345', 'KK099999')}\nTUNTUTAN HAK MILIK: Bank Islam Malaysia Berhad`) }], now);
    expect(find(findings, 'VOC', 'Chassis number')?.result).toBe('MISMATCH');
    expect(find(findings, 'VOC', 'Hire purchase claim')?.result).toBe('MISMATCH');
  });

  it('allows for digits the OCR read as letters, with a note to confirm by eye', () => {
    const findings = checkAssetDocuments(lorry, [{ documentType: 'OWNERSHIP', text: text(voc.replace('J08E-UV12345', 'JOBEUV12345')) }], now);
    expect(find(findings, 'VOC', 'Engine number')).toMatchObject({ result: 'MATCH', note: expect.stringContaining('O and 0') });
  });
});

describe('machinery', () => {
  const crane = { manufacturer: 'Tadano', model: 'GR-500EX', serialNumber: 'FE5123', requiresDoshCertificate: true, doshCertificateNumber: 'PMA-SL-123456', doshCertificateExpiry: '2026-09-30' };
  const machine: CheckedAsset = { ...asset, assetType: 'MACHINERY', details: crane };

  it('needs the serial plate, and the JKKP certificate only for machines that require one', () => {
    expect(requiredDocuments('MACHINERY', crane)).toEqual(['OWNERSHIP', 'SERIAL_PLATE', 'DOSH_CERTIFICATE']);
    expect(requiredDocuments('EQUIPMENT', { requiresDoshCertificate: false })).toEqual(['OWNERSHIP', 'SERIAL_PLATE']);
    expect(detailGaps('MACHINERY', { manufacturer: 'Tadano', model: 'GR-500EX', serialNumber: 'FE5123', requiresDoshCertificate: true })).toEqual(['JKKP certificate number', 'JKKP certificate expiry']);
    expect(assetIdentityKey('MACHINERY', crane)).toBe('MACHINE:TADANO|FE5123');
  });

  it('ties the invoice to the serial plate and flags an expired JKKP certificate', () => {
    const findings = checkAssetDocuments(machine, [
      { documentType: 'OWNERSHIP', text: text('INVOIS\nBill to: Al Hidayah Group Sdn Bhd\nTadano GR-500EX Rough Terrain Crane S/N FE5123') },
      { documentType: 'SERIAL_PLATE', text: text('TADANO LTD\nMODEL GR-500EX\nSERIAL NO. FE5124') },
      { documentType: 'DOSH_CERTIFICATE', text: text('PERAKUAN KELAYAKAN\nNo. Perakuan: PMA-SL-123456\nNo. Siri: FE5123') },
    ], now);
    expect(find(findings, 'invoice', 'Serial number')?.result).toBe('MATCH');
    expect(find(findings, 'invoice', 'Registered owner')?.result).toBe('MATCH');
    expect(find(findings, 'serial plate', 'Serial number')?.result).toBe('MISMATCH');
    expect(find(findings, 'JKKP', 'Certificate number')?.result).toBe('MATCH');
    expect(find(findings, 'details entered', 'JKKP certificate expiry')?.result).toBe('MISMATCH');
  });
});

describe('buildings', () => {
  const shop = { titleKind: 'INDIVIDUAL', titleNumber: 'GRN 11223', lotNumber: '5566', mukim: 'Kajang', district: 'Hulu Langat', state: 'Selangor', buildingUse: 'COMMERCIAL', floorArea: 3200, yearCompleted: 2015, completionCertificateNumber: 'CCC-2015-0456', hasTenants: true, tenantActivity: 'Convenience store and beer outlet' };
  const building: CheckedAsset = { ...asset, assetType: 'BUILDING', details: shop };

  it('needs the completion certificate, and strata details for a strata parcel', () => {
    expect(requiredDocuments('BUILDING')).toEqual(['OWNERSHIP', 'COMPLETION_CERT']);
    expect(detailGaps('BUILDING', shop)).toEqual([]);
    expect(detailGaps('BUILDING', { ...shop, titleKind: 'STRATA' })).toEqual(['strata title number', 'parcel number']);
    expect(assetIdentityKey('BUILDING', { titleKind: 'STRATA', strataTitleNumber: 'GRN 1/M1/2/34', parcelNumber: 'A-12-3' })).toBe('STRATA:GRN1M1234|A123');
  });

  it('reads the title, the CCC and the assessment year, and flags a tenant business that is not Shariah-compliant', () => {
    const findings = checkAssetDocuments(building, [
      { documentType: 'OWNERSHIP', text: text('GERAN\nNo. Hakmilik GRN 11223 Lot 5566 Mukim Kajang\nAL HIDAYAH GROUP SDN BHD') },
      { documentType: 'COMPLETION_CERT', text: text('PERAKUAN SIAP DAN PEMATUHAN\nNo. CCC-2015-0456') },
      { documentType: 'ASSESSMENT', text: text('Bil cukai taksiran 2022\nAl Hidayah Group Sdn Bhd') },
    ], now);
    expect(find(findings, 'title or sale', 'Title number')?.result).toBe('MATCH');
    expect(find(findings, 'CCC', 'Certificate')?.result).toBe('MATCH');
    expect(find(findings, 'CCC', 'Certificate number')?.result).toBe('MATCH');
    expect(find(findings, 'cukai pintu', 'Year')?.result).toBe('MISMATCH');
    expect(find(findings, 'details entered', "Tenants' business")?.result).toBe('MISMATCH');
  });
});
