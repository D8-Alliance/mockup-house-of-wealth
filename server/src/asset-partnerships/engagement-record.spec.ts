import { canonical, entryHash, termsHash, verifyEntries } from './engagement-record';

describe('partnership record fingerprints', () => {
  it('hashes the same content the same way, whatever the key order or empty fields (as the database returns it)', () => {
    expect(canonical({ b: 1, a: { d: 2, c: undefined } })).toBe('{"a":{"d":2},"b":1}');
    expect(entryHash({ action: 'ACCEPTED', at: 'x', note: undefined })).toBe(entryHash({ at: 'x', action: 'ACCEPTED' }));
    expect(termsHash({ akad: 'IJARAH', terms: { rentAmount: 9000, currency: 'MYR' }, startDate: new Date('2027-01-01'), endDate: '2027-07-01' }))
      .toBe(termsHash({ akad: 'IJARAH', terms: { currency: 'MYR', rentAmount: 9000 }, startDate: '2027-01-01', endDate: new Date('2027-07-01') }));
  });

  it('marks entries from before fingerprinting as legacy, and an edited entry as a mismatch', () => {
    const old = { at: '2026-10-21T09:08:00.000Z', action: 'PROPOSED' };
    const kept = { at: '2026-10-22T05:00:00.000Z', action: 'COUNTERED' };
    const edited = { at: '2026-10-22T06:00:00.000Z', action: 'ACCEPTED', note: 'changed later' };
    const audit = [
      { createdAt: new Date('2026-10-22T05:00:01Z'), metadata: { entryHash: entryHash(kept) } },
      { createdAt: new Date('2026-10-22T06:00:01Z'), metadata: { entryHash: entryHash({ at: edited.at, action: 'ACCEPTED' }) } },
    ];
    expect(verifyEntries([old, kept, edited], audit).map((item) => item.verification)).toEqual(['LEGACY', 'VERIFIED', 'MISMATCH']);
  });
});
