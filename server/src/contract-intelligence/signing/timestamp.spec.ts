import forge from 'node-forge';
import { buildTimestampRequest, parseTimestampResponse, requestTimestamp } from './timestamp';
import { fakeTimestampResponse as fakeResponse } from './timestamp.fixture';

const { asn1 } = forge;
const hash = 'a'.repeat(64);

describe('third-party time-stamp (RFC 3161)', () => {
  it('asks for a SHA-256 stamp of the document hash', () => {
    const request = asn1.fromDer(buildTimestampRequest(hash, Buffer.from('0102030405060708', 'hex')).toString('binary')).value as forge.asn1.Asn1[];
    const imprint = request[1].value as forge.asn1.Asn1[];
    expect(forge.util.bytesToHex(imprint[1].value as string)).toBe(hash);
  });

  it('accepts a stamp of our hash and keeps its time and token', () => {
    const result = parseTimestampResponse(fakeResponse(hash), hash, 'https://tsa.example.test');
    expect(result).toMatchObject({ genTime: new Date('2026-10-22T08:00:00Z'), serial: '0102', authority: 'https://tsa.example.test' });
    expect(result.token.length).toBeGreaterThan(20);
  });

  it('refuses a stamp of another document, or a refusal from the authority', async () => {
    expect(() => parseTimestampResponse(fakeResponse('b'.repeat(64)), hash, 'x')).toThrow('different document');
    expect(() => parseTimestampResponse(fakeResponse(hash, 2), hash, 'x')).toThrow('refused');
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => fakeResponse(hash) });
    await expect(requestTimestamp(hash, 'https://tsa.example.test', fetchImpl as never)).resolves.toMatchObject({ serial: '0102' });
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/timestamp-query' } });
  });
});
