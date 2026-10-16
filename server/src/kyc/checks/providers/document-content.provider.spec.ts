import { CheckContext } from '../check-types';
import { DocumentTextReader } from '../document-text-reader';
import { addressOnDocument, closestLine, dateOfBirthOnDocument, datesInText, DocumentContentProvider, idNumberOnDocument, issuerOfDocument, nameOnDocument, proofOfAddressAge } from './document-content.provider';

/** A fixed 'today' so the 3-month proof-of-address rule does not depend on when the tests run. */
const NOW = () => new Date('2026-10-16T00:00:00Z');

const idCardText = 'MALAYSIA KAD PENGENALAN\nName: AMINAH BINTI YUSOF\n1D No: 900512-10-1234\nWarganegara';
const billText = 'TENAGA NASIONAL\nAccount holder: AMINAH BINTI YUSOF\nNo. 8, Jalan Tun Razak, 50400 Kuala Lumpur\nBill date: 15-09-2026';

describe('document field matching', () => {
  it('finds the applicant name on the document, ignoring bin/binti and one OCR slip', () => {
    expect(nameOnDocument('Aminah binti Yusof', idCardText)).toBe('MATCH');
    expect(nameOnDocument('Aminah Yusof', 'Name: AMlNAH YUSOF')).toBe('MATCH');
    expect(nameOnDocument('Khaled bin Sulaiman', idCardText)).toBe('MISMATCH');
  });

  it('matches ID numbers regardless of dashes and common OCR confusions', () => {
    expect(idNumberOnDocument('900512101234', idCardText)).toBe('MATCH');
    expect(idNumberOnDocument('900512-10-1234', 'IC: 9OO512-1O-1234')).toBe('MATCH');
    expect(idNumberOnDocument('850101-14-5678', idCardText)).toBe('MISMATCH');
  });

  it('reads dates in several formats', () => {
    expect(datesInText('DOB 12/05/1990, issued 2020-01-31, expires 12 MAY 2031').sort()).toEqual(['1990-05-12', '2020-01-31', '2031-05-12']);
  });

  it('reports a date of birth mismatch only when no date on the document matches', () => {
    expect(dateOfBirthOnDocument(new Date('1990-05-12'), 'Born 12-05-1990, expiry 01-01-2031')).toBe('MATCH');
    expect(dateOfBirthOnDocument(new Date('1990-05-12'), 'Born 13-05-1991')).toBe('MISMATCH');
    expect(dateOfBirthOnDocument(new Date('1990-05-12'), 'no dates here')).toBe('NOT_FOUND');
  });

  it('checks the address, requiring the postcode when one was entered', () => {
    expect(addressOnDocument('No. 8, Jalan Tun Razak, 50400 Kuala Lumpur', billText)).toBe('MATCH');
    expect(addressOnDocument('No. 8, Jalan Tun Razak, 50450 Kuala Lumpur', billText)).toBe('MISMATCH');
  });
});

describe('DocumentContentProvider', () => {
  const subject = (overrides: Partial<CheckContext['subject']> = {}): CheckContext['subject'] => ({
    applicationId: 'KYC-1', userId: 'USR-1', countryNodeId: 'CN-MYS', fullName: 'Aminah binti Yusof', dateOfBirth: new Date('1990-05-12'), nationality: 'Malaysian',
    idDocumentType: 'NATIONAL_ID', idDocumentNumber: '900512-10-1234', idDocumentExpiry: null, residentialAddress: 'No. 8, Jalan Tun Razak, 50400 Kuala Lumpur',
    documentTypes: ['ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS'],
    loadDocument: async (type) => ({ mimeType: 'application/pdf', content: Buffer.from(type) }),
    ...overrides,
  });
  const reader = (texts: Record<string, string>) => ({ read: async (document: { content: Buffer }) => {
    const text = texts[document.content.toString()] ?? '';
    return { text, method: text ? 'pdf-text' : 'none' };
  } }) as unknown as DocumentTextReader;
  const run = (provider: DocumentContentProvider, s = subject()) => provider.run('DOCUMENT_CONTENT', { subject: s, previous: {}, signal: new AbortController().signal });

  it('passes when the documents agree with the application', async () => {
    const outcome = await run(new DocumentContentProvider(reader({ ID_FRONT: idCardText, ID_BACK: 'Alamat No. 8 Jalan Tun Razak', PROOF_OF_ADDRESS: billText }), NOW));
    expect(outcome.status).toBe('PASS');
    expect(outcome.reasons).toEqual([]);
  });

  it('raises a review with one reason per mismatched field', async () => {
    const outcome = await run(new DocumentContentProvider(reader({ ID_FRONT: idCardText, PROOF_OF_ADDRESS: billText }), NOW), subject({ fullName: 'Khaled bin Sulaiman', idDocumentNumber: '850101-14-5678' }));
    expect(outcome.status).toBe('REVIEW');
    expect(outcome.reasons).toEqual(expect.arrayContaining([
      'Name on the identity document does not match the application (entered: "Khaled bin Sulaiman")',
      'ID number on the identity document does not match the application (entered: "850101-14-5678")',
      'Name on the proof of address does not match the application (entered: "Khaled bin Sulaiman")',
    ]));
  });

  it('asks for a manual check when a document has no readable text', async () => {
    const outcome = await run(new DocumentContentProvider(reader({ ID_FRONT: idCardText, PROOF_OF_ADDRESS: billText }), NOW));
    expect(outcome.status).toBe('REVIEW');
    expect(outcome.reasons).toContain('Could not read any text from the ID card (back) - check it manually');
  });
});

