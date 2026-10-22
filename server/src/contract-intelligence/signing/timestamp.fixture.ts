import forge from 'node-forge';

const { asn1 } = forge;
const U = asn1.Class.UNIVERSAL;

/** A minimal TimeStampResp around a TSTInfo stamping `stampedHex` at 2026-10-22 08:00 UTC. */
export function fakeTimestampResponse(stampedHex: string, status = 0): Buffer {
  const tstInfo = asn1.create(U, asn1.Type.SEQUENCE, true, [
    asn1.create(U, asn1.Type.INTEGER, false, asn1.integerToDer(1).getBytes()),
    asn1.create(U, asn1.Type.OID, false, asn1.oidToDer('1.2.3.4').getBytes()),
    asn1.create(U, asn1.Type.SEQUENCE, true, [
      asn1.create(U, asn1.Type.SEQUENCE, true, [asn1.create(U, asn1.Type.OID, false, asn1.oidToDer('2.16.840.1.101.3.4.2.1').getBytes())]),
      asn1.create(U, asn1.Type.OCTETSTRING, false, forge.util.hexToBytes(stampedHex)),
    ]),
    asn1.create(U, asn1.Type.INTEGER, false, forge.util.hexToBytes('0102')),
    asn1.create(U, asn1.Type.GENERALIZEDTIME, false, asn1.dateToGeneralizedTime(new Date('2026-10-22T08:00:00Z'))),
  ]);
  const signedData = asn1.create(U, asn1.Type.SEQUENCE, true, [
    asn1.create(U, asn1.Type.INTEGER, false, asn1.integerToDer(3).getBytes()),
    asn1.create(U, asn1.Type.SET, true, []),
    asn1.create(U, asn1.Type.SEQUENCE, true, [
      asn1.create(U, asn1.Type.OID, false, asn1.oidToDer('1.2.840.113549.1.9.16.1.4').getBytes()),
      asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [asn1.create(U, asn1.Type.OCTETSTRING, false, asn1.toDer(tstInfo).getBytes())]),
    ]),
    asn1.create(U, asn1.Type.SET, true, []),
  ]);
  const token = asn1.create(U, asn1.Type.SEQUENCE, true, [
    asn1.create(U, asn1.Type.OID, false, asn1.oidToDer('1.2.840.113549.1.7.2').getBytes()),
    asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [signedData]),
  ]);
  const response = asn1.create(U, asn1.Type.SEQUENCE, true, [
    asn1.create(U, asn1.Type.SEQUENCE, true, [asn1.create(U, asn1.Type.INTEGER, false, asn1.integerToDer(status).getBytes())]),
    ...(status === 0 ? [token] : []),
  ]);
  return Buffer.from(asn1.toDer(response).getBytes(), 'binary');
}
