import { assetExpiriesDue } from './asset-expiry';

const now = new Date('2026-11-02T09:00:00Z');

describe('asset expiry reminders', () => {
  it('reminds at the nearest of 30, 14 and 7 days before, and once lapsed', () => {
    const due = assetExpiriesDue({ roadTaxExpiry: '2026-11-30', insuranceExpiry: '2026-11-12', inspectionExpiry: '2026-11-06', permitNumber: 'X' }, now);
    expect(due.map((item) => [item.field, item.threshold])).toEqual([['roadTaxExpiry', 30], ['insuranceExpiry', 14], ['inspectionExpiry', 7]]);
    expect(assetExpiriesDue({ roadTaxExpiry: '2026-10-20' }, now)).toMatchObject([{ field: 'roadTaxExpiry', threshold: 0 }]);
  });

  it('stays quiet more than 30 days ahead, or with no usable date', () => {
    expect(assetExpiriesDue({ roadTaxExpiry: '2027-02-01' }, now)).toEqual([]);
    expect(assetExpiriesDue({ roadTaxExpiry: 'soon' }, now)).toEqual([]);
    expect(assetExpiriesDue(null, now)).toEqual([]);
  });

  it('counts a JKKP certificate only when one is required, and a lease only for leasehold', () => {
    expect(assetExpiriesDue({ doshCertificateExpiry: '2026-11-10', requiresDoshCertificate: false }, now)).toEqual([]);
    expect(assetExpiriesDue({ doshCertificateExpiry: '2026-11-10', requiresDoshCertificate: true }, now)).toHaveLength(1);
    expect(assetExpiriesDue({ leaseExpiry: '2026-11-10', tenure: 'FREEHOLD' }, now)).toEqual([]);
    expect(assetExpiriesDue({ leaseExpiry: '2026-11-10', tenure: 'LEASEHOLD' }, now)).toMatchObject([{ label: 'Lease', threshold: 14 }]);
  });
});