describe('proof of address checks', () => {
  const today = NOW();

  it('accepts a bill under 3 months old and flags an older one or one without a date', () => {
    expect(proofOfAddressAge('Bill date: 15-09-2026', today)).toEqual({ result: 'MATCH', date: '2026-09-15' });
    expect(proofOfAddressAge('Bill date: 02-05-2026', today)).toEqual({ result: 'MISMATCH', date: '2026-05-02' });
    expect(proofOfAddressAge('no dates', today)).toEqual({ result: 'NOT_FOUND' });
  });

  it('takes the bill date, not the later due date printed on it', () => {
    expect(proofOfAddressAge('Bill date 01-04-2026  Pay by 30-11-2026', today)).toEqual({ result: 'MISMATCH', date: '2026-04-01' });
  });

  it('recognises common Malaysian issuers', () => {
    expect(issuerOfDocument(billText)).toEqual(expect.objectContaining({ kind: 'electricity bill' }));
    expect(issuerOfDocument('Penyata Akaun BANK ISLAM MALAYSIA')).toEqual(expect.objectContaining({ kind: 'bank statement' }));
    expect(issuerOfDocument('Invoice from Some Shop Sdn Bhd')).toBeUndefined();
  });

  it('shows the line it read, so the officer sees why a name did not match', () => {
    expect(closestLine('Anuar bin Jamin', 'KAD PENGENALAN\nANUAR BIN JAMlN\n790127-01-6085')).toBe('ANUAR BIN JAMlN');
  });

  it('reports an old proof of address and lists every compared field for the officer', async () => {
    const oldBill = billText.replace('15-09-2026', '02-05-2026');
    const provider = new DocumentContentProvider({ read: async (document: { content: Buffer }) => ({ text: { ID_FRONT: idCardText, PROOF_OF_ADDRESS: oldBill }[document.content.toString()] ?? '', method: 'pdf-text' }) } as unknown as DocumentTextReader, NOW);
    const s: CheckContext['subject'] = {
      applicationId: 'KYC-1', userId: 'USR-1', countryNodeId: 'CN-MYS', fullName: 'Aminah binti Yusof', dateOfBirth: new Date('1990-05-12'), nationality: 'Malaysian',
      idDocumentType: 'NATIONAL_ID', idDocumentNumber: '900512-10-1234', idDocumentExpiry: null, residentialAddress: 'No. 8, Jalan Tun Razak, 50400 Kuala Lumpur',
      documentTypes: ['ID_FRONT', 'PROOF_OF_ADDRESS'], loadDocument: async (type) => ({ mimeType: 'application/pdf', content: Buffer.from(type) }),
    };
    const outcome = await provider.run('DOCUMENT_CONTENT', { subject: s, previous: {}, signal: new AbortController().signal });
    expect(outcome.status).toBe('REVIEW');
    expect(outcome.reasons).toContain('The proof of address is dated 2026-05-02, older than 3 months');
    expect(outcome.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'proof of address', field: 'Date', result: 'MISMATCH', found: '2026-05-02' }),
      expect.objectContaining({ source: 'proof of address', field: 'Issued by', result: 'INFO', found: 'Tenaga Nasional (TNB) (electricity bill)' }),
      expect.objectContaining({ source: 'identity document', field: 'Address on MyKad', result: 'INFO' }),
    ]));
  });
});

