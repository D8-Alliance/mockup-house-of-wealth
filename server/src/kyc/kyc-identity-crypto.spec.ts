import { idNumberHash, isSealed, protectIdNumber, revealIdNumber, sealIdNumber } from './kyc-identity-crypto';

describe('KYC identity number encryption', () => {
  const saved = { key: process.env.KYC_DATA_ENCRYPTION_KEY, env: process.env.NODE_ENV };
  afterEach(() => { process.env.KYC_DATA_ENCRYPTION_KEY = saved.key; process.env.NODE_ENV = saved.env; });

  it('encrypts with a fresh value each time and reads it back', () => {
    process.env.KYC_DATA_ENCRYPTION_KEY = 'test-key-one';
    const first = sealIdNumber('900101-14-5678');
    const second = sealIdNumber('900101-14-5678');
    expect(isSealed(first)).toBe(true);
    expect(first).not.toBe(second);
    expect(first).not.toContain('5678');
    expect(revealIdNumber(first)).toBe('900101-14-5678');
  });

  it('reads a number saved before encryption as it is', () => {
    process.env.KYC_DATA_ENCRYPTION_KEY = 'test-key-one';
    expect(revealIdNumber('900101-14-5678')).toBe('900101-14-5678');
    expect(revealIdNumber('')).toBe('');
  });

  it('hashes the normalised number, so the same document is found however it was typed', () => {
    process.env.KYC_DATA_ENCRYPTION_KEY = 'test-key-one';
    expect(idNumberHash('900101-14-5678')).toBe(idNumberHash('900101 14 5678'));
    expect(idNumberHash('900101-14-5678')).not.toBe(idNumberHash('900101-14-5679'));
    expect(protectIdNumber(' 900101-14-5678 ')).toMatchObject({ idDocumentNumberLast4: '5678', idDocumentNumberHash: idNumberHash('900101145678') });
    expect(protectIdNumber('')).toEqual({ idDocumentNumber: '', idDocumentNumberHash: null, idDocumentNumberLast4: null });
  });

  it('refuses to save without a key in production, and keeps the number as before in development', () => {
    delete process.env.KYC_DATA_ENCRYPTION_KEY;
    process.env.NODE_ENV = 'development';
    expect(sealIdNumber('A1234567')).toBe('A1234567');
    process.env.NODE_ENV = 'production';
    expect(() => sealIdNumber('A1234567')).toThrow('KYC_DATA_ENCRYPTION_KEY');
  });
});
