import { CheckContext, CheckOutcome, KycCheckProvider, KycCheckType } from '../check-types';

/**
 * Development stand-in for an external eKYC provider. Refused in production by
 * assertRoutingUsable. A full name containing "TEST FAIL" or "TEST REVIEW"
 * forces that outcome.
 */
export class MockKycProvider implements KycCheckProvider {
  readonly name = 'mock';
  readonly version = '1.0.0';
  readonly developmentOnly = true;

  supports(check: KycCheckType): boolean {
    return check !== 'DOCUMENT_CONSISTENCY' && check !== 'DUPLICATE_IDENTITY';
  }

  async run(check: KycCheckType, { subject }: CheckContext): Promise<CheckOutcome> {
    if (/TEST FAIL/i.test(subject.fullName)) return { status: 'FAIL', score: 0.1, reasons: ['Mock: forced failure'] };
    if (/TEST REVIEW/i.test(subject.fullName)) return { status: 'REVIEW', score: 0.82, reasons: ['Mock: forced review'] };
    const identity = check === 'DOCUMENT' || check === 'REGISTRY'
      ? { fullName: subject.fullName, idNumber: subject.idDocumentNumber, dateOfBirth: subject.dateOfBirth?.toISOString().slice(0, 10), documentExpiry: subject.idDocumentExpiry?.toISOString().slice(0, 10) }
      : undefined;
    return { status: 'PASS', score: 0.97, reasons: [], identity };
  }
}
